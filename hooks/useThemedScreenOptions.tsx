import { Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

/**
 * Returns screen options for the Stack navigator that match
 * the active HUD theme — sharp, dark/light aware, monospace title.
 */
export function useThemedScreenOptions() {
  const { colors, isLight } = useTheme();

  const headerBg      = colors.hudBg;
  const headerBorder  = colors.hudBorderBright;
  const titleColor    = colors.hudPrimary;
  const tintColor     = colors.hudPrimary;
  const iconColor     = colors.textSecondary;

  return {
    headerStyle: {
      backgroundColor: headerBg,
      // Remove default shadow/elevation — replaced by border
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      // Bottom border
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
    // No large title — HUD style is compact
    headerLargeTitle: false,
    contentStyle: {
      backgroundColor: colors.hudBg,
    },
  };
}
