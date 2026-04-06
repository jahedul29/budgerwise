'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { SyncEngine } from '@/lib/sync-engine';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';

export function useSync(userId: string | undefined) {
  const { isOnline, syncStatus, setSyncStatus, setSyncError, setLastSyncTime, setSyncing, setSyncNow } = useUIStore();
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      syncEngineRef.current = new SyncEngine(userId);
      return;
    }
    syncEngineRef.current = null;
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
