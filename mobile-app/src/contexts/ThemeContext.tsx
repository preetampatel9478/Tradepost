import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeType;
  setThemeMode: (mode: ThemeType) => void;
  colors: typeof darkColors;
}

const darkColors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  border: 'rgba(255, 255, 255, 0.1)',
  searchBg: 'rgba(15, 23, 42, 0.42)',
  verifiedBlue: '#3B82F6',
  bullish: '#10B981', // Emerald Green
  bearish: '#F43F5E', // Rose Red
  disclaimer: '#94A3B8',
};

const lightColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  searchBg: '#F1F5F9',
  verifiedBlue: '#3B82F6',
  bullish: '#10B981', // Emerald Green
  bearish: '#F43F5E', // Rose Red
  disclaimer: '#64748B',
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  themeMode: 'system',
  setThemeMode: () => {},
  colors: darkColors,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeType>('system');

  const activeTheme = themeMode === 'system' ? (systemColorScheme || 'dark') : themeMode;
  const colors = activeTheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, themeMode, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
