import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackId } from '../data/types';

interface RepoConfig {
  repo: string;
  stackIds: StackId[];
  selectedSections?: string[];
  updatedAt: string;
}

interface RepoConfigState {
  configs: Record<string, RepoConfig>;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  saveRepoConfig: (
    repo: string,
    stackIds: StackId[],
    selectedSections?: string[],
  ) => void;
  getRepoConfig: (repo: string) => RepoConfig | undefined;
  deleteRepoConfig: (repo: string) => void;
  getKnownRepos: () => string[];
  replaceConfigs: (configs: Record<string, RepoConfig>) => void;
}

export const useRepoConfigStore = create<RepoConfigState>()(
  persist(
    (set, get) => ({
      configs: {},
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      saveRepoConfig: (repo, stackIds, selectedSections) => {
        const config: RepoConfig = {
          repo,
          stackIds,
          selectedSections,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          configs: { ...state.configs, [repo]: config },
        }));
      },

      getRepoConfig: (repo) => {
        return get().configs[repo];
      },

      deleteRepoConfig: (repo) => {
        set((state) => {
          const { [repo]: _, ...rest } = state.configs;
          return { configs: rest };
        });
      },

      getKnownRepos: () => {
        return Object.keys(get().configs).sort();
      },

      replaceConfigs: (configs) => set({ configs }),
    }),
    {
      name: 'repo-config-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        configs: state.configs,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
