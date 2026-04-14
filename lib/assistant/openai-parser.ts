import { z } from 'zod';
import {
  assistantIntentSchema,
  assistantLLMParseSchema,
  type AssistantIntent,
} from './schemas';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5-nano';

function intentEntityOperation(intent: AssistantIntent) {
  const [entity, operation] = intent.split('.') as [string, string];
  return { entity, operation };
}

function extractJson(text: string) {
  const raw = text.trim();
  if (raw.startsWith('{') && raw.endsWith('}')) return raw;

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw;
}

const openAIResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().optional(),
    }),
  })).min(1),
});

function extractUsage(raw: Record<string, unknown>): OpenAITokenUsage {
  const usage = raw?.usage as Record<string, unknown> | undefined;
  if (!usage || typeof usage !== 'object') {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  // Handle both legacy (prompt_tokens/completion_tokens) and new (input_tokens/output_tokens)
  const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0;
  const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0;
  const totalTokens = Number(usage.total_tokens ?? 0) || (inputTokens + outputTokens);

  return { inputTokens, outputTokens, totalTokens };
}

export interface OpenAITokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export async function parseWithOpenAI(params: {
  text: string;
  locale?: string;
  timezone?: string;
  nowIso: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const systemPrompt = [
    'You are an assistant that converts natural language finance commands to strict JSON.',
    'The user may write in any language. Normalize to the expected enum values.',
    'Only output JSON, no markdown.',
    'Infer intent among:',
    '- transaction.add/update',
    '- account.add/update',
    '- category.add/update',
    '- budget.add/update',
    'Deletion is not supported by this assistant. Never return any *.delete intent.',
    'If unknown, choose the closest valid intent and add missingFields.',
    'For transaction add:',
    '- map spent/paid/bought to expense',
    '- phrases like "add 50000 taka to my cash account", "deposit 50000 to cash account", or "put 50000 into cash account" mean transaction.add with type="income", not account.update',
    '- phrases like "transfer 500 from cash to bank" mean transaction.add with type="transfer", with accountName as the source and transferAccountName as the destination',
    '- parse relative dates (today/yesterday/now)',
    '- keep free text as notes/description',
    'For account commands:',
    '- "add a bank account called savings" means account.add',
    '- "rename my cash account to wallet" means account.update',
    '- account.update may change only non-balance properties like name, type, icon, color, currency',
    'For category commands:',
    '- "create an expense category called groceries" means category.add',
    '- "rename groceries category to food" means category.update',
    'For budget commands:',
    '- "set a monthly budget of 5000 for food" means budget.add',
    '- "update my food budget to 7000" means budget.update',
    'Do not use account.update for balance changes. Account balances change through transactions only.',
  ].join('\n');

  const userPrompt = JSON.stringify({
    locale: params.locale ?? null,
    timezone: params.timezone ?? 'UTC',
    nowIso: params.nowIso,
    text: params.text,
      outputSchema: {
      intent: 'transaction.add|transaction.update|account.add|account.update|category.add|category.update|budget.add|budget.update',
      confidence: '0..1',
      fields: {
        transaction: {
          id: 'optional',
          amount: 'optional number',
          type: 'income|expense|transfer optional',
          categoryName: 'optional',
          accountName: 'optional',
          transferAccountName: 'optional',
          dateMode: 'absolute|relative optional',
          relativeDate: 'today|yesterday|now optional',
          dateIso: 'optional',
          description: 'optional',
          notes: 'optional',
        },
        account: {
          id: 'optional',
          name: 'optional',
          type: 'cash|mobile_banking|bank|credit_card|loan optional',
          currency: 'optional',
          color: 'optional',
          icon: 'optional',
        },
        category: {
          id: 'optional',
          name: 'optional',
          icon: 'optional',
          color: 'optional',
          type: 'income|expense optional',
        },
        budget: {
          id: 'optional',
          categoryName: 'optional',
          amount: 'optional number',
          period: 'monthly|weekly|yearly optional',
          month: 'optional yyyy-mm',
          alertThreshold: 'optional number 1-100',
        },
      },
      missingFields: ['string'],
    },
  });

  const run = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`OpenAI parse failed (${response.status}): ${err}`);
      }

      const rawJson = await response.json();
      const payload = openAIResponseSchema.parse(rawJson);
      const content = payload.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(extractJson(content));
      const normalized = assistantLLMParseSchema.parse(parsed);
      const intent = assistantIntentSchema.parse(normalized.intent);
      const { entity, operation } = intentEntityOperation(intent);

      const tokenUsage = extractUsage(rawJson as Record<string, unknown>);

      return {
        intent,
        entity,
        operation,
        confidence: normalized.confidence,
        fields: normalized.fields,
        missingFields: normalized.missingFields,
        tokenUsage,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await run();
  } catch {
    // Single retry for idempotent parse calls — fresh AbortController per attempt.
    return await run();
  }
}
