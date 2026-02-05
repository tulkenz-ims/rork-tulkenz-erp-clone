import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function WorkOrdersLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    />
  );
}
