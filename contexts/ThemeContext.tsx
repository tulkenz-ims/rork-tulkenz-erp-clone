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
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    accent: '#06B6D4',
    accentLight: '#22D3EE',
    background: '#0C1222',
    backgroundSecondary: '#131C31',
    backgroundTertiary: '#1E293B',
    surface: '#1E3A5F',
    surfaceLight: '#2D4A6F',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    borderLight: '#475569',
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
    chartColors: ['#60A5FA', '#22D3EE', '#34D399', '#FBBF24', '#A78BFA'],
  },
  rust: {
    primary: '#D97706',
    primaryDark: '#B45309',
    primaryLight: '#F59E0B',
    accent: '#10B981',
    accentLight: '#34D399',
    background: '#1C1410',
    backgroundSecondary: '#261C15',
    backgroundTertiary: '#332518',
    surface: '#3D2D1F',
    surfaceLight: '#4D3D2F',
    text: '#FEF3C7',
    textSecondary: '#D6B88D',
    textTertiary: '#A68B5B',
    border: '#4D3D2F',
    borderLight: '#5D4D3F',
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
    chartColors: ['#F59E0B', '#D97706', '#10B981', '#3B82F6', '#8B5CF6'],
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
