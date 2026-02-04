import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function RecyclingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Recycling Hub',
        }}
      />
    </Stack>
  );
}
