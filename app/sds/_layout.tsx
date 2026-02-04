import { Stack } from 'expo-router';

export default function SDSLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F7FA' },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
