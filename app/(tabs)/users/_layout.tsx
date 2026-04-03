import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function WorkforceLayout() {
  const { colors, isHUD } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isHUD ? colors.hudBg : colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: isHUD ? colors.hudBorderBright : colors.border,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: isHUD ? colors.hudPrimary : colors.primary,
        headerTitleStyle: {
          fontWeight: '800',
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: 3,
          color: isHUD ? colors.hudPrimary : colors.text,
          textTransform: 'uppercase',
        },
        contentStyle: {
          backgroundColor: isHUD ? colors.hudBg : colors.background,
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Workforce' }}
      />
      <Stack.Screen
        name="permissions"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="orgchart"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
