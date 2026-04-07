'use client';
import { useState, useEffect, useCallback } from 'react';
import { localDb } from '@/lib/dexie';
import { createDefaultCategories } from '@/lib/default-categories';
import { generateId } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import type { Category, CategoryType } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, lastSyncTime, syncStatus } = useUIStore();

  const dedupeDefaultCategories = useCallback(async (cats: Category[]) => {
    const defaultGroups = new Map<string, Category[]>();

    for (const category of cats) {
      if (!category.isDefault) continue;

      const key = `${category.type}:${category.name.trim().toLowerCase()}`;
      const group = defaultGroups.get(key) ?? [];
      group.push(category);
      defaultGroups.set(key, group);
    }

    const duplicates: Category[] = [];

    for (const group of defaultGroups.values()) {
      if (group.length <= 1) continue;

      group.sort((a, b) => {
        const sa = a._syncStatus === 'synced' ? 0 : 1;
        const sb = b._syncStatus === 'synced' ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      duplicates.push(...group.slice(1));
    }

    if (duplicates.length === 0) {
      return cats;
    }

    for (const duplicate of duplicates) {
      if (duplicate._syncStatus === 'pending_create') {
        await localDb.categories.delete(duplicate.id);
      } else {
        await localDb.categories.update(duplicate.id, { _syncStatus: 'pending_delete' });
      }
    }

    const duplicateIds = new Set(duplicates.map((category) => category.id));
    return cats.filter((category) => !duplicateIds.has(category.id));
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      let cats = await localDb.categories
        .where('_syncStatus')
        .notEqual('pending_delete')
        .toArray();

      if (cats.length === 0) {
        if (isOnline && !lastSyncTime && syncStatus !== 'error') {
          setCategories([]);
          return;
        }

        const defaults = createDefaultCategories();
        await localDb.categories.bulkPut(defaults);
        cats = defaults;
      }

      const normalizedCats = await dedupeDefaultCategories(cats);
      setCategories(normalizedCats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, lastSyncTime, syncStatus, dedupeDefaultCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const handleSyncComplete = () => {
      loadCategories();
    };

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
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
