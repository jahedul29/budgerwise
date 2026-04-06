'use client';
import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export function useOnlineStatus() {
  const { isOnline, setOnline, setSyncStatus, setSyncError } = useUIStore();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setSyncStatus('idle');
      setSyncError(null);
    };
    const handleOffline = () => {
      setOnline(false);
      setSyncStatus('offline');
    };

    setOnline(navigator.onLine);
    if (!navigator.onLine) setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, setSyncStatus, setSyncError]);

  return isOnline;
}
