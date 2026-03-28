import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function UsersLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Users',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="permissions"
        options={{
          title: 'Permissions Matrix',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
