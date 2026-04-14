import { create } from 'zustand';
import type { AccountType, CategoryType, TransactionType } from '@/types';

export interface AssistantTransactionDraft {
  amount?: number;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  transferAccountId?: string;
  dateIso?: string;
  description?: string;
  notes?: string;
  source?: 'assistant';
}

export interface AssistantCategoryDraft {
  name?: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
  source?: 'assistant';
}

export interface AssistantAccountDraft {
  name?: string;
  type?: AccountType;
  currency?: string;
  icon?: string;
  color?: string;
  source?: 'assistant';
}

export interface AssistantBudgetDraft {
  categoryId?: string;
  categoryName?: string;
  amount?: number;
  period?: 'monthly' | 'weekly' | 'yearly';
  month?: string;
  alertThreshold?: number;
  source?: 'assistant';
}

interface UIState {
  isSyncing: boolean;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  syncError: string | null;
  lastSyncTime: Date | null;
  syncNow: null | (() => Promise<boolean>);
  showAddTransaction: boolean;
  showFilterPanel: boolean;
  assistantTransactionDraft: AssistantTransactionDraft | null;
  assistantCategoryDraft: AssistantCategoryDraft | null;
  assistantAccountDraft: AssistantAccountDraft | null;
  assistantBudgetDraft: AssistantBudgetDraft | null;
  currency: string;
  _currencyHydrated: boolean;
  setSyncing: (syncing: boolean) => void;
  setOnline: (online: boolean) => void;
  setSyncStatus: (status: UIState['syncStatus']) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTime: (time: Date) => void;
  setSyncNow: (syncNow: UIState['syncNow']) => void;
  setShowAddTransaction: (show: boolean) => void;
  setShowFilterPanel: (show: boolean) => void;
  setAssistantTransactionDraft: (draft: AssistantTransactionDraft | null) => void;
  clearAssistantTransactionDraft: () => void;
  setAssistantCategoryDraft: (draft: AssistantCategoryDraft | null) => void;
  setAssistantAccountDraft: (draft: AssistantAccountDraft | null) => void;
  setAssistantBudgetDraft: (draft: AssistantBudgetDraft | null) => void;
  setCurrency: (currency: string) => void;
  hydrateCurrency: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSyncing: false,
  isOnline: true,
  syncStatus: 'idle',
  syncError: null,
  lastSyncTime: null,
  syncNow: null,
  showAddTransaction: false,
  showFilterPanel: false,
  assistantTransactionDraft: null,
  assistantCategoryDraft: null,
  assistantAccountDraft: null,
  assistantBudgetDraft: null,
  currency: 'BDT',
  _currencyHydrated: false,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSyncError: (syncError) => set({ syncError }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setSyncNow: (syncNow) => set({ syncNow }),
  setShowAddTransaction: (showAddTransaction) => set({ showAddTransaction }),
  setShowFilterPanel: (showFilterPanel) => set({ showFilterPanel }),
  setAssistantTransactionDraft: (assistantTransactionDraft) => set({ assistantTransactionDraft }),
  clearAssistantTransactionDraft: () => set({ assistantTransactionDraft: null }),
  setAssistantCategoryDraft: (assistantCategoryDraft) => set({ assistantCategoryDraft }),
  setAssistantAccountDraft: (assistantAccountDraft) => set({ assistantAccountDraft }),
  setAssistantBudgetDraft: (assistantBudgetDraft) => set({ assistantBudgetDraft }),
  setCurrency: (currency) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('budgetwise_currency', currency);
    }
    set({ currency });
  },
  hydrateCurrency: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('budgetwise_currency');
      if (saved) {
        set({ currency: saved, _currencyHydrated: true });
      } else {
        set({ _currencyHydrated: true });
      }
    }
  },
}));
