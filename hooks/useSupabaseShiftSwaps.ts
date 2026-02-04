import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, insertRecord, updateRecord } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type ShiftSwapType = 'swap' | 'giveaway' | 'pickup';
export type ShiftSwapStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'cancelled' 
  | 'manager_pending' 
  | 'manager_approved' 
  | 'manager_rejected' 
  | 'completed';

export interface ShiftSwap {
  id: string;
  organization_id: string;
  requester_id: string;
  requester_name: string;
  requester_shift_id: string;
  target_employee_id: string | null;
  target_employee_name: string | null;
  target_shift_id: string | null;
  swap_type: ShiftSwapType;
  status: ShiftSwapStatus;
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
  swap_type: ShiftSwapType;
  reason?: string;
  requester_date: string;
  requester_start_time: string;
  requester_end_time: string;
  target_employee_id?: string;
  target_employee_name?: string;
  target_shift_id?: string;
  target_date?: string;
  target_start_time?: string;
  target_end_time?: string;
}

export interface UpdateShiftSwapInput {
  target_employee_id?: string | null;
  target_employee_name?: string | null;
  target_shift_id?: string | null;
  target_date?: string | null;
  target_start_time?: string | null;
  target_end_time?: string | null;
  status?: ShiftSwapStatus;
  reason?: string | null;
  responded_at?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_approved_at?: string | null;
  manager_notes?: string | null;
}

export function useShiftSwaps(options?: {
  status?: ShiftSwapStatus | ShiftSwapStatus[];
  swapType?: ShiftSwapType | ShiftSwapType[];
  requesterId?: string;
  targetEmployeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
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

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.swapType) {
        if (Array.isArray(options.swapType)) {
          query = query.in('swap_type', options.swapType);
        } else {
          query = query.eq('swap_type', options.swapType);
        }
      }

      if (options?.requesterId) {
        query = query.eq('requester_id', options.requesterId);
      }

      if (options?.targetEmployeeId) {
        query = query.eq('target_employee_id', options.targetEmployeeId);
      }

      if (options?.startDate) {
        query = query.gte('requester_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('requester_date', options.endDate);
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

export function useShiftSwap(swapId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shift-swap', organizationId, swapId],
    queryFn: async () => {
      if (!organizationId || !swapId) {
        return null;
      }

      const { data, error } = await supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', swapId)
        .maybeSingle();

      if (error) {
        console.error('[useShiftSwap] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useShiftSwap] Fetched swap ${swapId}:`, data ? 'found' : 'not found');
      return data as ShiftSwap | null;
    },
    enabled: !!organizationId && !!swapId,
  });
}

export function useEmployeeSwapRequests(employeeId: string | undefined, options?: {
  includeCompleted?: boolean;
  asRequester?: boolean;
  asTarget?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-swap-requests', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      const asRequester = options?.asRequester ?? true;
      const asTarget = options?.asTarget ?? true;

      let query = supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (asRequester && asTarget) {
        query = query.or(`requester_id.eq.${employeeId},target_employee_id.eq.${employeeId}`);
      } else if (asRequester) {
        query = query.eq('requester_id', employeeId);
      } else if (asTarget) {
        query = query.eq('target_employee_id', employeeId);
      }

      if (!options?.includeCompleted) {
        query = query.not('status', 'in', '("completed","cancelled","manager_rejected","rejected")');
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEmployeeSwapRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useEmployeeSwapRequests] Fetched ${data?.length || 0} swap requests for employee ${employeeId}`);
      return (data || []) as ShiftSwap[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useOpenSwapRequests() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['open-swap-requests', organizationId],
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
        console.error('[useOpenSwapRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useOpenSwapRequests] Fetched ${data?.length || 0} open swap requests`);
      return (data || []) as ShiftSwap[];
    },
    enabled: !!organizationId,
  });
}

