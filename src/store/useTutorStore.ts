import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorConversation, TutorMessage } from '../data/types';

const MAX_CACHE_ENTRIES = 200;
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

export interface TutorResponseCacheEntry {
  key: string;
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedAt: string;
}

interface TutorStoreState {
  conversations: Record<string, TutorConversation>;
  responseCache: Record<string, TutorResponseCacheEntry>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  replaceConversations: (
    conversations: Record<string, TutorConversation>,
  ) => void;
  getConversation: (itemId: string) => TutorConversation | undefined;
  setMessages: (itemId: string, messages: TutorMessage[]) => void;
  appendMessage: (itemId: string, message: TutorMessage) => void;
  clearConversation: (itemId: string) => void;

  getCachedResponse: (
    key: string,
    maxAgeMs?: number,
  ) => TutorResponseCacheEntry | undefined;
  setCachedResponse: (entry: TutorResponseCacheEntry) => void;
  clearResponseCache: () => void;
}

function buildConversation(
  itemId: string,
  messages: TutorMessage[],
): TutorConversation {
  return {
    itemId,
    messages,
    lastAccessed: new Date().toISOString(),
  };
}

function pruneCache(
  cache: Record<string, TutorResponseCacheEntry>,
  maxEntries: number,
): Record<string, TutorResponseCacheEntry> {
  const entries = Object.values(cache);
  if (entries.length <= maxEntries) return cache;
  const sorted = entries.sort(
    (a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime(),
  );
  const next: Record<string, TutorResponseCacheEntry> = {};
  for (const entry of sorted.slice(entries.length - maxEntries)) {
    next[entry.key] = entry;
  }
  return next;
}

export const useTutorStore = create<TutorStoreState>()(
  persist(
    (set, get) => ({
      conversations: {},
      responseCache: {},
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      replaceConversations: (conversations) => set({ conversations }),

      getConversation: (itemId) => get().conversations[itemId],

      setMessages: (itemId, messages) => {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [itemId]: buildConversation(itemId, messages),
          },
        }));
      },

      appendMessage: (itemId, message) => {
        set((state) => {
          const existing = state.conversations[itemId];
          const messages = [...(existing?.messages ?? []), message];
          return {
            conversations: {
              ...state.conversations,
              [itemId]: buildConversation(itemId, messages),
            },
          };
        });
      },

      clearConversation: (itemId) => {
        set((state) => {
          const { [itemId]: _removed, ...rest } = state.conversations;
          return { conversations: rest };
        });
      },

      getCachedResponse: (key, maxAgeMs = DEFAULT_CACHE_TTL_MS) => {
        const entry = get().responseCache[key];
        if (!entry) return undefined;
        const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
        if (ageMs > maxAgeMs) return undefined;
        return entry;
      },

      setCachedResponse: (entry) => {
        set((state) => {
          const nextCache = pruneCache(
            {
              ...state.responseCache,
              [entry.key]: entry,
            },
            MAX_CACHE_ENTRIES,
          );
          return { responseCache: nextCache };
        });
      },

      clearResponseCache: () => set({ responseCache: {} }),
    }),
    {
      name: 'tutor-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
