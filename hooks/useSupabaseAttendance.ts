import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type AttendanceStatus = 
  | 'scheduled'
  | 'present'
  | 'completed'
  | 'absent'
  | 'absent_excused'
  | 'late'
  | 'early_departure'
  | 'no_call_no_show'
  | 'partial'
  | 'holiday'
  | 'time_off'
  | 'suspended'
  | 'terminated';

export type OccurrenceType =
  | 'none'
  | 'late_minor'
  | 'late_major'
  | 'late_severe'
  | 'early_minor'
  | 'early_major'
  | 'absent_half'
  | 'absent_full'
  | 'ncns';

export type ExceptionType =
  | 'late_arrival'
  | 'early_departure'
  | 'missed_punch'
  | 'overtime_unapproved'
  | 'schedule_deviation'
  | 'break_violation'
  | 'no_call_no_show'
  | 'other';

export type ExceptionSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type ExceptionStatus = 'pending' | 'approved' | 'excused' | 'denied' | 'appealed';
export type WarningLevel = 'none' | 'verbal' | 'written' | 'final' | 'termination';
export type PointsAction = 'add' | 'remove' | 'expire' | 'reset' | 'adjust';

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  date: string;
  facility_id: string | null;
  facility_name: string | null;
  department_code: string | null;
  department_name: string | null;
  shift_id: string | null;
  time_entry_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  scheduled_hours: number | null;
  actual_clock_in: string | null;
  actual_clock_out: string | null;
  actual_hours: number;
  break_minutes: number;
  status: AttendanceStatus;
  is_late: boolean;
  late_minutes: number;
  is_early_departure: boolean;
  early_departure_minutes: number;
  is_overtime: boolean;
  overtime_minutes: number;
  is_no_call_no_show: boolean;
  occurrence_points: number;
  occurrence_type: OccurrenceType | null;
  time_off_request_id: string | null;
  time_off_type: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  exception_reason: string | null;
  exception_approved: boolean;
  exception_approved_by: string | null;
  exception_approved_at: string | null;
  pay_period_start: string | null;
  pay_period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceException {
  id: string;
  organization_id: string;
  attendance_record_id: string;
  employee_id: string;
  exception_type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  occurred_at: string;
  duration_minutes: number | null;
  points_assigned: number;
  status: ExceptionStatus;
  reported_by: string | null;
  reported_by_id: string | null;
  resolved_by: string | null;
  resolved_by_id: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendancePointsBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  current_points: number;
  points_this_period: number;
  points_ytd: number;
  last_occurrence_date: string | null;
  next_point_expiry_date: string | null;
  warning_level: WarningLevel;
  last_warning_date: string | null;
  last_warning_type: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendancePointsHistory {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_record_id: string | null;
  exception_id: string | null;
  action: PointsAction;
  points_change: number;
  points_before: number;
  points_after: number;
  reason: string;
  effective_date: string;
  expiry_date: string | null;
  performed_by: string;
  performed_by_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  employeeIds?: string[];
  departmentCode?: string;
  facilityId?: string;
  status?: AttendanceStatus | AttendanceStatus[];
  isLate?: boolean;
  isNoCallNoShow?: boolean;
  hasExceptions?: boolean;
  payPeriodStart?: string;
  payPeriodEnd?: string;
}

export interface AttendanceSummary {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  earlyDepartureCount: number;
  noCallNoShowCount: number;
  timeOffCount: number;
  totalHoursWorked: number;
  totalOvertimeMinutes: number;
  averageHoursPerDay: number;
  attendanceRate: number;
}

// Fetch attendance records with filters
export function useAttendanceRecords(filters?: AttendanceFilters) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['attendance-records', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('attendance_records')
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

      if (filters?.isLate !== undefined) {
        query = query.eq('is_late', filters.isLate);
      }

      if (filters?.isNoCallNoShow !== undefined) {
        query = query.eq('is_no_call_no_show', filters.isNoCallNoShow);
      }

      if (filters?.payPeriodStart) {
        query = query.eq('pay_period_start', filters.payPeriodStart);
      }

      if (filters?.payPeriodEnd) {
        query = query.eq('pay_period_end', filters.payPeriodEnd);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAttendanceRecords] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useAttendanceRecords] Fetched ${data?.length || 0} records`);
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!organizationId,
  });
}

// Fetch single attendance record
export function useAttendanceRecord(recordId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['attendance-record', organizationId, recordId],
    queryFn: async () => {
      if (!organizationId || !recordId) {
        return null;
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', recordId)
        .maybeSingle();

      if (error) {
        console.error('[useAttendanceRecord] Error:', error);
        throw new Error(error.message);
      }

      return data as AttendanceRecord | null;
    },
    enabled: !!organizationId && !!recordId,
  });
}

// Fetch attendance for a specific employee on a specific date
export function useEmployeeDailyAttendance(employeeId: string | undefined, date: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-daily-attendance', organizationId, employeeId, date],
    queryFn: async () => {
      if (!organizationId || !employeeId || !date) {
        return null;
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        console.error('[useEmployeeDailyAttendance] Error:', error);
        throw new Error(error.message);
      }

      return data as AttendanceRecord | null;
    },
    enabled: !!organizationId && !!employeeId && !!date,
  });
}

// Fetch attendance summary/stats
export function useAttendanceSummary(filters?: AttendanceFilters) {
  const { data: records, isLoading } = useAttendanceRecords(filters);

  const summary: AttendanceSummary = {
    totalRecords: records?.length || 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    earlyDepartureCount: 0,
    noCallNoShowCount: 0,
    timeOffCount: 0,
    totalHoursWorked: 0,
    totalOvertimeMinutes: 0,
    averageHoursPerDay: 0,
    attendanceRate: 0,
  };

  if (records) {
    records.forEach((record) => {
      if (record.status === 'present' || record.status === 'completed') {
        summary.presentCount++;
      }
      if (record.status === 'absent' || record.status === 'no_call_no_show') {
        summary.absentCount++;
      }
      if (record.is_late) {
        summary.lateCount++;
      }
      if (record.is_early_departure) {
        summary.earlyDepartureCount++;
      }
      if (record.is_no_call_no_show) {
        summary.noCallNoShowCount++;
      }
      if (record.status === 'time_off' || record.status === 'absent_excused') {
        summary.timeOffCount++;
      }
      summary.totalHoursWorked += record.actual_hours || 0;
      summary.totalOvertimeMinutes += record.overtime_minutes || 0;
    });

    if (summary.totalRecords > 0) {
      summary.averageHoursPerDay = summary.totalHoursWorked / summary.totalRecords;
      const scheduledDays = summary.totalRecords - summary.timeOffCount;
      if (scheduledDays > 0) {
        summary.attendanceRate = ((summary.presentCount / scheduledDays) * 100);
      }
    }
  }

  return { summary, isLoading };
}

// Fetch attendance exceptions
export function useAttendanceExceptions(filters?: { 
  attendanceRecordId?: string; 
  employeeId?: string; 
  status?: ExceptionStatus;
  startDate?: string;
  endDate?: string;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['attendance-exceptions', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('attendance_exceptions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false });

      if (filters?.attendanceRecordId) {
        query = query.eq('attendance_record_id', filters.attendanceRecordId);
      }

      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('occurred_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('occurred_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAttendanceExceptions] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useAttendanceExceptions] Fetched ${data?.length || 0} exceptions`);
      return (data || []) as AttendanceException[];
    },
    enabled: !!organizationId,
  });
}

