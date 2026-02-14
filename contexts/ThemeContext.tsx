import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';
const CUSTOM_BG_KEY = 'tulkenz_custom_bg';
const CUSTOM_PRIMARY_KEY = 'tulkenz_custom_primary';

export type ThemeType = 'light' | 'dark' | 'custom';

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

// ── Color math helpers ─────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function mixColors(hex1: string, hex2: string, weight: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r * weight + c2.r * (1 - weight),
    c1.g * weight + c2.g * (1 - weight),
    c1.b * weight + c2.b * (1 - weight),
  );
}

// ── Generate a full theme from background + card color ─────────
function generateCustomTheme(bg: string, cardColor: string): ThemeColors {
  const bgLum = luminance(bg);
  const cardLum = luminance(cardColor);
  const isDark = bgLum < 0.5;
  const cardIsDark = cardLum < 0.5;

  // Background variants — derived from bg
  const backgroundSecondary = isDark ? lighten(bg, 0.04) : darken(bg, 0.03);
  const backgroundTertiary = isDark ? lighten(bg, 0.08) : darken(bg, 0.06);

  // Surface = cards — derived from the card color
  const surface = cardColor;
  const surfaceLight = isDark ? lighten(cardColor, 0.08) : darken(cardColor, 0.05);

  // Border — blend between card and white/black for subtle edge
  const border = mixColors(cardColor, isDark ? '#FFFFFF' : '#000000', 0.7);
  const borderLight = mixColors(cardColor, isDark ? '#FFFFFF' : '#000000', 0.55);

  // Text — pick based on card luminance since text sits on cards
  const text = cardIsDark ? '#F0F0F0' : '#1A1A1A';
  const textSecondary = cardIsDark ? '#A0A0A0' : '#555555';
  const textTertiary = cardIsDark ? '#707070' : '#888888';

  // ALL semantic colors stay fixed — these never change with theme
  return {
    primary: '#0066CC',
    primaryDark: '#004C99',
    primaryLight: '#3399FF',
    accent: '#10B981',
    accentLight: '#34D399',
    background: bg,
    backgroundSecondary,
    backgroundTertiary,
    surface,
    surfaceLight,
    text,
    textSecondary,
    textTertiary,
    border,
    borderLight,
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
  };
}

// ── Preset themes ──────────────────────────────────────────────
const themes: Record<'light' | 'dark', ThemeColors> = {
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

// ── Context ────────────────────────────────────────────────────
export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeName, setThemeName] = useState<ThemeType>('dark');
  const [customBg, setCustomBg] = useState('#1C1F26');
  const [customPrimary, setCustomPrimary] = useState('#2A2E38');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [saved, bg, primary] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(CUSTOM_BG_KEY),
          AsyncStorage.getItem(CUSTOM_PRIMARY_KEY),
        ]);
        if (saved === 'light' || saved === 'dark' || saved === 'custom') {
          setThemeName(saved);
        }
        // Migrate old blue/rust to custom
        if (saved === 'blue' || saved === 'rust') {
          setThemeName('dark');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        }
        if (bg) setCustomBg(bg);
        if (primary) setCustomPrimary(primary);
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

  const setCustomColors = useCallback(async (bg: string, primary: string) => {
    try {
      setCustomBg(bg);
      setCustomPrimary(primary);
      await Promise.all([
        AsyncStorage.setItem(CUSTOM_BG_KEY, bg),
        AsyncStorage.setItem(CUSTOM_PRIMARY_KEY, primary),
      ]);
      // Auto-switch to custom theme
      if (themeName !== 'custom') {
        setThemeName('custom');
        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'custom');
      }
    } catch (e) {
      console.error('Error saving custom colors:', e);
    }
  }, [themeName]);

  const colors = useMemo<ThemeColors>(() => {
    if (themeName === 'custom') {
      return generateCustomTheme(customBg, customPrimary);
    }
    return themes[themeName] || themes.dark;
  }, [themeName, customBg, customPrimary]);

  return {
    theme: themeName,
    setTheme,
    colors,
    isLoading,
    customBg,
    customPrimary,
    setCustomColors,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors => {
  if (theme === 'custom') return themes.dark; // fallback for static calls
  return themes[theme] || themes.dark;
};
