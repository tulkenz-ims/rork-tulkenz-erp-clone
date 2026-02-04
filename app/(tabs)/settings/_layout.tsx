import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="getting-started" options={{ title: 'Getting Started' }} />
      <Stack.Screen name="roles" options={{ title: 'Roles & Permissions' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="facilities" options={{ title: 'Facilities' }} />
      <Stack.Screen name="areas" options={{ title: 'Areas & Locations' }} />
      <Stack.Screen name="organization" options={{ title: 'Organization Setup' }} />
      <Stack.Screen name="organizations" options={{ title: 'Manage Organizations' }} />
      <Stack.Screen name="breaksettings" options={{ title: 'Break Settings' }} />
      <Stack.Screen name="departments" options={{ title: 'Departments' }} />
      <Stack.Screen name="taskfeed-templates" options={{ title: 'Task Feed Templates' }} />
      <Stack.Screen name="template-builder" options={{ title: 'Template Builder', presentation: 'modal' }} />
    </Stack>
  );
}
