import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { autoLogRoomHygieneEntry } from '@/hooks/useRoomHygieneLog';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';
import {
  DetailedWorkOrder,
  WorkOrderDB,
  mapDBToDetailedWorkOrder,
  mapDetailedToDBUpdate,
  DEFAULT_SAFETY,
} from '@/types/workOrder';

type WorkOrder = Tables['work_orders'];

export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'on_hold' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderType = 'corrective' | 'preventive' | 'emergency' | 'request';
export type WorkOrderSource = 'manual' | 'request' | 'pm_schedule';

export interface WorkOrderTask {
  id: string;
  order: number;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface WorkOrderSafety {
  lotoRequired: boolean;
  lotoSteps: {
    id: string;
    order: number;
    description: string;
    lockColor?: string;
    energySource?: string;
    location?: string;
  }[];
  permits: string[];
  permitNumbers: Record<string, string>;
  permitExpiry: Record<string, string>;
  ppeRequired: string[];
}

export interface WorkOrderAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
  size?: number;
}

export interface ExtendedWorkOrder extends Omit<WorkOrder, 'safety' | 'tasks' | 'attachments'> {
  work_order_number?: string;
  source?: WorkOrderSource;
  source_id?: string;
  assigned_name?: string;
  location?: string;
  safety?: WorkOrderSafety;
  tasks?: WorkOrderTask[];
  attachments?: WorkOrderAttachment[];
  completed_by?: string | null;
  department?: string;
  department_name?: string;
}

