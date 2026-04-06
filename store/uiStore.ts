import { create } from 'zustand';

interface UIState {
  isSyncing: boolean;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncTime: Date | null;
  showAddTransaction: boolean;
  showFilterPanel: boolean;
  setSyncing: (syncing: boolean) => void;
  setOnline: (online: boolean) => void;
  setSyncStatus: (status: UIState['syncStatus']) => void;
  setLastSyncTime: (time: Date) => void;
  setShowAddTransaction: (show: boolean) => void;
  setShowFilterPanel: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSyncing: false,
  isOnline: true,
  syncStatus: 'idle',
  lastSyncTime: null,
  showAddTransaction: false,
  showFilterPanel: false,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setShowAddTransaction: (showAddTransaction) => set({ showAddTransaction }),
  setShowFilterPanel: (showFilterPanel) => set({ showFilterPanel }),
}));
