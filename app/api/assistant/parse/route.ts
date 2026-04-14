import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { parseWithOpenAI, type OpenAITokenUsage } from '@/lib/assistant/openai-parser';
import { assertWithinTokenLimit, getUserAiAccessState, recordAiUsage } from '@/lib/ai-usage';
import {
  assistantParseRequestSchema,
  assistantParseResultSchema,
  assistantResolutionSchema,
  assistantIntentSchema,
} from '@/lib/assistant/schemas';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function misconfigured() {
  return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function extractAccountTargetName(text: string) {
  const renameMatch = text.match(/rename\s+(?:my\s+)?(.+?)\s+account\s+to\s+.+$/i);
  if (renameMatch) return renameMatch[1]?.trim();

  const changeTypeMatch = text.match(/change\s+(?:my\s+)?(.+?)\s+account\s+to\s+(cash|mobile banking|bank|credit card|loan)$/i);
  if (changeTypeMatch) return changeTypeMatch[1]?.trim();

  return undefined;
}

function extractCategoryTargetName(text: string) {
  const renameMatch = text.match(/rename\s+(?:the\s+)?(.+?)\s+category\s+to\s+.+$/i);
  if (renameMatch) return renameMatch[1]?.trim();
  return undefined;
}

function keepOnlyRelevantIntentData<T extends { key: string }>(
  intent: string,
  items: T[],
) {
  const [entity] = intent.split('.') as [string, string];
  return items.filter((item) => item.key === 'clarification' || item.key.startsWith(`${entity}.`));
}

type UserEntity = {
  id: string;
  name?: string;
  type?: string;
  description?: string;
};

function fallbackParseResult(text: string, reason: string) {
  const [entity, operation] = assistantIntentSchema.parse('transaction.add').split('.') as ['transaction', 'add'];
  return assistantParseResultSchema.parse({
    intent: 'transaction.add',
    entity,
    operation,
    confidence: 0,
    fields: {},
    missingFields: ['clarification'],
    ambiguities: [],
    resolutions: [
      {
        key: 'clarification',
        status: 'missing',
        query: reason,
        options: [],
      },
    ],
    requiresConfirmation: true,
    originalText: text,
  });
}

function parseSimpleTransactionText(text: string, nowIso: string): Awaited<ReturnType<typeof parseWithOpenAI>> | null {
  const raw = text.trim();
  if (!raw) return null;

  const normalized = normalizeText(raw);
  const expenseSignals = ['spent', 'pay', 'paid', 'bought', 'খরচ'];
  const incomeSignals = ['received', 'got paid', 'earned', 'income', 'আয়'];
  const incomeAccountPattern = /(?:add|deposit|put)\s+(\d+(?:[.,]\d+)?)(?:\s*[a-z]{2,})?\s+(?:to|into)\s+(?:my\s+)?(.+?)\s+account$/i;
  const transferPattern = /transfer\s+(\d+(?:[.,]\d+)?)(?:\s*[a-z]{2,})?\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+account)?$/i;

  let intent: 'transaction.add' | null = null;
  let type: 'expense' | 'income' | 'transfer' | undefined;
  if (expenseSignals.some((token) => normalized.includes(token))) {
    intent = 'transaction.add';
    type = 'expense';
  } else if (incomeSignals.some((token) => normalized.includes(token))) {
    intent = 'transaction.add';
    type = 'income';
  } else if (incomeAccountPattern.test(raw)) {
    intent = 'transaction.add';
    type = 'income';
  } else if (transferPattern.test(normalized)) {
    intent = 'transaction.add';
    type = 'transfer';
  }

  if (!intent) return null;

  const amountMatch = raw.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(',', '')) : undefined;

  const incomeAccountMatch = raw.match(incomeAccountPattern);
  const transferMatch = raw.match(transferPattern);
  const accountMatch = raw.match(/from\s+(?:my\s+)?(.+?)\s+account/i);
  const accountName = incomeAccountMatch?.[2]?.trim() || transferMatch?.[2]?.trim() || accountMatch?.[1]?.trim();
  const transferAccountName = transferMatch?.[3]?.trim();

  const categoryMatch = raw.match(/(?:on|for)\s+(.+?)(?:\s+from\s+|\s+and\s+this\s+is\s+|\s+this\s+is\s+|$)/i);
  const categoryRaw = categoryMatch?.[1]?.trim();
  const categoryName = categoryRaw ? categoryRaw.replace(/\b(items?|expense|expenses)\b/gi, '').trim() : undefined;

  const noteMatch = raw.match(/(?:this is|it is)\s+for\s+(.+)$/i);
  const notes = noteMatch?.[1]?.trim();

  const missingFields: string[] = [];
  if (!amount || Number.isNaN(amount)) missingFields.push('transaction.amount');
  if (!type) missingFields.push('transaction.type');
  if (!accountName) missingFields.push('transaction.accountId');
  if (type === 'transfer') {
    if (!transferAccountName) missingFields.push('transaction.transferAccountId');
  } else if (!categoryName) {
    missingFields.push('transaction.categoryId');
  }

  return {
    intent,
    entity: 'transaction',
    operation: 'add',
    confidence: 0.72,
    fields: {
      transaction: {
        amount,
        type,
        accountName,
        transferAccountName,
        categoryName,
        dateMode: 'relative',
        relativeDate: 'today',
        dateIso: nowIso,
        description:
          type === 'transfer'
            ? `Transfer to ${transferMatch?.[3]?.trim() ?? 'another account'}`
            :
          type === 'income'
            ? notes ? `Income for ${notes}` : `Income added to ${accountName ?? 'account'}`
            : notes ? `Expense for ${notes}` : `Expense on ${categoryName ?? 'category'}`,
        notes: notes ?? raw,
      },
    },
    missingFields,
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

function parseSimpleAccountText(text: string): Awaited<ReturnType<typeof parseWithOpenAI>> | null {
  const raw = text.trim();
  if (!raw) return null;

  const addMatch = raw.match(/(?:add|create)\s+(?:a\s+)?(cash|mobile banking|bank|credit card|loan)\s+account(?:\s+called|\s+named)?\s+(.+)$/i);
  if (addMatch) {
    const rawType = normalizeText(addMatch[1]).replace(/\s+/g, '_');
    return {
      intent: 'account.add',
      entity: 'account',
      operation: 'add',
      confidence: 0.78,
      fields: {
        account: {
          type: rawType === 'mobile_banking' || rawType === 'credit_card' ? rawType : rawType as 'cash' | 'bank' | 'loan',
          name: addMatch[2]?.trim(),
        },
      },
      missingFields: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const renameMatch = raw.match(/rename\s+(?:my\s+)?(.+?)\s+account\s+to\s+(.+)$/i);
  if (renameMatch) {
    return {
      intent: 'account.update',
      entity: 'account',
      operation: 'update',
      confidence: 0.78,
      fields: {
        account: {
          id: undefined,
          name: renameMatch[2]?.trim(),
        },
      },
      missingFields: ['account.id'],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const changeTypeMatch = raw.match(/change\s+(?:my\s+)?(.+?)\s+account\s+to\s+(cash|mobile banking|bank|credit card|loan)$/i);
  if (changeTypeMatch) {
    const rawType = normalizeText(changeTypeMatch[2]).replace(/\s+/g, '_');
    return {
      intent: 'account.update',
      entity: 'account',
      operation: 'update',
      confidence: 0.74,
      fields: {
        account: {
          type: rawType === 'mobile_banking' || rawType === 'credit_card' ? rawType : rawType as 'cash' | 'bank' | 'loan',
        },
      },
      missingFields: ['account.id'],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  return null;
}

function parseSimpleCategoryText(text: string): Awaited<ReturnType<typeof parseWithOpenAI>> | null {
  const raw = text.trim();
  if (!raw) return null;

  const addMatch = raw.match(/(?:create|add)\s+(?:an?\s+)?(expense|income)\s+category(?:\s+called|\s+named)?\s+(.+)$/i);
  if (addMatch) {
    return {
      intent: 'category.add',
      entity: 'category',
      operation: 'add',
      confidence: 0.8,
      fields: {
        category: {
          type: normalizeText(addMatch[1]) as 'income' | 'expense',
          name: addMatch[2]?.trim(),
        },
      },
      missingFields: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const renameMatch = raw.match(/rename\s+(?:the\s+)?(.+?)\s+category\s+to\s+(.+)$/i);
  if (renameMatch) {
    return {
      intent: 'category.update',
      entity: 'category',
      operation: 'update',
      confidence: 0.78,
      fields: {
        category: {
          name: renameMatch[2]?.trim(),
        },
      },
      missingFields: ['category.id'],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  return null;
}

function parseSimpleBudgetText(text: string, nowIso: string): Awaited<ReturnType<typeof parseWithOpenAI>> | null {
  const raw = text.trim();
  if (!raw) return null;

  const addMatch = raw.match(/set\s+(?:a\s+)?(monthly|weekly|yearly)\s+budget\s+of\s+(\d+(?:[.,]\d+)?)\s+(?:for|on)\s+(.+)$/i);
  if (addMatch) {
    return {
      intent: 'budget.add',
      entity: 'budget',
      operation: 'add',
      confidence: 0.82,
      fields: {
        budget: {
          period: normalizeText(addMatch[1]) as 'monthly' | 'weekly' | 'yearly',
          amount: Number(addMatch[2].replace(/,/g, '')),
          categoryName: addMatch[3]?.trim(),
          month: new Date(nowIso).toISOString().slice(0, 7),
        },
      },
      missingFields: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const updateMatch = raw.match(/update\s+(?:my\s+)?(.+?)\s+budget\s+to\s+(\d+(?:[.,]\d+)?)$/i);
  if (updateMatch) {
    return {
      intent: 'budget.update',
      entity: 'budget',
      operation: 'update',
      confidence: 0.78,
      fields: {
        budget: {
          amount: Number(updateMatch[2].replace(/,/g, '')),
          categoryName: updateMatch[1]?.trim(),
          month: new Date(nowIso).toISOString().slice(0, 7),
        },
      },
      missingFields: ['budget.id'],
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();
  if (!isFirebaseAdminConfigured) return misconfigured();

  const accessState = await getUserAiAccessState(userId);
  if (!accessState.enabled) {
    return NextResponse.json(
      { error: accessState.blockedReason === 'trial_exhausted' ? 'Free trial ended' : 'AI assistant access not enabled', access: accessState },
      { status: 403 },
    );
  }

  const { allowed, reason, usage } = await assertWithinTokenLimit(userId);
  if (!allowed) {
    return NextResponse.json({ error: reason, usage }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const input = assistantParseRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: 'Invalid request', issues: input.error.issues }, { status: 400 });
  }

  const timezone = input.data.timezone ?? 'UTC';
  const nowIso = input.data.nowIso ?? new Date().toISOString();

  const requestId = crypto.randomUUID();
  const model = process.env.OPENAI_MODEL || 'gpt-5-nano';

  let parsed: Awaited<ReturnType<typeof parseWithOpenAI>>;
  let usageStatus: 'success' | 'error' | 'fallback' = 'success';
  try {
    parsed = await parseWithOpenAI({
      text: input.data.text,
      locale: input.data.locale,
      timezone,
      nowIso,
    });
  } catch (error) {
    const heuristic =
      parseSimpleTransactionText(input.data.text, nowIso) ??
      parseSimpleBudgetText(input.data.text, nowIso) ??
      parseSimpleCategoryText(input.data.text) ??
      parseSimpleAccountText(input.data.text);
    if (heuristic) {
      parsed = heuristic;
      usageStatus = 'fallback';
    } else {
      usageStatus = 'error';
      // Record failed attempt
      recordAiUsage({
        userId,
        model,
        provider: 'openai',
        feature: 'assistant_parse',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requestId,
        status: 'error',
        entitlementTypeAtRequest: accessState.entitlementType,
        bucketType: accessState.entitlementType === 'trial' ? 'trial' : 'monthly',
      }).catch(() => {});
      const reason = error instanceof Error ? error.message : 'Unable to parse request';
      return NextResponse.json(fallbackParseResult(input.data.text, reason));
    }
  }

  // Record usage after successful parse
  recordAiUsage({
    userId,
    model,
    provider: 'openai',
    feature: 'assistant_parse',
    inputTokens: parsed.tokenUsage?.inputTokens ?? 0,
    outputTokens: parsed.tokenUsage?.outputTokens ?? 0,
    totalTokens: parsed.tokenUsage?.totalTokens ?? 0,
    requestId,
    status: usageStatus,
    entitlementTypeAtRequest: accessState.entitlementType,
    bucketType: accessState.entitlementType === 'trial' ? 'trial' : 'monthly',
  }).catch(() => {});

  const userDoc = adminDb!.collection('users').doc(userId);
  const [accountsSnap, categoriesSnap, budgetsSnap, transactionsSnap] = await Promise.all([
    userDoc.collection('accounts').get(),
    userDoc.collection('categories').get(),
    userDoc.collection('budgets').get(),
    userDoc.collection('transactions').limit(200).get(),
  ]);

  const accounts: UserEntity[] = accountsSnap.docs.map((doc) => {
    const data = doc.data() as { name?: string; type?: string };
    return { id: doc.id, name: data.name, type: data.type };
  });
  const categories: UserEntity[] = categoriesSnap.docs.map((doc) => {
    const data = doc.data() as { name?: string; type?: string };
    return { id: doc.id, name: data.name, type: data.type };
  });
  const budgets: UserEntity[] = budgetsSnap.docs.map((doc) => {
    const data = doc.data() as { categoryName?: string; period?: string };
    return { id: doc.id, name: data.categoryName, type: data.period };
  });
  const transactions: UserEntity[] = transactionsSnap.docs.map((doc) => {
    const data = doc.data() as { description?: string };
    return { id: doc.id, description: data.description };
  });

  const resolutions: Array<ReturnType<typeof assistantResolutionSchema.parse>> = [];
  const ambiguities: Array<ReturnType<typeof assistantResolutionSchema.parse>> = [];
  const missingFields = [...parsed.missingFields];

  const resolveByName = (args: {
    key: string;
    query?: string;
    options: Array<{ id: string; name?: string; subtitle?: string }>;
  }) => {
    const query = normalizeText(args.query);
    if (!query) {
      const missing = assistantResolutionSchema.parse({
        key: args.key,
        status: 'missing',
        query: args.query,
        options: [],
      });
      resolutions.push(missing);
      if (!missingFields.includes(args.key)) missingFields.push(args.key);
      return undefined;
    }

    const exact = args.options.filter((option) => normalizeText(option.name) === query);
    if (exact.length === 1) {
      const resolved = assistantResolutionSchema.parse({
        key: args.key,
        status: 'resolved',
        query: args.query,
        resolvedId: exact[0].id,
        options: [],
      });
      resolutions.push(resolved);
      return exact[0].id;
    }

    const fuzzy = args.options.filter((option) => {
      const name = normalizeText(option.name);
      return name.includes(query) || query.includes(name);
    });
    if (fuzzy.length === 1) {
      const resolved = assistantResolutionSchema.parse({
        key: args.key,
        status: 'resolved',
        query: args.query,
        resolvedId: fuzzy[0].id,
        options: [],
      });
      resolutions.push(resolved);
      return fuzzy[0].id;
    }

    if (fuzzy.length > 1 || exact.length > 1) {
      const ambiguous = assistantResolutionSchema.parse({
        key: args.key,
        status: 'ambiguous',
        query: args.query,
        options: (fuzzy.length > 0 ? fuzzy : exact).map((option) => ({
          id: option.id,
          name: option.name ?? option.id,
          subtitle: option.subtitle,
        })),
      });
      resolutions.push(ambiguous);
      ambiguities.push(ambiguous);
      if (!missingFields.includes(args.key)) missingFields.push(args.key);
      return undefined;
    }

    const missing = assistantResolutionSchema.parse({
      key: args.key,
      status: 'missing',
      query: args.query,
      options: [],
    });
    resolutions.push(missing);
    if (!missingFields.includes(args.key)) missingFields.push(args.key);
    return undefined;
  };

  const fields = { ...parsed.fields };
  if (fields.transaction) {
    fields.transaction = { ...fields.transaction };
    if (!fields.transaction.accountId) {
      const accountId = resolveByName({
        key: 'transaction.accountId',
        query: fields.transaction.accountName,
        options: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          subtitle: account.type,
        })),
      });
      if (accountId) fields.transaction.accountId = accountId;
    }

    if (!fields.transaction.categoryId) {
      if (fields.transaction.type === 'transfer') {
        fields.transaction.categoryId = 'transfer';
        fields.transaction.categoryName = 'Transfer';
      } else {
        const categoryId = resolveByName({
          key: 'transaction.categoryId',
          query: fields.transaction.categoryName,
          options: categories.map((category) => ({
            id: category.id,
            name: category.name,
            subtitle: category.type,
          })),
        });
        if (categoryId) fields.transaction.categoryId = categoryId;
      }
    }

    if (!fields.transaction.transferAccountId && fields.transaction.type === 'transfer') {
      const transferAccountId = resolveByName({
        key: 'transaction.transferAccountId',
        query: fields.transaction.transferAccountName,
        options: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          subtitle: account.type,
        })),
      });
      if (transferAccountId) fields.transaction.transferAccountId = transferAccountId;
    }

    if (parsed.intent === 'transaction.update' && !fields.transaction.id) {
      const txId = resolveByName({
        key: 'transaction.id',
        query: fields.transaction.description,
        options: transactions.map((transaction) => ({
          id: transaction.id,
          name: transaction.description,
        })),
      });
      if (txId) fields.transaction.id = txId;
    }

    if (!fields.transaction.dateIso) {
      if (fields.transaction.relativeDate === 'yesterday') {
        const dt = new Date(nowIso);
        dt.setDate(dt.getDate() - 1);
        fields.transaction.dateIso = dt.toISOString();
      } else {
        fields.transaction.dateIso = new Date(nowIso).toISOString();
      }
    }
  }

  if (fields.budget) {
    fields.budget = { ...fields.budget };
    if (!fields.budget.categoryId) {
      const categoryId = resolveByName({
        key: 'budget.categoryId',
        query: fields.budget.categoryName,
        options: categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      });
      if (categoryId) fields.budget.categoryId = categoryId;
    }

    if (!fields.budget.month) {
      fields.budget.month = new Date(nowIso).toISOString().slice(0, 7);
    }
  }

  if (fields.account) {
    fields.account = { ...fields.account };
    if (!fields.account.id && parsed.intent === 'account.update') {
      const accountQuery = extractAccountTargetName(input.data.text) ?? fields.account.name ?? input.data.text;
      const accountId = resolveByName({
        key: 'account.id',
        query: accountQuery,
        options: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          subtitle: account.type,
        })),
      });
      if (accountId) fields.account.id = accountId;
    }
  }

  if (fields.category) {
    fields.category = { ...fields.category };
    if (!fields.category.id && parsed.intent === 'category.update') {
      const categoryQuery = extractCategoryTargetName(input.data.text) ?? fields.category.name ?? input.data.text;
      const categoryId = resolveByName({
        key: 'category.id',
        query: categoryQuery,
        options: categories.map((category) => ({
          id: category.id,
          name: category.name,
          subtitle: category.type,
        })),
      });
      if (categoryId) fields.category.id = categoryId;
    }
  }

  // For add operations, ensure required fields are present and remove irrelevant missingFields
  if (parsed.intent === 'account.add') {
    if (!fields.account) fields.account = {};
    // id is not required for add — remove it from missingFields
    const idx = missingFields.indexOf('account.id');
    if (idx !== -1) missingFields.splice(idx, 1);
    // Only name and type are required
    if (!fields.account.name && !missingFields.includes('account.name')) missingFields.push('account.name');
    if (!fields.account.type && !missingFields.includes('account.type')) missingFields.push('account.type');
  }

  if (parsed.intent === 'category.add') {
    if (!fields.category) fields.category = {};
    const idx = missingFields.indexOf('category.id');
    if (idx !== -1) missingFields.splice(idx, 1);
    // Only name and type are required
    if (!fields.category.name && !missingFields.includes('category.name')) missingFields.push('category.name');
    if (!fields.category.type && !missingFields.includes('category.type')) missingFields.push('category.type');
  }

  if (parsed.intent === 'account.update') {
    if (!fields.account) fields.account = {};
    if (!fields.account.id && !missingFields.includes('account.id')) missingFields.push('account.id');
    const hasUpdateValue =
      Boolean(fields.account.name) ||
      Boolean(fields.account.type) ||
      Boolean(fields.account.currency) ||
      Boolean(fields.account.color) ||
      Boolean(fields.account.icon);
    if (!hasUpdateValue && !missingFields.includes('account.name')) missingFields.push('account.name');
  }

  if (parsed.intent === 'category.update') {
    if (!fields.category) fields.category = {};
    if (!fields.category.id && !missingFields.includes('category.id')) missingFields.push('category.id');
    const hasUpdateValue =
      Boolean(fields.category.name) ||
      Boolean(fields.category.type) ||
      Boolean(fields.category.color) ||
      Boolean(fields.category.icon);
    if (!hasUpdateValue && !missingFields.includes('category.name')) missingFields.push('category.name');
  }

  if (parsed.intent === 'budget.add') {
    if (!fields.budget) fields.budget = {};
    const idx = missingFields.indexOf('budget.id');
    if (idx !== -1) missingFields.splice(idx, 1);
    if (!fields.budget.categoryId && !missingFields.includes('budget.categoryId')) missingFields.push('budget.categoryId');
    if (!fields.budget.amount && !missingFields.includes('budget.amount')) missingFields.push('budget.amount');
    if (!fields.budget.period) fields.budget.period = 'monthly';
    if (!fields.budget.month) fields.budget.month = new Date(nowIso).toISOString().slice(0, 7);
  }

  if (parsed.intent === 'budget.update') {
    if (!fields.budget) fields.budget = {};
    if (!fields.budget.id && !fields.budget.categoryId && !missingFields.includes('budget.id')) missingFields.push('budget.id');
    if (fields.budget.categoryName && !fields.budget.categoryId) {
      const categoryId = resolveByName({
        key: 'budget.categoryId',
        query: fields.budget.categoryName,
        options: categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      });
      if (categoryId) fields.budget.categoryId = categoryId;
    }
    if (!fields.budget.amount && !missingFields.includes('budget.amount')) missingFields.push('budget.amount');
    if (!fields.budget.month) fields.budget.month = new Date(nowIso).toISOString().slice(0, 7);
  }

  // For update/delete, validate IDs exist
  if (parsed.operation !== 'add') {
    if (fields.account?.id) {
      const exists = accounts.some((account) => account.id === fields.account!.id);
      if (!exists && !missingFields.includes('account.id')) missingFields.push('account.id');
    }

    if (fields.category?.id) {
      const exists = categories.some((category) => category.id === fields.category!.id);
      if (!exists && !missingFields.includes('category.id')) missingFields.push('category.id');
    }

    if (fields.budget?.id) {
      const exists = budgets.some((budget) => budget.id === fields.budget!.id);
      if (!exists && !missingFields.includes('budget.id')) missingFields.push('budget.id');
    }
  }

  // Remove any stale 'clarification' missingField that shouldn't be here
  const clarIdx = missingFields.indexOf('clarification');
  if (clarIdx !== -1 && parsed.confidence > 0) missingFields.splice(clarIdx, 1);

  const [intentEntity] = parsed.intent.split('.') as ['transaction' | 'account' | 'category' | 'budget', 'add' | 'update'];
  const cleanedFields = {
    transaction: intentEntity === 'transaction' ? fields.transaction : undefined,
    account: intentEntity === 'account' ? fields.account : undefined,
    category: intentEntity === 'category' ? fields.category : undefined,
    budget: intentEntity === 'budget' ? fields.budget : undefined,
  };
  const cleanedMissingFields = keepOnlyRelevantIntentData(
    parsed.intent,
    Array.from(new Set(missingFields)).map((key) => ({ key })),
  ).map((item) => item.key);
  const cleanedAmbiguities = keepOnlyRelevantIntentData(parsed.intent, ambiguities);
  const cleanedResolutions = keepOnlyRelevantIntentData(parsed.intent, resolutions);

  const result = assistantParseResultSchema.parse({
    intent: parsed.intent,
    entity: parsed.entity,
    operation: parsed.operation,
    confidence: parsed.confidence,
    fields: cleanedFields,
    missingFields: cleanedMissingFields,
    ambiguities: cleanedAmbiguities,
    resolutions: cleanedResolutions,
    requiresConfirmation: true,
    originalText: input.data.text,
  });

  return NextResponse.json(result);
}
