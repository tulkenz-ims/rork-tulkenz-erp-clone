import React from 'react';
import { Stack } from 'expo-router';
import FilteredInventoryView from '@/components/FilteredInventoryView';
import { useTheme } from '@/contexts/ThemeContext';

export default function SanitationChemicalsScreen() {
  const { colors } = useTheme();
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Chemicals & Supplies',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <FilteredInventoryView 
        departmentCode={6}
        title="Chemicals & Supplies"
        showMasterLink={true}
      />
    </>
  );
}
