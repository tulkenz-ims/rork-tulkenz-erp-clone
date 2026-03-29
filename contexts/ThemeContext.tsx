import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'tulkenz_theme';
const COMPANY_COLORS_KEY = 'tulkenz_company_colors';

export type ThemeType =
  | 'hud_cyan_dark'   | 'hud_cyan_light'
  | 'hud_green_dark'  | 'hud_green_light'
  | 'hud_silver_dark' | 'hud_silver_light'
  | 'hud_gold_dark'   | 'hud_gold_light'
  | 'hud_purple_dark' | 'hud_purple_light'
  | 'hud_blue_dark'   | 'hud_blue_light';

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

export const THEME_GROUPS: { label: string; themes: ThemeType[] }[] = [
  { label: 'Futuristic Cyan',  themes: ['hud_cyan_dark',   'hud_cyan_light']   },
  { label: 'Neon Green',       themes: ['hud_green_dark',  'hud_green_light']  },
  { label: 'Silver Surfer',    themes: ['hud_silver_dark', 'hud_silver_light'] },
  { label: 'Silver & Gold',    themes: ['hud_gold_dark',   'hud_gold_light']   },
  { label: 'Silver & Purple',  themes: ['hud_purple_dark', 'hud_purple_light'] },
  { label: 'Electric Blue',    themes: ['hud_blue_dark',   'hud_blue_light']   },
];

export const THEME_PREVIEW_COLORS: Record<ThemeType, { bg: string; accent: string; label: string }> = {
  hud_cyan_dark:    { bg: '#010B18', accent: '#00D4EE', label: 'Dark'  },
  hud_cyan_light:   { bg: '#FFFFFF', accent: '#0099AA', label: 'Light' },
  hud_green_dark:   { bg: '#020E04', accent: '#00CC33', label: 'Dark'  },
  hud_green_light:  { bg: '#FFFFFF', accent: '#008822', label: 'Light' },
  hud_silver_dark:  { bg: '#0A0A10', accent: '#A0AACC', label: 'Dark'  },
  hud_silver_light: { bg: '#FFFFFF', accent: '#445588', label: 'Light' },
  hud_gold_dark:    { bg: '#080600', accent: '#C8A000', label: 'Dark'  },
  hud_gold_light:   { bg: '#FFFFFF', accent: '#886600', label: 'Light' },
  hud_purple_dark:  { bg: '#06000E', accent: '#8844BB', label: 'Dark'  },
  hud_purple_light: { bg: '#FFFFFF', accent: '#6600AA', label: 'Light' },
  hud_blue_dark:    { bg: '#00001A', accent: '#5599DD', label: 'Dark'  },
  hud_blue_light:   { bg: '#FFFFFF', accent: '#0044AA', label: 'Light' },
};

function buildHUD(opts: {
  bg: string; bg2: string; bg3: string; surface: string;
  c1: string; c2: string; c3: string;
  textStrong: string; textMid: string; textDim: string;
  scanColor: string; isLight: boolean;
}): ThemeColors {
  const { bg, bg2, bg3, surface, c1, c2, c3, textStrong, textMid, textDim, scanColor, isLight } = opts;
  return {
    primary: c1, primaryDark: c3, primaryLight: c2,
    accent: c2, accentLight: c2,
    background: bg, backgroundSecondary: bg2, backgroundTertiary: bg3,
    surface, surfaceLight: bg2,
    text: textStrong, textSecondary: textMid, textTertiary: textDim,
    border: `${c1}28`, borderLight: `${c1}14`,
    success: '#00CC66', successLight: '#00EE77', successBg: 'rgba(0,204,102,0.10)',
    warning: '#CC9900', warningLight: '#DDAA00', warningBg: 'rgba(204,153,0,0.10)',
    error: '#DD2233', errorLight: '#EE4455', errorBg: 'rgba(221,34,51,0.10)',
    info: c1, infoLight: c2, infoBg: `${c1}12`,
    purple: '#8844BB', purpleLight: '#AA66DD', purpleBg: 'rgba(136,68,187,0.10)',
    chartColors: [c1, c2, '#CC9900', '#DD2233', '#8844BB'],
    isHUD: true, isLight,
    hudPrimary: c1, hudSecondary: c2,
    hudDim: `${c1}40`, hudGlow: `${c1}0A`,
    hudBg: bg, hudSurface: surface,
    hudBorder: isLight ? `${c1}35` : `${c1}25`,
    hudBorderBright: isLight ? `${c1}70` : `${c1}55`,
    hudTextStrong: textStrong,
    hudScanColor: scanColor,
    hudCityColor: c1,
  };
}

