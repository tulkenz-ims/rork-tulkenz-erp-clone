import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, insertRecord, updateRecord } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface TimeOffRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  manager_id: string | null;
  manager_name: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  facility_id: string | null;
  position: string | null;
  status: 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeOffInput {
  employee_id: string;
  employee_name: string;
  type: 'vacation' | 'sick' | 'personal' | 'unpaid';
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
}

export interface ShiftSwap {
  id: string;
  organization_id: string;
  requester_id: string;
  requester_name: string;
  requester_shift_id: string;
  target_employee_id: string | null;
  target_employee_name: string | null;
  target_shift_id: string | null;
  swap_type: 'swap' | 'giveaway' | 'pickup';
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'manager_pending' | 'manager_approved' | 'manager_rejected' | 'completed';
  reason: string | null;
  requester_date: string;
  requester_start_time: string;
  requester_end_time: string;
  target_date: string | null;
  target_start_time: string | null;
  target_end_time: string | null;
  responded_at: string | null;
  manager_id: string | null;
  manager_name: string | null;
  manager_approved_at: string | null;
  manager_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftSwapInput {
  requester_id: string;
  requester_name: string;
  requester_shift_id: string;
  target_employee_id?: string;
  target_employee_name?: string;
  target_shift_id?: string;
  swap_type: 'swap' | 'giveaway' | 'pickup';
  reason?: string;
  requester_date: string;
  requester_start_time: string;
  requester_end_time: string;
  target_date?: string;
  target_start_time?: string;
  target_end_time?: string;
}

export function useTimeOffRequests(employeeId?: string, options?: { status?: 'pending' | 'approved' | 'rejected' }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['time-off-requests', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('time_off_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTimeOffRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useTimeOffRequests] Fetched ${data?.length || 0} requests`);
      return (data || []) as TimeOffRequest[];
    },
    enabled: !!organizationId,
  });
}

export function usePendingTimeOffRequests() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['pending-time-off-requests', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[usePendingTimeOffRequests] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as TimeOffRequest[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateTimeOffInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await insertRecord('time_off_requests', {
        organization_id: organizationId,
        employee_id: input.employee_id,
        employee_name: input.employee_name,
        type: input.type,
        start_date: input.start_date,
        end_date: input.end_date,
        total_days: input.total_days,
        reason: input.reason || null,
        status: 'pending' as const,
        manager_id: null,
        manager_name: null,
        responded_at: null,
      });

      if (error) {
        console.error('[useCreateTimeOffRequest] Error:', error);
        throw error;
      }

      console.log('[useCreateTimeOffRequest] Created request:', data?.id);
      return data as TimeOffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-time-off-requests'] });
    },
  });
}

export function useApproveTimeOff() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ requestId, managerId, managerName }: { requestId: string; managerId: string; managerName: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord(
        'time_off_requests',
        requestId,
        {
          status: 'approved' as const,
          manager_id: managerId,
          manager_name: managerName,
          responded_at: new Date().toISOString(),
        },
        organizationId
      );

      if (error) {
        console.error('[useApproveTimeOff] Error:', error);
        throw error;
      }

      console.log('[useApproveTimeOff] Approved request:', requestId);
      return data as TimeOffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-time-off-requests'] });
    },
  });
}

export function useRejectTimeOff() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ requestId, managerId, managerName }: { requestId: string; managerId: string; managerName: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord(
        'time_off_requests',
        requestId,
        {
          status: 'rejected' as const,
          manager_id: managerId,
          manager_name: managerName,
          responded_at: new Date().toISOString(),
        },
        organizationId
      );

      if (error) {
        console.error('[useRejectTimeOff] Error:', error);
        throw error;
      }

      console.log('[useRejectTimeOff] Rejected request:', requestId);
      return data as TimeOffRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-time-off-requests'] });
    },
  });
}

export function useShifts(options?: { employeeId?: string; startDate?: string; endDate?: string; facilityId?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shifts', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }

      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useShifts] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useShifts] Fetched ${data?.length || 0} shifts`);
      return (data || []) as Shift[];
    },
    enabled: !!organizationId,
  });
}

export function useEmployeeShifts(employeeId: string | undefined, options?: { startDate?: string; endDate?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-shifts', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('date', { ascending: true });

      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEmployeeShifts] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as Shift[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: Omit<Shift, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await insertRecord('shifts', {
        organization_id: organizationId,
        employee_id: input.employee_id,
        employee_name: input.employee_name,
        date: input.date,
        start_time: input.start_time,
        end_time: input.end_time,
        facility_id: input.facility_id,
        position: input.position,
        status: input.status || 'scheduled',
        notes: input.notes,
      });

      if (error) {
        console.error('[useCreateShift] Error:', error);
        throw error;
      }

      console.log('[useCreateShift] Created shift:', data?.id);
      return data as Shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Shift> }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('shifts', id, updates, organizationId);

      if (error) {
        console.error('[useUpdateShift] Error:', error);
        throw error;
      }

      console.log('[useUpdateShift] Updated shift:', id);
      return data as Shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteShift] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteShift] Deleted shift:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
    },
  });
}

export function useShiftSwaps(options?: { employeeId?: string; status?: ShiftSwap['status']; includeTarget?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shift-swaps', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.employeeId) {
        if (options?.includeTarget) {
          query = query.or(`requester_id.eq.${options.employeeId},target_employee_id.eq.${options.employeeId}`);
        } else {
          query = query.eq('requester_id', options.employeeId);
        }
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useShiftSwaps] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useShiftSwaps] Fetched ${data?.length || 0} shift swaps`);
      return (data || []) as ShiftSwap[];
    },
    enabled: !!organizationId,
  });
}

