import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorConversation, TutorMessage } from '../data/types';

interface TutorStoreState {
  conversations: Record<string, TutorConversation>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  replaceConversations: (
    conversations: Record<string, TutorConversation>,
  ) => void;
  getConversation: (itemId: string) => TutorConversation | undefined;
  setMessages: (itemId: string, messages: TutorMessage[]) => void;
  appendMessage: (itemId: string, message: TutorMessage) => void;
  clearConversation: (itemId: string) => void;
}

function buildConversation(itemId: string, messages: TutorMessage[]): TutorConversation {
  return {
    itemId,
    messages,
    lastAccessed: new Date().toISOString(),
  };
}

export const useTutorStore = create<TutorStoreState>()(
  persist(
    (set, get) => ({
      conversations: {},
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
