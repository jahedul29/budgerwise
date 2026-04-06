import { create } from 'zustand';
import type { Transaction } from '@/types';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  filter: {
    dateRange?: { start: Date; end: Date };
    categories: string[];
    types: string[];
    accounts: string[];
    paymentMethods: string[];
    tags: string[];
    amountRange?: { min: number; max: number };
    search: string;
  };
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setFilter: (filter: Partial<TransactionState['filter']>) => void;
  resetFilter: () => void;
  setSortBy: (sort: TransactionState['sortBy']) => void;
  setLoading: (loading: boolean) => void;
}

const defaultFilter = {
  categories: [],
  types: [],
  accounts: [],
  paymentMethods: [],
  tags: [],
  search: '',
};

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: true,
  filter: defaultFilter,
  sortBy: 'date_desc',
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  resetFilter: () => set({ filter: defaultFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setLoading: (isLoading) => set({ isLoading }),
}));