export function usePendingShiftSwapsForEmployee(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['pending-shift-swaps', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      const { data, error } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('target_employee_id', employeeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[usePendingShiftSwapsForEmployee] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as ShiftSwap[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function usePendingManagerApprovals() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['manager-pending-swaps', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'manager_pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[usePendingManagerApprovals] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as ShiftSwap[];
    },
    enabled: !!organizationId,
  });
}

export function useOpenShiftGiveaways() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['open-giveaways', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('swap_type', 'giveaway')
        .eq('status', 'pending')
        .is('target_employee_id', null)
        .order('requester_date', { ascending: true });

      if (error) {
        console.error('[useOpenShiftGiveaways] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as ShiftSwap[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateShiftSwapInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await insertRecord('shift_swaps', {
        organization_id: organizationId,
        requester_id: input.requester_id,
        requester_name: input.requester_name,
        requester_shift_id: input.requester_shift_id,
        target_employee_id: input.target_employee_id || null,
        target_employee_name: input.target_employee_name || null,
        target_shift_id: input.target_shift_id || null,
        swap_type: input.swap_type,
        status: 'pending' as const,
        reason: input.reason || null,
        requester_date: input.requester_date,
        requester_start_time: input.requester_start_time,
        requester_end_time: input.requester_end_time,
        target_date: input.target_date || null,
        target_start_time: input.target_start_time || null,
        target_end_time: input.target_end_time || null,
        responded_at: null,
        manager_id: null,
        manager_name: null,
        manager_approved_at: null,
        manager_notes: null,
      });

      if (error) {
        console.error('[useCreateShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useCreateShiftSwap] Created shift swap:', data?.id);
      return data as ShiftSwap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['pending-shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['open-giveaways'] });
    },
  });
}

export function useRespondToShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ swapId, accept, employeeId, employeeName }: { swapId: string; accept: boolean; employeeId?: string; employeeName?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const newStatus = accept ? 'manager_pending' : 'rejected';
      
      const updates: Record<string, unknown> = {
        status: newStatus,
        responded_at: new Date().toISOString(),
      };

      if (accept && employeeId && employeeName) {
        updates.target_employee_id = employeeId;
        updates.target_employee_name = employeeName;
      }

      const { data, error } = await updateRecord('shift_swaps', swapId, updates, organizationId);

      if (error) {
        console.error('[useRespondToShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useRespondToShiftSwap] Responded to swap:', swapId, accept ? 'accepted' : 'rejected');
      return data as ShiftSwap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['pending-shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['manager-pending-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['open-giveaways'] });
    },
  });
}

export function useManagerApproveShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ swapId, managerId, managerName, approve, notes }: { swapId: string; managerId: string; managerName: string; approve: boolean; notes?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord(
        'shift_swaps',
        swapId,
        {
          status: approve ? 'manager_approved' : 'manager_rejected',
          manager_id: managerId,
          manager_name: managerName,
          manager_approved_at: new Date().toISOString(),
          manager_notes: notes || null,
        },
        organizationId
      );

      if (error) {
        console.error('[useManagerApproveShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useManagerApproveShiftSwap] Manager decision:', swapId, approve ? 'approved' : 'rejected');
      return data as ShiftSwap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['manager-pending-swaps'] });
    },
  });
}

export function useCompleteShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (swapId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: swap, error: fetchError } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('id', swapId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !swap) {
        throw new Error('Shift swap not found');
      }

      if (swap.swap_type === 'swap' && swap.target_shift_id) {
        const { data: requesterShift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', swap.requester_shift_id)
          .single();

        const { data: targetShift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', swap.target_shift_id)
          .single();

        if (requesterShift && targetShift) {
          await updateRecord('shifts', swap.requester_shift_id, {
            employee_id: swap.target_employee_id,
            employee_name: swap.target_employee_name,
          }, organizationId);

          await updateRecord('shifts', swap.target_shift_id, {
            employee_id: swap.requester_id,
            employee_name: swap.requester_name,
          }, organizationId);
        }
      } else if (swap.swap_type === 'giveaway' || swap.swap_type === 'pickup') {
        await updateRecord('shifts', swap.requester_shift_id, {
          employee_id: swap.target_employee_id,
          employee_name: swap.target_employee_name,
        }, organizationId);
      }

      const { data, error } = await updateRecord(
        'shift_swaps',
        swapId,
        { status: 'completed' as const },
        organizationId
      );

      if (error) {
        console.error('[useCompleteShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useCompleteShiftSwap] Completed swap:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
    },
  });
}

export function useCancelShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (swapId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord(
        'shift_swaps',
        swapId,
        { status: 'cancelled' as const },
        organizationId
      );

      if (error) {
        console.error('[useCancelShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useCancelShiftSwap] Cancelled swap:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['pending-shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['open-giveaways'] });
    },
  });
}
