import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';
const COMPANY_COLORS_KEY = 'tulkenz_company_colors';

export type ThemeType =
  | 'hud_cyan_dark'
  | 'hud_cyan_light'
  | 'hud_green_dark'
  | 'hud_green_light'
  | 'hud_silver_dark'
  | 'hud_silver_light'
  | 'hud_gold_dark'
  | 'hud_gold_light'
  | 'hud_purple_dark'
  | 'hud_purple_light'
  | 'hud_blue_dark'
  | 'hud_blue_light';

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
  // HUD-specific
  isHUD: boolean;
  isLight: boolean;
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

// ── THEME LABEL MAP ────────────────────────────────────────────
export const THEME_LABELS: Record<ThemeType, string> = {
  hud_cyan_dark:    'Futuristic Cyan — Dark',
  hud_cyan_light:   'Futuristic Cyan — Light',
  hud_green_dark:   'Neon Green — Dark',
  hud_green_light:  'Neon Green — Light',
  hud_silver_dark:  'Silver Surfer — Dark',
  hud_silver_light: 'Silver Surfer — Light',
  hud_gold_dark:    'Silver & Gold — Dark',
  hud_gold_light:   'Silver & Gold — Light',
  hud_purple_dark:  'Silver & Purple — Dark',
  hud_purple_light: 'Silver & Purple — Light',
  hud_blue_dark:    'Electric Blue — Dark',
  hud_blue_light:   'Electric Blue — Light',
};

// ── THEME GROUPS for Settings display ─────────────────────────
export const THEME_GROUPS: { label: string; themes: ThemeType[] }[] = [
  {
    label: 'Futuristic Cyan',
    themes: ['hud_cyan_dark', 'hud_cyan_light'],
  },
  {
    label: 'Neon Green',
    themes: ['hud_green_dark', 'hud_green_light'],
  },
  {
    label: 'Silver Surfer',
    themes: ['hud_silver_dark', 'hud_silver_light'],
  },
  {
    label: 'Silver & Gold',
    themes: ['hud_gold_dark', 'hud_gold_light'],
  },
  {
    label: 'Silver & Purple',
    themes: ['hud_purple_dark', 'hud_purple_light'],
  },
  {
    label: 'Electric Blue',
    themes: ['hud_blue_dark', 'hud_blue_light'],
  },
];

// ── THEME PREVIEW COLORS ───────────────────────────────────────
export const THEME_PREVIEW_COLORS: Record<ThemeType, { bg: string; accent: string; label: string }> = {
  hud_cyan_dark:    { bg: '#010B18', accent: '#00E5FF', label: 'Dark' },
  hud_cyan_light:   { bg: '#1A2A35', accent: '#00E5FF', label: 'Light' },
  hud_green_dark:   { bg: '#010F03', accent: '#00FF41', label: 'Dark' },
  hud_green_light:  { bg: '#0F1F12', accent: '#00FF41', label: 'Light' },
  hud_silver_dark:  { bg: '#0D0D12', accent: '#C0C8D8', label: 'Dark' },
  hud_silver_light: { bg: '#222230', accent: '#C0C8D8', label: 'Light' },
  hud_gold_dark:    { bg: '#0F0900', accent: '#FFD700', label: 'Dark' },
  hud_gold_light:   { bg: '#1F1600', accent: '#FFD700', label: 'Light' },
  hud_purple_dark:  { bg: '#080010', accent: '#CC44FF', label: 'Dark' },
  hud_purple_light: { bg: '#180028', accent: '#CC44FF', label: 'Light' },
  hud_blue_dark:    { bg: '#00001A', accent: '#88CCFF', label: 'Dark' },
  hud_blue_light:   { bg: '#0A1428', accent: '#88CCFF', label: 'Light' },
};

