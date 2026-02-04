import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AssignmentHub from '@/components/RoomTimeHub';
import { useUser } from '@/contexts/UserContext';
import { useAllEmployeesClockStatus } from '@/hooks/useSupabaseTimeClock';

export default function AssignmentHubScreen() {
  const { user } = useUser();
  const { data: employees = [] } = useAllEmployeesClockStatus();
  
  const currentEmployee = employees.find(e => e.employee_id === user?.id);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Assignment Hub',
          headerShown: true,
        }} 
      />
      <View style={styles.content}>
        <AssignmentHub 
          currentEmployeeId={currentEmployee?.employee_id || user?.id}
          currentEmployeeName={currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name}` : user ? `${user.first_name} ${user.last_name}` : undefined}
          facilityId={currentEmployee?.facility_id || undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