export function useWorkOrdersQuery(options?: QueryOptions<WorkOrder> & { 
  enabled?: boolean;
  status?: WorkOrderStatus | WorkOrderStatus[];
  type?: WorkOrderType;
  assignedTo?: string;
  equipmentId?: string;
  facilityId?: string;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'work_orders', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.status,
      options?.type,
      options?.assignedTo,
      options?.equipmentId,
      options?.facilityId,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('work_orders')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.type) {
        query = query.eq('type', options.type);
      }
      
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (filters) {
        for (const filter of filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'gt': query = query.gt(col, filter.value); break;
            case 'gte': query = query.gte(col, filter.value); break;
            case 'lt': query = query.lt(col, filter.value); break;
            case 'lte': query = query.lte(col, filter.value); break;
            case 'like': query = query.like(col, filter.value as string); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
            case 'is': query = query.is(col, filter.value); break;
          }
        }
      }
      
      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useWorkOrdersQuery] Error:', JSON.stringify(error, null, 2));
        console.error('[useWorkOrdersQuery] Error code:', error.code);
        console.error('[useWorkOrdersQuery] Error message:', error.message);
        console.error('[useWorkOrdersQuery] Error details:', error.details);
        throw new Error(error.message || 'Failed to fetch work orders');
      }
      
      console.log('[useWorkOrdersQuery] Fetched:', data?.length || 0, 'work orders');
      return (data || []) as unknown as ExtendedWorkOrder[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkOrderById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['work_orders', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('work_orders', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useWorkOrderById] Fetched work order:', id);
      return result.data as ExtendedWorkOrder | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkOrderDetail(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['work_orders', 'detail', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('[useWorkOrderDetail] Error:', error);
        throw new Error(error.message);
      }
      
      if (!data) return null;
      
      const detailed = mapDBToDetailedWorkOrder(data as unknown as WorkOrderDB);
      console.log('[useWorkOrderDetail] Fetched detailed work order:', id);
      return detailed;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateWorkOrderDetail(options?: {
  onSuccess?: (data: DetailedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DetailedWorkOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const dbUpdates = mapDetailedToDBUpdate(updates);
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateWorkOrderDetail] Error:', error);
        throw new Error(error.message);
      }
      
      const detailed = mapDBToDetailedWorkOrder(data as unknown as WorkOrderDB);
      console.log('[useUpdateWorkOrderDetail] Updated work order:', id);
      return detailed;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders', 'detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['work_orders', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateWorkOrderDetail] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useWorkOrdersByEquipment(equipmentId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['work_orders', 'byEquipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useWorkOrdersByEquipment] Fetched:', data?.length || 0, 'work orders');
      return (data || []) as unknown as ExtendedWorkOrder[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOpenWorkOrdersCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['work_orders', 'openCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const { count, error } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['open', 'in_progress']);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOverdueWorkOrdersCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['work_orders', 'overdueCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['open', 'in_progress'])
        .lt('due_date', today);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateWorkOrder(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workOrder: Omit<ExtendedWorkOrder, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const workOrderNumber = workOrder.work_order_number || generateWorkOrderNumber();
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          organization_id: organizationId,
          work_order_number: workOrderNumber,
          title: workOrder.title,
          description: workOrder.description,
          status: workOrder.status || 'open',
          priority: workOrder.priority || 'medium',
          type: workOrder.type || 'corrective',
          source: workOrder.source || 'manual',
          source_id: workOrder.source_id || null,
          assigned_to: workOrder.assigned_to || null,
          assigned_name: workOrder.assigned_name || null,
          facility_id: workOrder.facility_id || null,
          equipment_id: workOrder.equipment_id || null,
          equipment: workOrder.equipment || null,
          location: workOrder.location || null,
          due_date: workOrder.due_date,
          estimated_hours: workOrder.estimated_hours || null,
          notes: workOrder.notes || null,
          safety: workOrder.safety || {},
          tasks: workOrder.tasks || [],
          attachments: workOrder.attachments || [],
          department: workOrder.department || null,
          department_name: workOrder.department_name || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateWorkOrder] Created work order:', data?.id);
      return data as ExtendedWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateWorkOrder(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtendedWorkOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateWorkOrder] Updated work order:', id);
      return data as ExtendedWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useStartWorkOrder(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updateWorkOrder = useUpdateWorkOrder(options);
  
  return useMutation({
    mutationFn: async (workOrderId: string) => {
      return updateWorkOrder.mutateAsync({
        id: workOrderId,
        updates: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        },
      });
    },
  });
}

export function useCompleteWorkOrder(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
  skipTaskFeedPost?: boolean;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      completionNotes, 
      actualHours,
      completedBy,
      completedByName,
      departmentCode,
      skipTaskFeedPost,
    }: { 
      workOrderId: string; 
      completionNotes?: string;
      actualHours?: number;
      completedBy?: string;
      completedByName?: string;
      departmentCode?: string;
      skipTaskFeedPost?: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      // First fetch the work order to get full details for Task Feed
      const { data: existingWO, error: fetchError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) {
        console.error('[useCompleteWorkOrder] Error fetching WO:', fetchError);
        throw new Error(fetchError.message);
      }
      
      const isValidUUID = completedBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(completedBy);
      
      const updatePayload: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes || null,
        actual_hours: actualHours || null,
      };
      if (isValidUUID) {
        updatePayload.completed_by = completedBy;
      }
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(updatePayload)
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useCompleteWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCompleteWorkOrder] Completed work order:', workOrderId);
      
      // Department task completion and post status updates are handled 
      // by the Postgres trigger: trigger_wo_complete_dept_tasks
      // It fires automatically when work_orders.status changes to 'completed'
      
      // Post to Task Feed unless explicitly skipped
      if (!skipTaskFeedPost && !options?.skipTaskFeedPost) {
        try {
          const isFromPM = existingWO.source === 'pm_schedule';
          const woNumber = existingWO.work_order_number || `WO-${workOrderId.slice(0, 8)}`;
          const completedName = completedByName || completedBy || 'System';
          const deptCode = departmentCode || existingWO.department || '1001';
          
          const sourceType = isFromPM ? 'pm_work_order' : 'work_order';
          const categoryName = isFromPM 
            ? `PM Completed: ${existingWO.title}` 
            : 'Work Order Completed';
          const action = isFromPM
            ? `PM Work Order Completed: ${existingWO.title}`
            : `Work Order Completed: ${existingWO.title}`;
          
          const notes = [
            existingWO.description,
            existingWO.equipment ? `Equipment: ${existingWO.equipment}` : null,
            `Priority: ${(existingWO.priority || 'medium').charAt(0).toUpperCase() + (existingWO.priority || 'medium').slice(1)}`,
            actualHours ? `Labor Hours: ${actualHours}` : null,
            completionNotes ? `Completion Notes: ${completionNotes}` : null,
            `Completed by: ${completedName}`,
          ].filter(Boolean).join('\n');
          
          await supabase
            .from('task_verifications')
            .insert({
              organization_id: organizationId,
              department_code: deptCode,
              department_name: getDepartmentNameForWO(deptCode),
              facility_code: existingWO.facility_id || null,
              location_id: null,
              location_name: existingWO.location || existingWO.equipment || null,
              category_id: `cat-${sourceType}-complete`,
              category_name: categoryName,
              action: action,
              notes: notes,
              photo_uri: null,
              employee_id: (completedBy && /^[0-9a-f]{8}-/.test(completedBy)) ? completedBy : null,
              employee_name: completedName,
              status: 'verified',
              source_type: sourceType,
              source_id: workOrderId,
              source_number: woNumber,
              linked_work_order_id: workOrderId,
            });
          
          console.log('[useCompleteWorkOrder] Posted to Task Feed:', woNumber);
        } catch (taskFeedError) {
          console.error('[useCompleteWorkOrder] Task Feed post error (non-blocking):', taskFeedError);
        }
      }
      
      // Auto-log to Room Hygiene Log if WO is in a hygiene-required location
      try {
        const deptCode = departmentCode || existingWO.department || '1001';
        const woNumber = existingWO.work_order_number || `WO-${workOrderId.slice(0, 8)}`;
        const completedName = completedByName || completedBy || 'System';
        await autoLogRoomHygieneEntry({
          organizationId,
          locationId: existingWO.location_id || undefined,
          locationName: existingWO.location || existingWO.equipment || undefined,
          purpose: 'work_order',
          referenceId: workOrderId,
          referenceNumber: woNumber,
          departmentCode: deptCode,
          departmentName: getDepartmentNameForWO(deptCode),
          performedById: (completedBy && /^[0-9a-f]{8}-/.test(completedBy)) ? completedBy : undefined,
          performedByName: completedName,
          description: `${existingWO.title}${completionNotes ? ': ' + completionNotes : ''}`,
        });
      } catch (hygieneErr) {
        console.error('[useCompleteWorkOrder] Room hygiene auto-log error (non-blocking):', hygieneErr);
      }
      
      return data as ExtendedWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders', 'byId', data.id] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts_with_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      queryClient.invalidateQueries({ queryKey: ['daily_room_hygiene_reports'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCompleteWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

function getDepartmentNameForWO(code: string): string {
  const deptNames: Record<string, string> = {
    '1000': 'Projects / Offices',
    '1001': 'Maintenance',
    '1002': 'Sanitation',
    '1003': 'Production',
    '1004': 'Quality',
    '1005': 'Safety',
    '1006': 'HR',
    '1008': 'Warehouse',
    '1009': 'IT / Technology',
    '3000': 'Maintenance',
  };
  return deptNames[code] || 'Maintenance';
}

export function usePutWorkOrderOnHold(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updateWorkOrder = useUpdateWorkOrder(options);
  
  return useMutation({
    mutationFn: async ({ workOrderId, reason }: { workOrderId: string; reason?: string }) => {
      return updateWorkOrder.mutateAsync({
        id: workOrderId,
        updates: {
          status: 'on_hold',
          notes: reason,
        },
      });
    },
  });
}

export function useCancelWorkOrder(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updateWorkOrder = useUpdateWorkOrder(options);
  
  return useMutation({
    mutationFn: async ({ workOrderId, reason }: { workOrderId: string; reason?: string }) => {
      return updateWorkOrder.mutateAsync({
        id: workOrderId,
        updates: {
          status: 'cancelled',
          notes: reason,
        },
      });
    },
  });
}

export function useAssignWorkOrder(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updateWorkOrder = useUpdateWorkOrder(options);
  
  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      assignedTo, 
      assignedName 
    }: { 
      workOrderId: string; 
      assignedTo: string;
      assignedName: string;
    }) => {
      return updateWorkOrder.mutateAsync({
        id: workOrderId,
        updates: {
          assigned_to: assignedTo,
          assigned_name: assignedName,
        },
      });
    },
  });
}