// ── HUD THEME BUILDER ──────────────────────────────────────────
function buildHUD(opts: {
  bg: string;
  bg2: string;
  bg3: string;
  surface: string;
  c1: string;       // primary accent
  c2: string;       // secondary accent
  c3: string;       // dim accent
  textStrong: string;
  textMid: string;
  textDim: string;
  scanColor: string;
  isLight: boolean;
}): ThemeColors {
  const { bg, bg2, bg3, surface, c1, c2, c3, textStrong, textMid, textDim, scanColor, isLight } = opts;

  return {
    primary: c1,
    primaryDark: c3,
    primaryLight: c2,
    accent: c2,
    accentLight: c2,

    background: bg,
    backgroundSecondary: bg2,
    backgroundTertiary: bg3,
    surface: surface,
    surfaceLight: bg2,

    text: textStrong,
    textSecondary: textMid,
    textTertiary: textDim,

    border: `${c1}28`,
    borderLight: `${c1}14`,

    // Semantic — universal, always readable on any HUD bg
    success: '#00FF88',
    successLight: '#66FFAA',
    successBg: 'rgba(0,255,136,0.14)',
    warning: '#FFB800',
    warningLight: '#FFD044',
    warningBg: 'rgba(255,184,0,0.14)',
    error: '#FF3344',
    errorLight: '#FF6677',
    errorBg: 'rgba(255,51,68,0.14)',
    info: c1,
    infoLight: c2,
    infoBg: `${c1}18`,
    purple: '#CC44FF',
    purpleLight: '#DD77FF',
    purpleBg: 'rgba(204,68,255,0.14)',

    chartColors: [c1, c2, '#FFB800', '#FF3344', '#CC44FF'],

    isHUD: true,
    isLight,
    hudPrimary: c1,
    hudSecondary: c2,
    hudDim: `${c1}45`,
    hudGlow: `${c1}0C`,
    hudBg: bg,
    hudSurface: surface,
    hudBorder: `${c1}28`,
    hudBorderBright: `${c1}6A`,
    hudTextStrong: textStrong,
    hudScanColor: scanColor,
    hudCityColor: c1,
  };
}

// ── ALL 12 THEMES ──────────────────────────────────────────────
const themes: Record<ThemeType, ThemeColors> = {

  // ── FUTURISTIC CYAN — DARK ───────────────────────────────────
  hud_cyan_dark: buildHUD({
    bg:         '#010B18',
    bg2:        '#041428',
    bg3:        '#071E3A',
    surface:    '#051628',
    c1:         '#00E5FF',
    c2:         '#00FFD0',
    c3:         '#0099CC',
    textStrong: '#CCFEFF',
    textMid:    '#7ADEEF',
    textDim:    '#3D8899',
    scanColor:  'rgba(0,229,255,0.65)',
    isLight:    false,
  }),

  // ── FUTURISTIC CYAN — LIGHT ──────────────────────────────────
  hud_cyan_light: buildHUD({
    bg:         '#1A2A35',
    bg2:        '#223340',
    bg3:        '#2A3D4A',
    surface:    '#1E3040',
    c1:         '#00E5FF',
    c2:         '#00FFD0',
    c3:         '#0099CC',
    textStrong: '#EEFCFF',
    textMid:    '#9EEEFF',
    textDim:    '#5AADBB',
    scanColor:  'rgba(0,229,255,0.5)',
    isLight:    true,
  }),

  // ── NEON GREEN — DARK ────────────────────────────────────────
  hud_green_dark: buildHUD({
    bg:         '#010F03',
    bg2:        '#021A06',
    bg3:        '#042210',
    surface:    '#031408',
    c1:         '#00FF41',
    c2:         '#AAFF00',
    c3:         '#00CC33',
    textStrong: '#CCFFCC',
    textMid:    '#77EE77',
    textDim:    '#338844',
    scanColor:  'rgba(0,255,65,0.6)',
    isLight:    false,
  }),

  // ── NEON GREEN — LIGHT ───────────────────────────────────────
  hud_green_light: buildHUD({
    bg:         '#0F1F12',
    bg2:        '#162618',
    bg3:        '#1C2E1E',
    surface:    '#122015',
    c1:         '#00FF41',
    c2:         '#AAFF00',
    c3:         '#00CC33',
    textStrong: '#DDFFDD',
    textMid:    '#99EE99',
    textDim:    '#55AA66',
    scanColor:  'rgba(0,255,65,0.45)',
    isLight:    true,
  }),

  // ── SILVER SURFER — DARK ─────────────────────────────────────
  hud_silver_dark: buildHUD({
    bg:         '#0D0D12',
    bg2:        '#181820',
    bg3:        '#202028',
    surface:    '#141418',
    c1:         '#C0C8D8',
    c2:         '#E8EEFA',
    c3:         '#7888A8',
    textStrong: '#F0F4FF',
    textMid:    '#A8B4CC',
    textDim:    '#606880',
    scanColor:  'rgba(192,200,216,0.55)',
    isLight:    false,
  }),

  // ── SILVER SURFER — LIGHT ────────────────────────────────────
  hud_silver_light: buildHUD({
    bg:         '#222230',
    bg2:        '#2A2A3A',
    bg3:        '#323244',
    surface:    '#262636',
    c1:         '#C0C8D8',
    c2:         '#E8EEFA',
    c3:         '#7888A8',
    textStrong: '#FFFFFF',
    textMid:    '#BCC8DC',
    textDim:    '#788899',
    scanColor:  'rgba(192,200,216,0.45)',
    isLight:    true,
  }),

  // ── SILVER & GOLD — DARK ─────────────────────────────────────
  hud_gold_dark: buildHUD({
    bg:         '#0F0900',
    bg2:        '#1A1200',
    bg3:        '#221800',
    surface:    '#140E00',
    c1:         '#FFD700',
    c2:         '#FFA500',
    c3:         '#CC8800',
    textStrong: '#FFF8CC',
    textMid:    '#DDBB55',
    textDim:    '#997722',
    scanColor:  'rgba(255,215,0,0.6)',
    isLight:    false,
  }),

  // ── SILVER & GOLD — LIGHT ────────────────────────────────────
  hud_gold_light: buildHUD({
    bg:         '#1F1600',
    bg2:        '#281C00',
    bg3:        '#322200',
    surface:    '#241A00',
    c1:         '#FFD700',
    c2:         '#FFA500',
    c3:         '#CC8800',
    textStrong: '#FFFADD',
    textMid:    '#EEC833',
    textDim:    '#AA8800',
    scanColor:  'rgba(255,215,0,0.45)',
    isLight:    true,
  }),

  // ── SILVER & PURPLE — DARK ───────────────────────────────────
  hud_purple_dark: buildHUD({
    bg:         '#080010',
    bg2:        '#100020',
    bg3:        '#18002A',
    surface:    '#0C0018',
    c1:         '#CC44FF',
    c2:         '#FF88FF',
    c3:         '#8800CC',
    textStrong: '#F8CCFF',
    textMid:    '#CC77EE',
    textDim:    '#7733AA',
    scanColor:  'rgba(204,68,255,0.6)',
    isLight:    false,
  }),

  // ── SILVER & PURPLE — LIGHT ──────────────────────────────────
  hud_purple_light: buildHUD({
    bg:         '#180028',
    bg2:        '#200034',
    bg3:        '#28003E',
    surface:    '#1C002E',
    c1:         '#CC44FF',
    c2:         '#FF88FF',
    c3:         '#8800CC',
    textStrong: '#FFDDFF',
    textMid:    '#DD99FF',
    textDim:    '#9944BB',
    scanColor:  'rgba(204,68,255,0.45)',
    isLight:    true,
  }),

  // ── ELECTRIC BLUE — DARK ─────────────────────────────────────
  hud_blue_dark: buildHUD({
    bg:         '#00001A',
    bg2:        '#000822',
    bg3:        '#00102E',
    surface:    '#00041E',
    c1:         '#88CCFF',
    c2:         '#AAEEFF',
    c3:         '#3366CC',
    textStrong: '#DDEEFF',
    textMid:    '#88BBDD',
    textDim:    '#335577',
    scanColor:  'rgba(136,204,255,0.6)',
    isLight:    false,
  }),

  // ── ELECTRIC BLUE — LIGHT ────────────────────────────────────
  hud_blue_light: buildHUD({
    bg:         '#0A1428',
    bg2:        '#101C34',
    bg3:        '#162240',
    surface:    '#0E1830',
    c1:         '#88CCFF',
    c2:         '#AAEEFF',
    c3:         '#3366CC',
    textStrong: '#EEF8FF',
    textMid:    '#99CCEE',
    textDim:    '#446688',
    scanColor:  'rgba(136,204,255,0.45)',
    isLight:    true,
  }),
};

