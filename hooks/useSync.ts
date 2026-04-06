'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { SyncEngine } from '@/lib/sync-engine';

export function useSync(userId: string | undefined) {
  const { isOnline, setSyncStatus, setLastSyncTime, setSyncing } = useUIStore();
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      syncEngineRef.current = new SyncEngine(userId);
    }
  }, [userId]);

  const performSync = useCallback(async () => {
    if (!syncEngineRef.current || !isOnline) return;

    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await syncEngineRef.current.syncAll();
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  }, [isOnline, setSyncing, setSyncStatus, setLastSyncTime]);

  // Sync on app load and when coming online
  useEffect(() => {
    if (isOnline && userId) {
      performSync();
    }
  }, [isOnline, userId, performSync]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (isOnline && userId) {
      syncIntervalRef.current = setInterval(performSync, 5 * 60 * 1000);
      return () => {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      };
    }
  }, [isOnline, userId, performSync]);

  return { performSync };
}
