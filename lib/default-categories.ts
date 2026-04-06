import type { Category } from '@/types';
import { generateId } from './utils';

export const defaultExpenseCategories: Omit<Category, 'id' | 'createdAt' | '_syncStatus'>[] = [
  { name: 'Food', icon: '🍔', color: '#F97316', type: 'expense', isDefault: true },
  { name: 'Transport', icon: '🚗', color: '#3B82F6', type: 'expense', isDefault: true },
  { name: 'Housing', icon: '🏠', color: '#8B5CF6', type: 'expense', isDefault: true },
  { name: 'Health', icon: '💊', color: '#EF4444', type: 'expense', isDefault: true },
  { name: 'Entertainment', icon: '🎮', color: '#EC4899', type: 'expense', isDefault: true },
  { name: 'Shopping', icon: '🛍️', color: '#F59E0B', type: 'expense', isDefault: true },
  { name: 'Utilities', icon: '💡', color: '#10B981', type: 'expense', isDefault: true },
  { name: 'Education', icon: '📚', color: '#6366F1', type: 'expense', isDefault: true },
  { name: 'Travel', icon: '✈️', color: '#14B8A6', type: 'expense', isDefault: true },
  { name: 'Work', icon: '💼', color: '#64748B', type: 'expense', isDefault: true },
  { name: 'Pets', icon: '🐾', color: '#A855F7', type: 'expense', isDefault: true },
  { name: 'Gifts', icon: '🎁', color: '#F43F5E', type: 'expense', isDefault: true },
  { name: 'Others', icon: '📦', color: '#78716C', type: 'expense', isDefault: true },
];

export const defaultIncomeCategories: Omit<Category, 'id' | 'createdAt' | '_syncStatus'>[] = [
  { name: 'Salary', icon: '💰', color: '#10B981', type: 'income', isDefault: true },
  { name: 'Freelance', icon: '💻', color: '#3B82F6', type: 'income', isDefault: true },
  { name: 'Investment', icon: '📈', color: '#8B5CF6', type: 'income', isDefault: true },
  { name: 'Interest', icon: '🏦', color: '#F59E0B', type: 'income', isDefault: true },
  { name: 'Gift', icon: '🎁', color: '#EC4899', type: 'income', isDefault: true },
  { name: 'Other Income', icon: '💵', color: '#64748B', type: 'income', isDefault: true },
];

export function createDefaultCategories(): Category[] {
  const now = new Date();
  return [...defaultExpenseCategories, ...defaultIncomeCategories].map(cat => ({
    ...cat,
    id: generateId(),
    createdAt: now,
    _syncStatus: 'pending_create' as const,
  }));
}
