/**
 * components/Themed.tsx
 *
 * Shared themed primitives. Every screen imports from here.
 * Each component automatically adapts its visual style to the active theme.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useThemeStyle } from '@/hooks/useThemeStyle';
import { useTheme } from '@/contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// ThemedCard
// A surface card that renders with corners/shadows/borders per active theme
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'inset' | 'accent';
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
  showAccentBar?: boolean;
  padding?: number;
}

export function ThemedCard({
  children, variant = 'surface', style,
  accentColor, showAccentBar = false, padding = 14,
}: ThemedCardProps) {
  const ts = useThemeStyle();
  const { colors } = useTheme();
  const cardStyle = ts.card[variant];

  return (
    <View style={[cardStyle, { padding, position: 'relative', overflow: 'hidden' }, style]}>
      {/* Accent bar — colored top stripe */}
      {showAccentBar && (
        <View style={[ts.accentBar(accentColor), { marginTop: -padding, marginHorizontal: -padding, marginBottom: padding }]} />
      )}

      {/* HUD corner brackets */}
      {ts.isHUD && (
        <>
          <View style={ts.brackets.tl} />
          <View style={ts.brackets.tr} />
          <View style={ts.brackets.bl} />
          <View style={ts.brackets.br} />
        </>
      )}

      {/* Classic double rule top */}
      {ts.isClassic && showAccentBar && (
        <View style={[ts.classicDoubleRule, { marginTop: -padding, marginHorizontal: -padding, marginBottom: padding - 4 }]} />
      )}

      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedHeader
// Top-of-screen header bar — adapts background, text style, border per theme
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedHeaderProps {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function ThemedHeader({ title, left, right, subtitle, style }: ThemedHeaderProps) {
  const ts = useThemeStyle();
  const { colors } = useTheme();

  return (
    <View style={[ts.header, style]}>
      {left && <View style={{ marginRight: 10 }}>{left}</View>}
      <View style={{ flex: 1 }}>
        <Text style={ts.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={[ts.label.hint, { marginTop: 2 }]}>{subtitle}</Text>
        )}
      </View>
      {right && <View style={{ marginLeft: 10 }}>{right}</View>}

      {/* Ghost Protocol: red dot indicator */}
      {ts.isGhost && (
        <View style={{ position: 'absolute', top: 8, right: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: '#CC0000' }} />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedSectionLabel
// Section sub-heading — monospace caps for HUD, normal for light themes
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedSectionLabelProps {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
  showDot?: boolean;
}

export function ThemedSectionLabel({ children, color, style, showDot = false }: ThemedSectionLabelProps) {
  const ts = useThemeStyle();
  const { colors } = useTheme();
  const dotAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!ts.isHUD || !showDot) return;
    Animated.loop(Animated.sequence([
      Animated.timing(dotAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(dotAnim, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
    ])).start();
  }, [ts.isHUD, showDot]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {ts.isHUD && showDot && (
        <Animated.View style={{
          width: 5, height: 5, borderRadius: 3,
          backgroundColor: color || colors.hudPrimary,
          opacity: dotAnim,
        }} />
      )}
      {ts.isClassic && (
        <View style={{ width: 3, height: 14, backgroundColor: color || colors.primary, borderRadius: 1, marginRight: 2 }} />
      )}
      <Text style={[ts.label.section, color ? { color } : {}, style]}>
        {children}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedBadge
// Status/dept badge — pill for Clean Light, bracket for HUD, tag for Classic
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedBadgeProps {
  label: string;
  color: string;
  style?: StyleProp<ViewStyle>;
  showDot?: boolean;
}

export function ThemedBadge({ label, color, style, showDot = true }: ThemedBadgeProps) {
  const ts = useThemeStyle();
  const p = ts.deptPill(color);

  return (
    <View style={[p.container, style]}>
      {showDot && <View style={p.dot} />}
      <Text style={p.text}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedDivider
// Horizontal rule — double for Classic, single for others
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedDividerProps {
  style?: StyleProp<ViewStyle>;
}

export function ThemedDivider({ style }: ThemedDividerProps) {
  const ts = useThemeStyle();

  if (ts.isClassic) {
    return (
      <View style={[{ marginVertical: 10 }, style]}>
        <View style={{ height: 2, backgroundColor: ts.card.surface.borderColor }} />
        <View style={{ height: 1, backgroundColor: ts.card.surface.borderColor, marginTop: 2, opacity: 0.5 }} />
      </View>
    );
  }

  return <View style={[ts.divider, style]} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedMetric
// Big number display — adapts color and font per theme
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedMetricProps {
  value: string | number;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function ThemedMetric({ value, label, color, style }: ThemedMetricProps) {
  const ts = useThemeStyle();
  const { colors } = useTheme();
  const c = color || colors.hudPrimary;

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <Text style={[ts.label.metric, { color: c }]}>{value}</Text>
      <Text style={[ts.label.hint, { marginTop: 2, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemedGhostRedact
// Ghost Protocol only — renders text as a black redacted bar
// On other themes renders the text normally
// ─────────────────────────────────────────────────────────────────────────────
interface ThemedGhostRedactProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export function ThemedGhostRedact({ children, style }: ThemedGhostRedactProps) {
  const ts = useThemeStyle();

  if (!ts.isGhost) {
    return <Text style={[ts.label.secondary, style]}>{children}</Text>;
  }

  return (
    <View style={ts.ghostRedact}>
      <Text style={{ color: 'transparent', fontSize: 12 }}>{children}</Text>
    </View>
  );
}
