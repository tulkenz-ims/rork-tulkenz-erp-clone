/**
 * hooks/useThemeStyle.ts
 *
 * Returns layout and decoration primitives that adapt to the active theme.
 * Screens call this once and get everything they need to render correctly
 * for HUD Cyan, Clean Light, Classic, or Ghost Protocol.
 *
 * Usage:
 *   const { ts, card, label, font } = useThemeStyle();
 *   <View style={card.surface}> ... </View>
 *   <Text style={[label.title, font.primary]}>Hello</Text>
 */

import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTheme, type ThemeType } from '@/contexts/ThemeContext';

// ── Font families per theme ──────────────────────────────────────
const FONTS = {
  mono:  Platform.OS === 'ios' ? 'Menlo'   : 'monospace',
  serif: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  sans:  undefined, // system default
};

// ── Border radius per theme ──────────────────────────────────────
const RADIUS = {
  hud_cyan:       { sm: 0,  md: 4,  lg: 6,  pill: 4  },
  clean_light:    { sm: 6,  md: 10, lg: 14, pill: 20 },
  classic:        { sm: 2,  md: 4,  lg: 6,  pill: 4  },
  ghost_protocol: { sm: 0,  md: 0,  lg: 0,  pill: 2  },
};

// ── Card elevation per theme ─────────────────────────────────────
const ELEVATION = {
  hud_cyan:       { shadowOpacity: 0,   elevation: 0 },
  clean_light:    { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  classic:        { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  ghost_protocol: { shadowOpacity: 0,   elevation: 0 },
};

// ── Decorative style per theme ───────────────────────────────────
// These tell screens WHAT kind of decoration to render
export type ThemeDecoration =
  | 'hud'           // corner brackets, scan line, monospace
  | 'clean'         // rounded cards, pill badges, drop shadow
  | 'classic'       // double rules, ornament dividers, warm serif
  | 'ghost';        // black topbar, redacted blocks, sharp white

const DECORATION: Record<ThemeType, ThemeDecoration> = {
  hud_cyan:       'hud',
  clean_light:    'clean',
  classic:        'classic',
  ghost_protocol: 'ghost',
};

// ── Section header style per theme ──────────────────────────────
export type SectionHeaderStyle = 'hud_bar' | 'underline' | 'rule' | 'topbar';

const SECTION_HEADER: Record<ThemeType, SectionHeaderStyle> = {
  hud_cyan:       'hud_bar',
  clean_light:    'underline',
  classic:        'rule',
  ghost_protocol: 'topbar',
};

// ── Badge style per theme ────────────────────────────────────────
export type BadgeStyle = 'bracket' | 'pill' | 'tag' | 'stamp';

const BADGE_STYLE: Record<ThemeType, BadgeStyle> = {
  hud_cyan:       'bracket',
  clean_light:    'pill',
  classic:        'tag',
  ghost_protocol: 'stamp',
};

export function useThemeStyle() {
  const { colors, theme } = useTheme();
  const t = theme as ThemeType;

  const r   = RADIUS[t]     || RADIUS.hud_cyan;
  const elev = ELEVATION[t] || ELEVATION.hud_cyan;
  const dec  = DECORATION[t] || 'hud';
  const secH = SECTION_HEADER[t] || 'hud_bar';
  const badge = BADGE_STYLE[t] || 'bracket';

  const fontPrimary = t === 'hud_cyan' ? FONTS.mono
    : t === 'classic' ? FONTS.serif
    : FONTS.sans;

  const fontMono = FONTS.mono;

  const style = useMemo(() => ({

    // ── Is helpers ─────────────────────────────────────────────
    isHUD:     t === 'hud_cyan',
    isLight:   t !== 'hud_cyan',
    isClassic: t === 'classic',
    isGhost:   t === 'ghost_protocol',
    isClean:   t === 'clean_light',

    // ── Decoration type ────────────────────────────────────────
    decoration: dec,
    sectionHeader: secH,
    badgeStyle: badge,

    // ── Font helpers ───────────────────────────────────────────
    font: {
      primary: fontPrimary,
      mono:    fontMono,
      serif:   FONTS.serif,
    },

    // ── Spacing ────────────────────────────────────────────────
    spacing: {
      xs: 4,
      sm: 8,
      md: 14,
      lg: 20,
      xl: 28,
    },

    // ── Radius ─────────────────────────────────────────────────
    radius: r,

    // ── Card surfaces ──────────────────────────────────────────
    card: {
      // Primary surface card
      surface: {
        backgroundColor: colors.surface,
        borderRadius: r.lg,
        borderWidth: t === 'ghost_protocol' ? 0 : 1,
        borderColor: colors.border,
        ...(t === 'clean_light' || t === 'classic' ? elev : {}),
      },
      // Inset / secondary card
      inset: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
      },
      // HUD-style card with bright border
      accent: {
        backgroundColor: colors.hudSurface,
        borderRadius: r.lg,
        borderWidth: t === 'hud_cyan' ? 1 : 1,
        borderColor: t === 'hud_cyan' ? colors.hudBorderBright : colors.border,
        ...(t !== 'hud_cyan' ? elev : {}),
      },
    },

    // ── Text styles ────────────────────────────────────────────
    label: {
      // Screen/section title
      title: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: colors.text,
        fontFamily: fontPrimary,
        letterSpacing: t === 'hud_cyan' ? 2 : t === 'ghost_protocol' ? 3 : 0.5,
        textTransform: (t === 'hud_cyan' || t === 'ghost_protocol' ? 'uppercase' : 'none') as 'uppercase' | 'none',
      },
      // Section sub-label
      section: {
        fontSize: t === 'hud_cyan' ? 9 : 11,
        fontWeight: '600' as const,
        color: colors.textTertiary,
        fontFamily: fontMono,
        letterSpacing: t === 'hud_cyan' ? 2.5 : 1.5,
        textTransform: 'uppercase' as const,
      },
      // Body text
      body: {
        fontSize: 14,
        color: colors.text,
        fontFamily: fontPrimary,
        lineHeight: 20,
      },
      // Secondary body
      secondary: {
        fontSize: 13,
        color: colors.textSecondary,
        fontFamily: fontPrimary,
      },
      // Tertiary / hint
      hint: {
        fontSize: 11,
        color: colors.textTertiary,
        fontFamily: fontPrimary,
      },
      // Metric value (big number)
      metric: {
        fontSize: 28,
        fontWeight: '700' as const,
        color: colors.hudPrimary,
        fontFamily: fontMono,
        lineHeight: 32,
      },
    },

    // ── Button styles ──────────────────────────────────────────
    button: {
      primary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.hudPrimary,
        borderRadius: r.md,
        paddingVertical: 11,
        paddingHorizontal: 16,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      primaryText: {
        color: colors.hudPrimary,
        fontSize: 13,
        fontWeight: '700' as const,
        fontFamily: t === 'hud_cyan' ? fontMono : fontPrimary,
        letterSpacing: t === 'hud_cyan' ? 1.5 : 0.5,
        textTransform: (t === 'hud_cyan' ? 'uppercase' : 'none') as 'uppercase' | 'none',
      },
      // Filled primary
      filled: {
        backgroundColor: colors.hudPrimary,
        borderRadius: r.md,
        paddingVertical: 11,
        paddingHorizontal: 16,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      filledText: {
        color: t === 'hud_cyan' ? '#000000' : '#FFFFFF',
        fontSize: 13,
        fontWeight: '700' as const,
        fontFamily: fontPrimary,
        letterSpacing: 0.5,
      },
    },

    // ── Input styles ───────────────────────────────────────────
    input: {
      container: {
        height: 48,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 12,
      },
      text: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        fontFamily: fontPrimary,
      },
      focused: {
        borderColor: colors.hudPrimary,
      },
    },

    // ── Divider ────────────────────────────────────────────────
    divider: t === 'classic'
      ? { height: 2, backgroundColor: colors.border, marginVertical: 10 }
      : { height: 1, backgroundColor: colors.border, marginVertical: 8 },

    // ── Screen background ──────────────────────────────────────
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── Header bar (top of screen) ─────────────────────────────
    header: {
      backgroundColor: t === 'ghost_protocol' ? '#111111' : colors.hudSurface,
      borderBottomWidth: 1,
      borderBottomColor: t === 'ghost_protocol' ? 'transparent' : colors.hudBorder,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    headerTitle: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: t === 'ghost_protocol' ? '#FFFFFF' : colors.hudPrimary,
      fontFamily: fontMono,
      letterSpacing: t === 'hud_cyan' || t === 'ghost_protocol' ? 2.5 : 1,
      textTransform: 'uppercase' as const,
    },

    // ── Accent bar (3px colored top of card) ──────────────────
    accentBar: (color?: string) => ({
      height: 3,
      backgroundColor: color || colors.hudPrimary,
      opacity: t === 'hud_cyan' ? 0.7 : 0.9,
      marginBottom: 10,
    }),

    // ── Status dot ─────────────────────────────────────────────
    statusDot: (color: string) => ({
      width: t === 'hud_cyan' ? 6 : 8,
      height: t === 'hud_cyan' ? 6 : 8,
      borderRadius: 4,
      backgroundColor: color,
    }),

    // ── Corner bracket (HUD only) ──────────────────────────────
    // Returns style objects for all 4 corners
    // Usage: only render these when isHUD is true
    brackets: {
      tl: { position: 'absolute' as const, top: -1, left: -1,  width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2,  borderColor: colors.hudBorderBright },
      tr: { position: 'absolute' as const, top: -1, right: -1, width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.hudBorderBright },
      bl: { position: 'absolute' as const, bottom: -1, left: -1,  width: 10, height: 10, borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: colors.hudBorderBright },
      br: { position: 'absolute' as const, bottom: -1, right: -1, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.hudBorderBright },
    },

    // ── Classic ornament ───────────────────────────────────────
    // Only render when isClassic is true
    classicRule: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    classicDoubleRule: {
      borderTopWidth: 2,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingTop: 3,
      marginVertical: 10,
    },

    // ── Ghost redact block ─────────────────────────────────────
    // Only render when isGhost is true
    ghostRedact: {
      backgroundColor: '#111111',
      borderRadius: 2,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },

    // ── Dept pill ──────────────────────────────────────────────
    deptPill: (color: string) => ({
      container: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 4,
        paddingHorizontal: t === 'hud_cyan' ? 6 : 10,
        paddingVertical: t === 'hud_cyan' ? 3 : 4,
        borderRadius: t === 'clean_light' ? 12 : r.sm,
        backgroundColor: `${color}12`,
        borderWidth: 1,
        borderColor: t === 'hud_cyan' ? `${color}40` : `${color}30`,
      },
      dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
      },
      text: {
        fontSize: t === 'hud_cyan' ? 8 : 10,
        fontWeight: '600' as const,
        color,
        fontFamily: t === 'hud_cyan' ? fontMono : fontPrimary,
        letterSpacing: t === 'hud_cyan' ? 1.5 : 0.5,
        textTransform: (t === 'hud_cyan' ? 'uppercase' : 'none') as 'uppercase' | 'none',
      },
    }),

  }), [colors, t, r, elev, dec, secH, badge, fontPrimary, fontMono]);

  return style;
}

// ── Helper: get decoration for current theme ──────────────────────
export function useDecoration(): ThemeDecoration {
  const { theme } = useTheme();
  return DECORATION[theme as ThemeType] || 'hud';
}
