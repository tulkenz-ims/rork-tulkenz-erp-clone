import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';

type PMSchedule = Tables['pm_schedules'];

export type PMFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type PMPriority = 'low' | 'medium' | 'high' | 'critical';
export type PMDayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ExtendedPMSchedule extends PMSchedule {
  equipment_name?: string;
  equipment_tag?: string;
  facility_id?: string;
  facility_name?: string;
  assigned_name?: string;
  is_overdue?: boolean;
  days_until_due?: number;
  schedule_time?: string;
  schedule_days?: PMDayOfWeek[];
}

export function usePMSchedulesQuery(options?: QueryOptions<PMSchedule> & { 
  enabled?: boolean;
  frequency?: PMFrequency | PMFrequency[];
  priority?: PMPriority | PMPriority[];
  equipmentId?: string;
  assignedTo?: string;
  active?: boolean;
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
      'pm_schedules', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.frequency,
      options?.priority,
      options?.equipmentId,
      options?.assignedTo,
      options?.active,
      options?.overdueOnly,
      options?.dueSoon,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('pm_schedules')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.frequency) {
        if (Array.isArray(options.frequency)) {
          query = query.in('frequency', options.frequency);
        } else {
          query = query.eq('frequency', options.frequency);
        }
      }
      
      if (options?.priority) {
        if (Array.isArray(options.priority)) {
          query = query.in('priority', options.priority);
        } else {
          query = query.eq('priority', options.priority);
        }
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      
      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      if (options?.overdueOnly) {
        query = query.lt('next_due', today);
      }
      
      if (options?.dueSoon !== undefined) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.dueSoon);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        query = query.lte('next_due', futureDateStr);
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
        query = query.order('next_due', { ascending: true });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[usePMSchedulesQuery] Error:', error);
        throw new Error(error.message);
      }
      
      const rawData = (data || []) as unknown as PMSchedule[];
      const schedules = rawData.map(schedule => {
        const nextDue = new Date(schedule.next_due);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const diffTime = nextDue.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...schedule,
          is_overdue: diffDays < 0,
          days_until_due: diffDays,
        } as ExtendedPMSchedule;
      });
      
      console.log('[usePMSchedulesQuery] Fetched:', schedules.length, 'PM schedules');
      return schedules;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMScheduleById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('pm_schedules', id, organizationId);
      if (result.error) throw result.error;
      console.log('[usePMScheduleById] Fetched PM schedule:', id);
      return result.data as ExtendedPMSchedule | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMSchedulesByEquipment(equipmentId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'byEquipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      const { data, error } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .eq('active', true)
        .order('next_due', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[usePMSchedulesByEquipment] Fetched:', data?.length || 0, 'PM schedules');
      return (data || []) as ExtendedPMSchedule[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useActivePMSchedules() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('next_due', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useActivePMSchedules] Fetched:', data?.length || 0, 'active PM schedules');
      return (data || []) as ExtendedPMSchedule[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOverduePMSchedules() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'overdue', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .lt('next_due', today)
        .order('next_due', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useOverduePMSchedules] Fetched:', data?.length || 0, 'overdue PM schedules');
      return (data || []) as ExtendedPMSchedule[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMSchedulesDueSoon(days: number = 7) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'dueSoon', days, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .gte('next_due', today)
        .lte('next_due', futureDateStr)
        .order('next_due', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[usePMSchedulesDueSoon] Fetched:', data?.length || 0, 'PM schedules due in', days, 'days');
      return (data || []) as ExtendedPMSchedule[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePMSchedulesCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'count', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const { count, error } = await supabase
        .from('pm_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('active', true);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useOverduePMCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'overdueCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('pm_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('active', true)
        .lt('next_due', today);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePMSchedule(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (schedule: Omit<ExtendedPMSchedule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('pm_schedules')
        .insert({
          organization_id: organizationId,
          equipment_id: schedule.equipment_id,
          name: schedule.name,
          description: schedule.description || null,
          frequency: schedule.frequency,
          priority: schedule.priority || 'medium',
          estimated_hours: schedule.estimated_hours || 1,
          assigned_to: schedule.assigned_to || null,
          last_completed: schedule.last_completed || null,
          next_due: schedule.next_due,
          active: schedule.active !== false,
          schedule_time: schedule.schedule_time || '08:00',
          schedule_days: schedule.schedule_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreatePMSchedule] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreatePMSchedule] Created PM schedule:', data?.id);
      return data as ExtendedPMSchedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_schedules'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePMSchedule] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePMSchedule(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtendedPMSchedule> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('pm_schedules')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdatePMSchedule] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdatePMSchedule] Updated PM schedule:', id);
      return data as ExtendedPMSchedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['pm_schedules', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePMSchedule] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCompletePMSchedule(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const updatePMSchedule = useUpdatePMSchedule(options);
  
  return useMutation({
    mutationFn: async ({ scheduleId, completedDate }: { scheduleId: string; completedDate?: string }) => {
      const completionDate = completedDate || new Date().toISOString().split('T')[0];
      const nextDue = calculateNextDueDate(completionDate);
      
      return updatePMSchedule.mutateAsync({
        id: scheduleId,
        updates: {
          last_completed: completionDate,
          next_due: nextDue,
        },
      });
    },
  });
}

export function useActivatePMSchedule(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const updatePMSchedule = useUpdatePMSchedule(options);
  
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      return updatePMSchedule.mutateAsync({
        id: scheduleId,
        updates: { active: true },
      });
    },
  });
}

export function useDeactivatePMSchedule(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const updatePMSchedule = useUpdatePMSchedule(options);
  
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      return updatePMSchedule.mutateAsync({
        id: scheduleId,
        updates: { active: false },
      });
    },
  });
}

export function useAssignPMSchedule(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const updatePMSchedule = useUpdatePMSchedule(options);
  
  return useMutation({
    mutationFn: async ({ scheduleId, assignedTo }: { scheduleId: string; assignedTo: string | null }) => {
      return updatePMSchedule.mutateAsync({
        id: scheduleId,
        updates: { assigned_to: assignedTo },
      });
    },
  });
}

export function useDeletePMSchedule(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('pm_schedules', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeletePMSchedule] Deleted PM schedule:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm_schedules'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeletePMSchedule] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePMScheduleMetrics() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          total: 0,
          active: 0,
          inactive: 0,
          overdue: 0,
          dueThisWeek: 0,
          dueThisMonth: 0,
          completedThisMonth: 0,
          byFrequency: {} as Record<string, number>,
          byPriority: {} as Record<string, number>,
          avgEstimatedHours: 0,
          complianceRate: 0,
        };
      }
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekStr = weekFromNow.toISOString().split('T')[0];
      
      const monthFromNow = new Date();
      monthFromNow.setDate(monthFromNow.getDate() + 30);
      const monthStr = monthFromNow.toISOString().split('T')[0];
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      
      const [allResult, overdueResult, dueWeekResult, dueMonthResult, completedMonthResult] = await Promise.all([
        supabase
          .from('pm_schedules')
          .select('active, frequency, priority, estimated_hours')
          .eq('organization_id', organizationId),
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('active', true)
          .lt('next_due', todayStr),
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('active', true)
          .gte('next_due', todayStr)
          .lte('next_due', weekStr),
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('active', true)
          .gte('next_due', todayStr)
          .lte('next_due', monthStr),
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('last_completed', startOfMonthStr),
      ]);
      
      const schedules = allResult.data || [];
      const overdueCount = overdueResult.count || 0;
      const dueWeekCount = dueWeekResult.count || 0;
      const dueMonthCount = dueMonthResult.count || 0;
      const completedMonthCount = completedMonthResult.count || 0;
      
      const activeCount = schedules.filter(s => s.active).length;
      const inactiveCount = schedules.filter(s => !s.active).length;
      
      const byFrequency = schedules.reduce((acc, s) => {
        acc[s.frequency] = (acc[s.frequency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const byPriority = schedules.reduce((acc, s) => {
        acc[s.priority] = (acc[s.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const avgEstimatedHours = schedules.length > 0
        ? schedules.reduce((sum, s) => sum + (s.estimated_hours || 0), 0) / schedules.length
        : 0;
      
      const denominator = completedMonthCount + overdueCount;
      const complianceRate = denominator > 0 
        ? Math.round((completedMonthCount / denominator) * 100) 
        : 100;
      
      return {
        total: schedules.length,
        active: activeCount,
        inactive: inactiveCount,
        overdue: overdueCount,
        dueThisWeek: dueWeekCount,
        dueThisMonth: dueMonthCount,
        completedThisMonth: completedMonthCount,
        byFrequency,
        byPriority,
        avgEstimatedHours: Math.round(avgEstimatedHours * 10) / 10,
        complianceRate,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePMScheduleSearch(searchTerm: string) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_schedules', 'search', searchTerm, organizationId],
    queryFn: async () => {
      if (!organizationId || !searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('next_due', { ascending: true })
        .limit(50);
      
      if (error) throw new Error(error.message);
      console.log('[usePMScheduleSearch] Found:', data?.length || 0, 'PM schedules');
      return (data || []) as ExtendedPMSchedule[];
    },
    enabled: !!organizationId && !!searchTerm && searchTerm.length >= 2,
    staleTime: 1000 * 60 * 1,
  });
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

export function getFrequencyLabel(frequency: PMFrequency): string {
  const labels: Record<PMFrequency, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual',
  };
  return labels[frequency] || frequency;
}

export function getFrequencyDays(frequency: PMFrequency): number {
  const days: Record<PMFrequency, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
    semi_annual: 180,
    annual: 365,
  };
  return days[frequency] || 30;
}

export interface PMWorkOrder {
  id: string;
  pm_schedule_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date: string;
  completed_date?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export function usePMWorkOrdersQuery(options?: {
  enabled?: boolean;
  status?: string | string[];
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['pm_work_orders', organizationId, options?.status],
    queryFn: async (): Promise<PMWorkOrder[]> => {
      if (!organizationId) return [];
      
      const { data: schedules, error } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('next_due', { ascending: true });
      
      if (error) {
        console.error('[usePMWorkOrdersQuery] Error:', error);
        throw new Error(error.message);
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const pmWorkOrders: PMWorkOrder[] = (schedules || []).map(schedule => {
        let status: PMWorkOrder['status'] = 'scheduled';
        if (schedule.last_completed && schedule.last_completed >= schedule.next_due) {
          status = 'completed';
        } else if (schedule.next_due < today) {
          status = 'in_progress';
        }
        
        return {
          id: schedule.id,
          pm_schedule_id: schedule.id,
          status,
          priority: (schedule.priority as PMWorkOrder['priority']) || 'medium',
          scheduled_date: schedule.next_due,
          completed_date: schedule.last_completed,
          assigned_to: schedule.assigned_to,
          notes: schedule.description,
          created_at: schedule.created_at,
          updated_at: schedule.updated_at,
        };
      });
      
      console.log('[usePMWorkOrdersQuery] Fetched:', pmWorkOrders.length, 'PM work orders');
      return pmWorkOrders;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useStartPMWorkOrder(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const updatePMSchedule = useUpdatePMSchedule(options);
  
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      console.log('[useStartPMWorkOrder] Starting PM work order:', scheduleId);
      return updatePMSchedule.mutateAsync({
        id: scheduleId,
        updates: {
          // Mark as in progress by setting a flag or just triggering an update
          // The status is derived from dates, so we just need to track it started
        },
      });
    },
  });
}

export function useCompletePMWorkOrder(options?: {
  onSuccess?: (data: ExtendedPMSchedule) => void;
  onError?: (error: Error) => void;
  skipTaskFeedPost?: boolean;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pmWorkOrderId, 
      laborHours, 
      completionNotes,
      completedBy,
      completedByName,
      skipTaskFeedPost,
    }: { 
      pmWorkOrderId: string; 
      laborHours?: number; 
      completionNotes?: string;
      completedBy?: string;
      completedByName?: string;
      skipTaskFeedPost?: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const completionDate = new Date().toISOString().split('T')[0];
      
      // Get the current schedule to calculate next due date
      const { data: schedule, error: fetchError } = await supabase
        .from('pm_schedules')
        .select('*')
        .eq('id', pmWorkOrderId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) {
        console.error('[useCompletePMWorkOrder] Error fetching schedule:', fetchError);
        throw new Error(fetchError.message);
      }
      
      const nextDue = calculateNextDueDateFromFrequency(completionDate, schedule.frequency as PMFrequency);
      
      const { data, error } = await supabase
        .from('pm_schedules')
        .update({
          last_completed: completionDate,
          next_due: nextDue,
          description: completionNotes ? `${schedule.description || ''}\n\nLast completion notes: ${completionNotes}` : schedule.description,
        })
        .eq('id', pmWorkOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useCompletePMWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCompletePMWorkOrder] Completed PM work order:', pmWorkOrderId, 'Labor hours:', laborHours);
      
      // Post to Task Feed unless explicitly skipped
      if (!skipTaskFeedPost && !options?.skipTaskFeedPost) {
        try {
          const pmNumber = generatePMNumber();
          const completedName = completedByName || completedBy || 'System';
          const frequencyLabel = getFrequencyLabel(schedule.frequency as PMFrequency);
          
          const action = `PM Completed: ${schedule.name}`;
          const categoryName = `Preventive Maintenance - ${frequencyLabel}`;
          
          const notes = [
            schedule.equipment_id ? `Equipment ID: ${schedule.equipment_id}` : null,
            `Frequency: ${frequencyLabel}`,
            laborHours ? `Labor Hours: ${laborHours}` : null,
            `Next Due: ${new Date(nextDue).toLocaleDateString()}`,
            completionNotes ? `Notes: ${completionNotes}` : null,
            `Completed by: ${completedName}`,
          ].filter(Boolean).join('\n');
          
          await supabase
            .from('task_verifications')
            .insert({
              organization_id: organizationId,
              department_code: '1001',
              department_name: 'Maintenance',
              facility_code: null,
              location_id: null,
              location_name: schedule.name || null,
              category_id: 'cat-pm-complete',
              category_name: categoryName,
              action: action,
              notes: notes,
              photo_uri: null,
              employee_id: completedBy || 'system',
              employee_name: completedName,
              status: 'verified',
              source_type: 'pm_work_order',
              source_id: pmWorkOrderId,
              source_number: pmNumber,
            });
          
          console.log('[useCompletePMWorkOrder] Posted to Task Feed:', pmNumber);
        } catch (taskFeedError) {
          console.error('[useCompletePMWorkOrder] Task Feed post error (non-blocking):', taskFeedError);
        }
      }
      
      return data as ExtendedPMSchedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pm_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['pm_work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['pm_compliance_metrics'] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCompletePMWorkOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

function generatePMNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PM-${year}${month}${day}-${random}`;
}

function calculateNextDueDateFromFrequency(completedDate: string, frequency: PMFrequency): string {
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

export function usePMComplianceMetrics() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['pm_compliance_metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalSchedules: 0,
          completedThisMonth: 0,
          overdue: 0,
          complianceRate: 100,
          avgCompletionTime: 0,
          onTimeRate: 100,
        };
      }
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      
      const [scheduledResult, completedResult, overdueResult] = await Promise.all([
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('active', true),
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('last_completed', startOfMonthStr),
        supabase
          .from('pm_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('active', true)
          .lt('next_due', todayStr),
      ]);
      
      const totalSchedules = scheduledResult.count || 0;
      const completedThisMonth = completedResult.count || 0;
      const overdue = overdueResult.count || 0;
      
      const totalDue = completedThisMonth + overdue;
      const complianceRate = totalDue > 0 
        ? Math.round((completedThisMonth / totalDue) * 100) 
        : 100;
      
      const onTimeRate = totalSchedules > 0
        ? Math.round(((totalSchedules - overdue) / totalSchedules) * 100)
        : 100;
      
      return {
        totalSchedules,
        completedThisMonth,
        overdue,
        complianceRate,
        avgCompletionTime: 0,
        onTimeRate,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}
