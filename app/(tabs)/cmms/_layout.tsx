import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function CMMSLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'CMMS',
          headerShown: true,
        }} 
      />
      {/* Work Order Management */}
      <Stack.Screen name="workorders" options={{ title: 'Work Orders' }} />
      <Stack.Screen name="newworkorder" options={{ title: 'New Work Order' }} />
      <Stack.Screen name="correctivemo" options={{ title: 'Corrective Maintenance' }} />
      <Stack.Screen name="wohistory" options={{ title: 'Work Order History' }} />
      
      {/* Preventive Maintenance */}
      <Stack.Screen name="pmschedule" options={{ title: 'PM Schedule' }} />
      <Stack.Screen name="pmcalendar" options={{ title: 'PM Calendar' }} />
      <Stack.Screen name="pmtasks" options={{ title: 'PM Task Library' }} />
      <Stack.Screen name="pmtemplates" options={{ title: 'PM Templates' }} />

      
      {/* Equipment Management */}
      <Stack.Screen name="equipmentlist" options={{ title: 'Equipment List' }} />
      <Stack.Screen name="equipmentdetail" options={{ title: 'Equipment Detail' }} />
      <Stack.Screen name="equipmentregistry" options={{ title: 'Equipment Registry' }} />
      <Stack.Screen name="equipmenthierarchy" options={{ title: 'Equipment Hierarchy' }} />
      <Stack.Screen name="equipmenthistory" options={{ title: 'Equipment History' }} />
      <Stack.Screen name="equipmentdowntime" options={{ title: 'Equipment Downtime' }} />
      
      {/* MRO Inventory */}
      <Stack.Screen name="mrosupplies" options={{ title: 'MRO Parts & Supplies' }} />
      <Stack.Screen name="partslist" options={{ title: 'Parts Inventory' }} />
      <Stack.Screen name="stocklevels" options={{ title: 'Stock Levels' }} />
      <Stack.Screen name="whereused" options={{ title: 'Where-Used Parts' }} />
      <Stack.Screen name="partsissue" options={{ title: 'Parts Issue' }} />
      <Stack.Screen name="partsrequest" options={{ title: 'Parts Request' }} />
      <Stack.Screen name="partsreturn" options={{ title: 'Parts Return' }} />
      <Stack.Screen name="reorderpoints" options={{ title: 'Reorder Points' }} />
      
      {/* Cost Tracking */}
      <Stack.Screen name="budgettracking" options={{ title: 'Budget Tracking' }} />
      <Stack.Screen name="laborcosting" options={{ title: 'Labor Costing' }} />
      <Stack.Screen name="partscosting" options={{ title: 'Parts Costing' }} />
      <Stack.Screen name="costreports" options={{ title: 'Cost Reports' }} />
      
      {/* Vendor Management */}
      <Stack.Screen name="vendorlist" options={{ title: 'Vendor List' }} />
      <Stack.Screen name="vendorcontracts" options={{ title: 'Vendor Contracts' }} />
      <Stack.Screen name="warrantytracking" options={{ title: 'Warranty Tracking' }} />
      
      {/* Failure Analysis */}
      <Stack.Screen name="failurecodes" options={{ title: 'Failure Codes' }} />
      <Stack.Screen name="failureanalysis" options={{ title: 'Failure Analysis' }} />
      <Stack.Screen name="rootcauseanalysis" options={{ title: 'Root Cause Analysis' }} />

      <Stack.Screen name="mtbfanalysis" options={{ title: 'MTBF Analysis' }} />
      <Stack.Screen name="mttranalysis" options={{ title: 'MTTR Analysis' }} />
      
      {/* Safety & Compliance */}
      <Stack.Screen name="lotoprocedures" options={{ title: 'LOTO Procedures' }} />
      <Stack.Screen name="safetypermits" options={{ title: 'Safety Permits' }} />
      <Stack.Screen name="pperequirements" options={{ title: 'PPE Requirements' }} />
      <Stack.Screen name="safetychecklist" options={{ title: 'Safety Checklist' }} />
      <Stack.Screen name="hazardassessment" options={{ title: 'Hazard Assessment' }} />
      <Stack.Screen name="regulatorycompliance" options={{ title: 'Regulatory Compliance' }} />
      
      {/* Reports & Analytics */}
      <Stack.Screen name="kpidashboard" options={{ title: 'KPI Dashboard' }} />
      <Stack.Screen name="downtimereport" options={{ title: 'Downtime Report' }} />
      <Stack.Screen name="downtime" options={{ title: 'Downtime Tracking' }} />
    </Stack>
  );
}
