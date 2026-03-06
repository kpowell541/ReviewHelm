import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { lightColors } from './lightColors';
import { usePreferencesStore } from '../store/usePreferencesStore';

export type ThemeColors = { [K in keyof typeof colors]: string };

const ThemeContext = createContext<ThemeColors>(colors);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const systemScheme = useColorScheme();

  const resolvedColors = useMemo<ThemeColors>(() => {
    if (themeMode === 'light') return lightColors;
    if (themeMode === 'dark') return colors;
    return systemScheme === 'light' ? lightColors : colors;
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={resolvedColors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext);
}
