import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Returns Stack screenOptions that apply company-color gradient
 * to the header bar when set, otherwise uses the standard theme surface.
 */
export function useThemedScreenOptions() {
  const { colors, barColors, barText, companyColors } = useTheme();
  const hasCompanyColors = companyColors.length > 0;

  return {
    headerStyle: hasCompanyColors ? undefined : { backgroundColor: colors.surface },
    headerTintColor: hasCompanyColors ? barText : colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    contentStyle: { backgroundColor: colors.background },
    ...(hasCompanyColors
      ? {
          headerBackground: () => (
            <LinearGradient
              colors={barColors as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          ),
        }
      : {}),
  };
}
