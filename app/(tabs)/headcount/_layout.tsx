import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function HeadcountLayout() {
  const { colors, isHUD } = useTheme();
  const router = useRouter();

  const BackToHR = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.push('/hr')}
    >
      <ChevronLeft size={24} color={isHUD ? colors.hudPrimary : colors.primary} />
      <Text style={[styles.backText, { color: isHUD ? colors.hudPrimary : colors.primary }]}>HR</Text>
    </TouchableOpacity>
  );

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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Emergency Headcount',
          headerLeft: () => <BackToHR />,
        }}
      />
      <Stack.Screen
        name="emergencyprotocol"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400' as const,
  },
});
