'use client';
import { useState, useEffect, useCallback } from 'react';
import { localDb } from '@/lib/dexie';
import { createDefaultCategories } from '@/lib/default-categories';
import { generateId } from '@/lib/utils';
import type { Category, CategoryType } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      let cats = await localDb.categories
        .where('_syncStatus')
        .notEqual('pending_delete')
        .toArray();

      if (cats.length === 0) {
        const defaults = createDefaultCategories();
        await localDb.categories.bulkAdd(defaults);
        cats = defaults;
      }

      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = useCallback(async (data: { name: string; icon: string; color: string; type: CategoryType }) => {
    const category: Category = {
      ...data,
      id: generateId(),
      isDefault: false,
      createdAt: new Date(),
      _syncStatus: 'pending_create',
    };
    await localDb.categories.add(category);
    setCategories(prev => [...prev, category]);
    return category;
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    await localDb.categories.update(id, { ...updates, _syncStatus: 'pending_update' });
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await localDb.categories.update(id, { _syncStatus: 'pending_delete' });
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCategoriesByType = useCallback((type: CategoryType) => {
    return categories.filter(c => c.type === type);
  }, [categories]);

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    reload: loadCategories,
  };
}
