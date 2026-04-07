'use client';
import { RefreshCw } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function SyncIndicator() {
  const { syncStatus, syncNow, isSyncing } = useUIStore();

  const config = {
    idle: { color: 'text-gray-400', label: '' },
    syncing: { color: 'text-primary-500', label: 'Syncing...' },
    synced: { color: 'text-income', label: 'Synced' },
    error: { color: 'text-expense', label: 'Sync failed' },
    offline: { color: 'text-warning', label: 'Offline' },
  };

  const { color, label } = config[syncStatus];

  if (syncStatus === 'idle') return null;

  const isDisabled = !syncNow || isSyncing || syncStatus === 'offline';

  const handleManualSync = async () => {
    if (isDisabled || !syncNow) return;
    const didSync = await syncNow();
    if (didSync) toast.success('Sync completed');
    else toast.error('Sync failed');
  };

  return (
    <button
      type="button"
      onClick={handleManualSync}
      disabled={isDisabled}
      className={cn(
        'flex items-center gap-1.5 rounded-md p-1 text-xs font-medium transition-colors',
        color,
        isDisabled
          ? 'cursor-default'
          : 'hover:bg-navy-100/70 dark:hover:bg-white/[0.06]'
      )}
      title={isSyncing ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : 'Sync now'}
      aria-label={isSyncing ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : 'Sync now'}
    >
      <RefreshCw className={cn('h-4 w-4', syncStatus === 'syncing' && 'animate-spin')} />
      <span>{label}</span>
    </button>
  );
}
