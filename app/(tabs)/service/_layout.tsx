import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ServiceLayout() {
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
          title: 'Service',
          headerLargeTitle: true,
        }} 
      />
    </Stack>
  );
}
