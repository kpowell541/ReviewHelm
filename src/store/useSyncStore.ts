import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { persistStorage } from '../storage/secureStorage';

interface SyncSnapshot {
  lastChecked?: string;
  lastSyncedVersion?: string;
  lastError?: string;
  syncing: boolean;
}

interface SyncStoreState extends SyncSnapshot {
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  replaceSyncState: (snapshot: Partial<SyncSnapshot>) => void;
  markSyncStart: () => void;
  markSyncSuccess: (version: string) => void;
  markSyncFailure: (message: string) => void;
}

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set) => ({
      syncing: false,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      replaceSyncState: (snapshot) => set((state) => ({ ...state, ...snapshot })),

      markSyncStart: () =>
        set({
          syncing: true,
          lastChecked: new Date().toISOString(),
          lastError: undefined,
        }),

      markSyncSuccess: (version) =>
        set({
          syncing: false,
          lastChecked: new Date().toISOString(),
          lastSyncedVersion: version,
          lastError: undefined,
        }),

      markSyncFailure: (message) =>
        set({
          syncing: false,
          lastChecked: new Date().toISOString(),
          lastError: message,
        }),
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => persistStorage),
      partialize: (state) => ({
        lastChecked: state.lastChecked,
        lastSyncedVersion: state.lastSyncedVersion,
        lastError: state.lastError,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Always reset syncing on app start — a persisted true means
          // a previous sync crashed mid-flight
          state.syncing = false;
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
