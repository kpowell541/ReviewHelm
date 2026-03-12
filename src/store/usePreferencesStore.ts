import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStorage, secureStoreAsyncStorage } from '../storage/secureStorage';
import { randomUUID } from 'expo-crypto';
import type { Severity, ClaudeModel } from '../data/types';

const KEY_SLOT_PREFIX = 'reviewhelm-key-slot:';
const ADMIN_KEY_INDEX = 'reviewhelm-key-index:admin';

function tokenSlotKey(token: string): string {
  return `${KEY_SLOT_PREFIX}${token}`;
}

async function clearToken(indexKey: string): Promise<void> {
  const token = await secureStoreAsyncStorage.getItem(indexKey);
  if (!token) return;
  await secureStoreAsyncStorage.removeItem(tokenSlotKey(token));
  await secureStoreAsyncStorage.removeItem(indexKey);
}

async function saveTokenizedKey(indexKey: string, value: string): Promise<string> {
  await clearToken(indexKey);
  const token = `atk_${randomUUID().replace(/-/g, '')}`;
  await secureStoreAsyncStorage.setItem(tokenSlotKey(token), value);
  await secureStoreAsyncStorage.setItem(indexKey, token);
  return token;
}

async function resolveTokenizedKey(indexKey: string): Promise<string> {
  const token = await secureStoreAsyncStorage.getItem(indexKey);
  if (!token) {
    throw new Error('No key configured.');
  }
  const value = await secureStoreAsyncStorage.getItem(tokenSlotKey(token));
  if (!value) {
    throw new Error('Stored key is missing. Re-enter it in Settings.');
  }
  return value;
}

async function loadTokenState(
  indexKey: string,
): Promise<{ token: string | null; has: boolean }> {
  const token = await secureStoreAsyncStorage.getItem(indexKey);
  if (!token) return { token: null, has: false };
  const value = await secureStoreAsyncStorage.getItem(tokenSlotKey(token));
  if (!value) {
    await secureStoreAsyncStorage.removeItem(indexKey);
    return { token: null, has: false };
  }
  return { token, has: true };
}

interface PreferencesState {
  adminApiKeyToken: string | null;
  hasAdminApiKey: boolean;
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  hasSeenTourForTier: string | null;
  aiModel: ClaudeModel;
  defaultSeverityFilter: Severity[];
  antiBiasMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  codeBlockTheme: 'dark' | 'light';
  autoExportPdf: boolean;
  themeMode: 'dark' | 'light' | 'system';

  setHasHydrated: (hydrated: boolean) => void;

  loadAdminApiKey: () => Promise<void>;
  setAdminApiKey: (key: string) => Promise<void>;
  clearAdminApiKey: () => Promise<void>;
  resolveAdminApiKey: () => Promise<string>;

  replacePreferences: (preferences: Partial<{
    aiModel: ClaudeModel;
    defaultSeverityFilter: Severity[];
    antiBiasMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    codeBlockTheme: 'dark' | 'light';
    autoExportPdf: boolean;
    themeMode: 'dark' | 'light' | 'system';
  }>) => void;
  setAiModel: (model: ClaudeModel) => void;
  setSeverityFilter: (filter: Severity[]) => void;
  setAntiBiasMode: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setCodeBlockTheme: (theme: 'dark' | 'light') => void;
  setAutoExportPdf: (enabled: boolean) => void;
  setThemeMode: (mode: 'dark' | 'light' | 'system') => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      adminApiKeyToken: null,
      hasAdminApiKey: false,
      hasHydrated: false,
      hasCompletedOnboarding: false,
      hasSeenTourForTier: null,
      aiModel: 'sonnet' as ClaudeModel,
      defaultSeverityFilter: ['blocker', 'major', 'minor', 'nit'],
      antiBiasMode: true,
      fontSize: 'medium',
      codeBlockTheme: 'dark',
      autoExportPdf: false,
      themeMode: 'dark' as const,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      loadAdminApiKey: async () => {
        const adminState = await loadTokenState(ADMIN_KEY_INDEX);
        set({
          adminApiKeyToken: adminState.token,
          hasAdminApiKey: adminState.has,
        });
      },

      setAdminApiKey: async (key) => {
        const trimmed = key.trim();
        if (!trimmed) {
          await clearToken(ADMIN_KEY_INDEX);
          set({ adminApiKeyToken: null, hasAdminApiKey: false });
          return;
        }
        const token = await saveTokenizedKey(ADMIN_KEY_INDEX, trimmed);
        set({ adminApiKeyToken: token, hasAdminApiKey: true });
      },

      clearAdminApiKey: async () => {
        await clearToken(ADMIN_KEY_INDEX);
        set({ adminApiKeyToken: null, hasAdminApiKey: false });
      },

      resolveAdminApiKey: async () => {
        try {
          return await resolveTokenizedKey(ADMIN_KEY_INDEX);
        } catch {
          throw new Error(
            'No Admin API key configured. Add one in Settings.',
          );
        }
      },

      replacePreferences: (preferences) => {
        set((state) => ({
          ...state,
          ...preferences,
        }));
      },

      setAiModel: (model) => set({ aiModel: model }),
      setSeverityFilter: (filter) =>
        set({ defaultSeverityFilter: filter }),
      setAntiBiasMode: (enabled) => set({ antiBiasMode: enabled }),
      setFontSize: (size) => set({ fontSize: size }),
      setCodeBlockTheme: (theme) => set({ codeBlockTheme: theme }),
      setAutoExportPdf: (enabled) => set({ autoExportPdf: enabled }),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => persistStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasSeenTourForTier: state.hasSeenTourForTier,
        aiModel: state.aiModel,
        defaultSeverityFilter: state.defaultSeverityFilter,
        antiBiasMode: state.antiBiasMode,
        fontSize: state.fontSize,
        codeBlockTheme: state.codeBlockTheme,
        autoExportPdf: state.autoExportPdf,
        themeMode: state.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
