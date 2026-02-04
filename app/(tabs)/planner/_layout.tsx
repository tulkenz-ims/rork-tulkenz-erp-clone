import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export default function PlannerLayout() {
  const { colors } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  
  const isEmployee = user?.role === 'employee';

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/(dashboard)');
    }
  };
  
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
          title: 'Planner',
          headerLargeTitle: true,
          headerLeft: isEmployee ? () => (
            <Pressable onPress={handleBackPress} style={{ marginRight: 8, padding: 4 }}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ) : undefined,
        }} 
      />
    </Stack>
  );
}
