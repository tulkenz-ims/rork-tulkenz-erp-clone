import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';
const COMPANY_COLORS_KEY = 'tulkenz_company_colors';

export type ThemeType =
  | 'light'
  | 'dark'
  | 'hud_cyan'
  | 'hud_green'
  | 'hud_silver'
  | 'hud_gold'
  | 'hud_purple';

export interface ThemeColors {
  // Core
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceLight: string;
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  // Borders
  border: string;
  borderLight: string;
  // Semantic
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
  // Charts
  chartColors: string[];
  // HUD-specific extras
  isHUD: boolean;
  hudPrimary: string;
  hudSecondary: string;
  hudDim: string;
  hudGlow: string;
  hudBg: string;
  hudSurface: string;
  hudBorder: string;
  hudBorderBright: string;
  hudTextStrong: string;
  hudScanColor: string;
  hudCityColor: string;
}

// ── THEME LABEL MAP (for display in Settings) ──────────────────
export const THEME_LABELS: Record<ThemeType, string> = {
  light: 'Light',
  dark: 'Dark',
  hud_cyan: 'Futuristic Cyan',
  hud_green: 'Neon Green',
  hud_silver: 'Silver Surfer',
  hud_gold: 'Silver & Gold',
  hud_purple: 'Silver & Purple',
};

// ── THEME PREVIEW COLORS (for color swatches in Settings) ──────
export const THEME_PREVIEW_COLORS: Record<ThemeType, { bg: string; accent: string }> = {
  light: { bg: '#EEEEE8', accent: '#0066CC' },
  dark: { bg: '#1C1F26', accent: '#0066CC' },
  hud_cyan: { bg: '#010B18', accent: '#00E5FF' },
  hud_green: { bg: '#010F03', accent: '#00FF41' },
  hud_silver: { bg: '#0D0D12', accent: '#C0C8D8' },
  hud_gold: { bg: '#0F0900', accent: '#FFD700' },
  hud_purple: { bg: '#080010', accent: '#CC44FF' },
};

// ── HUD BASE HELPER ────────────────────────────────────────────
// Builds a full ThemeColors from HUD color values
function buildHUDTheme(opts: {
  bg: string;
  bg2: string;
  c1: string;      // primary HUD color
  c2: string;      // secondary HUD color
  c3: string;      // dim HUD color
  textStrong: string;
  scanColor: string;
  cityColor: string;
}): ThemeColors {
  const { bg, bg2, c1, c2, c3, textStrong, scanColor, cityColor } = opts;

  return {
    // Map HUD colors to standard ThemeColors interface
    primary: c1,
    primaryDark: c3,
    primaryLight: c2,
    accent: c2,
    accentLight: c2,

    // Backgrounds
    background: bg,
    backgroundSecondary: bg2,
    backgroundTertiary: bg2,
    surface: bg2,
    surfaceLight: bg2,

    // Text
    text: textStrong,
    textSecondary: c1,
    textTertiary: `${c1}80`,

    // Borders
    border: `${c1}30`,
    borderLight: `${c1}18`,

    // Semantic — keep universal colors readable on dark HUD bg
    success: '#00FF88',
    successLight: '#66FFAA',
    successBg: 'rgba(0,255,136,0.12)',
    warning: '#FFB800',
    warningLight: '#FFD044',
    warningBg: 'rgba(255,184,0,0.12)',
    error: '#FF3344',
    errorLight: '#FF6677',
    errorBg: 'rgba(255,51,68,0.12)',
    info: c1,
    infoLight: c2,
    infoBg: `${c1}18`,
    purple: '#CC44FF',
    purpleLight: '#DD77FF',
    purpleBg: 'rgba(204,68,255,0.12)',

    // Charts
    chartColors: [c1, c2, '#FFB800', '#FF3344', '#CC44FF'],

    // HUD extras
    isHUD: true,
    hudPrimary: c1,
    hudSecondary: c2,
    hudDim: `${c1}50`,
    hudGlow: `${c1}0D`,
    hudBg: bg,
    hudSurface: bg2,
    hudBorder: `${c1}30`,
    hudBorderBright: `${c1}70`,
    hudTextStrong: textStrong,
    hudScanColor: scanColor,
    hudCityColor: cityColor,
  };
}

