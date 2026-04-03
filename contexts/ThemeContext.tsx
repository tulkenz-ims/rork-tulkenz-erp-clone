import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';
const COMPANY_COLORS_KEY = 'tulkenz_company_colors';

export type ThemeType =
  | 'hud_cyan'
  | 'clean_light'
  | 'classic'
  | 'ghost_protocol';

export interface ThemeColors {
  // ── Standard tokens ──────────────────────────────────────────
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
  // ── Theme meta ───────────────────────────────────────────────
  isHUD: boolean;
  isLight: boolean;
  // ── HUD-specific tokens (used by HUD screens) ────────────────
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
  // ── Department pill colors ───────────────────────────────────
  deptColors: Record<string, string>;
}

export const THEME_LABELS: Record<ThemeType, string> = {
  hud_cyan:       'HUD Cyan — Dark',
  clean_light:    'Clean Light',
  classic:        'Classic',
  ghost_protocol: 'Ghost Protocol',
};

export const THEME_GROUPS: { label: string; themes: ThemeType[] }[] = [
  { label: 'Futuristic',  themes: ['hud_cyan']       },
  { label: 'Light',       themes: ['clean_light', 'classic', 'ghost_protocol'] },
];

export const THEME_PREVIEW_COLORS: Record<ThemeType, { bg: string; accent: string; label: string }> = {
  hud_cyan:       { bg: '#010B18', accent: '#00D4EE', label: 'Dark'  },
  clean_light:    { bg: '#F4F5F7', accent: '#2266DD', label: 'Light' },
  classic:        { bg: '#F5F0E8', accent: '#8B6F47', label: 'Light' },
  ghost_protocol: { bg: '#F8F8F8', accent: '#CC0000', label: 'Light' },
};

// ── Shared semantic colors (same across all themes) ──────────────
const SEMANTIC = {
  success:    '#00CC66',
  successL:   '#00EE77',
  successBg:  'rgba(0,204,102,0.10)',
  warning:    '#CC9900',
  warningL:   '#DDAA00',
  warningBg:  'rgba(204,153,0,0.10)',
  error:      '#DD2233',
  errorL:     '#EE4455',
  errorBg:    'rgba(221,34,51,0.10)',
  purple:     '#8844BB',
  purpleL:    '#AA66DD',
  purpleBg:   'rgba(136,68,187,0.10)',
};

// ── Default dept colors ──────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  maintenance:  '#2266DD',
  sanitation:   '#00AA55',
  production:   '#EE9900',
  quality:      '#AA44BB',
  safety:       '#EE3344',
  hr:           '#EE4499',
  warehouse:    '#44BB44',
  projects:     '#00BBAA',
};

// ── HUD Cyan Dark ────────────────────────────────────────────────
// textSecondary: bumped from #6ABECC to #8ED8E8 — clearly readable on dark bg
// textTertiary:  bumped from #2E6A7A to #5AAABB — visible but still secondary
const hudCyan: ThemeColors = {
  primary: '#00D4EE', primaryDark: '#0088AA', primaryLight: '#00BBCC',
  accent: '#00BBCC', accentLight: '#00D4EE',
  background: '#010B18', backgroundSecondary: '#031220', backgroundTertiary: '#051A2E',
  surface: '#040F1C', surfaceLight: '#031220',
  text: '#C8F0F8',
  textSecondary: '#8ED8E8',   // was #6ABECC — brighter, clearly readable
  textTertiary:  '#5AAABB',   // was #2E6A7A — nearly invisible, now visible
  border: 'rgba(0,212,238,0.25)', borderLight: 'rgba(0,212,238,0.14)',
  ...SEMANTIC,
  info: '#00D4EE', infoLight: '#00BBCC', infoBg: 'rgba(0,212,238,0.10)',
  chartColors: ['#00D4EE', '#00BBCC', '#CC9900', '#DD2233', '#8844BB'],
  isHUD: true, isLight: false,
  hudPrimary: '#00D4EE', hudSecondary: '#00BBCC',
  hudDim: 'rgba(0,212,238,0.40)', hudGlow: 'rgba(0,212,238,0.08)',
  hudBg: '#010B18', hudSurface: '#040F1C',
  hudBorder: 'rgba(0,212,238,0.25)', hudBorderBright: 'rgba(0,212,238,0.55)',
  hudTextStrong: '#C8F0F8',
  hudScanColor: 'rgba(0,212,238,0.5)',
  hudCityColor: '#00D4EE',
  deptColors: DEPT_COLORS,
};