export function useUpdateWorkOrderTasks(options?: {
  onSuccess?: (data: ExtendedWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updateWorkOrder = useUpdateWorkOrder(options);
  
  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      tasks 
    }: { 
      workOrderId: string; 
      tasks: WorkOrderTask[];
    }) => {
      return updateWorkOrder.mutateAsync({
        id: workOrderId,
        updates: {
          tasks,
        },
      });
    },
  });
}

export function useDeleteWorkOrder(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('work_orders', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteWorkOrder] Deleted work order:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useWorkOrderMetrics() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['work_orders', 'metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          onHold: 0,
          overdue: 0,
          avgCompletionHours: 0,
        };
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const [allResult, overdueResult, completedResult] = await Promise.all([
        supabase
          .from('work_orders')
          .select('status')
          .eq('organization_id', organizationId),
        supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .in('status', ['open', 'in_progress'])
          .lt('due_date', today),
        supabase
          .from('work_orders')
          .select('actual_hours')
          .eq('organization_id', organizationId)
          .eq('status', 'completed')
          .not('actual_hours', 'is', null),
      ]);
      
      const workOrders = allResult.data || [];
      const overdueCount = overdueResult.count || 0;
      const completedWithHours = completedResult.data || [];
      
      const statusCounts = workOrders.reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const avgCompletionHours = completedWithHours.length > 0
        ? completedWithHours.reduce((sum, wo) => sum + (wo.actual_hours || 0), 0) / completedWithHours.length
        : 0;
      
      return {
        total: workOrders.length,
        open: statusCounts['open'] || 0,
        inProgress: statusCounts['in_progress'] || 0,
        completed: statusCounts['completed'] || 0,
        onHold: statusCounts['on_hold'] || 0,
        overdue: overdueCount,
        avgCompletionHours: Math.round(avgCompletionHours * 10) / 10,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

function generateWorkOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `WO-${year}-${timestamp}${random}`;
}

export function generateAttachmentPath(
  organizationId: string,
  workOrderId: string,
  filename: string
): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  return `${organizationId}/${workOrderId}/${timestamp}_${sanitizedFilename}`;
}

