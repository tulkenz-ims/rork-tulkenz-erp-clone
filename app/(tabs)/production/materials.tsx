import React from 'react';
import { Stack } from 'expo-router';
import FilteredInventoryView from '@/components/FilteredInventoryView';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProductionMaterialsScreen() {
  const { colors } = useTheme();
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Production Materials',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <FilteredInventoryView 
        departmentCode={4}
        title="Production Materials"
        showMasterLink={true}
      />
    </>
  );
}
