import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { randomUUID } from 'expo-crypto';
import type {
  Session,
  ChecklistMode,
  StackId,
  ItemResponse,
  Verdict,
  ConfidenceLevel,
} from '../data/types';
import { getEffectiveStackIds } from '../data/types';
import { secureStoreAsyncStorage, persistStorage } from '../storage/secureStorage';

interface SessionState {
  sessions: Record<string, Session>;
  deletedSessionIds: string[];
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  createSession: (
    mode: ChecklistMode,
    stackIds?: StackId[],
    title?: string,
    selectedSections?: string[],
    linkedPRId?: string
  ) => string;
  setItemResponse: (
    sessionId: string,
    itemId: string,
    response: Partial<ItemResponse>
  ) => void;
  updateSessionNotes: (sessionId: string, notes: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  completeSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  linkPR: (sessionId: string, prId: string | undefined) => void;
  updateSelectedSections: (sessionId: string, sections: string[] | undefined) => void;
  replaceSessions: (sessions: Record<string, Session>) => void;
  clearDeletedSessionIds: () => void;
  getSession: (sessionId: string) => Session | undefined;
  getSessionsByMode: (mode: ChecklistMode, stackId?: StackId) => Session[];
  getRecentSessions: (limit: number) => Session[];
}

/**
 * One-time migration: reads from old SecureStore if AsyncStorage is empty,
 * writes to AsyncStorage going forward. SecureStore is too constrained
 * for bulky session data on native.
 */
const migratingSessionStorage = {
  getItem: async (key: string) => {
    const value = await persistStorage.getItem(key);
    if (value) return value;
    // Try migrating from old SecureStore location
    try {
      const old = await secureStoreAsyncStorage.getItem(key);
      if (old) {
        await persistStorage.setItem(key, old);
        await secureStoreAsyncStorage.removeItem(key);
        return old;
      }
    } catch {
      // Migration failed — start fresh
    }
    return null;
  },
  setItem: (key: string, value: string) => persistStorage.setItem(key, value),
  removeItem: (key: string) => persistStorage.removeItem(key),
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      deletedSessionIds: [],
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      createSession: (mode, stackIds, title, selectedSections, linkedPRId) => {
        const id = randomUUID();
        const now = new Date().toISOString();
        const defaultTitle =
          title ||
          `${mode === 'polish' ? 'Polish' : 'Review'} — ${new Date().toLocaleDateString()}`;

        const session: Session = {
          id,
          mode,
          stackId: stackIds?.[0],
          stackIds: stackIds ?? [],
          selectedSections,
          title: defaultTitle,
          itemResponses: {},
          sessionNotes: '',
          linkedPRId,
          createdAt: now,
          updatedAt: now,
          isComplete: false,
        };

        set((state) => ({
          sessions: { ...state.sessions, [id]: session },
        }));

        return id;
      },

      setItemResponse: (sessionId, itemId, response) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const existing = session.itemResponses[itemId] || {
            verdict: 'skipped' as Verdict,
            confidence: 3 as ConfidenceLevel,
          };

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                itemResponses: {
                  ...session.itemResponses,
                  [itemId]: { ...existing, ...response },
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateSessionNotes: (sessionId, notes) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                sessionNotes: notes,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      renameSession: (sessionId, title) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...session, title, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      completeSession: (sessionId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                isComplete: true,
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const { [sessionId]: _, ...rest } = state.sessions;
          return {
            sessions: rest,
            deletedSessionIds: [...state.deletedSessionIds, sessionId],
          };
        });
      },

      linkPR: (sessionId, prId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                linkedPRId: prId,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateSelectedSections: (sessionId, sections) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                selectedSections: sections,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      replaceSessions: (sessions) => set({ sessions }),
      clearDeletedSessionIds: () => set({ deletedSessionIds: [] }),

      getSession: (sessionId) => {
        return get().sessions[sessionId];
      },

      getSessionsByMode: (mode, stackId) => {
        return Object.values(get().sessions)
          .filter((s) => {
            if (s.mode !== mode) return false;
            if (!stackId) return true;
            const effective = getEffectiveStackIds(s);
            return effective.includes(stackId);
          })
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          );
      },

      getRecentSessions: (limit) => {
        return Object.values(get().sessions)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
          .slice(0, limit);
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => migratingSessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