// ── VALID THEME LIST ───────────────────────────────────────────
const VALID_THEMES: ThemeType[] = [
  'hud_cyan_dark', 'hud_cyan_light',
  'hud_green_dark', 'hud_green_light',
  'hud_silver_dark', 'hud_silver_light',
  'hud_gold_dark', 'hud_gold_light',
  'hud_purple_dark', 'hud_purple_light',
  'hud_blue_dark', 'hud_blue_light',
];

// ── BAR TEXT HELPER ────────────────────────────────────────────
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
  const [themeName, setThemeName] = useState<ThemeType>('hud_cyan_dark');
  const [companyColors, setCompanyColorsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [saved, savedColors] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(COMPANY_COLORS_KEY),
        ]);

        if (saved && VALID_THEMES.includes(saved as ThemeType)) {
          setThemeName(saved as ThemeType);
        } else if (saved) {
          // Migrate old theme names to default HUD
          setThemeName('hud_cyan_dark');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'hud_cyan_dark');
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
    return themes[themeName] || themes.hud_cyan_dark;
  }, [themeName]);

  const barColors = useMemo<string[]>(() => {
    if (companyColors.length === 0) return [colors.surface, colors.surface];
    if (companyColors.length === 1) return [companyColors[0], companyColors[0]];
    return companyColors;
  }, [companyColors, colors.surface]);

  const barText = useMemo(() => barTextColor(companyColors), [companyColors]);

  const isHUD = true; // always true — all themes are HUD
  const isLight = useMemo(() => colors.isLight, [colors]);

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
    isLight,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors => {
  return themes[theme] || themes.hud_cyan_dark;
};
