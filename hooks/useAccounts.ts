'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { localDb } from '@/lib/dexie';
import { generateId } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import type { Account } from '@/types';
import { useStableUser } from './useStableUser';

type PreferencesResponse = {
  preferences?: {
    accountsSeeded?: boolean;
  };
};

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, lastSyncTime, syncStatus, syncNow } = useUIStore();
  const { userId } = useStableUser();
  const seedCheckedUserRef = useRef<string | null>(null);

  const createDefaultAccounts = useCallback((): Account[] => {
    const now = new Date();
    return [
      {
        id: 'default-account-cash',
        name: 'Cash',
        type: 'cash',
        balance: 0,
        currency: 'BDT',
        color: '#10B981',
        icon: '💵',
        createdAt: now,
        _syncStatus: 'pending_create',
      },
      {
        id: 'default-account-bank',
        name: 'Bank',
        type: 'bank',
        balance: 0,
        currency: 'BDT',
        color: '#3B82F6',
        icon: '🏦',
        createdAt: now,
        _syncStatus: 'pending_create',
      },
      {
        id: 'default-account-loan',
        name: 'Loan',
        type: 'loan',
        balance: 0,
        currency: 'BDT',
        color: '#F59E0B',
        icon: '📉',
        createdAt: now,
        _syncStatus: 'pending_create',
      },
    ];
  }, []);

  const ensureSeededDefaults = useCallback(async (): Promise<Account[]> => {
    if (!userId) {
      return [];
    }

    if (seedCheckedUserRef.current === userId) {
      return [];
    }

    const response = await fetch('/api/preferences');
    const data = await response.json().catch(() => null) as PreferencesResponse | null;
    const isAlreadySeeded = Boolean(data?.preferences?.accountsSeeded);

    seedCheckedUserRef.current = userId;

    if (isAlreadySeeded) {
      return [];
    }

    const defaults = createDefaultAccounts();
    await localDb.accounts.bulkPut(defaults);

    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountsSeeded: true,
        accountsSeededAt: new Date().toISOString(),
      }),
    });

    if (syncNow && isOnline) {
      await syncNow();
    }

    return defaults;
  }, [createDefaultAccounts, isOnline, syncNow, userId]);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      let accs = await localDb.accounts
        .where('_syncStatus')
        .notEqual('pending_delete')
        .toArray();

      if (accs.length === 0) {
        const canInitializeDefaults = isOnline && Boolean(lastSyncTime) && syncStatus !== 'error';
        if (!canInitializeDefaults) {
          setAccounts([]);
          return;
        }

        const seeded = await ensureSeededDefaults();
        if (seeded.length > 0) {
          accs = seeded;
        }
      }

      setAccounts(accs);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, lastSyncTime, syncStatus, ensureSeededDefaults]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!userId) {
      seedCheckedUserRef.current = null;
      return;
    }
    if (seedCheckedUserRef.current !== userId) {
      seedCheckedUserRef.current = null;
    }
  }, [userId]);

  useEffect(() => {
    const handleSyncComplete = () => {
      loadAccounts();
    };

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
  }, [loadAccounts]);

  const notifyAccountsChanged = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT));
    }
  }, []);

  const addAccount = useCallback(async (data: Omit<Account, 'id' | 'createdAt' | '_syncStatus' | 'balance'>) => {
    const account: Account = {
      ...data,
      balance: 0,
      id: generateId(),
      createdAt: new Date(),
      _syncStatus: 'pending_create',
    };
    await localDb.accounts.add(account);
    setAccounts(prev => [...prev, account]);
    notifyAccountsChanged();
    return account;
  }, [notifyAccountsChanged]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    await localDb.accounts.update(id, { ...updates, _syncStatus: 'pending_update' });
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    notifyAccountsChanged();
  }, [notifyAccountsChanged]);

  const deleteAccount = useCallback(async (id: string) => {
    if (isOnline) {
      const response = await fetch(`/api/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to delete account from database');
      }
      await localDb.accounts.delete(id);
    } else {
      await localDb.accounts.update(id, { _syncStatus: 'pending_delete' });
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    notifyAccountsChanged();
  }, [isOnline, notifyAccountsChanged]);

  const updateBalance = useCallback(async (id: string, amount: number) => {
    const account = accounts.find(a => a.id === id);
    if (account) {
      const newBalance = account.balance + amount;
      await updateAccount(id, { balance: newBalance });
    }
  }, [accounts, updateAccount]);

  const getTotalBalance = useCallback(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  return {
    accounts,
    isLoading,
    addAccount,
    updateAccount,
    deleteAccount,
    updateBalance,
    getTotalBalance,
    reload: loadAccounts,
  };
}
