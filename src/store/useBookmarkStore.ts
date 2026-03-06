import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookmarkState {
  bookmarkedIds: string[];
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  toggleBookmark: (itemId: string) => void;
  isBookmarked: (itemId: string) => boolean;
  getBookmarks: () => string[];
  clearAll: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarkedIds: [],
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      toggleBookmark: (itemId) => {
        set((state) => {
          const exists = state.bookmarkedIds.includes(itemId);
          return {
            bookmarkedIds: exists
              ? state.bookmarkedIds.filter((id) => id !== itemId)
              : [...state.bookmarkedIds, itemId],
          };
        });
      },

      isBookmarked: (itemId) => {
        return get().bookmarkedIds.includes(itemId);
      },

      getBookmarks: () => {
        return get().bookmarkedIds;
      },

      clearAll: () => set({ bookmarkedIds: [] }),
    }),
    {
      name: 'bookmark-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bookmarkedIds: state.bookmarkedIds,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
