import React from 'react';
import { Stack } from 'expo-router';
import FilteredInventoryView from '@/components/FilteredInventoryView';
import { useTheme } from '@/contexts/ThemeContext';

export default function MROSuppliesScreen() {
  const { colors } = useTheme();
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'MRO Parts & Supplies',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <FilteredInventoryView 
        departmentCode={1}
        title="MRO Parts & Supplies"
        showMasterLink={true}
      />
    </>
  );
}