// Fetch points balance for an employee
export function useEmployeePointsBalance(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['attendance-points-balance', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return null;
      }

      const { data, error } = await supabase
        .from('attendance_points_balance')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        console.error('[useEmployeePointsBalance] Error:', error);
        throw new Error(error.message);
      }

      return data as AttendancePointsBalance | null;
    },
    enabled: !!organizationId && !!employeeId,
  });
}

// Fetch all employees points balances
export function useAllPointsBalances(filters?: { warningLevel?: WarningLevel; minPoints?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['all-attendance-points-balances', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('attendance_points_balance')
        .select('*')
        .eq('organization_id', organizationId)
        .order('current_points', { ascending: false });

      if (filters?.warningLevel) {
        query = query.eq('warning_level', filters.warningLevel);
      }

      if (filters?.minPoints !== undefined) {
        query = query.gte('current_points', filters.minPoints);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAllPointsBalances] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useAllPointsBalances] Fetched ${data?.length || 0} balances`);
      return (data || []) as AttendancePointsBalance[];
    },
    enabled: !!organizationId,
  });
}

// Fetch points history for an employee
export function usePointsHistory(employeeId: string | undefined, options?: { limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['attendance-points-history', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('attendance_points_history')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePointsHistory] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[usePointsHistory] Fetched ${data?.length || 0} history entries`);
      return (data || []) as AttendancePointsHistory[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

// MUTATIONS

// Create or update attendance record
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      employee_id: string;
      employee_name: string;
      employee_code?: string;
      date: string;
      status: AttendanceStatus;
      facility_id?: string;
      facility_name?: string;
      department_code?: string;
      department_name?: string;
      shift_id?: string;
      scheduled_start?: string;
      scheduled_end?: string;
      scheduled_hours?: number;
      actual_clock_in?: string;
      actual_clock_out?: string;
      actual_hours?: number;
      break_minutes?: number;
      is_late?: boolean;
      late_minutes?: number;
      is_early_departure?: boolean;
      early_departure_minutes?: number;
      is_overtime?: boolean;
      overtime_minutes?: number;
      is_no_call_no_show?: boolean;
      occurrence_points?: number;
      occurrence_type?: OccurrenceType;
      time_off_request_id?: string;
      time_off_type?: string;
      exception_reason?: string;
      notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useMarkAttendance] Creating/updating attendance record:', data);

      // Check if record exists for this employee on this date
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_id', data.employee_id)
        .eq('date', data.date)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data: updated, error } = await supabase
          .from('attendance_records')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('[useMarkAttendance] Update error:', error);
          throw new Error(error.message);
        }

        console.log('[useMarkAttendance] Updated record:', updated.id);
        return updated as AttendanceRecord;
      } else {
        // Create new record
        const { data: created, error } = await supabase
          .from('attendance_records')
          .insert({
            organization_id: organizationId,
            ...data,
          })
          .select()
          .single();

        if (error) {
          console.error('[useMarkAttendance] Insert error:', error);
          throw new Error(error.message);
        }

        console.log('[useMarkAttendance] Created record:', created.id);
        return created as AttendanceRecord;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-daily-attendance', organizationId] });
    },
  });
}

