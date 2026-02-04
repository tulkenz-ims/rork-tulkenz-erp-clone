import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import type {
  ShiftTemplate,
  ShiftTemplateCreateInput,
  Schedule,
  ScheduleCreateInput,
  ShiftAssignmentWithDetails,
  ShiftAssignmentCreateInput,
  ShiftSwapRequest,
  ShiftSwapRequestWithDetails,
  ShiftSwapCreateInput,
  ScheduleStats,
  ScheduleStatus,
} from '@/types/scheduling';

// ============ SHIFT TEMPLATES ============

export function useShiftTemplates(facilityId?: string) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['shift-templates', organizationId, facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useShiftTemplates] No organization ID');
        return [];
      }

      console.log('[useShiftTemplates] Fetching templates for org:', organizationId);

      let query = supabase
        .from('shift_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (facilityId) {
        query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useShiftTemplates] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useShiftTemplates] Fetched', data?.length || 0, 'templates');
      return (data || []) as ShiftTemplate[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateShiftTemplate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: ShiftTemplateCreateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreateShiftTemplate] Creating template:', input.name);

      const { data, error } = await supabase
        .from('shift_templates')
        .insert({
          ...input,
          organization_id: organization.id,
          break_duration_minutes: input.break_duration_minutes || 30,
          paid_break: input.paid_break ?? false,
          color: input.color || '#3B82F6',
          is_overnight: input.is_overnight ?? false,
          minimum_staff: input.minimum_staff || 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateShiftTemplate] Error:', error);
        throw new Error(error.message);
      }

      return data as ShiftTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });
}

export function useUpdateShiftTemplate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShiftTemplateCreateInput> & { id: string }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateShiftTemplate] Updating template:', id);

      const { data, error } = await supabase
        .from('shift_templates')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateShiftTemplate] Error:', error);
        throw new Error(error.message);
      }

      return data as ShiftTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });
}

export function useDeleteShiftTemplate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeleteShiftTemplate] Deactivating template:', id);

      const { error } = await supabase
        .from('shift_templates')
        .update({ is_active: false })
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeleteShiftTemplate] Error:', error);
        throw new Error(error.message);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    },
  });
}

// ============ SCHEDULES ============

export function useSchedules(options?: { status?: ScheduleStatus; departmentCode?: string; facilityId?: string }) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['schedules', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSchedules] No organization ID');
        return [];
      }

      console.log('[useSchedules] Fetching schedules for org:', organizationId);

      let query = supabase
        .from('schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('week_start_date', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
      }
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSchedules] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useSchedules] Fetched', data?.length || 0, 'schedules');
      return (data || []) as Schedule[];
    },
    enabled: !!organizationId,
  });
}

export function useSchedule(scheduleId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['schedule', organizationId, scheduleId],
    queryFn: async () => {
      if (!organizationId || !scheduleId) {
        return null;
      }

      console.log('[useSchedule] Fetching schedule:', scheduleId);

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useSchedule] Error:', error);
        throw new Error(error.message);
      }

      return data as Schedule;
    },
    enabled: !!organizationId && !!scheduleId,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { organization, currentUser } = useOrganization();

  return useMutation({
    mutationFn: async (input: ScheduleCreateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreateSchedule] Creating schedule:', input.name);

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          ...input,
          organization_id: organization.id,
          status: 'draft',
          created_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateSchedule] Error:', error);
        throw new Error(error.message);
      }

      return data as Schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleCreateInput> & { id: string; status?: ScheduleStatus }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateSchedule] Updating schedule:', id);

      const { data, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateSchedule] Error:', error);
        throw new Error(error.message);
      }

      return data as Schedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', data.id] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

export function usePublishSchedule() {
  const queryClient = useQueryClient();
  const { organization, currentUser } = useOrganization();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[usePublishSchedule] Publishing schedule:', scheduleId);

      const { data, error } = await supabase
        .from('schedules')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          published_by: currentUser?.id || null,
        })
        .eq('id', scheduleId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[usePublishSchedule] Error:', error);
        throw new Error(error.message);
      }

      return data as Schedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', data.id] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeleteSchedule] Deleting schedule:', scheduleId);

      const { error: assignmentError } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('schedule_id', scheduleId)
        .eq('organization_id', organization.id);

      if (assignmentError) {
        console.error('[useDeleteSchedule] Error deleting assignments:', assignmentError);
      }

      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeleteSchedule] Error:', error);
        throw new Error(error.message);
      }

      return scheduleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

// ============ SHIFT ASSIGNMENTS ============

