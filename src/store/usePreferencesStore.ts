import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Severity } from '../data/types';

interface PreferencesState {
  apiKey: string;
  defaultSeverityFilter: Severity[];
  antiBiasMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  codeBlockTheme: 'dark' | 'light';
  autoExportPdf: boolean;

  setApiKey: (key: string) => void;
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
      defaultSeverityFilter: ['blocker', 'major', 'minor', 'nit'],
      antiBiasMode: true,
      fontSize: 'medium',
      codeBlockTheme: 'dark',
      autoExportPdf: false,

      setApiKey: (key) => set({ apiKey: key }),
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
    }
  )
);
