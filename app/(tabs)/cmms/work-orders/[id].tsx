import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import WorkOrderDetail from '@/components/WorkOrderDetail';
import { AlertTriangle } from 'lucide-react-native';

interface DetailedWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  type: 'corrective' | 'preventive' | 'emergency' | 'request';
  source: 'manual' | 'request' | 'pm_schedule';
  sourceId?: string;
  equipment?: string;
  equipmentId?: string;
  location: string;
  facility_id: string;
  requestedBy?: string;
  requestedAt?: string;
  assigned_to?: string;
  assignedName?: string;
  due_date: string;
  started_at?: string;
  completed_at?: string;
  estimatedHours?: number;
  actualHours?: number;
  safety: {
    lotoRequired: boolean;
    lotoSteps: any[];
    permits: string[];
    permitNumbers: Record<string, string>;
    permitExpiry: Record<string, string>;
    ppeRequired: string[];
  };
  tasks: any[];
  attachments: any[];
  notes: string;
  completionNotes?: string;
  created_at: string;
  updated_at: string;
}

export default function WorkOrderDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: workOrdersData, isLoading, error } = useWorkOrdersQuery();
  
  const workOrder = useMemo(() => {
    if (!workOrdersData || !id) return null;
    
    const found = workOrdersData.find(wo => 
      wo.id === id || 
      wo.work_order_number === id ||
      wo.work_order_number?.includes(id)
    );
    
    if (!found) {
      console.log('[WorkOrderDetail] Work order not found for ID:', id);
      return null;
    }
    
    console.log('[WorkOrderDetail] Found work order:', found.work_order_number);
    
    const mapped: DetailedWorkOrder = {
      id: found.id,
      workOrderNumber: found.work_order_number || `WO-${found.id.slice(-8).toUpperCase()}`,
      title: found.title || '',
      description: found.description || '',
      priority: (found.priority as DetailedWorkOrder['priority']) || 'medium',
      status: (found.status as DetailedWorkOrder['status']) || 'open',
      type: (found.type as DetailedWorkOrder['type']) || 'corrective',
      source: (found.source as DetailedWorkOrder['source']) || 'manual',
      sourceId: found.source_id || undefined,
      equipment: found.equipment || undefined,
      equipmentId: found.equipment_id || undefined,
      location: found.location || 'Main Facility',
      facility_id: found.facility_id || '',
      assigned_to: found.assigned_to || undefined,
      assignedName: found.assigned_name || undefined,
      due_date: found.due_date || new Date().toISOString().split('T')[0],
      started_at: found.started_at || undefined,
      completed_at: found.completed_at || undefined,
      estimatedHours: found.estimated_hours || undefined,
      actualHours: found.actual_hours || undefined,
      safety: found.safety || {
        lotoRequired: false,
        lotoSteps: [],
        permits: [],
        permitNumbers: {},
        permitExpiry: {},
        ppeRequired: ['safety-glasses', 'safety-shoes'],
      },
      tasks: found.tasks || [],
      attachments: found.attachments || [],
      notes: found.notes || '',
      completionNotes: found.completion_notes || undefined,
      created_at: found.created_at || new Date().toISOString(),
      updated_at: found.updated_at || new Date().toISOString(),
    };
    
    return mapped;
  }, [workOrdersData, id]);
  
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/cmms/workorders');
    }
  };
  
  const handleUpdate = (updates: Partial<DetailedWorkOrder>) => {
    console.log('[WorkOrderDetail] Update requested:', updates);
  };
  
  const handleStartWork = () => {
    console.log('[WorkOrderDetail] Start work requested');
  };
  
  const handleCompleteWork = () => {
    console.log('[WorkOrderDetail] Complete work requested');
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen 
          options={{ 
            title: 'Work Order',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading work order...
          </Text>
        </View>
      </View>
    );
  }
  
  if (error || !workOrder) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen 
          options={{ 
            title: 'Work Order',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }} 
        />
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: colors.error + '15' }]}>
            <AlertTriangle size={48} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Work Order Not Found
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            The work order you are looking for does not exist or may have been deleted.
          </Text>
          <Text style={[styles.errorId, { color: colors.textTertiary }]}>
            ID: {id}
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: workOrder.workOrderNumber,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <WorkOrderDetail
        workOrder={workOrder}
        onClose={handleClose}
        onUpdate={handleUpdate}
        onStartWork={handleStartWork}
        onCompleteWork={handleCompleteWork}
        canEdit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  errorId: {
    fontSize: 12,
    marginTop: 8,
  },
});
