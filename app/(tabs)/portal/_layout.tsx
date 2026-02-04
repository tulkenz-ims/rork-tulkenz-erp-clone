import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';

export default function PortalLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isEmployee } = useUser();

  const BackToHR = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.push('/hr')}
    >
      <ChevronLeft size={24} color={colors.primary} />
      <Text style={[styles.backText, { color: colors.primary }]}>HR</Text>
    </TouchableOpacity>
  );

  const BackToDashboard = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.replace('/(tabs)/(dashboard)')}
    >
      <ChevronLeft size={24} color={colors.primary} />
      <Text style={[styles.backText, { color: colors.primary }]}>Dashboard</Text>
    </TouchableOpacity>
  );

  const BackToPortal = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.replace('/portal')}
    >
      <ChevronLeft size={24} color={colors.primary} />
      <Text style={[styles.backText, { color: colors.primary }]}>Portal</Text>
    </TouchableOpacity>
  );
  
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Employee Portal',
          headerLeft: isEmployee ? () => <BackToDashboard /> : () => <BackToHR />,
        }} 
      />
      <Stack.Screen 
        name="directory" 
        options={{ 
          title: 'Company Directory',
          headerLeft: isEmployee ? () => <BackToDashboard /> : () => <BackToPortal />,
        }} 
      />
      <Stack.Screen 
        name="bulletin" 
        options={{ 
          title: 'Bulletin Board',
          headerLeft: isEmployee ? () => <BackToDashboard /> : () => <BackToPortal />,
        }} 
      />
      <Stack.Screen 
        name="work-request" 
        options={{ 
          title: 'Work Request',
          headerLeft: () => <BackToPortal />,
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