// ── PRESET THEMES ──────────────────────────────────────────────
const themes: Record<ThemeType, ThemeColors> = {

  // ── STANDARD DARK ──────────────────────────────────────────
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
    successBg: 'rgba(16,185,129,0.15)',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningBg: 'rgba(245,158,11,0.15)',
    error: '#EF4444',
    errorLight: '#F87171',
    errorBg: 'rgba(239,68,68,0.15)',
    info: '#3B82F6',
    infoLight: '#60A5FA',
    infoBg: 'rgba(59,130,246,0.15)',
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleBg: 'rgba(139,92,246,0.15)',
    chartColors: ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'],
    isHUD: false,
    hudPrimary: '#0066CC',
    hudSecondary: '#10B981',
    hudDim: 'rgba(0,102,204,0.5)',
    hudGlow: 'rgba(0,102,204,0.08)',
    hudBg: '#1C1F26',
    hudSurface: '#2A2E38',
    hudBorder: 'rgba(61,66,77,0.6)',
    hudBorderBright: 'rgba(61,66,77,0.9)',
    hudTextStrong: '#FFFFFF',
    hudScanColor: 'rgba(0,102,204,0.6)',
    hudCityColor: '#0066CC',
  },

  // ── STANDARD LIGHT ──────────────────────────────────────────
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
    successBg: 'rgba(16,185,129,0.1)',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningBg: 'rgba(245,158,11,0.1)',
    error: '#EF4444',
    errorLight: '#F87171',
    errorBg: 'rgba(239,68,68,0.1)',
    info: '#3B82F6',
    infoLight: '#60A5FA',
    infoBg: 'rgba(59,130,246,0.1)',
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleBg: 'rgba(139,92,246,0.1)',
    chartColors: ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'],
    isHUD: false,
    hudPrimary: '#0066CC',
    hudSecondary: '#10B981',
    hudDim: 'rgba(0,102,204,0.5)',
    hudGlow: 'rgba(0,102,204,0.08)',
    hudBg: '#EEEEE8',
    hudSurface: '#F5F5F0',
    hudBorder: 'rgba(208,208,202,0.8)',
    hudBorderBright: 'rgba(208,208,202,1)',
    hudTextStrong: '#1A1A1A',
    hudScanColor: 'rgba(0,102,204,0.4)',
    hudCityColor: '#0066CC',
  },

  // ── HUD: FUTURISTIC CYAN ─────────────────────────────────────
  hud_cyan: buildHUDTheme({
    bg: '#010B18',
    bg2: '#041428',
    c1: '#00E5FF',
    c2: '#00FFD0',
    c3: '#0099CC',
    textStrong: '#CCFEFF',
    scanColor: 'rgba(0,229,255,0.7)',
    cityColor: '#00E5FF',
  }),

  // ── HUD: NEON GREEN ──────────────────────────────────────────
  hud_green: buildHUDTheme({
    bg: '#010F03',
    bg2: '#021A06',
    c1: '#00FF41',
    c2: '#AAFF00',
    c3: '#00CC33',
    textStrong: '#CCFFCC',
    scanColor: 'rgba(0,255,65,0.7)',
    cityColor: '#00FF41',
  }),

  // ── HUD: SILVER SURFER ───────────────────────────────────────
  hud_silver: buildHUDTheme({
    bg: '#0D0D12',
    bg2: '#181820',
    c1: '#C0C8D8',
    c2: '#E8EEFA',
    c3: '#7888A8',
    textStrong: '#F0F4FF',
    scanColor: 'rgba(192,200,216,0.65)',
    cityColor: '#C0C8D8',
  }),

  // ── HUD: SILVER & GOLD ───────────────────────────────────────
  hud_gold: buildHUDTheme({
    bg: '#0F0900',
    bg2: '#1A1000',
    c1: '#FFD700',
    c2: '#FFA500',
    c3: '#CC8800',
    textStrong: '#FFF8CC',
    scanColor: 'rgba(255,215,0,0.65)',
    cityColor: '#FFD700',
  }),

  // ── HUD: SILVER & PURPLE ─────────────────────────────────────
  hud_purple: buildHUDTheme({
    bg: '#080010',
    bg2: '#100020',
    c1: '#CC44FF',
    c2: '#FF88FF',
    c3: '#8800CC',
    textStrong: '#F8CCFF',
    scanColor: 'rgba(204,68,255,0.65)',
    cityColor: '#CC44FF',
  }),
};

// ── HELPER: contrasting bar text ───────────────────────────────
function barTextColor(hexColors: string[]): string {
  if (hexColors.length === 0) return '#FFFFFF';
  const hex = hexColors[0].replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

// ── CONTEXT ────────────────────────────────────────────────────
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

        // Migrate old/invalid theme names → dark
        const validThemes: ThemeType[] = ['light','dark','hud_cyan','hud_green','hud_silver','hud_gold','hud_purple'];
        if (saved && validThemes.includes(saved as ThemeType)) {
          setThemeName(saved as ThemeType);
        } else if (saved) {
          // Old theme name — migrate to dark
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

  const barColors = useMemo<string[]>(() => {
    if (companyColors.length === 0) return [colors.surface, colors.surface];
    if (companyColors.length === 1) return [companyColors[0], companyColors[0]];
    return companyColors;
  }, [companyColors, colors.surface]);

  const barText = useMemo(() => barTextColor(companyColors), [companyColors]);

  const isHUD = useMemo(() => colors.isHUD, [colors]);

  return {
    theme: themeName,
    setTheme,
    colors,
    isLoading,
    companyColors,
    setCompanyColors,
    barColors,
    barText,
    isHUD,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors => {
  return themes[theme] || themes.dark;
};
