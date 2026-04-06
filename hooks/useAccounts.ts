'use client';
import { useState, useEffect, useCallback } from 'react';
import { localDb } from '@/lib/dexie';
import { generateId } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import type { Account, AccountType } from '@/types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, lastSyncTime, syncStatus } = useUIStore();

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      let accs = await localDb.accounts
        .where('_syncStatus')
        .notEqual('pending_delete')
        .toArray();

      if (accs.length === 0) {
        if (isOnline && !lastSyncTime && syncStatus !== 'error') {
          setAccounts([]);
          return;
        }

        const defaultAccount: Account = {
          id: generateId(),
          name: 'Cash',
          type: 'cash',
          balance: 0,
          currency: 'BDT',
          color: '#10B981',
          icon: '💵',
          createdAt: new Date(),
          _syncStatus: 'pending_create',
        };
        await localDb.accounts.add(defaultAccount);
        accs = [defaultAccount];
      }

      setAccounts(accs);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, lastSyncTime, syncStatus]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const handleSyncComplete = () => {
      loadAccounts();
    };

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
  }, [loadAccounts]);

  const addAccount = useCallback(async (data: Omit<Account, 'id' | 'createdAt' | '_syncStatus'>) => {
    const account: Account = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      _syncStatus: 'pending_create',
    };
    await localDb.accounts.add(account);
    setAccounts(prev => [...prev, account]);
    return account;
  }, []);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    await localDb.accounts.update(id, { ...updates, _syncStatus: 'pending_update' });
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    await localDb.accounts.update(id, { _syncStatus: 'pending_delete' });
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

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
