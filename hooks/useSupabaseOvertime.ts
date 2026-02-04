import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type OvertimeType = 'voluntary' | 'mandatory' | 'emergency';

export interface OvertimeRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  department_code: string | null;
  department_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  date: string;
  scheduled_hours: number;
  actual_hours: number | null;
  overtime_hours: number;
  overtime_type: OvertimeType;
  reason: string;
  status: OvertimeStatus;
  hourly_rate: number | null;
  overtime_rate: number | null;
  overtime_multiplier: number;
  overtime_pay: number | null;
  double_time_hours: number;
  double_time_rate: number | null;
  double_time_pay: number;
  total_pay: number | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  shift_id: string | null;
  time_entry_id: string | null;
  consecutive_overtime_day: number;
  weekly_overtime_total: number | null;
  monthly_overtime_total: number | null;
  is_compliance_exception: boolean;
  compliance_notes: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  manager_id: string | null;
  manager_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimeFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  employeeIds?: string[];
  departmentCode?: string;
  facilityId?: string;
  status?: OvertimeStatus | OvertimeStatus[];
  overtimeType?: OvertimeType | OvertimeType[];
}

export interface OvertimeSummary {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  completedCount: number;
  totalOvertimeHours: number;
  totalOvertimePay: number;
  averageOvertimeHours: number;
}

export interface CreateOvertimeInput {
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  department_code?: string;
  department_name?: string;
  facility_id?: string;
  date: string;
  scheduled_hours: number;
  overtime_hours: number;
  overtime_type: OvertimeType;
  reason: string;
  hourly_rate: number;
  overtime_rate: number;
  overtime_pay: number;
  notes?: string;
}

// Fetch overtime requests with filters
export function useOvertimeRequests(filters?: OvertimeFilters) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['overtime-requests', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('overtime_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      if (filters?.employeeIds && filters.employeeIds.length > 0) {
        query = query.in('employee_id', filters.employeeIds);
      }

      if (filters?.departmentCode) {
        query = query.eq('department_code', filters.departmentCode);
      }

      if (filters?.facilityId) {
        query = query.eq('facility_id', filters.facilityId);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.overtimeType) {
        if (Array.isArray(filters.overtimeType)) {
          query = query.in('overtime_type', filters.overtimeType);
        } else {
          query = query.eq('overtime_type', filters.overtimeType);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useOvertimeRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useOvertimeRequests] Fetched ${data?.length || 0} requests`);
      return (data || []) as OvertimeRequest[];
    },
    enabled: !!organizationId,
  });
}

// Fetch single overtime request
export function useOvertimeRequest(requestId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['overtime-request', organizationId, requestId],
    queryFn: async () => {
      if (!organizationId || !requestId) {
        return null;
      }

      const { data, error } = await supabase
        .from('overtime_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        console.error('[useOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      return data as OvertimeRequest | null;
    },
    enabled: !!organizationId && !!requestId,
  });
}

// Fetch pending overtime requests (for approvals)
export function usePendingOvertimeRequests() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['overtime-requests-pending', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('overtime_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('date', { ascending: true });

      if (error) {
        console.error('[usePendingOvertimeRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[usePendingOvertimeRequests] Fetched ${data?.length || 0} pending requests`);
      return (data || []) as OvertimeRequest[];
    },
    enabled: !!organizationId,
  });
}