// Update attendance status
export function useUpdateAttendanceStatus() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ recordId, status, notes }: { 
      recordId: string; 
      status: AttendanceStatus; 
      notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useUpdateAttendanceStatus] Updating status:', { recordId, status });

      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateAttendanceStatus] Error:', error);
        throw new Error(error.message);
      }

      return data as AttendanceRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-record', organizationId, variables.recordId] });
    },
  });
}

// Approve/Review attendance
export function useApproveAttendance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      recordId, 
      approverId, 
      approverName,
      action,
    }: { 
      recordId: string; 
      approverId: string;
      approverName: string;
      action: 'approve' | 'review';
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useApproveAttendance] Action:', action, 'for record:', recordId);

      const updateData = action === 'approve' 
        ? {
            approved_by: approverId,
            approved_by_name: approverName,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : {
            reviewed_by: approverId,
            reviewed_by_name: approverName,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

      const { data, error } = await supabase
        .from('attendance_records')
        .update(updateData)
        .eq('id', recordId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useApproveAttendance] Error:', error);
        throw new Error(error.message);
      }

      return data as AttendanceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', organizationId] });
    },
  });
}

// Create attendance exception
export function useCreateException() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      attendance_record_id: string;
      employee_id: string;
      exception_type: ExceptionType;
      severity?: ExceptionSeverity;
      description: string;
      occurred_at: string;
      duration_minutes?: number;
      points_assigned?: number;
      reported_by?: string;
      reported_by_id?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useCreateException] Creating exception:', data);

      const { data: created, error } = await supabase
        .from('attendance_exceptions')
        .insert({
          organization_id: organizationId,
          severity: 'minor',
          status: 'pending',
          points_assigned: 0,
          ...data,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateException] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateException] Created exception:', created.id);
      return created as AttendanceException;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-exceptions', organizationId] });
    },
  });
}

// Resolve attendance exception
export function useResolveException() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      exceptionId, 
      status, 
      resolverId, 
      resolverName,
      resolutionNotes,
    }: { 
      exceptionId: string; 
      status: ExceptionStatus;
      resolverId: string;
      resolverName: string;
      resolutionNotes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useResolveException] Resolving exception:', exceptionId, 'with status:', status);

      const { data, error } = await supabase
        .from('attendance_exceptions')
        .update({
          status,
          resolved_by: resolverName,
          resolved_by_id: resolverId,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exceptionId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useResolveException] Error:', error);
        throw new Error(error.message);
      }

      return data as AttendanceException;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-exceptions', organizationId] });
    },
  });
}

