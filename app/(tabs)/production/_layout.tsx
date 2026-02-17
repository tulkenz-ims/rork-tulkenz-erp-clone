import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProductionLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Production', headerShown: true }} />
      <Stack.Screen name="materials" options={{ title: 'Production Materials' }} />
      <Stack.Screen name="productionruns" options={{ title: 'Production Runs', headerShown: false }} />
    </Stack>
  );
}