export function usePendingManagerApprovals(managerId?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['pending-manager-approvals', organizationId, managerId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'manager_pending')
        .order('created_at', { ascending: true });

      if (managerId) {
        query = query.eq('manager_id', managerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePendingManagerApprovals] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[usePendingManagerApprovals] Fetched ${data?.length || 0} pending approvals`);
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
        swap_type: input.swap_type,
        status: 'pending',
        reason: input.reason || null,
        requester_date: input.requester_date,
        requester_start_time: input.requester_start_time,
        requester_end_time: input.requester_end_time,
        target_employee_id: input.target_employee_id || null,
        target_employee_name: input.target_employee_name || null,
        target_shift_id: input.target_shift_id || null,
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

      console.log('[useCreateShiftSwap] Shift swap created:', data?.id);
      return data as ShiftSwap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['open-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] });
    },
  });
}

export function useUpdateShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ swapId, updates }: { swapId: string; updates: UpdateShiftSwapInput }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('shift_swaps', swapId, updates, organizationId);

      if (error) {
        console.error('[useUpdateShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useUpdateShiftSwap] Shift swap updated:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift-swap', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['open-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] });
    },
  });
}

export function useAcceptShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      swapId,
      acceptorId,
      acceptorName,
      acceptorShiftId,
      acceptorDate,
      acceptorStartTime,
      acceptorEndTime,
    }: {
      swapId: string;
      acceptorId: string;
      acceptorName: string;
      acceptorShiftId?: string;
      acceptorDate?: string;
      acceptorStartTime?: string;
      acceptorEndTime?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const updates: UpdateShiftSwapInput = {
        target_employee_id: acceptorId,
        target_employee_name: acceptorName,
        target_shift_id: acceptorShiftId || null,
        target_date: acceptorDate || null,
        target_start_time: acceptorStartTime || null,
        target_end_time: acceptorEndTime || null,
        status: 'manager_pending',
        responded_at: new Date().toISOString(),
      };

      const { data, error } = await updateRecord('shift_swaps', swapId, updates, organizationId);

      if (error) {
        console.error('[useAcceptShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useAcceptShiftSwap] Shift swap accepted:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift-swap', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['open-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] });
    },
  });
}

export function useRejectShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      swapId,
      rejecterId,
      rejecterName,
      reason,
    }: {
      swapId: string;
      rejecterId: string;
      rejecterName: string;
      reason?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const swap = await supabase
        .from('shift_swaps')
        .select('status')
        .eq('id', swapId)
        .eq('organization_id', organizationId)
        .single();

      const isManagerRejection = swap.data?.status === 'manager_pending';

      const updates: UpdateShiftSwapInput = {
        status: isManagerRejection ? 'manager_rejected' : 'rejected',
        responded_at: new Date().toISOString(),
      };

      if (isManagerRejection) {
        updates.manager_id = rejecterId;
        updates.manager_name = rejecterName;
        updates.manager_notes = reason || null;
      }

      const { data, error } = await updateRecord('shift_swaps', swapId, updates, organizationId);

      if (error) {
        console.error('[useRejectShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useRejectShiftSwap] Shift swap rejected:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift-swap', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['open-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] });
    },
  });
}

export function useManagerApproveSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      swapId,
      managerId,
      managerName,
      notes,
    }: {
      swapId: string;
      managerId: string;
      managerName: string;
      notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const updates: UpdateShiftSwapInput = {
        status: 'manager_approved',
        manager_id: managerId,
        manager_name: managerName,
        manager_approved_at: new Date().toISOString(),
        manager_notes: notes || null,
      };

      const { data, error } = await updateRecord('shift_swaps', swapId, updates, organizationId);

      if (error) {
        console.error('[useManagerApproveSwap] Error:', error);
        throw error;
      }

      console.log('[useManagerApproveSwap] Shift swap manager approved:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift-swap', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
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

      const { data, error } = await updateRecord(
        'shift_swaps',
        swapId,
        { status: 'completed' },
        organizationId
      );

      if (error) {
        console.error('[useCompleteShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useCompleteShiftSwap] Shift swap completed:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift-swap', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
    },
  });
}

export function useCancelShiftSwap() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ swapId, reason }: { swapId: string; reason?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const updates: UpdateShiftSwapInput = {
        status: 'cancelled',
      };

      if (reason) {
        updates.manager_notes = reason;
      }

      const { data, error } = await updateRecord('shift_swaps', swapId, updates, organizationId);

      if (error) {
        console.error('[useCancelShiftSwap] Error:', error);
        throw error;
      }

      console.log('[useCancelShiftSwap] Shift swap cancelled:', swapId);
      return data as ShiftSwap;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift-swap', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['open-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-manager-approvals'] });
    },
  });
}

export function useShiftSwapStats(options?: { startDate?: string; endDate?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shift-swap-stats', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }

      let query = supabase
        .from('shift_swaps')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useShiftSwapStats] Error:', error);
        throw new Error(error.message);
      }

      const swaps = (data || []) as ShiftSwap[];

      const totalSwaps = swaps.length;
      const pendingSwaps = swaps.filter(s => s.status === 'pending').length;
      const managerPendingSwaps = swaps.filter(s => s.status === 'manager_pending').length;
      const approvedSwaps = swaps.filter(s => s.status === 'manager_approved' || s.status === 'completed').length;
      const rejectedSwaps = swaps.filter(s => s.status === 'rejected' || s.status === 'manager_rejected').length;
      const cancelledSwaps = swaps.filter(s => s.status === 'cancelled').length;

      const swapsByType = {
        swap: swaps.filter(s => s.swap_type === 'swap').length,
        giveaway: swaps.filter(s => s.swap_type === 'giveaway').length,
        pickup: swaps.filter(s => s.swap_type === 'pickup').length,
      };

      const approvalRate = totalSwaps > 0 
        ? Math.round((approvedSwaps / (totalSwaps - cancelledSwaps - pendingSwaps - managerPendingSwaps)) * 1000) / 10 
        : 0;

      const stats = {
        totalSwaps,
        pendingSwaps,
        managerPendingSwaps,
        approvedSwaps,
        rejectedSwaps,
        cancelledSwaps,
        swapsByType,
        approvalRate: isNaN(approvalRate) || !isFinite(approvalRate) ? 0 : approvalRate,
        actionRequired: pendingSwaps + managerPendingSwaps,
      };

      console.log('[useShiftSwapStats] Calculated stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
  });
}
