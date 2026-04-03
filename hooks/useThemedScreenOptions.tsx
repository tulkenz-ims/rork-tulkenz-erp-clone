import { Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

/**
 * Returns screen options for the Stack navigator that match
 * the active theme — sharp, dark/light aware, monospace title.
 * Header text is always high-contrast and clearly readable.
 */
export function useThemedScreenOptions() {
  const { colors, isLight, isHUD } = useTheme();

  // Background: HUD stays deep dark, light themes use surface so it doesn't wash out
  const headerBg = isHUD ? colors.hudBg : colors.surface;

  // Border: HUD gets bright cyan border, light themes get a clean separator
  const headerBorder = isHUD ? colors.hudBorderBright : colors.border;

  // Title: HUD gets bright cyan, light themes get strong dark text — always readable
  const titleColor = isHUD ? colors.hudPrimary : colors.text;

  // Tint (back button, icons): same as title
  const tintColor = isHUD ? colors.hudPrimary : colors.primary;

  return {
    headerStyle: {
      backgroundColor: headerBg,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      borderBottomWidth: 1,
      borderBottomColor: headerBorder,
    },
    headerTitleStyle: {
      color: titleColor,
      fontSize: 11,
      fontWeight: '800' as const,
      letterSpacing: 3,
      fontFamily: MONO,
      textTransform: 'uppercase' as const,
    },
    headerTintColor: tintColor,
    headerBackTitleStyle: {
      fontFamily: MONO,
      fontSize: 9,
      letterSpacing: 1,
    },
    headerBackTitle: 'BACK',
    headerLargeTitle: false,
    contentStyle: {
      backgroundColor: isHUD ? colors.hudBg : colors.background,
    },
  };
}
