import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationBell from '@/components/NotificationBell';

export default function DashboardLayout() {
  const { colors } = useTheme();
  
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
          title: 'Dashboard',
          headerLargeTitle: true,
          headerRight: () => <NotificationBell />,
        }} 
      />
    </Stack>
  );
}
