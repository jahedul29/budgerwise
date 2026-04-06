import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["income", "expense", "transfer"]),
  categoryId: z.string().min(1, "Category is required"),
  categoryName: z.string(),
  categoryIcon: z.string(),
  categoryColor: z.string(),
  accountId: z.string().min(1, "Account is required"),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  date: z.date(),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "mobile_banking", "other"]),
  tags: z.array(z.string()),
  isRecurring: z.boolean(),
  recurringConfig: z.object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    endDate: z.date().optional(),
  }).optional(),
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  categoryName: z.string(),
  amount: z.number().positive("Budget amount must be positive"),
  period: z.enum(["monthly", "weekly", "yearly"]),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format"),
  alertThreshold: z.number().min(1).max(100),
});

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["cash", "mobile_banking", "bank", "credit_card"]),
  balance: z.number(),
  currency: z.string().min(1),
  color: z.string(),
  icon: z.string(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  type: z.enum(["income", "expense"]),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type AccountFormData = z.infer<typeof accountSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
