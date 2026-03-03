import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors, Shadows, CardFooterBg, Gradients } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: typeof Colors;
  shadows: typeof Shadows;
  gradients: typeof Gradients;
  cardFooterBg: string;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = '@eventez_theme_mode';

// ✅ Provide a default context value so useTheme() never throws
const defaultContext: ThemeContextType = {
  colors: Colors,
  shadows: Shadows,
  gradients: Gradients,
  cardFooterBg: CardFooterBg.light,
  isDark: false,
  mode: 'system',
  setMode: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    }).catch(() => {});
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const isDark = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark';
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo(() => (isDark ? DarkColors : Colors), [isDark]);

  const shadows = useMemo(() => ({ ...Shadows }), [isDark]);

  const gradients = useMemo(() => {
    if (!isDark) return Gradients;
    return {
      ...Gradients,
      brand: Gradients.brandDark,
      primary: [DarkColors.primary, DarkColors.primaryDark] as const,
      light: ['rgba(15,15,26,0)', 'rgba(15,15,26,1)'] as const,
    };
  }, [isDark]);

  const cardFooterBg = isDark ? CardFooterBg.dark : CardFooterBg.light;

  const value = useMemo<ThemeContextType>(() => ({
    colors,
    shadows,
    gradients,
    cardFooterBg,
    isDark,
    mode,
    setMode,
    toggleTheme,
  }), [colors, shadows, gradients, cardFooterBg, isDark, mode, setMode, toggleTheme]);

  // ✅ Always render children — no null return
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  // ✅ No undefined check needed since context always has a value
  return useContext(ThemeContext);
}