import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function OffboardingLayout() {
  const { colors } = useTheme();
  const router = useRouter();

  const BackToHR = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.push('/hr')}
    >
      <ChevronLeft size={24} color={colors.primary} />
      <Text style={[styles.backText, { color: colors.primary }]}>HR</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Offboarding', headerLeft: () => <BackToHR /> }} />
      <Stack.Screen name="exitinterview" options={{ title: 'Exit Interviews', headerLeft: () => <BackToHR /> }} />
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
