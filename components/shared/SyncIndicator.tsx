'use client';
import { RefreshCw, Check, WifiOff, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { syncStatus } = useUIStore();

  const config = {
    idle: { icon: Check, color: 'text-gray-400', label: '' },
    syncing: { icon: RefreshCw, color: 'text-primary-500', label: 'Syncing...' },
    synced: { icon: Check, color: 'text-income', label: 'Synced' },
    error: { icon: AlertCircle, color: 'text-expense', label: 'Sync error' },
    offline: { icon: WifiOff, color: 'text-warning', label: 'Offline' },
  };

  const { icon: Icon, color, label } = config[syncStatus];

  if (syncStatus === 'idle') return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
      <Icon className={cn('h-4 w-4', syncStatus === 'syncing' && 'animate-spin')} />
      <span>{label}</span>
    </div>
  );
}