// ── Clean Light ──────────────────────────────────────────────────
const cleanLight: ThemeColors = {
  primary: '#2266DD', primaryDark: '#1144BB', primaryLight: '#5599EE',
  accent: '#EE9900', accentLight: '#FFBB33',
  background: '#F4F5F7', backgroundSecondary: '#FFFFFF', backgroundTertiary: '#EAEBEE',
  surface: '#FFFFFF', surfaceLight: '#F8F8FC',
  text: '#1A1A2E', textSecondary: '#444466', textTertiary: '#777799',
  border: '#E8E8EC', borderLight: '#F0F0F4',
  ...SEMANTIC,
  info: '#2266DD', infoLight: '#5599EE', infoBg: 'rgba(34,102,221,0.08)',
  chartColors: ['#2266DD', '#EE9900', '#00AA55', '#DD2233', '#8844BB'],
  isHUD: false, isLight: true,
  hudPrimary: '#2266DD', hudSecondary: '#EE9900',
  hudDim: 'rgba(34,102,221,0.25)', hudGlow: 'rgba(34,102,221,0.06)',
  hudBg: '#F4F5F7', hudSurface: '#FFFFFF',
  hudBorder: '#E8E8EC', hudBorderBright: '#CCCCDD',
  hudTextStrong: '#1A1A2E',
  hudScanColor: 'rgba(34,102,221,0.15)',
  hudCityColor: '#2266DD',
  deptColors: DEPT_COLORS,
};

// ── Classic ──────────────────────────────────────────────────────
const classic: ThemeColors = {
  primary: '#8B6F47', primaryDark: '#6B5030', primaryLight: '#AA8855',
  accent: '#2A5A30', accentLight: '#3A7A40',
  background: '#F5F0E8', backgroundSecondary: '#EDE8DC', backgroundTertiary: '#E5DFD0',
  surface: '#FAF7F2', surfaceLight: '#F0EBE0',
  text: '#3A2A15', textSecondary: '#5A3A20', textTertiary: '#7A5A35',
  border: '#D8CDB8', borderLight: '#E8E0D0',
  success: '#2A5A30', successLight: '#3A7A40', successBg: 'rgba(42,90,48,0.10)',
  warning: '#8B6F00', warningLight: '#AA8800', warningBg: 'rgba(139,111,0,0.10)',
  error: '#8B2020', errorLight: '#AA3333', errorBg: 'rgba(139,32,32,0.10)',
  info: '#2A4A6B', infoLight: '#3A6A9B', infoBg: 'rgba(42,74,107,0.10)',
  purple: '#6B3A8B', purpleLight: '#8B5AAB', purpleBg: 'rgba(107,58,139,0.10)',
  chartColors: ['#8B6F47', '#2A5A30', '#8B6F00', '#8B2020', '#6B3A8B'],
  isHUD: false, isLight: true,
  hudPrimary: '#8B6F47', hudSecondary: '#6B5030',
  hudDim: 'rgba(139,111,71,0.30)', hudGlow: 'rgba(139,111,71,0.06)',
  hudBg: '#F5F0E8', hudSurface: '#FAF7F2',
  hudBorder: '#D8CDB8', hudBorderBright: '#C8B89A',
  hudTextStrong: '#3A2A15',
  hudScanColor: 'rgba(139,111,71,0.15)',
  hudCityColor: '#8B6F47',
  deptColors: {
    ...DEPT_COLORS,
    maintenance: '#2A4A6B',
    sanitation:  '#2A5A30',
    production:  '#8B6F00',
    safety:      '#8B2020',
  },
};

