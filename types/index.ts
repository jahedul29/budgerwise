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
