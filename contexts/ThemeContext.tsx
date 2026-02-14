import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';

export type ThemeType = 'light' | 'dark' | 'blue' | 'rust';

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

const themes: Record<ThemeType, ThemeColors> = {
  dark: {
    primary: '#0066CC',
    primaryDark: '#004C99',
    primaryLight: '#3399FF',
    accent: '#10B981',
    accentLight: '#34D399',
    background: '#0A0F1A',
    backgroundSecondary: '#111827',
    backgroundTertiary: '#1F2937',
    surface: '#1A2332',
    surfaceLight: '#243044',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#374151',
    borderLight: '#4B5563',
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
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    backgroundTertiary: '#E2E8F0',
    surface: '#FFFFFF',
    surfaceLight: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',
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
  blue: {
    primary: '#0073CF',
    primaryDark: '#005BA3',
    primaryLight: '#339FE0',
    accent: '#06B6D4',
    accentLight: '#22D3EE',
    background: '#091520',
    backgroundSecondary: '#0F1E2E',
    backgroundTertiary: '#17293D',
    surface: '#153050',
    surfaceLight: '#1E4068',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#1E4068',
    borderLight: '#2A5580',
    success: '#10B981',
    successLight: '#34D399',
    successBg: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    error: '#EF4444',
    errorLight: '#F87171',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    info: '#0073CF',
    infoLight: '#339FE0',
    infoBg: 'rgba(0, 115, 207, 0.15)',
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleBg: 'rgba(139, 92, 246, 0.15)',
    chartColors: ['#339FE0', '#22D3EE', '#34D399', '#FBBF24', '#A78BFA'],
  },
  rust: {
    primary: '#C0C0C0',
    primaryDark: '#A0A0A0',
    primaryLight: '#D4D4D4',
    accent: '#10B981',
    accentLight: '#34D399',
    background: '#1A1A1A',
    backgroundSecondary: '#222222',
    backgroundTertiary: '#2E2E2E',
    surface: '#333333',
    surfaceLight: '#404040',
    text: '#F0F0F0',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    border: '#404040',
    borderLight: '#505050',
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
    chartColors: ['#C0C0C0', '#A0A0A0', '#10B981', '#3B82F6', '#8B5CF6'],
  },
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeName, setThemeName] = useState<ThemeType>('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'blue' || savedTheme === 'rust')) {
          setThemeName(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const setTheme = useCallback(async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeName(newTheme);
      console.log('Theme changed to:', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const colors = useMemo(() => themes[themeName], [themeName]);

  return {
    theme: themeName,
    setTheme,
    colors,
    isLoading,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors => themes[theme];