// Update points balance
export function useUpdatePointsBalance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      pointsChange,
      action,
      reason,
      performedBy,
      performedById,
      attendanceRecordId,
      exceptionId,
      expiryDate,
      notes,
    }: { 
      employeeId: string;
      pointsChange: number;
      action: PointsAction;
      reason: string;
      performedBy: string;
      performedById?: string;
      attendanceRecordId?: string;
      exceptionId?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useUpdatePointsBalance] Updating points for employee:', employeeId);

      // Get current balance
      const { data: currentBalance } = await supabase
        .from('attendance_points_balance')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .maybeSingle();

      const pointsBefore = currentBalance?.current_points || 0;
      const pointsAfter = action === 'reset' 
        ? 0 
        : action === 'remove' || action === 'expire'
          ? Math.max(0, pointsBefore - Math.abs(pointsChange))
          : pointsBefore + pointsChange;

      // Determine warning level based on points
      let warningLevel: WarningLevel = 'none';
      if (pointsAfter >= 10) warningLevel = 'termination';
      else if (pointsAfter >= 8) warningLevel = 'final';
      else if (pointsAfter >= 6) warningLevel = 'written';
      else if (pointsAfter >= 4) warningLevel = 'verbal';

      // Upsert balance
      const { error: balanceError } = await supabase
        .from('attendance_points_balance')
        .upsert({
          organization_id: organizationId,
          employee_id: employeeId,
          current_points: pointsAfter,
          points_this_period: (currentBalance?.points_this_period || 0) + (action === 'add' ? pointsChange : 0),
          points_ytd: (currentBalance?.points_ytd || 0) + (action === 'add' ? pointsChange : 0),
          last_occurrence_date: action === 'add' ? new Date().toISOString().split('T')[0] : currentBalance?.last_occurrence_date,
          next_point_expiry_date: expiryDate || currentBalance?.next_point_expiry_date,
          warning_level: warningLevel,
          last_warning_date: warningLevel !== (currentBalance?.warning_level || 'none') ? new Date().toISOString().split('T')[0] : currentBalance?.last_warning_date,
          last_warning_type: warningLevel !== 'none' ? warningLevel : currentBalance?.last_warning_type,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,employee_id',
        });

      if (balanceError) {
        console.error('[useUpdatePointsBalance] Balance update error:', balanceError);
        throw new Error(balanceError.message);
      }

      // Insert history record
      const { data: history, error: historyError } = await supabase
        .from('attendance_points_history')
        .insert({
          organization_id: organizationId,
          employee_id: employeeId,
          attendance_record_id: attendanceRecordId,
          exception_id: exceptionId,
          action,
          points_change: pointsChange,
          points_before: pointsBefore,
          points_after: pointsAfter,
          reason,
          effective_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate,
          performed_by: performedBy,
          performed_by_id: performedById,
          notes,
        })
        .select()
        .single();

      if (historyError) {
        console.error('[useUpdatePointsBalance] History insert error:', historyError);
        throw new Error(historyError.message);
      }

      console.log('[useUpdatePointsBalance] Updated balance and added history entry:', history.id);
      return { pointsBefore, pointsAfter, warningLevel, historyId: history.id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-points-balance', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-attendance-points-balances', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-points-history', organizationId, variables.employeeId] });
    },
  });
}

// Bulk mark attendance (for daily processing)
export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (records: {
      employee_id: string;
      employee_name: string;
      date: string;
      status: AttendanceStatus;
      department_code?: string;
      department_name?: string;
      notes?: string;
    }[]) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useBulkMarkAttendance] Bulk marking', records.length, 'records');

      const recordsWithOrg = records.map(r => ({
        organization_id: organizationId,
        ...r,
      }));

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(recordsWithOrg, {
          onConflict: 'organization_id,employee_id,date',
        })
        .select();

      if (error) {
        console.error('[useBulkMarkAttendance] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useBulkMarkAttendance] Upserted', data?.length || 0, 'records');
      return (data || []) as AttendanceRecord[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', organizationId] });
    },
  });
}

// Delete attendance record (admin only)
export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useDeleteAttendanceRecord] Deleting record:', recordId);

      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', recordId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteAttendanceRecord] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteAttendanceRecord] Deleted record:', recordId);
      return recordId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', organizationId] });
    },
  });
}
