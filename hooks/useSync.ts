'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { SyncEngine } from '@/lib/sync-engine';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import { localDb } from '@/lib/dexie';

export function useSync(userId: string | undefined) {
  const { isOnline, syncStatus, setSyncStatus, setSyncError, setLastSyncTime, setSyncing, setSyncNow } = useUIStore();
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedUserRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!userId) {
        syncEngineRef.current = null;
        initializedUserRef.current = null;
        return;
      }

      // Keep local IndexedDB scoped to the currently signed-in user.
      if (typeof window !== 'undefined' && initializedUserRef.current !== userId) {
        const storageKey = 'budgetwise_active_user';
        const previousUser = localStorage.getItem(storageKey);
        if (previousUser && previousUser !== userId) {
          await localDb.transaction('rw', localDb.transactions, localDb.categories, localDb.budgets, localDb.accounts, async () => {
            await localDb.transactions.clear();
            await localDb.categories.clear();
            await localDb.budgets.clear();
            await localDb.accounts.clear();
          });
          window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT));
        }
        localStorage.setItem(storageKey, userId);
      }

      if (!cancelled) {
        syncEngineRef.current = new SyncEngine(userId);
        initializedUserRef.current = userId;
      }
    };

    initialize().catch((error) => {
      console.error('Sync initialization failed:', error);
      syncEngineRef.current = userId ? new SyncEngine(userId) : null;
      initializedUserRef.current = userId ?? null;
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const performSync = useCallback(async () => {
    if (!syncEngineRef.current || !isOnline) return false;

    setSyncing(true);
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      await syncEngineRef.current.syncAll();
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT));
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown sync error');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [isOnline, setSyncing, setSyncStatus, setSyncError, setLastSyncTime]);

  useEffect(() => {
    setSyncNow(performSync);
    return () => setSyncNow(null);
  }, [performSync, setSyncNow]);

  // Sync on app load and when coming online
  useEffect(() => {
    if (isOnline && userId) {
      performSync();
    }
  }, [isOnline, userId, performSync]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (isOnline && userId && syncStatus !== 'error') {
      syncIntervalRef.current = setInterval(performSync, 5 * 60 * 1000);
      return () => {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      };
    }
  }, [isOnline, userId, syncStatus, performSync]);

  return { performSync };
}
