import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchById, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface SupabaseEmployee {
  id: string;
  organization_id: string;
  facility_id: string | null;
  employee_code: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  hourly_rate: number | null;
  pto_balance: number | null;
  department_code: string | null;
  cost_center: string | null;
  gl_account: string | null;
  manager_id: string | null;
  profile: Record<string, unknown> | null;
  availability: Record<string, unknown> | null;
  time_off_balances: Record<string, unknown> | null;
  signature_pin?: string;
  signature_initials?: string;
  signature_pin_set?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  facility_id?: string | null;
  employee_code: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  position: string;
  hire_date?: string;
  status?: 'active' | 'inactive' | 'on_leave';
  hourly_rate?: number | null;
  pto_balance?: number | null;
  department_code?: string | null;
  cost_center?: string | null;
  gl_account?: string | null;
  manager_id?: string | null;
  profile?: Record<string, unknown> | null;
  availability?: Record<string, unknown> | null;
  time_off_balances?: Record<string, unknown> | null;
}

export interface UpdateEmployeeInput {
  facility_id?: string | null;
  employee_code?: string;
  pin?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  position?: string;
  hire_date?: string;
  status?: 'active' | 'inactive' | 'on_leave';
  hourly_rate?: number | null;
  pto_balance?: number | null;
  department_code?: string | null;
  cost_center?: string | null;
  gl_account?: string | null;
  manager_id?: string | null;
  profile?: Record<string, unknown> | null;
  availability?: Record<string, unknown> | null;
  time_off_balances?: Record<string, unknown> | null;
}

export function useEmployees(options?: { status?: 'active' | 'inactive' | 'on_leave'; facilityId?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employees', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEmployees] No organization ID');
        return [];
      }

      console.log('[useEmployees] ========================================');
      console.log('[useEmployees] Fetching employees for organization:', organizationId);

      // First, let's see ALL employees in the table to debug
      const { data: allEmps, error: allError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, organization_id')
        .limit(20);
      
      if (allError) {
        console.error('[useEmployees] Error fetching all employees:', allError);
      } else {
        console.log('[useEmployees] ========================================');
        console.log('[useEmployees] TOTAL employees in database:', allEmps?.length);
        console.log('[useEmployees] Current org filter:', organizationId);
        console.log('[useEmployees] ----------------------------------------');
        allEmps?.forEach(emp => {
          const matches = emp.organization_id === organizationId;
          console.log(`[useEmployees] ${emp.employee_code} - ${emp.first_name} ${emp.last_name}`);
          console.log(`[useEmployees]   org_id: ${emp.organization_id}`);
          console.log(`[useEmployees]   MATCHES CURRENT ORG: ${matches ? '✅ YES' : '❌ NO'}`);
        });
        console.log('[useEmployees] ========================================');
      }

      let query = supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('is_platform_admin', true)
        .order('last_name', { ascending: true });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEmployees] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useEmployees] Fetched ${data?.length || 0} employees for org ${organizationId}`);
      data?.forEach(emp => {
        console.log(`[useEmployees] - ${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
      });
      return (data || []) as SupabaseEmployee[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployee(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee', employeeId, organizationId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return null;
      }

      const { data, error } = await fetchById('employees', employeeId, organizationId);

      if (error) {
        console.error('[useEmployee] Error:', error);
        throw error;
      }

      console.log(`[useEmployee] Fetched employee: ${employeeId}`);
      return data as SupabaseEmployee | null;
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useEmployeeByCode(employeeCode: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-by-code', employeeCode, organizationId],
    queryFn: async () => {
      if (!organizationId || !employeeCode) {
        return null;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_code', employeeCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[useEmployeeByCode] Error:', error);
        throw new Error(error.message);
      }

      return data as SupabaseEmployee;
    },
    enabled: !!organizationId && !!employeeCode,
  });
}

