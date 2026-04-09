export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_banking' | 'other';
export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
export type AccountType = 'cash' | 'mobile_banking' | 'bank' | 'credit_card' | 'loan';
export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type CategoryType = 'income' | 'expense';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  currency: string;
  createdAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  budgetAlerts: boolean;
  weeklySummary: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  isDefault: boolean;
  createdAt: Date;
  _syncStatus?: SyncStatus;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountId: string;
  description: string;
  notes?: string;
  date: Date;
  paymentMethod: PaymentMethod;
  tags: string[];
  isRecurring: boolean;
  recurringConfig?: {
    frequency: RecurringFrequency;
    endDate?: Date;
  };
  attachmentURL?: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
  _syncStatus?: SyncStatus;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: BudgetPeriod;
  month: string; // YYYY-MM
  alertThreshold: number;
  createdAt: Date;
  _syncStatus?: SyncStatus;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  createdAt: Date;
  _syncStatus?: SyncStatus;
}

/* ─── User Roles ─── */

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'user';

/* ─── AI Token Usage ─── */

export type AiUsageStatus = 'success' | 'error' | 'fallback';
export type AiFeature = 'assistant_parse' | 'assistant_chat' | 'voice_transcription';
export type AiEntitlementType = 'locked' | 'trial' | 'full';
export type AiUsageBucketType = 'trial' | 'monthly';

export interface AiGlobalSettings {
  defaultMonthlyTokenLimit: number;
  defaultTrialTokenLimit: number;
  defaultAiHardStop: boolean;
  trialEnabled?: boolean;
  /** Manually entered from OpenAI dashboard for cross-check */
  openaiReportedTokens?: number | null;
  openaiReportedMonth?: string | null;
}

export interface AiUsageLedgerEntry {
  id?: string;
  userId: string;
  timestamp: string;
  month: string; // YYYY-MM
  model: string;
  provider: string;
  feature: AiFeature;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestId: string;
  status: AiUsageStatus;
  entitlementTypeAtRequest?: AiEntitlementType;
  bucketType?: AiUsageBucketType;
}

export interface AiUsageMonthlyAggregate {
  userId: string;
  month: string; // YYYY-MM
  inputTokensUsed: number;
  outputTokensUsed: number;
  totalTokensUsed: number;
  requestCount: number;
  lastUsedAt: string;
}

export interface AiUsageSummary {
  totalTokensUsed: number;
  /** null when isUnlimited is true */
  tokenLimit: number | null;
  /** null when isUnlimited is true */
  remaining: number | null;
  /** 0-1 decimal (e.g. 0.75 = 75%). 0 when unlimited. */
  usagePercent: number;
  requestCount: number;
  lastUsedAt?: string;
  isUnlimited: boolean;
  isCustomLimit: boolean;
  hardStopEnabled: boolean;
  entitlementType?: AiEntitlementType;
  bucketType?: AiUsageBucketType | null;
  blockedReason?: 'locked' | 'trial_exhausted' | 'monthly_limit_reached' | null;
  trialAvailable?: boolean;
  trialStartedAt?: string | null;
  trialConsumedAt?: string | null;
}

export interface AiAssistantAccessState {
  enabled: boolean;
  launcherVisible: boolean;
  entitlementType: AiEntitlementType;
  trialAvailable: boolean;
  trialStartedAt?: string | null;
  trialConsumedAt?: string | null;
  trialTokenLimit?: number | null;
  trialTokensUsed?: number;
  trialRemaining?: number | null;
  blockedReason?: 'locked' | 'trial_exhausted' | 'monthly_limit_reached' | null;
  usage?: AiUsageSummary | null;
  trialEnabled?: boolean;
}
