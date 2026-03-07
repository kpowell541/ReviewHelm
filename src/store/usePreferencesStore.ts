import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { persistStorage } from '../storage/secureStorage';
import { v4 as uuidv4 } from 'uuid';
import type { Severity, ClaudeModel } from '../data/types';

const KEY_SLOT_PREFIX = 'reviewhelm-key-slot:';
const USER_KEY_INDEX = 'reviewhelm-key-index:user';
const ADMIN_KEY_INDEX = 'reviewhelm-key-index:admin';

function tokenSlotKey(token: string): string {
  return `${KEY_SLOT_PREFIX}${token}`;
}

async function clearToken(indexKey: string): Promise<void> {
  const token = await SecureStore.getItemAsync(indexKey);
  if (!token) return;
  await SecureStore.deleteItemAsync(tokenSlotKey(token));
  await SecureStore.deleteItemAsync(indexKey);
}

async function saveTokenizedKey(indexKey: string, value: string): Promise<string> {
  await clearToken(indexKey);
  const token = `atk_${uuidv4().replace(/-/g, '')}`;
  await SecureStore.setItemAsync(tokenSlotKey(token), value);
  await SecureStore.setItemAsync(indexKey, token);
  return token;
}

async function resolveTokenizedKey(indexKey: string): Promise<string> {
  const token = await SecureStore.getItemAsync(indexKey);
  if (!token) {
    throw new Error('No key configured.');
  }
  const value = await SecureStore.getItemAsync(tokenSlotKey(token));
  if (!value) {
    throw new Error('Stored key is missing. Re-enter it in Settings.');
  }
  return value;
}

async function loadTokenState(
  indexKey: string,
): Promise<{ token: string | null; has: boolean }> {
  const token = await SecureStore.getItemAsync(indexKey);
  if (!token) return { token: null, has: false };
  const value = await SecureStore.getItemAsync(tokenSlotKey(token));
  if (!value) {
    await SecureStore.deleteItemAsync(indexKey);
    return { token: null, has: false };
  }
  return { token, has: true };
}

interface PreferencesState {
  apiKeyToken: string | null;
  hasApiKey: boolean;
  adminApiKeyToken: string | null;
  hasAdminApiKey: boolean;
  isApiKeyLoaded: boolean;
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  aiModel: ClaudeModel;
  defaultSeverityFilter: Severity[];
  antiBiasMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  codeBlockTheme: 'dark' | 'light';
  autoExportPdf: boolean;
  themeMode: 'dark' | 'light' | 'system';

  setHasHydrated: (hydrated: boolean) => void;
  loadApiKey: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  resolveApiKey: () => Promise<string>;

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
      apiKeyToken: null,
      hasApiKey: false,
      adminApiKeyToken: null,
      hasAdminApiKey: false,
      isApiKeyLoaded: false,
      hasHydrated: false,
      hasCompletedOnboarding: false,
      aiModel: 'sonnet' as ClaudeModel,
      defaultSeverityFilter: ['blocker', 'major', 'minor', 'nit'],
      antiBiasMode: true,
      fontSize: 'medium',
      codeBlockTheme: 'dark',
      autoExportPdf: false,
      themeMode: 'dark' as const,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      loadApiKey: async () => {
        try {
          const [userState, adminState] = await Promise.all([
            loadTokenState(USER_KEY_INDEX),
            loadTokenState(ADMIN_KEY_INDEX),
          ]);
          set({
            apiKeyToken: userState.token,
            hasApiKey: userState.has,
            adminApiKeyToken: adminState.token,
            hasAdminApiKey: adminState.has,
            isApiKeyLoaded: true,
          });
        } catch {
          set({
            apiKeyToken: null,
            hasApiKey: false,
            adminApiKeyToken: null,
            hasAdminApiKey: false,
            isApiKeyLoaded: true,
          });
        }
      },

      setApiKey: async (key) => {
        const trimmed = key.trim();
        if (!trimmed) {
          await clearToken(USER_KEY_INDEX);
          set({ apiKeyToken: null, hasApiKey: false });
          return;
        }
        try {
          const token = await saveTokenizedKey(USER_KEY_INDEX, trimmed);
          set({ apiKeyToken: token, hasApiKey: true });
        } catch {
          set({ apiKeyToken: null, hasApiKey: false });
        }
      },

      clearApiKey: async () => {
        await clearToken(USER_KEY_INDEX);
        set({ apiKeyToken: null, hasApiKey: false });
      },

      resolveApiKey: async () => {
        try {
          return await resolveTokenizedKey(USER_KEY_INDEX);
        } catch {
          throw new Error(
            'No Claude API key configured. Add one in Settings.',
          );
        }
      },

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
        try {
          const token = await saveTokenizedKey(ADMIN_KEY_INDEX, trimmed);
          set({ adminApiKeyToken: token, hasAdminApiKey: true });
        } catch {
          set({ adminApiKeyToken: null, hasAdminApiKey: false });
        }
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
