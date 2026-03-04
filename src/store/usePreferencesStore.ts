import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Severity, ClaudeModel } from '../data/types';

const API_KEY_STORAGE_KEY = 'reviewhelm-api-key';

interface PreferencesState {
  apiKey: string;
  isApiKeyLoaded: boolean;
  hasHydrated: boolean;
  aiModel: ClaudeModel;
  defaultSeverityFilter: Severity[];
  antiBiasMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  codeBlockTheme: 'dark' | 'light';
  autoExportPdf: boolean;

  setHasHydrated: (hydrated: boolean) => void;
  loadApiKey: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  setAiModel: (model: ClaudeModel) => void;
  setSeverityFilter: (filter: Severity[]) => void;
  setAntiBiasMode: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setCodeBlockTheme: (theme: 'dark' | 'light') => void;
  setAutoExportPdf: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      apiKey: '',
      isApiKeyLoaded: false,
      hasHydrated: false,
      aiModel: 'sonnet' as ClaudeModel,
      defaultSeverityFilter: ['blocker', 'major', 'minor', 'nit'],
      antiBiasMode: true,
      fontSize: 'medium',
      codeBlockTheme: 'dark',
      autoExportPdf: false,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      loadApiKey: async () => {
        try {
          const savedKey =
            (await SecureStore.getItemAsync(API_KEY_STORAGE_KEY)) ?? '';
          set({ apiKey: savedKey, isApiKeyLoaded: true });
        } catch {
          set({ isApiKeyLoaded: true });
        }
      },

      setApiKey: async (key) => {
        const trimmed = key.trim();
        set({ apiKey: key });
        try {
          if (trimmed === '') {
            await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
          } else {
            await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, trimmed);
          }
        } catch {
          // Keep in-memory value even if secure persistence fails.
        }
      },

      setAiModel: (model) => set({ aiModel: model }),
      setSeverityFilter: (filter) =>
        set({ defaultSeverityFilter: filter }),
      setAntiBiasMode: (enabled) => set({ antiBiasMode: enabled }),
      setFontSize: (size) => set({ fontSize: size }),
      setCodeBlockTheme: (theme) => set({ codeBlockTheme: theme }),
      setAutoExportPdf: (enabled) => set({ autoExportPdf: enabled }),
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        aiModel: state.aiModel,
        defaultSeverityFilter: state.defaultSeverityFilter,
        antiBiasMode: state.antiBiasMode,
        fontSize: state.fontSize,
        codeBlockTheme: state.codeBlockTheme,
        autoExportPdf: state.autoExportPdf,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
