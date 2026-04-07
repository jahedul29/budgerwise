import { z } from 'zod';

export const assistantEntitySchema = z.enum(['transaction', 'account', 'category', 'budget']);
export const assistantOperationSchema = z.enum(['add', 'update', 'delete']);

export const assistantIntentSchema = z.enum([
  'transaction.add',
  'transaction.update',
  'transaction.delete',
  'account.add',
  'account.update',
  'account.delete',
  'category.add',
  'category.update',
  'category.delete',
  'budget.add',
  'budget.update',
  'budget.delete',
]);

export const assistantDateRefModeSchema = z.enum(['absolute', 'relative']);
export const assistantRelativeDateSchema = z.enum(['today', 'yesterday', 'now']);

export const assistantTransactionDraftSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  accountId: z.string().optional(),
  accountName: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'mobile_banking', 'other']).optional(),
  dateMode: assistantDateRefModeSchema.default('relative').optional(),
  relativeDate: assistantRelativeDateSchema.optional(),
  dateIso: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const assistantAccountDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['cash', 'mobile_banking', 'bank', 'credit_card', 'loan']).optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const assistantCategoryDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
});

export const assistantBudgetDraftSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  amount: z.number().positive().optional(),
  period: z.enum(['monthly', 'weekly', 'yearly']).optional(),
  month: z.string().optional(),
  alertThreshold: z.number().min(1).max(100).optional(),
});

export const assistantResolutionOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string().optional(),
});

export const assistantResolutionSchema = z.object({
  key: z.string(),
  status: z.enum(['resolved', 'ambiguous', 'missing']),
  query: z.string().optional(),
  resolvedId: z.string().optional(),
  options: z.array(assistantResolutionOptionSchema).default([]),
});

export const assistantParseRequestSchema = z.object({
  text: z.string().min(1),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  nowIso: z.string().optional(),
});

export const assistantLLMParseSchema = z.object({
  intent: assistantIntentSchema,
  confidence: z.number().min(0).max(1).default(0.5),
  fields: z.object({
    transaction: assistantTransactionDraftSchema.optional(),
    account: assistantAccountDraftSchema.optional(),
    category: assistantCategoryDraftSchema.optional(),
    budget: assistantBudgetDraftSchema.optional(),
  }).default({}),
  missingFields: z.array(z.string()).default([]),
});

export const assistantParseResultSchema = z.object({
  intent: assistantIntentSchema,
  entity: assistantEntitySchema,
  operation: assistantOperationSchema,
  confidence: z.number().min(0).max(1),
  fields: z.object({
    transaction: assistantTransactionDraftSchema.optional(),
    account: assistantAccountDraftSchema.optional(),
    category: assistantCategoryDraftSchema.optional(),
    budget: assistantBudgetDraftSchema.optional(),
  }).default({}),
  missingFields: z.array(z.string()).default([]),
  ambiguities: z.array(assistantResolutionSchema).default([]),
  resolutions: z.array(assistantResolutionSchema).default([]),
  requiresConfirmation: z.boolean().default(true),
  originalText: z.string(),
});

export const assistantExecuteRequestSchema = z.object({
  intent: assistantIntentSchema,
  fields: z.object({
    transaction: assistantTransactionDraftSchema.optional(),
    account: assistantAccountDraftSchema.optional(),
    category: assistantCategoryDraftSchema.optional(),
    budget: assistantBudgetDraftSchema.optional(),
  }),
  confirmed: z.boolean(),
});

export const assistantExecuteResultSchema = z.object({
  ok: z.boolean(),
  entity: assistantEntitySchema,
  operation: assistantOperationSchema,
  message: z.string(),
  affectedIds: z.array(z.string()).default([]),
});

export type AssistantIntent = z.infer<typeof assistantIntentSchema>;
export type AssistantParseRequest = z.infer<typeof assistantParseRequestSchema>;
export type AssistantParseResult = z.infer<typeof assistantParseResultSchema>;
export type AssistantExecuteRequest = z.infer<typeof assistantExecuteRequestSchema>;
export type AssistantExecuteResult = z.infer<typeof assistantExecuteResultSchema>;