// ── Ghost Protocol ───────────────────────────────────────────────
const ghostProtocol: ThemeColors = {
  primary: '#111111', primaryDark: '#000000', primaryLight: '#333333',
  accent: '#CC0000', accentLight: '#EE2222',
  background: '#F8F8F8', backgroundSecondary: '#FFFFFF', backgroundTertiary: '#F0F0F0',
  surface: '#FFFFFF', surfaceLight: '#F8F8F8',
  text: '#111111', textSecondary: '#333333', textTertiary: '#666666',
  border: '#E0E0E0', borderLight: '#EEEEEE',
  success: '#006633', successLight: '#009944', successBg: 'rgba(0,102,51,0.08)',
  warning: '#CC6600', warningLight: '#EE8800', warningBg: 'rgba(204,102,0,0.08)',
  error: '#CC0000', errorLight: '#EE2222', errorBg: 'rgba(204,0,0,0.08)',
  info: '#003388', infoLight: '#2255AA', infoBg: 'rgba(0,51,136,0.08)',
  purple: '#550088', purpleLight: '#7722AA', purpleBg: 'rgba(85,0,136,0.08)',
  chartColors: ['#111111', '#CC0000', '#006633', '#CC6600', '#003388'],
  isHUD: false, isLight: true,
  hudPrimary: '#111111', hudSecondary: '#CC0000',
  hudDim: 'rgba(17,17,17,0.25)', hudGlow: 'rgba(17,17,17,0.05)',
  hudBg: '#F8F8F8', hudSurface: '#FFFFFF',
  hudBorder: '#E0E0E0', hudBorderBright: '#CCCCCC',
  hudTextStrong: '#111111',
  hudScanColor: 'rgba(204,0,0,0.10)',
  hudCityColor: '#CC0000',
  deptColors: {
    ...DEPT_COLORS,
    maintenance: '#003388',
    safety:      '#CC0000',
  },
};

const themes: Record<ThemeType, ThemeColors> = {
  hud_cyan:       hudCyan,
  clean_light:    cleanLight,
  classic:        classic,
  ghost_protocol: ghostProtocol,
};

const VALID_THEMES: ThemeType[] = [
  'hud_cyan', 'clean_light', 'classic', 'ghost_protocol',
];

function barTextColor(hexColors: string[]): string {
  if (hexColors.length === 0) return '#FFFFFF';
  const hex = hexColors[0].replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [themeName, setThemeName] = useState<ThemeType>('hud_cyan');
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
        } else {
          setThemeName('hud_cyan');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'hud_cyan');
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
    } catch (e) { console.error('Error saving theme:', e); }
  }, []);

  const setCompanyColors = useCallback(async (newColors: string[]) => {
    try {
      const trimmed = newColors.slice(0, 3);
      setCompanyColorsState(trimmed);
      await AsyncStorage.setItem(COMPANY_COLORS_KEY, JSON.stringify(trimmed));
    } catch (e) { console.error('Error saving company colors:', e); }
  }, []);

  const colors = useMemo<ThemeColors>(() => themes[themeName] || themes.hud_cyan, [themeName]);

  const barColors = useMemo<string[]>(() => {
    if (companyColors.length === 0) return [colors.surface, colors.surface];
    if (companyColors.length === 1) return [companyColors[0], companyColors[0]];
    return companyColors;
  }, [companyColors, colors.surface]);

  const barText = useMemo(() => barTextColor(companyColors), [companyColors]);
  const isHUD = useMemo(() => colors.isHUD, [colors]);
  const isLight = useMemo(() => colors.isLight, [colors]);

  return {
    theme: themeName, setTheme, colors, isLoading,
    companyColors, setCompanyColors, barColors, barText,
    isHUD, isLight,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors =>
  themes[theme] || themes.hud_cyan;
