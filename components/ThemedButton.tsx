/**
 * components/ThemedButton.tsx
 *
 * HUD-style bordered action button — works across all 4 themes.
 * Ghost Protocol: brightened colors for dark bg.
 * Classic: earthy colors, slightly squared corners.
 * All others: colored border + colored text + light tint bg.
 */

import React from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet,
  ActivityIndicator, ViewStyle, StyleProp,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemedButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function ThemedButton({
  label,
  color,
  onPress,
  icon,
  size = 'md',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}: ThemedButtonProps) {
  const { theme } = useTheme();

  const isGhost   = theme === 'ghost_protocol';
  const isClassic = theme === 'classic';

  // Ghost Protocol: boost color brightness for dark bg
  const effectiveColor = isGhost ? brightenColor(color) : color;

  const pad = size === 'sm'
    ? { paddingVertical: 7,  paddingHorizontal: 12 }
    : size === 'lg'
    ? { paddingVertical: 14, paddingHorizontal: 22 }
    : { paddingVertical: 10, paddingHorizontal: 16 };

  const fontSize    = size === 'sm' ? 11 : size === 'lg' ? 14 : 11;
  const radius      = isClassic ? 6 : 10;
  const bgOpacity   = isGhost ? '12' : '12';
  const borderColor = effectiveColor;
  const textColor   = effectiveColor;
  const bgColor     = effectiveColor + bgOpacity;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        pad,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: radius,
          opacity: disabled || loading ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.72}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.label, { color: textColor, fontSize }]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/**
 * Brighten a hex color for Ghost Protocol dark backgrounds.
 * Shifts each channel toward 255 by ~40%.
 */
function brightenColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const boost = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.45));
  const toHex = (v: number) => boost(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const styles = StyleSheet.create({
  btn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1.5,
    gap:            5,
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight:    '700',
    letterSpacing:  0.3,
  },
});
