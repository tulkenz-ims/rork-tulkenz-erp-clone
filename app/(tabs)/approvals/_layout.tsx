import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ApprovalsLayout() {
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
          title: 'Approvals',
          headerLargeTitle: true,
        }} 
      />
      <Stack.Screen 
        name="workflows" 
        options={{ 
          title: 'Workflows',
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          title: 'Approval History',
        }} 
      />
      <Stack.Screen 
        name="tiers" 
        options={{ 
          title: 'Approval Tiers',
        }} 
      />
      <Stack.Screen 
        name="delegation" 
        options={{ 
          title: 'Delegation',
        }} 
      />
    </Stack>
  );
}
