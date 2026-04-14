'use client';
import { useEffect, useCallback } from 'react';
import { useTransactionStore } from '@/store/transactionStore';
import { localDb } from '@/lib/dexie';
import { generateId } from '@/lib/utils';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import type { Transaction } from '@/types';

export function useTransactions() {
  const store = useTransactionStore();

  const loadTransactions = useCallback(async () => {
    store.setLoading(true);
    try {
      const transactions = await localDb.transactions
        .where('_syncStatus')
        .notEqual('pending_delete')
        .toArray();
      store.setTransactions(transactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      store.setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    const handleSyncComplete = () => {
      loadTransactions();
    };

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
  }, [loadTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | '_syncStatus'>) => {
    const now = new Date();
    const transaction: Transaction = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_create',
      _syncStatus: 'pending_create',
    };
    await localDb.transactions.add(transaction);
    store.addTransaction(transaction);
    return transaction;
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const updatedFields = {
      ...updates,
      updatedAt: new Date(),
      _syncStatus: 'pending_update' as const,
      syncStatus: 'pending_update' as const,
    };
    await localDb.transactions.update(id, updatedFields);
    store.updateTransaction(id, updatedFields);
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await localDb.transactions.update(id, { _syncStatus: 'pending_delete' });
    store.removeTransaction(id);
  }, []);

  const getFilteredTransactions = useCallback(() => {
    let filtered = [...store.transactions];
    const { filter, sortBy } = store;

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    }

    if (filter.categories.length > 0) {
      filtered = filtered.filter(t => filter.categories.includes(t.categoryId));
    }
    if (filter.types.length > 0) {
      filtered = filtered.filter(t => filter.types.includes(t.type));
    }
    if (filter.accounts.length > 0) {
      filtered = filtered.filter(t => filter.accounts.includes(t.accountId));
    }
    if (filter.dateRange) {
      filtered = filtered.filter(t => {
        const date = new Date(t.date);
        return date >= filter.dateRange!.start && date <= filter.dateRange!.end;
      });
    }
    if (filter.amountRange) {
      filtered = filtered.filter(t =>
        t.amount >= filter.amountRange!.min && t.amount <= filter.amountRange!.max
      );
    }

    switch (sortBy) {
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'amount_desc':
        filtered.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount_asc':
        filtered.sort((a, b) => a.amount - b.amount);
        break;
    }

    return filtered;
  }, [store.transactions, store.filter, store.sortBy]);

  return {
    transactions: store.transactions,
    isLoading: store.isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getFilteredTransactions,
    setFilter: store.setFilter,
    resetFilter: store.resetFilter,
    setSortBy: store.setSortBy,
    reload: loadTransactions,
  };
}
