import type { StoreApi, UseBoundStore } from 'zustand';
import { persistStorage, secureStoreAsyncStorage } from '../storage/secureStorage';
import { useBookmarkStore } from '../store/useBookmarkStore';
import { useConfidenceStore } from '../store/useConfidenceStore';
import { usePRTrackerStore } from '../store/usePRTrackerStore';
import { useRepoConfigStore } from '../store/useRepoConfigStore';
import { useSessionStore } from '../store/useSessionStore';
import { useSyncStore } from '../store/useSyncStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useTierStore } from '../store/useTierStore';
import { useTutorStore } from '../store/useTutorStore';
import { useUsageStore } from '../store/useUsageStore';
import { usePreferencesStore } from '../store/usePreferencesStore';

const PERSISTED_STORE_KEYS = [
  'session-storage',
  'confidence-storage',
  'usage-storage',
  'tutor-storage',
  'sync-storage',
  'repo-config-storage',
  'reviewhelm-tier',
  'pr-tracker-storage',
  'bookmark-storage',
  'template-storage',
] as const;

const USER_KEY_INDEX = 'reviewhelm-key-index:user';
const ADMIN_KEY_INDEX = 'reviewhelm-key-index:admin';
const KEY_SLOT_PREFIX = 'reviewhelm-key-slot:';

type ResettableStore<T extends object> = UseBoundStore<StoreApi<T>>;

function resetStoreToInitial<T extends object>(
  store: ResettableStore<T>,
  overrides: Partial<T> = {},
): void {
  const initial = store.getInitialState();
  const current = store.getState() as T & { hasHydrated?: boolean };
  const hydrationPatch: Partial<T> =
    typeof current.hasHydrated === 'boolean'
      ? ({ hasHydrated: current.hasHydrated } as unknown as Partial<T>)
      : {};

  store.setState({ ...initial, ...hydrationPatch, ...overrides }, true);
}

async function clearTokenizedKey(indexKey: string): Promise<void> {
  const token = await secureStoreAsyncStorage.getItem(indexKey);
  if (token) {
    await secureStoreAsyncStorage.removeItem(`${KEY_SLOT_PREFIX}${token}`);
  }
  await secureStoreAsyncStorage.removeItem(indexKey);
}

function clearBrowserSupabaseKeys(): void {
  if (typeof window === 'undefined') return;

  const clearFrom = (storage: Storage) => {
    const keysToDelete: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      storage.removeItem(key);
    }
  };

  clearFrom(window.localStorage);
  clearFrom(window.sessionStorage);
}

export async function clearLocalUserData(): Promise<void> {
  await Promise.allSettled(PERSISTED_STORE_KEYS.map((key) => persistStorage.removeItem(key)));
  await Promise.allSettled([
    clearTokenizedKey(USER_KEY_INDEX),
    clearTokenizedKey(ADMIN_KEY_INDEX),
  ]);

  clearBrowserSupabaseKeys();

  resetStoreToInitial(useSessionStore);
  resetStoreToInitial(useConfidenceStore);
  resetStoreToInitial(useUsageStore);
  resetStoreToInitial(useTutorStore);
  resetStoreToInitial(useSyncStore);
  resetStoreToInitial(useRepoConfigStore);
  resetStoreToInitial(useTierStore);
  resetStoreToInitial(usePRTrackerStore);
  resetStoreToInitial(useBookmarkStore);
  resetStoreToInitial(useTemplateStore);

  // Keep UI preferences but clear any local key tokens.
  const preferences = usePreferencesStore.getState();
  await Promise.allSettled([
    preferences.clearApiKey(),
    preferences.clearAdminApiKey(),
  ]);
}