export function useEmployeeByPin(pin: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-by-pin', pin, organizationId],
    queryFn: async () => {
      if (!organizationId || !pin) {
        return null;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('pin', pin)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[useEmployeeByPin] Error:', error);
        throw new Error(error.message);
      }

      return data as SupabaseEmployee;
    },
    enabled: !!organizationId && !!pin,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await insertRecord('employees', {
        organization_id: organizationId,
        facility_id: input.facility_id || null,
        employee_code: input.employee_code,
        pin: input.pin,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        role: input.role || 'default',
        position: input.position,
        hire_date: input.hire_date || new Date().toISOString().split('T')[0],
        status: input.status || 'active',
        hourly_rate: input.hourly_rate || null,
        pto_balance: input.pto_balance || 0,
        department_code: input.department_code || null,
        cost_center: input.cost_center || null,
        gl_account: input.gl_account || null,
        manager_id: input.manager_id || null,
        profile: input.profile || {},
        availability: input.availability || {},
        time_off_balances: input.time_off_balances || {},
      });

      if (error) {
        console.error('[useCreateEmployee] Error:', error);
        throw error;
      }

      console.log('[useCreateEmployee] Created employee:', data?.id);
      return data as SupabaseEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateEmployeeInput }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('employees', id, updates, organizationId);

      if (error) {
        console.error('[useUpdateEmployee] Error:', error);
        throw error;
      }

      console.log('[useUpdateEmployee] Updated employee:', id);
      return data as SupabaseEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', data?.id] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { success, error } = await deleteRecord('employees', id, organizationId);

      if (error) {
        console.error('[useDeleteEmployee] Error:', error);
        throw error;
      }

      console.log('[useDeleteEmployee] Deleted employee:', id);
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployeeAvailability() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, availability }: { id: string; availability: Record<string, unknown> }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('employees', id, { availability }, organizationId);

      if (error) {
        console.error('[useUpdateEmployeeAvailability] Error:', error);
        throw error;
      }

      console.log('[useUpdateEmployeeAvailability] Updated availability for:', id);
      return data as SupabaseEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', data?.id] });
    },
  });
}

export function useUpdateEmployeeProfile() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, profile }: { id: string; profile: Record<string, unknown> }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: currentEmployee } = await fetchById('employees', id, organizationId);
      const mergedProfile = { ...(currentEmployee?.profile || {}), ...profile };

      const { data, error } = await updateRecord('employees', id, { profile: mergedProfile }, organizationId);

      if (error) {
        console.error('[useUpdateEmployeeProfile] Error:', error);
        throw error;
      }

      console.log('[useUpdateEmployeeProfile] Updated profile for:', id);
      return data as SupabaseEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', data?.id] });
    },
  });
}

export function useUpdateEmployeeTimeOffBalances() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, balances }: { id: string; balances: Record<string, unknown> }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: currentEmployee } = await fetchById('employees', id, organizationId);
      const mergedBalances = { ...(currentEmployee?.time_off_balances || {}), ...balances };

      const { data, error } = await updateRecord('employees', id, { time_off_balances: mergedBalances }, organizationId);

      if (error) {
        console.error('[useUpdateEmployeeTimeOffBalances] Error:', error);
        throw error;
      }

      console.log('[useUpdateEmployeeTimeOffBalances] Updated time off balances for:', id);
      return data as SupabaseEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', data?.id] });
    },
  });
}

export function useValidateEmployeePin() {
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (pin: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('pin', pin)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[useValidateEmployeePin] Invalid PIN');
          return null;
        }
        console.error('[useValidateEmployeePin] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useValidateEmployeePin] Valid PIN for employee:', data?.id);
      return data as SupabaseEmployee;
    },
  });
}

// ============================================
// FACILITIES QUERIES
// ============================================

export interface SupabaseFacility {
  id: string;
  organization_id: string;
  name: string;
  facility_code: string;
  address: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useFacilities(options?: { activeOnly?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['facilities', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useFacilities] No organization ID');
        return [];
      }

      let query = supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (options?.activeOnly !== false) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useFacilities] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useFacilities] Fetched ${data?.length || 0} facilities`);
      return (data || []) as SupabaseFacility[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFacility(facilityId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['facility', facilityId, organizationId],
    queryFn: async () => {
      if (!organizationId || !facilityId) {
        return null;
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', facilityId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[useFacility] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useFacility] Fetched facility: ${facilityId}`);
      return data as SupabaseFacility;
    },
    enabled: !!organizationId && !!facilityId,
  });
}

// ============================================
// LABOR METRICS AGGREGATION QUERIES
// ============================================

export interface LaborMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  inactiveEmployees: number;
  clockedInToday: number;
  scheduledToday: number;
  absentToday: number;
  lateToday: number;
  totalHoursToday: number;
  totalHoursThisWeek: number;
  overtimeHoursThisWeek: number;
  pendingTimeOffRequests: number;
  pendingOvertimeRequests: number;
  averageAttendanceRate: number;
}

export interface DepartmentLaborMetrics {
  departmentCode: string;
  departmentName: string;
  employeeCount: number;
  clockedInCount: number;
  scheduledCount: number;
  hoursToday: number;
  hoursThisWeek: number;
  overtimeHours: number;
  attendanceRate: number;
}

