import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type {
  Session,
  ChecklistMode,
  StackId,
  ItemResponse,
  Verdict,
  ConfidenceLevel,
} from '../data/types';

interface SessionState {
  sessions: Record<string, Session>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  createSession: (
    mode: ChecklistMode,
    stackId?: StackId,
    title?: string
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
  replaceSessions: (sessions: Record<string, Session>) => void;
  getSession: (sessionId: string) => Session | undefined;
  getSessionsByMode: (mode: ChecklistMode, stackId?: StackId) => Session[];
  getRecentSessions: (limit: number) => Session[];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      createSession: (mode, stackId, title) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const defaultTitle =
          title ||
          `${mode === 'polish' ? 'Polish' : 'Review'} — ${new Date().toLocaleDateString()}`;

        const session: Session = {
          id,
          mode,
          stackId,
          title: defaultTitle,
          itemResponses: {},
          sessionNotes: '',
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
              [sessionId]: { ...session, title },
            },
          };
        });
      },

      completeSession: (sessionId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          if (session.completedAt || session.isComplete) return state;
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
          return { sessions: rest };
        });
      },

      replaceSessions: (sessions) => set({ sessions }),

      getSession: (sessionId) => {
        return get().sessions[sessionId];
      },

      getSessionsByMode: (mode, stackId) => {
        return Object.values(get().sessions)
          .filter(
            (s) => s.mode === mode && (!stackId || s.stackId === stackId)
          )
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
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
