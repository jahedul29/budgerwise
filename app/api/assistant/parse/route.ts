import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { parseWithOpenAI } from '@/lib/assistant/openai-parser';
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

  let intent: 'transaction.add' | null = null;
  let type: 'expense' | 'income' | undefined;
  if (expenseSignals.some((token) => normalized.includes(token))) {
    intent = 'transaction.add';
    type = 'expense';
  } else if (incomeSignals.some((token) => normalized.includes(token))) {
    intent = 'transaction.add';
    type = 'income';
  }

  if (!intent) return null;

  const amountMatch = raw.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(',', '')) : undefined;

  const accountMatch = raw.match(/from\s+(?:my\s+)?(.+?)\s+account/i);
  const accountName = accountMatch?.[1]?.trim();

  const categoryMatch = raw.match(/(?:on|for)\s+(.+?)(?:\s+from\s+|\s+and\s+this\s+is\s+|\s+this\s+is\s+|$)/i);
  const categoryRaw = categoryMatch?.[1]?.trim();
  const categoryName = categoryRaw ? categoryRaw.replace(/\b(items?|expense|expenses)\b/gi, '').trim() : undefined;

  const noteMatch = raw.match(/(?:this is|it is)\s+for\s+(.+)$/i);
  const notes = noteMatch?.[1]?.trim();

  const missingFields: string[] = [];
  if (!amount || Number.isNaN(amount)) missingFields.push('transaction.amount');
  if (!type) missingFields.push('transaction.type');
  if (!accountName) missingFields.push('transaction.accountId');
  if (!categoryName) missingFields.push('transaction.categoryId');

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
        categoryName,
        paymentMethod: accountName && normalizeText(accountName).includes('cash') ? 'cash' : undefined,
        dateMode: 'relative',
        relativeDate: 'today',
        dateIso: nowIso,
        description: notes ? `Expense for ${notes}` : `Expense on ${categoryName ?? 'category'}`,
        notes: notes ?? raw,
      },
    },
    missingFields,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();
  if (!isFirebaseAdminConfigured) return misconfigured();

  // Check AI access
  const accessDoc = await adminDb!.collection('users').doc(userId).get();
  if (!accessDoc.exists || !accessDoc.data()?.aiAssistantEnabled) {
    return NextResponse.json({ error: 'AI assistant access not enabled' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const input = assistantParseRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: 'Invalid request', issues: input.error.issues }, { status: 400 });
  }

  const timezone = input.data.timezone ?? 'UTC';
  const nowIso = input.data.nowIso ?? new Date().toISOString();

  let parsed: Awaited<ReturnType<typeof parseWithOpenAI>>;
  try {
    parsed = await parseWithOpenAI({
      text: input.data.text,
      locale: input.data.locale,
      timezone,
      nowIso,
    });
  } catch (error) {
    const heuristic = parseSimpleTransactionText(input.data.text, nowIso);
    if (heuristic) {
      parsed = heuristic;
    } else {
      const reason = error instanceof Error ? error.message : 'Unable to parse request';
      return NextResponse.json(fallbackParseResult(input.data.text, reason));
    }
  }

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

    if ((parsed.intent === 'transaction.update' || parsed.intent === 'transaction.delete') && !fields.transaction.id) {
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

  if (parsed.intent === 'budget.add') {
    if (!fields.budget) fields.budget = {};
    const idx = missingFields.indexOf('budget.id');
    if (idx !== -1) missingFields.splice(idx, 1);
    if (!fields.budget.categoryId && !missingFields.includes('budget.categoryId')) missingFields.push('budget.categoryId');
    if (!fields.budget.amount && !missingFields.includes('budget.amount')) missingFields.push('budget.amount');
    if (!fields.budget.period) fields.budget.period = 'monthly';
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

  const result = assistantParseResultSchema.parse({
    intent: parsed.intent,
    entity: parsed.entity,
    operation: parsed.operation,
    confidence: parsed.confidence,
    fields,
    missingFields: Array.from(new Set(missingFields)),
    ambiguities,
    resolutions,
    requiresConfirmation: true,
    originalText: input.data.text,
  });

  return NextResponse.json(result);
}