export function useShiftAssignments(scheduleId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['shift-assignments', organizationId, scheduleId],
    queryFn: async () => {
      if (!organizationId || !scheduleId) {
        return [];
      }

      console.log('[useShiftAssignments] Fetching assignments for schedule:', scheduleId);

      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          employee:employees(id, first_name, last_name, email, employee_code, position, department_code),
          shift_template:shift_templates(*)
        `)
        .eq('schedule_id', scheduleId)
        .eq('organization_id', organizationId)
        .order('shift_date')
        .order('start_time');

      if (error) {
        console.error('[useShiftAssignments] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useShiftAssignments] Fetched', data?.length || 0, 'assignments');
      return (data || []) as ShiftAssignmentWithDetails[];
    },
    enabled: !!organizationId && !!scheduleId,
  });
}

export function useEmployeeAssignments(employeeId: string | undefined, startDate?: string, endDate?: string) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['employee-assignments', organizationId, employeeId, startDate, endDate],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      console.log('[useEmployeeAssignments] Fetching assignments for employee:', employeeId);

      let query = supabase
        .from('shift_assignments')
        .select(`
          *,
          shift_template:shift_templates(*)
        `)
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId)
        .order('shift_date')
        .order('start_time');

      if (startDate) {
        query = query.gte('shift_date', startDate);
      }
      if (endDate) {
        query = query.lte('shift_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEmployeeAssignments] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as ShiftAssignmentWithDetails[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useCreateShiftAssignment() {
  const queryClient = useQueryClient();
  const { organization, currentUser } = useOrganization();

  return useMutation({
    mutationFn: async (input: ShiftAssignmentCreateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreateShiftAssignment] Creating assignment for:', input.employee_id);

      const { data, error } = await supabase
        .from('shift_assignments')
        .insert({
          ...input,
          organization_id: organization.id,
          break_duration_minutes: input.break_duration_minutes || 30,
          status: 'scheduled',
          is_overtime: input.is_overtime ?? false,
          created_by: currentUser?.id || null,
        })
        .select(`
          *,
          employee:employees(id, first_name, last_name, email, employee_code, position, department_code),
          shift_template:shift_templates(*)
        `)
        .single();

      if (error) {
        console.error('[useCreateShiftAssignment] Error:', error);
        throw new Error(error.message);
      }

      return data as ShiftAssignmentWithDetails;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments', data.schedule_id] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

export function useUpdateShiftAssignment() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShiftAssignmentCreateInput> & { id: string; status?: string }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateShiftAssignment] Updating assignment:', id);

      const { data, error } = await supabase
        .from('shift_assignments')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select(`
          *,
          employee:employees(id, first_name, last_name, email, employee_code, position, department_code),
          shift_template:shift_templates(*)
        `)
        .single();

      if (error) {
        console.error('[useUpdateShiftAssignment] Error:', error);
        throw new Error(error.message);
      }

      return data as ShiftAssignmentWithDetails;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments', data.schedule_id] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments', data.employee_id] });
    },
  });
}

export function useDeleteShiftAssignment() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, scheduleId, employeeId }: { id: string; scheduleId: string; employeeId: string }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeleteShiftAssignment] Deleting assignment:', id);

      const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeleteShiftAssignment] Error:', error);
        throw new Error(error.message);
      }

      return { id, scheduleId, employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments', data.scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

// ============ SHIFT SWAP REQUESTS ============

export function useShiftSwapRequests(status?: SwapStatus) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['shift-swap-requests', organizationId, status],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      console.log('[useShiftSwapRequests] Fetching swap requests');

      let query = supabase
        .from('shift_swap_requests')
        .select(`
          *,
          requesting_employee:employees!requesting_employee_id(id, first_name, last_name),
          target_employee:employees!target_employee_id(id, first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useShiftSwapRequests] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as ShiftSwapRequestWithDetails[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateShiftSwapRequest() {
  const queryClient = useQueryClient();
  const { organization, currentUser } = useOrganization();

  return useMutation({
    mutationFn: async (input: ShiftSwapCreateInput) => {
      if (!organization?.id || !currentUser?.id) {
        throw new Error('No organization or user selected');
      }

      console.log('[useCreateShiftSwapRequest] Creating swap request');

      const { data, error } = await supabase
        .from('shift_swap_requests')
        .insert({
          ...input,
          organization_id: organization.id,
          requesting_employee_id: currentUser.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateShiftSwapRequest] Error:', error);
        throw new Error(error.message);
      }

      return data as ShiftSwapRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

export function useRespondToSwapRequest() {
  const queryClient = useQueryClient();
  const { organization, currentUser } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status, response_reason }: { id: string; status: 'approved' | 'rejected'; response_reason?: string }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useRespondToSwapRequest] Responding to swap request:', id, status);

      const { data, error } = await supabase
        .from('shift_swap_requests')
        .update({
          status,
          response_reason,
          reviewed_by: currentUser?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useRespondToSwapRequest] Error:', error);
        throw new Error(error.message);
      }

      return data as ShiftSwapRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

// ============ STATS ============

export function useScheduleStats() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['schedule-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }

      console.log('[useScheduleStats] Fetching stats');

      const [schedules, assignments, swapRequests] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, status')
          .eq('organization_id', organizationId),
        supabase
          .from('shift_assignments')
          .select('id')
          .eq('organization_id', organizationId),
        supabase
          .from('shift_swap_requests')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('status', 'pending'),
      ]);

      const scheduleData = schedules.data || [];
      const stats: ScheduleStats = {
        total_schedules: scheduleData.length,
        draft_schedules: scheduleData.filter(s => s.status === 'draft').length,
        published_schedules: scheduleData.filter(s => s.status === 'published').length,
        total_assignments: assignments.data?.length || 0,
        swap_requests_pending: swapRequests.data?.length || 0,
        coverage_gaps: 0,
      };

      return stats;
    },
    enabled: !!organizationId,
  });
}

// ============ AVAILABLE EMPLOYEES ============

export function useAvailableEmployees(departmentCode?: string | null, facilityId?: string | null) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['available-employees', organizationId, departmentCode, facilityId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      console.log('[useAvailableEmployees] Fetching employees');

      let query = supabase
        .from('employees')
        .select('id, first_name, last_name, email, employee_code, position, department_code, facility_id, availability')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('last_name')
        .order('first_name');

      if (departmentCode) {
        query = query.eq('department_code', departmentCode);
      }
      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAvailableEmployees] Error:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!organizationId,
  });
}