const themes: Record<ThemeType, ThemeColors> = {

  hud_cyan_dark: buildHUD({
    bg: '#010B18', bg2: '#031220', bg3: '#051A2E', surface: '#040F1C',
    c1: '#00D4EE', c2: '#00BBCC', c3: '#0088AA',
    textStrong: '#C8F0F8', textMid: '#6ABECC', textDim: '#2E6A7A',
    scanColor: 'rgba(0,212,238,0.5)', isLight: false,
  }),

  hud_cyan_light: buildHUD({
    bg: '#FFFFFF', bg2: '#F0FBFF', bg3: '#E0F6FF', surface: '#FFFFFF',
    c1: '#0099AA', c2: '#007788', c3: '#005566',
    textStrong: '#001418', textMid: '#004455', textDim: '#556677',
    scanColor: 'rgba(0,153,170,0.2)', isLight: true,
  }),

  hud_green_dark: buildHUD({
    bg: '#020E04', bg2: '#031608', bg3: '#041C0C', surface: '#031208',
    c1: '#00CC33', c2: '#88CC00', c3: '#009922',
    textStrong: '#BBEECC', textMid: '#55BB66', textDim: '#226633',
    scanColor: 'rgba(0,204,51,0.5)', isLight: false,
  }),

  hud_green_light: buildHUD({
    bg: '#FFFFFF', bg2: '#F2FFF5', bg3: '#E4FFE9', surface: '#FFFFFF',
    c1: '#008822', c2: '#446600', c3: '#006611',
    textStrong: '#001805', textMid: '#004411', textDim: '#336644',
    scanColor: 'rgba(0,136,34,0.18)', isLight: true,
  }),

  hud_silver_dark: buildHUD({
    bg: '#0A0A10', bg2: '#141420', bg3: '#1C1C2A', surface: '#111118',
    c1: '#A0AACC', c2: '#C8D0E8', c3: '#6070A0',
    textStrong: '#E0E8FF', textMid: '#8894B8', textDim: '#4A5070',
    scanColor: 'rgba(160,170,204,0.45)', isLight: false,
  }),

  hud_silver_light: buildHUD({
    bg: '#FFFFFF', bg2: '#F4F5FA', bg3: '#EAECF5', surface: '#FFFFFF',
    c1: '#445588', c2: '#2A3A70', c3: '#667799',
    textStrong: '#080A18', textMid: '#2A3355', textDim: '#667788',
    scanColor: 'rgba(68,85,136,0.18)', isLight: true,
  }),

  hud_gold_dark: buildHUD({
    bg: '#080600', bg2: '#100D00', bg3: '#181200', surface: '#0C0900',
    c1: '#C8A000', c2: '#DD8800', c3: '#996600',
    textStrong: '#F8EEC8', textMid: '#BBAA44', textDim: '#775500',
    scanColor: 'rgba(200,160,0,0.5)', isLight: false,
  }),

  hud_gold_light: buildHUD({
    bg: '#FFFFFF', bg2: '#FFFEF2', bg3: '#FFF9D6', surface: '#FFFFFF',
    c1: '#886600', c2: '#664400', c3: '#AA8800',
    textStrong: '#140E00', textMid: '#553300', textDim: '#887733',
    scanColor: 'rgba(136,102,0,0.18)', isLight: true,
  }),

  hud_purple_dark: buildHUD({
    bg: '#06000E', bg2: '#0C0018', bg3: '#120022', surface: '#090014',
    c1: '#8844BB', c2: '#AA66DD', c3: '#6622AA',
    textStrong: '#DDB8FF', textMid: '#9966CC', textDim: '#553388',
    scanColor: 'rgba(136,68,187,0.45)', isLight: false,
  }),

  hud_purple_light: buildHUD({
    bg: '#FFFFFF', bg2: '#FCF5FF', bg3: '#F7EAFF', surface: '#FFFFFF',
    c1: '#6600AA', c2: '#440088', c3: '#8833BB',
    textStrong: '#080012', textMid: '#440066', textDim: '#775588',
    scanColor: 'rgba(102,0,170,0.18)', isLight: true,
  }),

  hud_blue_dark: buildHUD({
    bg: '#00001A', bg2: '#000520', bg3: '#000C2E', surface: '#000318',
    c1: '#5599DD', c2: '#88BBEE', c3: '#2266BB',
    textStrong: '#C8DDFF', textMid: '#6688BB', textDim: '#224466',
    scanColor: 'rgba(85,153,221,0.5)', isLight: false,
  }),

  hud_blue_light: buildHUD({
    bg: '#FFFFFF', bg2: '#F0F4FF', bg3: '#E0EAFF', surface: '#FFFFFF',
    c1: '#0044AA', c2: '#002288', c3: '#2266BB',
    textStrong: '#000818', textMid: '#002266', textDim: '#335577',
    scanColor: 'rgba(0,68,170,0.18)', isLight: true,
  }),
};

const VALID_THEMES: ThemeType[] = [
  'hud_cyan_dark',   'hud_cyan_light',
  'hud_green_dark',  'hud_green_light',
  'hud_silver_dark', 'hud_silver_light',
  'hud_gold_dark',   'hud_gold_light',
  'hud_purple_dark', 'hud_purple_light',
  'hud_blue_dark',   'hud_blue_light',
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
    } catch (e) { console.error('Error saving theme:', e); }
  }, []);

  const setCompanyColors = useCallback(async (newColors: string[]) => {
    try {
      const trimmed = newColors.slice(0, 3);
      setCompanyColorsState(trimmed);
      await AsyncStorage.setItem(COMPANY_COLORS_KEY, JSON.stringify(trimmed));
    } catch (e) { console.error('Error saving company colors:', e); }
  }, []);

  const colors = useMemo<ThemeColors>(() => themes[themeName] || themes.hud_cyan_dark, [themeName]);
  const barColors = useMemo<string[]>(() => {
    if (companyColors.length === 0) return [colors.surface, colors.surface];
    if (companyColors.length === 1) return [companyColors[0], companyColors[0]];
    return companyColors;
  }, [companyColors, colors.surface]);
  const barText = useMemo(() => barTextColor(companyColors), [companyColors]);
  const isHUD = true;
  const isLight = useMemo(() => colors.isLight, [colors]);

  return {
    theme: themeName, setTheme, colors, isLoading,
    companyColors, setCompanyColors, barColors, barText,
    isHUD, isLight,
  };
});

export const getThemeColors = (theme: ThemeType): ThemeColors =>
  themes[theme] || themes.hud_cyan_dark;