export interface FacilityLaborMetrics {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  employeeCount: number;
  clockedInCount: number;
  scheduledCount: number;
  hoursToday: number;
  hoursThisWeek: number;
  overtimeHours: number;
  attendanceRate: number;
}

export function useLaborMetrics(options?: { facilityId?: string; departmentCode?: string }) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['labor-metrics', organizationId, today, weekStart, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useLaborMetrics] No organization ID');
        return null;
      }

      // Fetch employees
      let employeeQuery = supabase
        .from('employees')
        .select('id, status, facility_id, department_code')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        employeeQuery = employeeQuery.eq('facility_id', options.facilityId);
      }
      if (options?.departmentCode) {
        employeeQuery = employeeQuery.eq('department_code', options.departmentCode);
      }

      const { data: employees, error: empError } = await employeeQuery;
      if (empError) {
        console.error('[useLaborMetrics] Error fetching employees:', empError);
        throw new Error(empError.message);
      }

      const employeeIds = employees?.map(e => e.id) || [];
      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(e => e.status === 'active').length || 0;
      const onLeaveEmployees = employees?.filter(e => e.status === 'on_leave').length || 0;
      const inactiveEmployees = employees?.filter(e => e.status === 'inactive').length || 0;

      // Fetch today's time entries (clocked in)
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('id, employee_id, total_hours, status, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (timeError) {
        console.error('[useLaborMetrics] Error fetching time entries:', timeError);
      }

      const clockedInToday = timeEntries?.filter(te => te.status === 'active' && te.clock_in && !te.clock_out).length || 0;
      const totalHoursToday = timeEntries?.reduce((sum, te) => sum + (te.total_hours || 0), 0) || 0;

      // Fetch today's shifts (scheduled)
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('id, employee_id, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (shiftError) {
        console.error('[useLaborMetrics] Error fetching shifts:', shiftError);
      }

      const scheduledToday = shifts?.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length || 0;

      // Fetch attendance records for today
      const { data: attendance, error: attError } = await supabase
        .from('attendance_records')
        .select('id, employee_id, status, is_late')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (attError) {
        console.error('[useLaborMetrics] Error fetching attendance:', attError);
      }

      const absentToday = attendance?.filter(a => 
        a.status === 'absent' || a.status === 'no_call_no_show'
      ).length || 0;
      const lateToday = attendance?.filter(a => a.is_late).length || 0;

      // Fetch this week's time entries for weekly hours
      const { data: weeklyTimeEntries, error: weeklyError } = await supabase
        .from('time_entries')
        .select('id, employee_id, total_hours')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .lte('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (weeklyError) {
        console.error('[useLaborMetrics] Error fetching weekly time entries:', weeklyError);
      }

      const totalHoursThisWeek = weeklyTimeEntries?.reduce((sum, te) => sum + (te.total_hours || 0), 0) || 0;

      // Fetch this week's overtime
      const { data: overtimeRequests, error: otError } = await supabase
        .from('overtime_requests')
        .select('id, employee_id, overtime_hours, status')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .lte('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (otError) {
        console.error('[useLaborMetrics] Error fetching overtime:', otError);
      }

      const overtimeHoursThisWeek = overtimeRequests
        ?.filter(ot => ot.status === 'approved' || ot.status === 'completed')
        .reduce((sum, ot) => sum + (ot.overtime_hours || 0), 0) || 0;

      const pendingOvertimeRequests = overtimeRequests?.filter(ot => ot.status === 'pending').length || 0;

      // Fetch pending time off requests
      const { data: timeOffRequests, error: toError } = await supabase
        .from('time_off_requests')
        .select('id, employee_id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (toError) {
        console.error('[useLaborMetrics] Error fetching time off requests:', toError);
      }

      const pendingTimeOffRequests = timeOffRequests?.length || 0;

      // Calculate average attendance rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: recentAttendance, error: recentAttError } = await supabase
        .from('attendance_records')
        .select('id, status')
        .eq('organization_id', organizationId)
        .gte('date', thirtyDaysAgoStr)
        .lte('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (recentAttError) {
        console.error('[useLaborMetrics] Error fetching recent attendance:', recentAttError);
      }

      const totalRecords = recentAttendance?.length || 0;
      const presentRecords = recentAttendance?.filter(a => 
        a.status === 'present' || a.status === 'completed' || a.status === 'late'
      ).length || 0;
      const averageAttendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 100;

      const metrics: LaborMetrics = {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        inactiveEmployees,
        clockedInToday,
        scheduledToday,
        absentToday,
        lateToday,
        totalHoursToday,
        totalHoursThisWeek,
        overtimeHoursThisWeek,
        pendingTimeOffRequests,
        pendingOvertimeRequests,
        averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10,
      };

      console.log('[useLaborMetrics] Computed metrics:', metrics);
      return metrics;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLaborMetricsByDepartment() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['labor-metrics-by-department', organizationId, today, weekStart],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useLaborMetricsByDepartment] No organization ID');
        return [];
      }

      // Fetch all employees with department info
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, department_code, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('department_code', 'is', null);

      if (empError) {
        console.error('[useLaborMetricsByDepartment] Error:', empError);
        throw new Error(empError.message);
      }

      // Group employees by department
      const departmentMap = new Map<string, string[]>();
      employees?.forEach(emp => {
        if (emp.department_code) {
          const existing = departmentMap.get(emp.department_code) || [];
          existing.push(emp.id);
          departmentMap.set(emp.department_code, existing);
        }
      });

      const allEmployeeIds = employees?.map(e => e.id) || [];

      // Fetch today's time entries
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, total_hours, status, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Fetch today's shifts
      const { data: shifts } = await supabase
        .from('shifts')
        .select('employee_id, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Fetch weekly time entries
      const { data: weeklyTimeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, total_hours')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .lte('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Fetch weekly overtime
      const { data: overtimeRequests } = await supabase
        .from('overtime_requests')
        .select('employee_id, overtime_hours, status')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .lte('date', today)
        .in('status', ['approved', 'completed'])
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Calculate metrics per department
      const metrics: DepartmentLaborMetrics[] = [];

      departmentMap.forEach((empIds, deptCode) => {
        const employeeCount = empIds.length;
        
        const deptTimeEntries = timeEntries?.filter(te => empIds.includes(te.employee_id)) || [];
        const clockedInCount = deptTimeEntries.filter(te => te.status === 'active' && te.clock_in && !te.clock_out).length;
        const hoursToday = deptTimeEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);

        const deptShifts = shifts?.filter(s => empIds.includes(s.employee_id)) || [];
        const scheduledCount = deptShifts.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length;

        const deptWeeklyEntries = weeklyTimeEntries?.filter(te => empIds.includes(te.employee_id)) || [];
        const hoursThisWeek = deptWeeklyEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);

        const deptOvertime = overtimeRequests?.filter(ot => empIds.includes(ot.employee_id)) || [];
        const overtimeHours = deptOvertime.reduce((sum, ot) => sum + (ot.overtime_hours || 0), 0);

        const attendanceRate = scheduledCount > 0 ? (clockedInCount / scheduledCount) * 100 : 100;

        metrics.push({
          departmentCode: deptCode,
          departmentName: deptCode,
          employeeCount,
          clockedInCount,
          scheduledCount,
          hoursToday: Math.round(hoursToday * 10) / 10,
          hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
          overtimeHours: Math.round(overtimeHours * 10) / 10,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        });
      });

      console.log(`[useLaborMetricsByDepartment] Computed metrics for ${metrics.length} departments`);
      return metrics.sort((a, b) => b.employeeCount - a.employeeCount);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLaborMetricsByFacility() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['labor-metrics-by-facility', organizationId, today, weekStart],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useLaborMetricsByFacility] No organization ID');
        return [];
      }

      // Fetch facilities
      const { data: facilities, error: facError } = await supabase
        .from('facilities')
        .select('id, name, facility_code')
        .eq('organization_id', organizationId)
        .eq('active', true);

      if (facError) {
        console.error('[useLaborMetricsByFacility] Error fetching facilities:', facError);
        throw new Error(facError.message);
      }

      // Fetch all employees with facility info
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, facility_id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (empError) {
        console.error('[useLaborMetricsByFacility] Error:', empError);
        throw new Error(empError.message);
      }

      // Group employees by facility
      const facilityMap = new Map<string, string[]>();
      employees?.forEach(emp => {
        if (emp.facility_id) {
          const existing = facilityMap.get(emp.facility_id) || [];
          existing.push(emp.id);
          facilityMap.set(emp.facility_id, existing);
        }
      });

      const allEmployeeIds = employees?.map(e => e.id) || [];

      // Fetch today's time entries
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, total_hours, status, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Fetch today's shifts
      const { data: shifts } = await supabase
        .from('shifts')
        .select('employee_id, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Fetch weekly time entries
      const { data: weeklyTimeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, total_hours')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .lte('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Fetch weekly overtime
      const { data: overtimeRequests } = await supabase
        .from('overtime_requests')
        .select('employee_id, overtime_hours, status')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .lte('date', today)
        .in('status', ['approved', 'completed'])
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      // Calculate metrics per facility
      const metrics: FacilityLaborMetrics[] = [];

      facilities?.forEach(facility => {
        const empIds = facilityMap.get(facility.id) || [];
        const employeeCount = empIds.length;

        if (employeeCount === 0) {
          metrics.push({
            facilityId: facility.id,
            facilityName: facility.name,
            facilityCode: facility.facility_code,
            employeeCount: 0,
            clockedInCount: 0,
            scheduledCount: 0,
            hoursToday: 0,
            hoursThisWeek: 0,
            overtimeHours: 0,
            attendanceRate: 100,
          });
          return;
        }

        const facTimeEntries = timeEntries?.filter(te => empIds.includes(te.employee_id)) || [];
        const clockedInCount = facTimeEntries.filter(te => te.status === 'active' && te.clock_in && !te.clock_out).length;
        const hoursToday = facTimeEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);

        const facShifts = shifts?.filter(s => empIds.includes(s.employee_id)) || [];
        const scheduledCount = facShifts.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length;

        const facWeeklyEntries = weeklyTimeEntries?.filter(te => empIds.includes(te.employee_id)) || [];
        const hoursThisWeek = facWeeklyEntries.reduce((sum, te) => sum + (te.total_hours || 0), 0);

        const facOvertime = overtimeRequests?.filter(ot => empIds.includes(ot.employee_id)) || [];
        const overtimeHours = facOvertime.reduce((sum, ot) => sum + (ot.overtime_hours || 0), 0);

        const attendanceRate = scheduledCount > 0 ? (clockedInCount / scheduledCount) * 100 : 100;

        metrics.push({
          facilityId: facility.id,
          facilityName: facility.name,
          facilityCode: facility.facility_code,
          employeeCount,
          clockedInCount,
          scheduledCount,
          hoursToday: Math.round(hoursToday * 10) / 10,
          hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
          overtimeHours: Math.round(overtimeHours * 10) / 10,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        });
      });

      console.log(`[useLaborMetricsByFacility] Computed metrics for ${metrics.length} facilities`);
      return metrics.sort((a, b) => b.employeeCount - a.employeeCount);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEmployeeCountsByStatus() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-counts-by-status', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { active: 0, inactive: 0, onLeave: 0, total: 0 };
      }

      const { data, error } = await supabase
        .from('employees')
        .select('status')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useEmployeeCountsByStatus] Error:', error);
        throw new Error(error.message);
      }

      const counts = {
        active: data?.filter(e => e.status === 'active').length || 0,
        inactive: data?.filter(e => e.status === 'inactive').length || 0,
        onLeave: data?.filter(e => e.status === 'on_leave').length || 0,
        total: data?.length || 0,
      };

      console.log('[useEmployeeCountsByStatus] Counts:', counts);
      return counts;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployeeCountsByDepartment() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-counts-by-department', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('department_code, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('department_code', 'is', null);

      if (error) {
        console.error('[useEmployeeCountsByDepartment] Error:', error);
        throw new Error(error.message);
      }

      const deptCounts = new Map<string, number>();
      data?.forEach(emp => {
        if (emp.department_code) {
          deptCounts.set(emp.department_code, (deptCounts.get(emp.department_code) || 0) + 1);
        }
      });

      const result = Array.from(deptCounts.entries()).map(([code, count]) => ({
        departmentCode: code,
        count,
      })).sort((a, b) => b.count - a.count);

      console.log(`[useEmployeeCountsByDepartment] Counts for ${result.length} departments`);
      return result;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployeeCountsByFacility() {
  const { organizationId } = useOrganization();
  const { data: facilities } = useFacilities();

  return useQuery({
    queryKey: ['employee-counts-by-facility', organizationId, facilities?.map(f => f.id)],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('facility_id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('facility_id', 'is', null);

      if (error) {
        console.error('[useEmployeeCountsByFacility] Error:', error);
        throw new Error(error.message);
      }

      const facCounts = new Map<string, number>();
      data?.forEach(emp => {
        if (emp.facility_id) {
          facCounts.set(emp.facility_id, (facCounts.get(emp.facility_id) || 0) + 1);
        }
      });

      const result = facilities?.map(fac => ({
        facilityId: fac.id,
        facilityName: fac.name,
        facilityCode: fac.facility_code,
        count: facCounts.get(fac.id) || 0,
      })).sort((a, b) => b.count - a.count) || [];

      console.log(`[useEmployeeCountsByFacility] Counts for ${result.length} facilities`);
      return result;
    },
    enabled: !!organizationId && !!facilities,
    staleTime: 1000 * 60 * 5,
  });
}

// Helper function to get week start (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