export function useUploadAttachment(options?: {
  onSuccess?: (attachment: WorkOrderAttachment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async ({
      workOrderId,
      file,
      filename,
      type,
      uploadedBy,
    }: {
      workOrderId: string;
      file: Blob | ArrayBuffer;
      filename: string;
      type: 'image' | 'document';
      uploadedBy: string;
    }): Promise<WorkOrderAttachment> => {
      if (!organizationId) throw new Error('No organization selected');

      const path = generateAttachmentPath(organizationId, workOrderId, filename);
      console.log('[useUploadAttachment] Uploading to path:', path);

      try {
        const { data, error } = await supabase.storage
          .from('work-order-attachments')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
            console.warn('[useUploadAttachment] Storage bucket not configured, using local attachment');
            const localAttachment: WorkOrderAttachment = {
              id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              type,
              name: filename,
              uri: type === 'image' 
                ? 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop'
                : 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=300&fit=crop',
              uploadedAt: new Date().toISOString(),
              uploadedBy,
              size: file instanceof Blob ? file.size : (file as ArrayBuffer).byteLength,
            };
            console.log('[useUploadAttachment] Local attachment created:', localAttachment.id);
            return localAttachment;
          }
          console.error('[useUploadAttachment] Storage error:', error);
          throw new Error(error.message);
        }

        const { data: urlData } = supabase.storage
          .from('work-order-attachments')
          .getPublicUrl(data.path);

        const attachment: WorkOrderAttachment = {
          id: data.path,
          type,
          name: filename,
          uri: urlData.publicUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          size: file instanceof Blob ? file.size : (file as ArrayBuffer).byteLength,
        };

        console.log('[useUploadAttachment] Upload successful:', attachment.id);
        return attachment;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage?.includes('Bucket not found') || errorMessage?.includes('bucket')) {
          console.warn('[useUploadAttachment] Storage bucket not configured, using local attachment');
          const localAttachment: WorkOrderAttachment = {
            id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type,
            name: filename,
            uri: type === 'image' 
              ? 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop'
              : 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=300&fit=crop',
            uploadedAt: new Date().toISOString(),
            uploadedBy,
            size: file instanceof Blob ? file.size : (file as ArrayBuffer).byteLength,
          };
          return localAttachment;
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUploadAttachment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteAttachment(options?: {
  onSuccess?: (path: string) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (attachmentPath: string): Promise<string> => {
      if (!organizationId) throw new Error('No organization selected');

      if (!attachmentPath.startsWith(organizationId)) {
        throw new Error('Unauthorized: Cannot delete attachment from another organization');
      }

      console.log('[useDeleteAttachment] Deleting:', attachmentPath);

      const { error } = await supabase.storage
        .from('work-order-attachments')
        .remove([attachmentPath]);

      if (error) {
        console.error('[useDeleteAttachment] Storage error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteAttachment] Deleted successfully:', attachmentPath);
      return attachmentPath;
    },
    onSuccess: (path) => {
      options?.onSuccess?.(path);
    },
    onError: (error) => {
      console.error('[useDeleteAttachment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export interface WorkOrderPartLine {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityIssued: number;
  quantityReturned: number;
  quantityConsumed: number;
  unitOfMeasure: string;
  unitCost: number;
  totalCost: number;
  warehouseLocation?: string;
  binLocation?: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
  isSubstitute: boolean;
  originalMaterialId?: string;
  status: 'pending' | 'issued' | 'partial_return' | 'full_return' | 'consumed';
}

export interface WorkOrderParts {
  requestId: string;
  requestNumber: string;
  workOrderId: string;
  workOrderNumber: string | null;
  status: string;
  requestedBy: string | null;
  requestedByName: string;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  lines: WorkOrderPartLine[];
  totalEstimatedCost: number;
  totalActualCost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useWorkOrderParts(workOrderId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['work_order_parts', workOrderId, organizationId],
    queryFn: async (): Promise<WorkOrderParts[]> => {
      if (!organizationId || !workOrderId) return [];

      console.log('[useWorkOrderParts] Fetching parts for work order:', workOrderId);

      const { data, error } = await supabase
        .from('part_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useWorkOrderParts] Error:', error);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        console.log('[useWorkOrderParts] No parts found for work order:', workOrderId);
        return [];
      }

      const parts: WorkOrderParts[] = data.map((req) => {
        const rawLines = (req.lines || []) as {
          id?: string;
          material_id?: string;
          material_number?: string;
          material_name?: string;
          material_sku?: string;
          quantity_requested?: number;
          quantity_approved?: number;
          quantity_issued?: number;
          unit_of_measure?: string;
          estimated_unit_cost?: number;
          actual_unit_cost?: number;
          location?: string;
          notes?: string;
          status?: string;
        }[];

        const lines: WorkOrderPartLine[] = rawLines.map((line, idx) => ({
          id: line.id || `line-${idx}`,
          materialId: line.material_id || '',
          materialName: line.material_name || 'Unknown Part',
          materialSku: line.material_sku || line.material_number || '',
          quantityRequested: Number(line.quantity_requested) || 0,
          quantityApproved: Number(line.quantity_approved) || 0,
          quantityIssued: Number(line.quantity_issued) || 0,
          quantityReturned: 0,
          quantityConsumed: Number(line.quantity_issued) || 0,
          unitOfMeasure: line.unit_of_measure || 'EA',
          unitCost: Number(line.actual_unit_cost) || Number(line.estimated_unit_cost) || 0,
          totalCost: (Number(line.quantity_issued) || 0) * (Number(line.actual_unit_cost) || Number(line.estimated_unit_cost) || 0),
          warehouseLocation: line.location || undefined,
          notes: line.notes || undefined,
          isSubstitute: false,
          status: line.status === 'issued' ? 'issued' : 
                  line.status === 'partial' ? 'issued' : 'pending',
        }));

        return {
          requestId: req.id,
          requestNumber: req.request_number,
          workOrderId: req.work_order_id,
          workOrderNumber: req.work_order_number,
          status: req.status,
          requestedBy: req.requested_by,
          requestedByName: req.requested_by_name,
          approvedBy: req.approved_by,
          approvedByName: req.approved_by_name,
          approvedAt: req.approved_at,
          lines,
          totalEstimatedCost: Number(req.total_estimated_cost) || 0,
          totalActualCost: Number(req.total_actual_cost) || 0,
          notes: req.notes,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
        };
      });

      console.log('[useWorkOrderParts] Fetched', parts.length, 'part requests with',
        parts.reduce((sum, p) => sum + p.lines.length, 0), 'total lines');
      return parts;
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkOrderPartsSummary(workOrderId: string | undefined | null) {
  const { data: partsData } = useWorkOrderParts(workOrderId);

  return useQuery({
    queryKey: ['work_order_parts_summary', workOrderId, partsData],
    queryFn: async () => {
      if (!partsData || partsData.length === 0) {
        return {
          totalParts: 0,
          totalRequested: 0,
          totalIssued: 0,
          totalConsumed: 0,
          totalEstimatedCost: 0,
          totalActualCost: 0,
          pendingApproval: 0,
          partiallyIssued: 0,
          fullyIssued: 0,
        };
      }

      const allLines = partsData.flatMap(p => p.lines);
      
      return {
        totalParts: allLines.length,
        totalRequested: allLines.reduce((sum, l) => sum + l.quantityRequested, 0),
        totalIssued: allLines.reduce((sum, l) => sum + l.quantityIssued, 0),
        totalConsumed: allLines.reduce((sum, l) => sum + l.quantityConsumed, 0),
        totalEstimatedCost: partsData.reduce((sum, p) => sum + p.totalEstimatedCost, 0),
        totalActualCost: partsData.reduce((sum, p) => sum + p.totalActualCost, 0),
        pendingApproval: partsData.filter(p => p.status === 'pending_approval').length,
        partiallyIssued: partsData.filter(p => p.status === 'partially_issued').length,
        fullyIssued: partsData.filter(p => p.status === 'issued' || p.status === 'completed').length,
      };
    },
    enabled: !!workOrderId && !!partsData,
    staleTime: 1000 * 60 * 2,
  });
}

export { DetailedWorkOrder, WorkOrderDB, mapDBToDetailedWorkOrder, mapDetailedToDBUpdate, DEFAULT_SAFETY };
