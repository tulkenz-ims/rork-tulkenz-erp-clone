import React from 'react';
import { Stack } from 'expo-router';
import SharedMaterialsManager from '@/components/SharedMaterialsManager';
import { useTheme } from '@/contexts/ThemeContext';

export default function SharedMaterialsScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shared Materials',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <SharedMaterialsManager />
    </>
  );
}
