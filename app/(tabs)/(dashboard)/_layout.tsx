import { Stack } from 'expo-router';
import { useThemedScreenOptions } from '@/hooks/useThemedScreenOptions';
import NotificationBell from '@/components/NotificationBell';

export default function DashboardLayout() {
  const screenOptions = useThemedScreenOptions();
  
  return (
    <Stack screenOptions={screenOptions}>
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
