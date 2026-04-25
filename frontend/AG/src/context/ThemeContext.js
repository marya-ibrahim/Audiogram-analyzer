// ============================================================
// THEME CONTEXT — Dark / Light theme switching
//
// Wrap your app in <ThemeProvider> and use:
//   const { theme, colors, isDark, toggleTheme } = useTheme();
// ============================================================
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { themes } from '../constants/theme';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'audiogram_theme';

const getInitialTheme = () => {
  try {
    const saved = localStorage?.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark';
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialTheme);

  useEffect(() => {
    try { localStorage?.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  const isDark = mode === 'dark';
  const colors = useMemo(() => themes[mode], [mode]);
  const toggleTheme = () => setMode(prev => prev === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => ({ theme: mode, isDark, colors, toggleTheme }), [mode, isDark, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};
