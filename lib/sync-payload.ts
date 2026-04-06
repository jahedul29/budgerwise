import type { Account, Budget, Category, Transaction } from '@/types';

export type SyncableTable = 'transactions' | 'categories' | 'budgets' | 'accounts';

export type SyncRecord = Transaction | Category | Budget | Account;

export type SyncPushPayload = {
  changes: Record<SyncableTable, {
    create: SyncRecord[];
    update: SyncRecord[];
    delete: string[];
  }>;
};

export type SyncPullPayload = {
  data: Record<SyncableTable, SyncRecord[]>;
};

export function normalizeRecordForServer<T extends SyncRecord>(record: T): T {
  const normalized = { ...record } as Record<string, unknown>;

  for (const field of ['date', 'createdAt', 'updatedAt'] as const) {
    const value = normalized[field];
    if (value instanceof Date) {
      normalized[field] = value.toISOString();
    }
  }

  delete normalized._syncStatus;
  return normalized as T;
}

export function normalizeRecordForClient<T extends SyncRecord>(record: Record<string, unknown>) {
  const normalized = { ...record } as Record<string, unknown>;

  for (const field of ['date', 'createdAt', 'updatedAt'] as const) {
    const value = normalized[field];
    if (typeof value === 'string') {
      normalized[field] = new Date(value);
    }
  }

  normalized._syncStatus = 'synced';
  if ('syncStatus' in normalized) {
    normalized.syncStatus = 'synced';
  }

  return normalized as T;
}
