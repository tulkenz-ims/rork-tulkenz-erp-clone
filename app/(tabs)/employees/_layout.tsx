import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useThemedScreenOptions } from '@/hooks/useThemedScreenOptions';
import { useTheme } from '@/contexts/ThemeContext';

export default function EmployeesLayout() {
  const screenOptions = useThemedScreenOptions();
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
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Employees',
          headerLeft: () => <BackToHR />,
        }} 
      />
      <Stack.Screen 
        name="signaturepin" 
        options={{ 
          title: 'Signature PIN Setup',
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
