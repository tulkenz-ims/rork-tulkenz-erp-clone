import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function DocumentsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Documents',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="sds" 
        options={{ 
          title: 'SDS Index',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}
