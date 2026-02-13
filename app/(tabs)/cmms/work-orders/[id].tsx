import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useWorkOrdersQuery, useStartWorkOrder, useCompleteWorkOrder, useUpdateWorkOrderDetail } from '@/hooks/useSupabaseWorkOrders';
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
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: workOrdersData, isLoading, error, refetch } = useWorkOrdersQuery();
  
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
  
  const startWorkMutation = useStartWorkOrder({
    onSuccess: (data) => {
      console.log('[WorkOrderDetail] Work order started:', data.id);
      refetch();
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to start work order:', error);
      Alert.alert('Error', 'Failed to start work order. Please try again.');
    },
  });

  const completeWorkOrderMutation = useCompleteWorkOrder({
    onSuccess: (data) => {
      console.log('[WorkOrderDetail] Work order completed:', data.id);
      refetch();
      Alert.alert(
        'Work Order Completed',
        `${workOrder?.workOrderNumber || 'Work order'} has been marked as complete.`,
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          }
        }}]
      );
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to complete work order:', error);
      Alert.alert('Error', 'Failed to complete work order. Please try again.');
    },
  });

  const updateWorkOrderMutation = useUpdateWorkOrderDetail({
    onSuccess: () => {
      console.log('[WorkOrderDetail] Work order updated');
      refetch();
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to update work order:', error);
      Alert.alert('Error', 'Failed to update work order. Please try again.');
    },
  });

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/cmms/workorders');
    }
  };
  
  const handleUpdate = useCallback((woId: string, updates: Partial<DetailedWorkOrder>) => {
    console.log('[WorkOrderDetail] Update requested:', woId, updates);
    updateWorkOrderMutation.mutate({
      id: woId,
      updates,
    });
  }, [updateWorkOrderMutation]);
  
  const handleStartWork = useCallback((woId: string) => {
    console.log('[WorkOrderDetail] Starting work on:', woId);
    startWorkMutation.mutate(woId);
  }, [startWorkMutation]);
  
  const handleCompleteWork = useCallback((workOrderId: string) => {
    if (!workOrder) return;
    console.log('[WorkOrderDetail] Completing work order:', workOrderId);

    Alert.alert(
      'Complete Work Order',
      `Are you sure you want to complete ${workOrder.workOrderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: () => {
            completeWorkOrderMutation.mutate({
              workOrderId,
              completedBy: user?.id,
              completedByName: user ? `${user.first_name} ${user.last_name}` : undefined,
            });
          },
        },
      ]
    );
  }, [workOrder, completeWorkOrderMutation, user]);
  
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
