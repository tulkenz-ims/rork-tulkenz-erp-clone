import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function InspectionsLayout() {
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
          title: 'Inspections',
        }}
      />
    </Stack>
  );
}
