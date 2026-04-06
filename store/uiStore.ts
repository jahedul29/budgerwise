import { create } from 'zustand';

interface UIState {
  isSyncing: boolean;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  syncError: string | null;
  lastSyncTime: Date | null;
  syncNow: null | (() => Promise<boolean>);
  showAddTransaction: boolean;
  showFilterPanel: boolean;
  setSyncing: (syncing: boolean) => void;
  setOnline: (online: boolean) => void;
  setSyncStatus: (status: UIState['syncStatus']) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTime: (time: Date) => void;
  setSyncNow: (syncNow: UIState['syncNow']) => void;
  setShowAddTransaction: (show: boolean) => void;
  setShowFilterPanel: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSyncing: false,
  isOnline: true,
  syncStatus: 'idle',
  syncError: null,
  lastSyncTime: null,
  syncNow: null,
  showAddTransaction: false,
  showFilterPanel: false,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSyncError: (syncError) => set({ syncError }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setSyncNow: (syncNow) => set({ syncNow }),
  setShowAddTransaction: (showAddTransaction) => set({ showAddTransaction }),
  setShowFilterPanel: (showFilterPanel) => set({ showFilterPanel }),
}));
