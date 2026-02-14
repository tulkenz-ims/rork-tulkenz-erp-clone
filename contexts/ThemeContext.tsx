import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';
const COMPANY_COLORS_KEY = 'tulkenz_company_colors';

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  success: string;
  successLight: string;
  successBg: string;
  warning: string;
  warningLight: string;
  warningBg: string;
  error: string;
  errorLight: string;
  errorBg: string;
  info: string;
  infoLight: string;
  infoBg: string;
  purple: string;
  purpleLight: string;
  purpleBg: string;
  chartColors: string[];
}

// ── Preset themes ──────────────────────────────────────────────
const themes: Record<ThemeType, ThemeColors> = {
  dark: {
    primary: '#0066CC',
    primaryDark: '#004C99',
    primaryLight: '#3399FF',
    accent: '#10B981',
    accentLight: '#34D399',
    background: '#1C1F26',
    backgroundSecondary: '#242830',
    backgroundTertiary: '#2E323B',
    surface: '#2A2E38',
    surfaceLight: '#353A45',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#3D424D',
    borderLight: '#4D535F',
    success: '#10B981',
    successLight: '#34D399',
    successBg: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    error: '#EF4444',
    errorLight: '#F87171',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    info: '#3B82F6',
    infoLight: '#60A5FA',
    infoBg: 'rgba(59, 130, 246, 0.15)',
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleBg: 'rgba(139, 92, 246, 0.15)',
    chartColors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  },
  light: {
    primary: '#0066CC',
    primaryDark: '#004C99',
    primaryLight: '#3399FF',
    accent: '#10B981',
    accentLight: '#34D399',
    background: '#EEEEE8',
    backgroundSecondary: '#E5E5DF',
    backgroundTertiary: '#D9D9D3',
    surface: '#F5F5F0',
    surfaceLight: '#ECECEA',
    text: '#1A1A1A',
    textSecondary: '#555555',
    textTertiary: '#888888',
    border: '#D0D0CA',
    borderLight: '#C0C0BA',
    success: '#10B981',
    successLight: '#34D399',
    successBg: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444',
    errorLight: '#F87171',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    info: '#3B82F6',
    infoLight: '#60A5FA',
    infoBg: 'rgba(59, 130, 246, 0.1)',
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleBg: 'rgba(139, 92, 246, 0.1)',
    chartColors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  },
};

// ── Helper: compute contrasting text for any bar color ─────────
function barTextColor(hexColors: string[]): string {
  if (hexColors.length === 0) return '#FFFFFF';
  // Use the first color to determine text contrast
  const hex = hexColors[0].replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

// ── Context ────────────────────────────────────────────────────
export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeName, setThemeName] = useState<ThemeType>('dark');
  const [companyColors, setCompanyColorsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [saved, savedColors] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(COMPANY_COLORS_KEY),
        ]);
        if (saved === 'light' || saved === 'dark') {
          setThemeName(saved);
        }
        // Migrate old custom/blue/rust → dark
        if (saved === 'custom' || saved === 'blue' || saved === 'rust') {
          setThemeName('dark');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        }
        if (savedColors) {
          try {
            const parsed = JSON.parse(savedColors);
            if (Array.isArray(parsed)) setCompanyColorsState(parsed);
          } catch {}
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const setTheme = useCallback(async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeName(newTheme);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  }, []);

  const setCompanyColors = useCallback(async (newColors: string[]) => {
    try {
      // Max 3 colors
      const trimmed = newColors.slice(0, 3);
      setCompanyColorsState(trimmed);
      await AsyncStorage.setItem(COMPANY_COLORS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving company colors:', e);
    }
  }, []);

  const colors = useMemo<ThemeColors>(() => {
    return themes[themeName] || themes.dark;
  }, [themeName]);

  // Bar gradient: returns the array for LinearGradient colors prop
  // Falls back to surface color if no company colors set
  const barColors = useMemo<string[]>(() => {
    if (companyColors.length === 0) return [colors.surface, colors.surface];
    if (companyColors.length === 1) return [companyColors[0], companyColors[0]];
    return companyColors;
  }, [companyColors, colors.surface]);

  const barText = useMemo(() => barTextColor(companyColors), [companyColors]);

  return {
    theme: themeName,
    setTheme,
    colors,
    isLoading,
    companyColors,
    setCompanyColors,
    barColors,
    barText,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors => {
  return themes[theme] || themes.dark;
};
