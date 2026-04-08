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
    '- transaction.add/update/delete',
    '- account.add/update/delete',
    '- category.add/update/delete',
    '- budget.add/update/delete',
    'If unknown, choose the closest valid intent and add missingFields.',
    'For transaction add:',
    '- map spent/paid/bought to expense',
    '- infer paymentMethod when explicit (cash/card/bank_transfer/mobile_banking/other)',
    '- parse relative dates (today/yesterday/now)',
    '- keep free text as notes/description',
  ].join('\n');

  const userPrompt = JSON.stringify({
    locale: params.locale ?? null,
    timezone: params.timezone ?? 'UTC',
    nowIso: params.nowIso,
    text: params.text,
    outputSchema: {
      intent: 'transaction.add|transaction.update|transaction.delete|account.add|account.update|account.delete|category.add|category.update|category.delete|budget.add|budget.update|budget.delete',
      confidence: '0..1',
      fields: {
        transaction: {
          id: 'optional',
          amount: 'optional number',
          type: 'income|expense|transfer optional',
          categoryName: 'optional',
          accountName: 'optional',
          paymentMethod: 'cash|card|bank_transfer|mobile_banking|other optional',
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
          balance: 'optional number',
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