// Fetch employee overtime history
export function useEmployeeOvertimeHistory(employeeId: string | undefined, options?: { limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-overtime-history', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('overtime_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEmployeeOvertimeHistory] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useEmployeeOvertimeHistory] Fetched ${data?.length || 0} records for employee ${employeeId}`);
      return (data || []) as OvertimeRequest[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

// Compute overtime summary from fetched data
export function useOvertimeSummary(filters?: OvertimeFilters) {
  const { data: requests, isLoading } = useOvertimeRequests(filters);

  const summary: OvertimeSummary = {
    totalRequests: requests?.length || 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
    totalOvertimeHours: 0,
    totalOvertimePay: 0,
    averageOvertimeHours: 0,
  };

  if (requests) {
    requests.forEach((request) => {
      if (request.status === 'pending') summary.pendingCount++;
      if (request.status === 'approved') summary.approvedCount++;
      if (request.status === 'rejected') summary.rejectedCount++;
      if (request.status === 'completed') summary.completedCount++;

      if (request.status === 'approved' || request.status === 'completed') {
        summary.totalOvertimeHours += request.overtime_hours || 0;
        summary.totalOvertimePay += request.overtime_pay || 0;
      }
    });

    const approvedOrCompleted = summary.approvedCount + summary.completedCount;
    if (approvedOrCompleted > 0) {
      summary.averageOvertimeHours = summary.totalOvertimeHours / approvedOrCompleted;
    }
  }

  return { summary, isLoading };
}

// MUTATIONS

// Submit overtime request
export function useSubmitOvertimeRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (data: CreateOvertimeInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useSubmitOvertimeRequest] Submitting request:', data);

      const { data: created, error } = await supabase
        .from('overtime_requests')
        .insert({
          organization_id: organizationId,
          ...data,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[useSubmitOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useSubmitOvertimeRequest] Created request:', created.id);
      return created as OvertimeRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests-pending', organizationId] });
    },
  });
}

// Approve overtime request
export function useApproveOvertimeRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      requestId,
      approverId,
      approverName,
      notes,
    }: {
      requestId: string;
      approverId: string;
      approverName: string;
      notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useApproveOvertimeRequest] Approving request:', requestId);

      const { data, error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_by_name: approverName,
          approved_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useApproveOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useApproveOvertimeRequest] Approved request:', data.id);
      return data as OvertimeRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests-pending', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-request', organizationId, variables.requestId] });
    },
  });
}

// Reject overtime request
export function useRejectOvertimeRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      requestId,
      rejectorId,
      rejectorName,
      reason,
    }: {
      requestId: string;
      rejectorId: string;
      rejectorName: string;
      reason: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useRejectOvertimeRequest] Rejecting request:', requestId);

      const { data, error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'rejected',
          rejected_by: rejectorId,
          rejected_by_name: rejectorName,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useRejectOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useRejectOvertimeRequest] Rejected request:', data.id);
      return data as OvertimeRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests-pending', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-request', organizationId, variables.requestId] });
    },
  });
}

// Mark overtime as completed
export function useCompleteOvertimeRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      requestId,
      actualHours,
      notes,
    }: {
      requestId: string;
      actualHours?: number;
      notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useCompleteOvertimeRequest] Completing request:', requestId);

      const updateData: Record<string, unknown> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (actualHours !== undefined) {
        updateData.actual_hours = actualHours;
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('overtime_requests')
        .update(updateData)
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useCompleteOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCompleteOvertimeRequest] Completed request:', data.id);
      return data as OvertimeRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-request', organizationId, variables.requestId] });
    },
  });
}

// Update overtime request
export function useUpdateOvertimeRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      requestId,
      updates,
    }: {
      requestId: string;
      updates: Partial<Omit<OvertimeRequest, 'id' | 'organization_id' | 'created_at'>>;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useUpdateOvertimeRequest] Updating request:', requestId, updates);

      const { data, error } = await supabase
        .from('overtime_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateOvertimeRequest] Updated request:', data.id);
      return data as OvertimeRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-request', organizationId, variables.requestId] });
    },
  });
}

// Delete overtime request (admin only, pending only)
export function useDeleteOvertimeRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useDeleteOvertimeRequest] Deleting request:', requestId);

      const { error } = await supabase
        .from('overtime_requests')
        .delete()
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      if (error) {
        console.error('[useDeleteOvertimeRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteOvertimeRequest] Deleted request:', requestId);
      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests-pending', organizationId] });
    },
  });
}

// Bulk approve overtime requests
export function useBulkApproveOvertimeRequests() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      requestIds,
      approverId,
      approverName,
    }: {
      requestIds: string[];
      approverId: string;
      approverName: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useBulkApproveOvertimeRequests] Approving', requestIds.length, 'requests');

      const { data, error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_by_name: approverName,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', requestIds)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .select();

      if (error) {
        console.error('[useBulkApproveOvertimeRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useBulkApproveOvertimeRequests] Approved', data?.length || 0, 'requests');
      return (data || []) as OvertimeRequest[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['overtime-requests-pending', organizationId] });
    },
  });
}
