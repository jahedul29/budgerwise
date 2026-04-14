'use client';
import { useState, useEffect, useCallback } from 'react';
import { localDb } from '@/lib/dexie';
import { generateId } from '@/lib/utils';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import type { Budget, BudgetPeriod } from '@/types';
import { getCurrentPeriodKey } from '@/lib/budget-periods';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await localDb.budgets
        .where('_syncStatus')
        .notEqual('pending_delete')
        .toArray();
      // Backfill period for budgets created before multi-period support
      const normalised = all.map(b => ({
        ...b,
        period: b.period || ('monthly' as BudgetPeriod),
      }));
      setBudgets(normalised);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  useEffect(() => {
    const handleSyncComplete = () => {
      loadBudgets();
    };

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
  }, [loadBudgets]);

  const addBudget = useCallback(async (data: Omit<Budget, 'id' | 'createdAt' | '_syncStatus'>) => {
    const budget: Budget = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      _syncStatus: 'pending_create',
    };
    await localDb.budgets.add(budget);
    setBudgets(prev => [...prev, budget]);
    return budget;
  }, []);

  const updateBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
    await localDb.budgets.update(id, { ...updates, _syncStatus: 'pending_update' });
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    await localDb.budgets.update(id, { _syncStatus: 'pending_delete' });
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  const getCurrentPeriodBudgets = useCallback(() => {
    return budgets.filter(b => b.month === getCurrentPeriodKey(b.period));
  }, [budgets]);

  return {
    budgets,
    isLoading,
    addBudget,
    updateBudget,
    deleteBudget,
    getCurrentPeriodBudgets,
    reload: loadBudgets,
  };
}
