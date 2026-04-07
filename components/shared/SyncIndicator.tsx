'use client';
import { RefreshCw, Check, WifiOff, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function SyncIndicator() {
  const { syncStatus, syncNow, isSyncing } = useUIStore();

  const config = {
    idle: { icon: Check, color: 'text-gray-400', label: '' },
    syncing: { icon: RefreshCw, color: 'text-primary-500', label: 'Syncing...' },
    synced: { icon: Check, color: 'text-income', label: 'Synced' },
    error: { icon: AlertCircle, color: 'text-expense', label: 'Sync error' },
    offline: { icon: WifiOff, color: 'text-warning', label: 'Offline' },
  };

  const { icon: Icon, color, label } = config[syncStatus];

  if (syncStatus === 'idle') return null;

  const handleManualSync = async () => {
    if (!syncNow || isSyncing) return;
    const didSync = await syncNow();
    if (didSync) toast.success('Sync completed');
    else toast.error('Sync failed');
  };

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
      <Icon className={cn('h-4 w-4', syncStatus === 'syncing' && 'animate-spin')} />
      <span>{label}</span>
      <button
        type="button"
        onClick={handleManualSync}
        disabled={!syncNow || isSyncing || syncStatus === 'offline'}
        className="ml-1 rounded-md p-1 text-navy-400 hover:bg-navy-100 hover:text-navy-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-navy-300 dark:hover:bg-white/[0.06] dark:hover:text-navy-100 transition-colors"
        title={isSyncing ? 'Syncing...' : 'Sync now'}
        aria-label="Sync now"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
      </button>
    </div>
  );
}
