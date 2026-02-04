import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';
import { ExtendedPMSchedule, PMFrequency, getFrequencyDays } from './useSupabasePMSchedules';
import { ExtendedWorkOrder, WorkOrderStatus, WorkOrderPriority } from './useSupabaseWorkOrders';

type WorkOrder = Tables['work_orders'];

export interface PMWorkOrder extends ExtendedWorkOrder {
  pm_schedule_id?: string;
  pm_schedule_name?: string;
  equipment_name?: string;
  equipment_tag?: string;
  is_recurring: boolean;
  frequency?: PMFrequency;
  last_completed?: string;
  next_occurrence?: string;
}

export interface GeneratePMWorkOrderInput {
  scheduleId: string;
  scheduleName: string;
  description?: string;
  equipmentId?: string;
  equipmentName?: string;
  facilityId?: string;
  assignedTo?: string;
  assignedName?: string;
  priority?: WorkOrderPriority;
  estimatedHours?: number;
  dueDate: string;
  tasks?: { id: string; order: number; description: string; completed: boolean }[];
}

export function usePMWorkOrdersQuery(options?: QueryOptions<WorkOrder> & { 
  enabled?: boolean;
  status?: WorkOrderStatus | WorkOrderStatus[];
  priority?: WorkOrderPriority | WorkOrderPriority[];
  scheduleId?: string;
  equipmentId?: string;
  assignedTo?: string;
  overdueOnly?: boolean;
  dueSoon?: number;
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
      'pm_work_orders', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.status,
      options?.priority,
      options?.scheduleId,
      options?.equipmentId,
      options?.assignedTo,
      options?.overdueOnly,
      options?.dueSoon,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('work_orders')
        .select(select || '*')
        .eq('organization_id', organizationId)
        .eq('type', 'preventive');
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.priority) {
        if (Array.isArray(options.priority)) {
          query = query.in('priority', options.priority);
        } else {
          query = query.eq('priority', options.priority);
        }
      }
      
      if (options?.scheduleId) {
        query = query.eq('source_id', options.scheduleId);
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      if (options?.overdueOnly) {
        query = query.in('status', ['open', 'in_progress']).lt('due_date', today);
      }
      
      if (options?.dueSoon !== undefined) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.dueSoon);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        query = query.in('status', ['open', 'in_progress']).lte('due_date', futureDateStr);
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
        query = query.order('due_date', { ascending: true });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[usePMWorkOrdersQuery] Error:', error);
        throw new Error(error.message);
      }
      
      const pmWorkOrders: PMWorkOrder[] = (data || []).map(wo => ({
        ...wo,
        pm_schedule_id: wo.source_id || undefined,
        is_recurring: wo.source === 'pm_schedule',
      })) as PMWorkOrder[];
      
      console.log('[usePMWorkOrdersQuery] Fetched:', pmWorkOrders.length, 'PM work orders');
      return pmWorkOrders;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMWorkOrderById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .single();
      
      if (error) {
        console.error('[usePMWorkOrderById] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[usePMWorkOrderById] Fetched PM work order:', id);
      return data ? {
        ...data,
        pm_schedule_id: data.source_id || undefined,
        is_recurring: data.source === 'pm_schedule',
      } as PMWorkOrder : null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMWorkOrdersBySchedule(scheduleId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'bySchedule', scheduleId, organizationId],
    queryFn: async () => {
      if (!organizationId || !scheduleId) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .eq('source_id', scheduleId)
        .order('due_date', { ascending: false });
      
      if (error) {
        console.error('[usePMWorkOrdersBySchedule] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[usePMWorkOrdersBySchedule] Fetched:', data?.length || 0, 'PM work orders for schedule:', scheduleId);
      return (data || []).map(wo => ({
        ...wo,
        pm_schedule_id: wo.source_id || undefined,
        is_recurring: true,
      })) as PMWorkOrder[];
    },
    enabled: !!organizationId && !!scheduleId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMWorkOrdersByEquipment(equipmentId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'byEquipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .eq('equipment_id', equipmentId)
        .order('due_date', { ascending: false });
      
      if (error) {
        console.error('[usePMWorkOrdersByEquipment] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[usePMWorkOrdersByEquipment] Fetched:', data?.length || 0, 'PM work orders');
      return (data || []).map(wo => ({
        ...wo,
        pm_schedule_id: wo.source_id || undefined,
        is_recurring: wo.source === 'pm_schedule',
      })) as PMWorkOrder[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOpenPMWorkOrdersCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'openCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      
      const { count, error } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .in('status', ['open', 'in_progress']);
      
      if (error) {
        console.error('[useOpenPMWorkOrdersCount] Error:', error);
        throw new Error(error.message);
      }
      
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOverduePMWorkOrdersCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'overdueCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .in('status', ['open', 'in_progress'])
        .lt('due_date', today);
      
      if (error) {
        console.error('[useOverduePMWorkOrdersCount] Error:', error);
        throw new Error(error.message);
      }
      
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useGeneratePMWorkOrder(options?: {
  onSuccess?: (data: PMWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: GeneratePMWorkOrderInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const workOrderNumber = generatePMWorkOrderNumber();
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          organization_id: organizationId,
          work_order_number: workOrderNumber,
          title: `PM: ${input.scheduleName}`,
          description: input.description || `Preventive maintenance for ${input.scheduleName}`,
          status: 'open',
          priority: input.priority || 'medium',
          type: 'preventive',
          source: 'pm_schedule',
          source_id: input.scheduleId,
          assigned_to: input.assignedTo || null,
          assigned_name: input.assignedName || null,
          facility_id: input.facilityId || null,
          equipment_id: input.equipmentId || null,
          equipment: input.equipmentName || null,
          due_date: input.dueDate,
          estimated_hours: input.estimatedHours || null,
          tasks: input.tasks || [],
          safety: {},
          attachments: [],
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useGeneratePMWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useGeneratePMWorkOrder] Generated PM work order:', data?.id);
      return {
        ...data,
        pm_schedule_id: data.source_id || undefined,
        is_recurring: true,
      } as PMWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useGeneratePMWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useGenerateFromSchedule(options?: {
  onSuccess?: (data: PMWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const generatePMWorkOrder = useGeneratePMWorkOrder(options);
  
  return useMutation({
    mutationFn: async (schedule: ExtendedPMSchedule) => {
      return generatePMWorkOrder.mutateAsync({
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        description: schedule.description || undefined,
        equipmentId: schedule.equipment_id || undefined,
        equipmentName: schedule.equipment_name || undefined,
        facilityId: schedule.facility_id || undefined,
        assignedTo: schedule.assigned_to || undefined,
        assignedName: schedule.assigned_name || undefined,
        priority: (schedule.priority as WorkOrderPriority) || 'medium',
        estimatedHours: schedule.estimated_hours || undefined,
        dueDate: schedule.next_due,
      });
    },
  });
}

export function useUpdatePMWorkOrder(options?: {
  onSuccess?: (data: PMWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PMWorkOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { pm_schedule_id, pm_schedule_name, equipment_name, equipment_tag, is_recurring, frequency, last_completed, next_occurrence, ...dbUpdates } = updates;
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(dbUpdates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdatePMWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdatePMWorkOrder] Updated PM work order:', id);
      return {
        ...data,
        pm_schedule_id: data.source_id || undefined,
        is_recurring: data.source === 'pm_schedule',
      } as PMWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePMWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useStartPMWorkOrder(options?: {
  onSuccess?: (data: PMWorkOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePMWorkOrder = useUpdatePMWorkOrder(options);
  
  return useMutation({
    mutationFn: async (workOrderId: string) => {
      return updatePMWorkOrder.mutateAsync({
        id: workOrderId,
        updates: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        },
      });
    },
  });
}

export function useCompletePMWorkOrder(options?: {
  onSuccess?: (data: PMWorkOrder) => void;
  onError?: (error: Error) => void;
  updateSchedule?: boolean;
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
    }: { 
      workOrderId: string; 
      completionNotes?: string;
      actualHours?: number;
      completedBy?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: workOrder, error: fetchError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) {
        console.error('[useCompletePMWorkOrder] Fetch error:', fetchError);
        throw new Error(fetchError.message);
      }
      
      const { data, error } = await supabase
        .from('work_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes || null,
          actual_hours: actualHours || null,
          completed_by: completedBy || null,
        })
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useCompletePMWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      if (options?.updateSchedule !== false && workOrder?.source_id && workOrder.source === 'pm_schedule') {
        const completedDate = new Date().toISOString().split('T')[0];
        
        const { data: schedule } = await supabase
          .from('pm_schedules')
          .select('frequency')
          .eq('id', workOrder.source_id)
          .eq('organization_id', organizationId)
          .single();
        
        if (schedule) {
          const nextDue = calculateNextDueDate(completedDate, schedule.frequency as PMFrequency);
          
          const { error: scheduleError } = await supabase
            .from('pm_schedules')
            .update({
              last_completed: completedDate,
              next_due: nextDue,
            })
            .eq('id', workOrder.source_id)
            .eq('organization_id', organizationId);
          
          if (scheduleError) {
            console.warn('[useCompletePMWorkOrder] Failed to update schedule:', scheduleError);
          } else {
            console.log('[useCompletePMWorkOrder] Updated PM schedule next_due to:', nextDue);
          }
        }
      }
      
      console.log('[useCompletePMWorkOrder] Completed PM work order:', workOrderId);
      return {
        ...data,
        pm_schedule_id: data.source_id || undefined,
        is_recurring: data.source === 'pm_schedule',
      } as PMWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['pm_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCompletePMWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeletePMWorkOrder(options?: {
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
      
      console.log('[useDeletePMWorkOrder] Deleted PM work order:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeletePMWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePMWorkOrderMetrics() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          completedThisMonth: 0,
          avgCompletionHours: 0,
          onTimeCompletionRate: 0,
        };
      }
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      
      const [allResult, overdueResult, completedMonthResult, completedWithHoursResult] = await Promise.all([
        supabase
          .from('work_orders')
          .select('status')
          .eq('organization_id', organizationId)
          .eq('type', 'preventive'),
        supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('type', 'preventive')
          .in('status', ['open', 'in_progress'])
          .lt('due_date', todayStr),
        supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('type', 'preventive')
          .eq('status', 'completed')
          .gte('completed_at', startOfMonthStr),
        supabase
          .from('work_orders')
          .select('actual_hours, due_date, completed_at')
          .eq('organization_id', organizationId)
          .eq('type', 'preventive')
          .eq('status', 'completed')
          .not('actual_hours', 'is', null),
      ]);
      
      const workOrders = allResult.data || [];
      const overdueCount = overdueResult.count || 0;
      const completedThisMonth = completedMonthResult.count || 0;
      const completedWithHours = completedWithHoursResult.data || [];
      
      const statusCounts = workOrders.reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const avgCompletionHours = completedWithHours.length > 0
        ? completedWithHours.reduce((sum, wo) => sum + (wo.actual_hours || 0), 0) / completedWithHours.length
        : 0;
      
      const onTimeCompletions = completedWithHours.filter(wo => {
        if (!wo.completed_at || !wo.due_date) return false;
        return new Date(wo.completed_at) <= new Date(wo.due_date + 'T23:59:59');
      }).length;
      
      const onTimeCompletionRate = completedWithHours.length > 0
        ? Math.round((onTimeCompletions / completedWithHours.length) * 100)
        : 100;
      
      return {
        total: workOrders.length,
        open: statusCounts['open'] || 0,
        inProgress: statusCounts['in_progress'] || 0,
        completed: statusCounts['completed'] || 0,
        overdue: overdueCount,
        completedThisMonth,
        avgCompletionHours: Math.round(avgCompletionHours * 10) / 10,
        onTimeCompletionRate,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePMWorkOrdersDueSoon(days: number = 7) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'dueSoon', days, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .in('status', ['open', 'in_progress'])
        .gte('due_date', today)
        .lte('due_date', futureDateStr)
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('[usePMWorkOrdersDueSoon] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[usePMWorkOrdersDueSoon] Fetched:', data?.length || 0, 'PM work orders due in', days, 'days');
      return (data || []).map(wo => ({
        ...wo,
        pm_schedule_id: wo.source_id || undefined,
        is_recurring: wo.source === 'pm_schedule',
      })) as PMWorkOrder[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOverduePMWorkOrders() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_work_orders', 'overdue', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'preventive')
        .in('status', ['open', 'in_progress'])
        .lt('due_date', today)
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('[useOverduePMWorkOrders] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useOverduePMWorkOrders] Fetched:', data?.length || 0, 'overdue PM work orders');
      return (data || []).map(wo => ({
        ...wo,
        pm_schedule_id: wo.source_id || undefined,
        is_recurring: wo.source === 'pm_schedule',
      })) as PMWorkOrder[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

function generatePMWorkOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `PM-${year}-${timestamp}${random}`;
}

function calculateNextDueDate(completedDate: string, frequency: PMFrequency = 'monthly'): string {
  const date = new Date(completedDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semi_annual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString().split('T')[0];
}
