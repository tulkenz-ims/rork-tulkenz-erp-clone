import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, insertRecord, updateRecord } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEffect, useState } from 'react';

export interface TimePunch {
  id: string;
  organization_id: string;
  employee_id: string;
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  organization_id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number;
  status: 'active' | 'completed' | 'pending_approval' | 'approved';
  shift_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useTimePunches(employeeId: string | undefined, options?: { date?: string; limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['time-punches', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false });

      if (options?.date) {
        query = query.gte('timestamp', `${options.date}T00:00:00`)
          .lt('timestamp', `${options.date}T23:59:59`);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTimePunches] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useTimePunches] Fetched ${data?.length || 0} punches for employee ${employeeId}`);
      return (data || []) as TimePunch[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useTimeEntries(employeeId: string | undefined, options?: { startDate?: string; endDate?: string; limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['time-entries', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });

      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTimeEntries] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useTimeEntries] Fetched ${data?.length || 0} entries for employee ${employeeId}`);
      return (data || []) as TimeEntry[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useActiveTimeEntry(employeeId: string | undefined) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['active-time-entry', organizationId, employeeId, today],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return null;
      }

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('[useActiveTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useActiveTimeEntry] Active entry for ${employeeId}:`, data ? 'found' : 'none');
      return data as TimeEntry | null;
    },
    enabled: !!organizationId && !!employeeId,
    refetchInterval: 30000,
  });
}

export function useIsOnBreak(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['is-on-break', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return false;
      }

      const { data, error } = await supabase
        .from('time_punches')
        .select('type')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useIsOnBreak] Error:', error);
        return false;
      }

      const isOnBreak = data?.type === 'break_start';
      console.log(`[useIsOnBreak] Employee ${employeeId} on break:`, isOnBreak);
      return isOnBreak;
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, notes, location }: { employeeId: string; notes?: string; location?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (existingEntry) {
        console.log('[useClockIn] Already clocked in today');
        return { punch: null, entry: existingEntry as TimeEntry };
      }

      const { data: punch, error: punchError } = await insertRecord('time_punches', {
        organization_id: organizationId,
        employee_id: employeeId,
        type: 'clock_in' as const,
        timestamp,
        location: location || null,
        notes: notes || null,
      });

      if (punchError) {
        console.error('[useClockIn] Punch error:', punchError);
        throw punchError;
      }

      const { data: entry, error: entryError } = await insertRecord('time_entries', {
        organization_id: organizationId,
        employee_id: employeeId,
        date: today,
        clock_in: timestamp,
        clock_out: null,
        break_minutes: 0,
        total_hours: 0,
        status: 'active' as const,
        shift_id: null,
      });

      if (entryError) {
        console.error('[useClockIn] Entry error:', entryError);
        throw entryError;
      }

      console.log('[useClockIn] Clocked in successfully:', entry?.id);
      return { punch: punch as TimePunch, entry: entry as TimeEntry };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, notes, location }: { employeeId: string; notes?: string; location?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      // Check if employee is on break and auto-end it
      const { data: lastPunch } = await supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      let additionalBreakMinutes = 0;
      if (lastPunch?.type === 'break_start') {
        // Auto-end the break
        console.log('[useClockOut] Auto-ending active break before clock out');
        
        await insertRecord('time_punches', {
          organization_id: organizationId,
          employee_id: employeeId,
          type: 'break_end' as const,
          timestamp,
          location: null,
          notes: 'Auto-ended on clock out',
        });

        // Calculate break duration
        additionalBreakMinutes = Math.round(
          (now.getTime() - new Date(lastPunch.timestamp).getTime()) / (1000 * 60)
        );
        console.log('[useClockOut] Added break minutes from auto-end:', additionalBreakMinutes);
      }

      const { data: punch, error: punchError } = await insertRecord('time_punches', {
        organization_id: organizationId,
        employee_id: employeeId,
        type: 'clock_out' as const,
        timestamp,
        location: location || null,
        notes: notes || null,
      });

      if (punchError) {
        console.error('[useClockOut] Punch error:', punchError);
        throw punchError;
      }

      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (activeEntry) {
        const totalBreakMinutes = activeEntry.break_minutes + additionalBreakMinutes;
        const clockInTime = new Date(activeEntry.clock_in || timestamp);
        const clockOutTime = new Date(timestamp);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const totalHours = Math.round(((diffMs / (1000 * 60 * 60)) - (totalBreakMinutes / 60)) * 100) / 100;

        const { data: updatedEntry, error: updateError } = await updateRecord(
          'time_entries',
          activeEntry.id,
          {
            clock_out: timestamp,
            break_minutes: totalBreakMinutes,
            total_hours: Math.max(0, totalHours),
            status: 'completed' as const,
          },
          organizationId
        );

        if (updateError) {
          console.error('[useClockOut] Update error:', updateError);
          throw updateError;
        }

        console.log('[useClockOut] Clocked out successfully:', updatedEntry?.id);
        return { punch: punch as TimePunch, entry: updatedEntry as TimeEntry };
      }

      console.log('[useClockOut] No active entry to update');
      return { punch: punch as TimePunch, entry: null };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['break-history', organizationId, variables.employeeId] });
    },
  });
}

export function useStartBreak() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      notes,
      breakType,
      scheduledMinutes,
    }: { 
      employeeId: string; 
      notes?: string;
      breakType: 'paid' | 'unpaid';
      scheduledMinutes: number;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const timestamp = new Date().toISOString();

      const { data: punch, error } = await insertRecord('time_punches', {
        organization_id: organizationId,
        employee_id: employeeId,
        type: 'break_start' as const,
        timestamp,
        location: null,
        notes: notes || null,
        break_type: breakType,
        scheduled_minutes: scheduledMinutes,
      });

      if (error) {
        console.error('[useStartBreak] Error:', error);
        throw error;
      }

      console.log('[useStartBreak] Break started:', punch?.id, 'Type:', breakType, 'Scheduled:', scheduledMinutes, 'min');
      return punch as TimePunch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-break', organizationId, variables.employeeId] });
    },
  });
}

export function useEndBreak() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, notes, force = false }: { employeeId: string; notes?: string; force?: boolean }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      // Get the break start punch to check break type and duration
      const { data: breakStartPunch } = await supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('type', 'break_start')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!breakStartPunch) {
        throw new Error('No active break found');
      }

      const breakDuration = Math.round(
        (now.getTime() - new Date(breakStartPunch.timestamp).getTime()) / (1000 * 60)
      );
      const breakType = breakStartPunch.break_type || 'unpaid';
      const scheduledMinutes = breakStartPunch.scheduled_minutes || 30;
      const MIN_UNPAID_BREAK = 30;
      const BUFFER_MINUTES = 2;

      // Validation for unpaid breaks - can't end before minimum (with buffer)
      if (breakType === 'unpaid' && !force) {
        const minAllowedDuration = MIN_UNPAID_BREAK - BUFFER_MINUTES;
        if (breakDuration < minAllowedDuration) {
          const remainingMinutes = minAllowedDuration - breakDuration;
          throw new Error(`BREAK_TOO_SHORT:${remainingMinutes}`);
        }
      }

      // Check if break is too long and create violation
      let violationType: string | null = null;
      if (breakDuration > scheduledMinutes + BUFFER_MINUTES) {
        violationType = 'break_too_long';
        console.log('[useEndBreak] Break too long detected:', breakDuration, 'min vs scheduled', scheduledMinutes, 'min');
        
        // Get employee name for violation record
        const { data: employee } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('id', employeeId)
          .single();
        
        const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
        
        // Create break violation record for HR
        try {
          await insertRecord('break_violations', {
            organization_id: organizationId,
            employee_id: employeeId,
            employee_name: employeeName,
            time_punch_id: breakStartPunch.id,
            violation_type: 'break_too_long',
            violation_date: today,
            break_type: breakType,
            scheduled_minutes: scheduledMinutes,
            actual_minutes: breakDuration,
            difference_minutes: breakDuration - scheduledMinutes,
            break_start: breakStartPunch.timestamp,
            break_end: timestamp,
            status: 'pending',
            hr_notified: true,
            hr_notified_at: timestamp,
            notes: `Break exceeded scheduled duration by ${breakDuration - scheduledMinutes} minutes`,
          });
          console.log('[useEndBreak] Created break violation record');
        } catch (violationError) {
          console.error('[useEndBreak] Failed to create violation record:', violationError);
        }
      }

      const { data: punch, error: punchError } = await insertRecord('time_punches', {
        organization_id: organizationId,
        employee_id: employeeId,
        type: 'break_end' as const,
        timestamp,
        location: null,
        notes: notes || null,
        break_type: breakType,
        scheduled_minutes: scheduledMinutes,
      });

      if (punchError) {
        console.error('[useEndBreak] Punch error:', punchError);
        throw punchError;
      }

      // Update time entry with break minutes
      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (activeEntry) {
        // Paid breaks don't deduct from working hours, unpaid breaks do
        const updateData: Record<string, any> = {};
        
        if (breakType === 'paid') {
          // Add to paid_break_minutes, don't affect total break_minutes for deduction
          updateData.paid_break_minutes = (activeEntry.paid_break_minutes || 0) + breakDuration;
        } else {
          // Unpaid breaks: add to both unpaid_break_minutes and break_minutes (for deduction)
          updateData.unpaid_break_minutes = (activeEntry.unpaid_break_minutes || 0) + breakDuration;
          updateData.break_minutes = (activeEntry.break_minutes || 0) + breakDuration;
        }
        
        await updateRecord(
          'time_entries',
          activeEntry.id,
          updateData,
          organizationId
        );
        console.log('[useEndBreak] Updated entry with', breakType, 'break:', breakDuration, 'min');
      }

      console.log('[useEndBreak] Break ended:', punch?.id, 'Duration:', breakDuration, 'min', 'Type:', breakType);
      return { 
        punch: punch as TimePunch, 
        breakDuration, 
        breakType, 
        violationType,
        wasOvertime: violationType === 'break_too_long',
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['break-violations', organizationId] });
    },
  });
}

// Get active break details
export function useActiveBreak(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['active-break', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return null;
      }

      const { data, error } = await supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('type', 'break_start')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useActiveBreak] Error:', error);
        return null;
      }

      if (!data) return null;

      // Check if there's a matching break_end after this break_start
      const { data: breakEnd } = await supabase
        .from('time_punches')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('type', 'break_end')
        .gt('timestamp', data.timestamp)
        .limit(1)
        .maybeSingle();

      if (breakEnd) {
        return null; // Break has ended
      }

      return {
        id: data.id,
        startTime: data.timestamp,
        breakType: (data.break_type || 'unpaid') as 'paid' | 'unpaid',
        scheduledMinutes: data.scheduled_minutes || 30,
      };
    },
    enabled: !!organizationId && !!employeeId,
    refetchInterval: 10000,
  });
}

// Get break violations for HR review
export function useBreakViolations(options?: { status?: string; startDate?: string; endDate?: string; limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['break-violations', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('break_violations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.startDate) {
        query = query.gte('violation_date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('violation_date', options.endDate);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useBreakViolations] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useBreakViolations] Fetched ${data?.length || 0} violations`);
      return data || [];
    },
    enabled: !!organizationId,
  });
}

export function useBreakHistory(employeeId: string | undefined, date?: string) {
  const { organizationId } = useOrganization();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['break-history', organizationId, employeeId, targetDate],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      const { data, error } = await supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .in('type', ['break_start', 'break_end'])
        .gte('timestamp', `${targetDate}T00:00:00`)
        .lt('timestamp', `${targetDate}T23:59:59`)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('[useBreakHistory] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as TimePunch[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useEmployeeTimeHistory(employeeId: string | undefined, limit: number = 14) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-time-history', organizationId, employeeId, limit],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useEmployeeTimeHistory] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useEmployeeTimeHistory] Fetched ${data?.length || 0} entries`);
      return (data || []) as TimeEntry[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

// ============================================
// ALL EMPLOYEES CLOCK STATUS
// ============================================

export interface EmployeeClockStatus {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  employee_code: string;
  department: string;
  position: string;
  status: 'clocked_in' | 'clocked_out' | 'on_break';
  last_punch_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | null;
  last_punch_time: string | null;
  today_hours: number;
  week_hours: number;
  facility_id: string | null;
}

export function useAllEmployeesClockStatus() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['all-employees-clock-status', organizationId, today],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      // Get all employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, department_code, position, facility_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (empError) {
        console.error('[useAllEmployeesClockStatus] Employee error:', empError);
        throw new Error(empError.message);
      }

      if (!employees || employees.length === 0) {
        return [];
      }

      const employeeIds = employees.map(e => e.id);

      // Get today's time entries
      const { data: todayEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds);

      // Get last punch for each employee
      const { data: lastPunches } = await supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .in('employee_id', employeeIds)
        .order('timestamp', { ascending: false });

      // Get week's time entries for weekly hours
      const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
      const { data: weekEntries } = await supabase
        .from('time_entries')
        .select('employee_id, total_hours')
        .eq('organization_id', organizationId)
        .gte('date', weekStart)
        .in('employee_id', employeeIds);

      // Build status for each employee
      const statusList: EmployeeClockStatus[] = employees.map(emp => {
        const todayEntry = todayEntries?.find(e => e.employee_id === emp.id && e.status === 'active');
        const lastPunch = lastPunches?.find(p => p.employee_id === emp.id);
        const empWeekEntries = weekEntries?.filter(e => e.employee_id === emp.id) || [];
        const weekHours = empWeekEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

        let status: 'clocked_in' | 'clocked_out' | 'on_break' = 'clocked_out';
        if (todayEntry) {
          if (lastPunch?.type === 'break_start') {
            status = 'on_break';
          } else {
            status = 'clocked_in';
          }
        }

        return {
          id: emp.id,
          employee_id: emp.id,
          first_name: emp.first_name || '',
          last_name: emp.last_name || '',
          employee_code: emp.employee_code || '',
          department: emp.department_code || '',
          position: emp.position || '',
          status,
          last_punch_type: lastPunch?.type || null,
          last_punch_time: lastPunch?.timestamp || null,
          today_hours: todayEntry?.total_hours || 0,
          week_hours: Math.round(weekHours * 100) / 100,
          facility_id: emp.facility_id || null,
        };
      });

      console.log(`[useAllEmployeesClockStatus] Fetched ${statusList.length} employees`);
      return statusList;
    },
    enabled: !!organizationId,
    refetchInterval: 60000,
  });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// ============================================
// TODAY'S CLOCK ACTIVITY FEED
// ============================================

export interface ClockActivityEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
  method: string | null;
  facility_name: string | null;
  is_within_geofence: boolean | null;
}

export function useTodayClockActivity(limit: number = 50) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-clock-activity', organizationId, today, limit],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data: punches, error } = await supabase
        .from('time_punches')
        .select(`
          *,
          employees:employee_id (first_name, last_name, department)
        `)
        .eq('organization_id', organizationId)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useTodayClockActivity] Error:', error);
        throw new Error(error.message);
      }

      const activities: ClockActivityEntry[] = (punches || []).map((p: any) => ({
        id: p.id,
        employee_id: p.employee_id,
        employee_name: p.employees ? `${p.employees.first_name || ''} ${p.employees.last_name || ''}`.trim() : 'Unknown',
        department: p.employees?.department || '',
        type: p.type,
        timestamp: p.timestamp,
        method: p.method,
        facility_name: null,
        is_within_geofence: p.is_within_geofence,
      }));

      console.log(`[useTodayClockActivity] Fetched ${activities.length} activities`);
      return activities;
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });
}

// ============================================
// ROOM / AREA TRACKING
// ============================================

export interface ProductionRoom {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  facility_id: string | null;
  capacity: number;
  hourly_rate: number;
  is_active: boolean;
  category: 'production' | 'warehouse' | 'quality' | 'maintenance' | 'office';
  created_at: string;
}

export interface RoomSession {
  id: string;
  organization_id: string;
  room_id: string;
  room_name?: string;
  room_code?: string;
  employee_id: string;
  employee_name?: string;
  department?: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: 'active' | 'completed' | 'paused';
  notes: string | null;
  linked_work_order_id: string | null;
  linked_work_order_number: string | null;
  created_at: string;
}

export function useProductionRooms(facilityId?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['production-rooms', organizationId, facilityId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('production_rooms')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useProductionRooms] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useProductionRooms] Fetched ${data?.length || 0} rooms`);
      return (data || []) as ProductionRoom[];
    },
    enabled: !!organizationId,
  });
}

export function useActiveRoomSessions(roomId?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['active-room-sessions', organizationId, roomId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('room_sessions')
        .select(`
          *,
          production_rooms:room_id (name, code),
          employees:employee_id (first_name, last_name, department)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useActiveRoomSessions] Error:', error);
        throw new Error(error.message);
      }

      const sessions: RoomSession[] = (data || []).map((s: any) => ({
        ...s,
        room_name: s.production_rooms?.name || '',
        room_code: s.production_rooms?.code || '',
        employee_name: s.employees ? `${s.employees.first_name || ''} ${s.employees.last_name || ''}`.trim() : '',
        department: s.employees?.department || '',
      }));

      console.log(`[useActiveRoomSessions] Fetched ${sessions.length} active sessions`);
      return sessions;
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });
}

export function useEmployeeActiveRoomSession(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-active-room-session', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return null;
      }

      const { data, error } = await supabase
        .from('room_sessions')
        .select(`
          *,
          production_rooms:room_id (name, code)
        `)
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('[useEmployeeActiveRoomSession] Error:', error);
        throw new Error(error.message);
      }

      if (!data) return null;

      const session: RoomSession = {
        ...data,
        room_name: (data as any).production_rooms?.name || '',
        room_code: (data as any).production_rooms?.code || '',
      };

      console.log(`[useEmployeeActiveRoomSession] Active session:`, session.id);
      return session;
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useRoomSessionHistory(options?: { roomId?: string; employeeId?: string; startDate?: string; endDate?: string; limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['room-session-history', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('room_sessions')
        .select(`
          *,
          production_rooms:room_id (name, code),
          employees:employee_id (first_name, last_name, department)
        `)
        .eq('organization_id', organizationId)
        .order('start_time', { ascending: false });

      if (options?.roomId) {
        query = query.eq('room_id', options.roomId);
      }
      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }
      if (options?.startDate) {
        query = query.gte('start_time', `${options.startDate}T00:00:00`);
      }
      if (options?.endDate) {
        query = query.lte('start_time', `${options.endDate}T23:59:59`);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useRoomSessionHistory] Error:', error);
        throw new Error(error.message);
      }

      const sessions: RoomSession[] = (data || []).map((s: any) => ({
        ...s,
        room_name: s.production_rooms?.name || '',
        room_code: s.production_rooms?.code || '',
        employee_name: s.employees ? `${s.employees.first_name || ''} ${s.employees.last_name || ''}`.trim() : '',
        department: s.employees?.department || '',
      }));

      console.log(`[useRoomSessionHistory] Fetched ${sessions.length} sessions`);
      return sessions;
    },
    enabled: !!organizationId,
  });
}

export function useStartRoomSession() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, roomId, notes, workOrderId, workOrderNumber }: {
      employeeId: string;
      roomId: string;
      notes?: string;
      workOrderId?: string;
      workOrderNumber?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      // Check for existing active session
      const { data: existing } = await supabase
        .from('room_sessions')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        throw new Error('Employee already has an active room session');
      }

      const { data, error } = await supabase
        .from('room_sessions')
        .insert({
          organization_id: organizationId,
          room_id: roomId,
          employee_id: employeeId,
          start_time: new Date().toISOString(),
          status: 'active',
          notes: notes || null,
          linked_work_order_id: workOrderId || null,
          linked_work_order_number: workOrderNumber || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useStartRoomSession] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useStartRoomSession] Started session:', data?.id);
      return data as unknown as RoomSession;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-room-sessions', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-active-room-session', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['room-session-history', organizationId] });
    },
  });
}

export function useEndRoomSession() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      // Get the session to calculate duration
      const { data: session } = await supabase
        .from('room_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('organization_id', organizationId)
        .single();

      if (!session) {
        throw new Error('Session not found');
      }

      const endTime = new Date();
      const startTime = new Date(session.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const updateData: Record<string, any> = {
        end_time: endTime.toISOString(),
        duration: durationMinutes,
        status: 'completed',
      };

      if (notes) {
        updateData.notes = session.notes ? `${session.notes}\n${notes}` : notes;
      }

      const { data, error } = await supabase
        .from('room_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useEndRoomSession] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useEndRoomSession] Ended session:', sessionId, 'Duration:', durationMinutes, 'min');
      return data as unknown as RoomSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-room-sessions', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-active-room-session', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['room-session-history', organizationId] });
    },
  });
}

// ============================================
// GEOFENCE CONFIGURATION
// ============================================

export interface GeofenceConfig {
  id: string;
  organization_id: string;
  facility_id: string;
  facility_name: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export function useGeofenceConfigs() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['geofence-configs', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('geofence_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('facility_name');

      if (error) {
        console.error('[useGeofenceConfigs] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useGeofenceConfigs] Fetched ${data?.length || 0} geofences`);
      return (data || []) as GeofenceConfig[];
    },
    enabled: !!organizationId,
  });
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function useTimeClockRealtime(onPunchUpdate?: (punch: TimePunch) => void) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!organizationId) return;

    console.log('[useTimeClockRealtime] Setting up subscription...');

    const channel = supabase
      .channel(`time_punches_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_punches',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[useTimeClockRealtime] New punch:', payload.new);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['today-clock-activity', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['all-employees-clock-status', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId] });

          // Call callback if provided
          if (onPunchUpdate) {
            onPunchUpdate(payload.new as TimePunch);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useTimeClockRealtime] Subscription status:', status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[useTimeClockRealtime] Cleaning up subscription');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [organizationId, queryClient, onPunchUpdate]);

  return { isSubscribed };
}

export function useRoomSessionsRealtime(onSessionUpdate?: (session: RoomSession) => void) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!organizationId) return;

    console.log('[useRoomSessionsRealtime] Setting up subscription...');

    const channel = supabase
      .channel(`room_sessions_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_sessions',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[useRoomSessionsRealtime] Session change:', payload.eventType, payload.new);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['active-room-sessions', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['employee-active-room-session', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['room-session-history', organizationId] });

          // Call callback if provided
          if (onSessionUpdate && payload.new) {
            onSessionUpdate(payload.new as RoomSession);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useRoomSessionsRealtime] Subscription status:', status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[useRoomSessionsRealtime] Cleaning up subscription');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [organizationId, queryClient, onSessionUpdate]);

  return { isSubscribed };
}

// ============================================
// EXTENDED CLOCK IN/OUT WITH LOCATION
// ============================================

export function useClockInWithLocation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      notes, 
      method,
      location,
      facilityId,
      isWithinGeofence,
    }: { 
      employeeId: string; 
      notes?: string; 
      method?: 'qr_code' | 'employee_number' | 'facial_recognition' | 'manual';
      location?: { latitude: number; longitude: number; accuracy?: number };
      facilityId?: string;
      isWithinGeofence?: boolean;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (existingEntry) {
        console.log('[useClockInWithLocation] Already clocked in today');
        return { punch: null, entry: existingEntry as TimeEntry };
      }

      // Build location string with all relevant info
      let locationStr: string | null = null;
      if (location) {
        const parts = [`${location.latitude},${location.longitude}`];
        if (location.accuracy) parts.push(`accuracy:${location.accuracy}`);
        if (method) parts.push(`method:${method}`);
        if (isWithinGeofence !== undefined) parts.push(`geofence:${isWithinGeofence}`);
        if (facilityId) parts.push(`facility:${facilityId}`);
        locationStr = parts.join('|');
      }

      const { data: punch, error: punchError } = await insertRecord('time_punches', {
        organization_id: organizationId,
        employee_id: employeeId,
        type: 'clock_in' as const,
        timestamp,
        location: locationStr,
        notes: notes || null,
      });

      if (punchError) {
        console.error('[useClockInWithLocation] Punch error:', punchError);
        throw punchError;
      }

      const { data: entry, error: entryError } = await insertRecord('time_entries', {
        organization_id: organizationId,
        employee_id: employeeId,
        date: today,
        clock_in: timestamp,
        clock_out: null,
        break_minutes: 0,
        total_hours: 0,
        status: 'active' as const,
        shift_id: null,
      });

      if (entryError) {
        console.error('[useClockInWithLocation] Entry error:', entryError);
        throw entryError;
      }

      console.log('[useClockInWithLocation] Clocked in successfully:', entry?.id);
      return { punch: punch as TimePunch, entry: entry as TimeEntry };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-employees-clock-status', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['today-clock-activity', organizationId] });
    },
  });
}

export function useClockOutWithLocation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      notes, 
      method,
      location,
      facilityId,
      isWithinGeofence,
    }: { 
      employeeId: string; 
      notes?: string; 
      method?: 'qr_code' | 'employee_number' | 'facial_recognition' | 'manual';
      location?: { latitude: number; longitude: number; accuracy?: number };
      facilityId?: string;
      isWithinGeofence?: boolean;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      // Check if employee is on break and auto-end it
      const { data: lastPunch } = await supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      let additionalBreakMinutes = 0;
      if (lastPunch?.type === 'break_start') {
        console.log('[useClockOutWithLocation] Auto-ending active break before clock out');
        
        await insertRecord('time_punches', {
          organization_id: organizationId,
          employee_id: employeeId,
          type: 'break_end' as const,
          timestamp,
          location: null,
          notes: 'Auto-ended on clock out',
        });

        additionalBreakMinutes = Math.round(
          (now.getTime() - new Date(lastPunch.timestamp).getTime()) / (1000 * 60)
        );
        console.log('[useClockOutWithLocation] Added break minutes from auto-end:', additionalBreakMinutes);
      }

      // Build location string with all relevant info
      let locationStr: string | null = null;
      if (location) {
        const parts = [`${location.latitude},${location.longitude}`];
        if (location.accuracy) parts.push(`accuracy:${location.accuracy}`);
        if (method) parts.push(`method:${method}`);
        if (isWithinGeofence !== undefined) parts.push(`geofence:${isWithinGeofence}`);
        if (facilityId) parts.push(`facility:${facilityId}`);
        locationStr = parts.join('|');
      }

      const { data: punch, error: punchError } = await insertRecord('time_punches', {
        organization_id: organizationId,
        employee_id: employeeId,
        type: 'clock_out' as const,
        timestamp,
        location: locationStr,
        notes: notes || null,
      });

      if (punchError) {
        console.error('[useClockOutWithLocation] Punch error:', punchError);
        throw punchError;
      }

      const { data: activeEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (activeEntry) {
        const totalBreakMinutes = activeEntry.break_minutes + additionalBreakMinutes;
        const clockInTime = new Date(activeEntry.clock_in || timestamp);
        const clockOutTime = new Date(timestamp);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const totalHours = Math.round(((diffMs / (1000 * 60 * 60)) - (totalBreakMinutes / 60)) * 100) / 100;

        const { data: updatedEntry, error: updateError } = await updateRecord(
          'time_entries',
          activeEntry.id,
          {
            clock_out: timestamp,
            break_minutes: totalBreakMinutes,
            total_hours: Math.max(0, totalHours),
            status: 'completed' as const,
          },
          organizationId
        );

        if (updateError) {
          console.error('[useClockOutWithLocation] Update error:', updateError);
          throw updateError;
        }

        console.log('[useClockOutWithLocation] Clocked out successfully:', updatedEntry?.id);
        return { punch: punch as TimePunch, entry: updatedEntry as TimeEntry };
      }

      console.log('[useClockOutWithLocation] No active entry to update');
      return { punch: punch as TimePunch, entry: null };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['break-history', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-employees-clock-status', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['today-clock-activity', organizationId] });
    },
  });
}

// ============================================
// ROOM TIME SUMMARY / ANALYTICS
// ============================================

export interface RoomTimeSummary {
  room_id: string;
  room_name: string;
  room_code: string;
  total_hours: number;
  total_sessions: number;
  unique_employees: number;
  average_session_length: number;
  labor_cost: number;
}

// ============================================
// ADMIN: RESET/DELETE TIME DATA
// ============================================

export function useResetEmployeeTimeData() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: string; date?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const targetDate = date || new Date().toISOString().split('T')[0];

      // Delete time punches for the date
      const { error: punchError } = await supabase
        .from('time_punches')
        .delete()
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .gte('timestamp', `${targetDate}T00:00:00`)
        .lt('timestamp', `${targetDate}T23:59:59`);

      if (punchError) {
        console.error('[useResetEmployeeTimeData] Punch delete error:', punchError);
        throw new Error(punchError.message);
      }

      // Delete time entries for the date
      const { error: entryError } = await supabase
        .from('time_entries')
        .delete()
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('date', targetDate);

      if (entryError) {
        console.error('[useResetEmployeeTimeData] Entry delete error:', entryError);
        throw new Error(entryError.message);
      }

      console.log(`[useResetEmployeeTimeData] Reset time data for employee ${employeeId} on ${targetDate}`);
      return { success: true, date: targetDate };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['break-history', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-employees-clock-status', organizationId] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ entryId, employeeId }: { entryId: string; employeeId: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useDeleteTimeEntry] Deleted entry ${entryId}`);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['all-employees-clock-status', organizationId] });
    },
  });
}

export function useDeleteTimePunch() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ punchId, employeeId }: { punchId: string; employeeId: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { error } = await supabase
        .from('time_punches')
        .delete()
        .eq('id', punchId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteTimePunch] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useDeleteTimePunch] Deleted punch ${punchId}`);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['break-history', organizationId, variables.employeeId] });
    },
  });
}

// ============================================
// TIME ADJUSTMENT REQUESTS
// ============================================

export interface TimeAdjustmentRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  time_entry_id?: string;
  time_punch_id?: string;
  request_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'add_entry' | 'delete_entry' | 'modify_entry';
  original_timestamp?: string;
  original_date?: string;
  original_clock_in?: string;
  original_clock_out?: string;
  requested_timestamp?: string;
  requested_date?: string;
  requested_clock_in?: string;
  requested_clock_out?: string;
  reason: string;
  employee_notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  admin_response?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export function useTimeAdjustmentRequests(employeeId?: string, options?: { status?: string; limit?: number }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['time-adjustment-requests', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('time_adjustment_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTimeAdjustmentRequests] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useTimeAdjustmentRequests] Fetched ${data?.length || 0} requests`);
      return (data || []) as TimeAdjustmentRequest[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateTimeAdjustmentRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (request: {
      employee_id: string;
      employee_name: string;
      time_entry_id?: string;
      time_punch_id?: string;
      request_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'add_entry' | 'delete_entry' | 'modify_entry';
      original_timestamp?: string;
      original_date?: string;
      original_clock_in?: string;
      original_clock_out?: string;
      requested_timestamp?: string;
      requested_date?: string;
      requested_clock_in?: string;
      requested_clock_out?: string;
      reason: string;
      employee_notes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('time_adjustment_requests')
        .insert({
          organization_id: organizationId,
          ...request,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateTimeAdjustmentRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateTimeAdjustmentRequest] Created request:', data?.id);
      return data as TimeAdjustmentRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-adjustment-requests', organizationId, variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['time-adjustment-requests', organizationId] });
    },
  });
}

// ============================================
// EMPLOYEE TIME ENTRY APPROVAL
// ============================================

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ entryId, employeeId }: { entryId: string; employeeId: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          employee_approved: true,
          employee_approved_at: now,
        })
        .eq('id', entryId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useApproveTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useApproveTimeEntry] Approved entry:', entryId);
      return data as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['week-time-entries', organizationId, variables.employeeId] });
    },
  });
}

export function useApproveAllTimeEntries() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, entryIds }: { employeeId: string; entryIds: string[] }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          employee_approved: true,
          employee_approved_at: now,
        })
        .in('id', entryIds)
        .eq('organization_id', organizationId)
        .select();

      if (error) {
        console.error('[useApproveAllTimeEntries] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useApproveAllTimeEntries] Approved', data?.length, 'entries');
      return data as TimeEntry[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['week-time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
    },
  });
}

// ============================================
// WEEK TIME ENTRIES WITH BREAK DETAILS
// ============================================

export interface TimeEntryWithBreaks extends TimeEntry {
  paid_break_minutes: number;
  unpaid_break_minutes: number;
  employee_approved: boolean;
  employee_approved_at: string | null;
}

export function useWeekTimeEntries(employeeId: string | undefined, weekStartDate?: Date) {
  const { organizationId } = useOrganization();
  
  const weekStart = weekStartDate || (() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  })();
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startStr = weekStart.toISOString().split('T')[0];
  const endStr = weekEnd.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['week-time-entries', organizationId, employeeId, startStr, endStr],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: false });

      if (error) {
        console.error('[useWeekTimeEntries] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useWeekTimeEntries] Fetched ${data?.length || 0} entries for week starting ${startStr}`);
      return (data || []).map(entry => ({
        ...entry,
        paid_break_minutes: entry.paid_break_minutes || 0,
        unpaid_break_minutes: entry.unpaid_break_minutes || 0,
        employee_approved: entry.employee_approved || false,
        employee_approved_at: entry.employee_approved_at || null,
      })) as TimeEntryWithBreaks[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useRoomTimeSummary(options?: { startDate?: string; endDate?: string; facilityId?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['room-time-summary', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      // Get rooms
      let roomsQuery = supabase
        .from('production_rooms')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (options?.facilityId) {
        roomsQuery = roomsQuery.eq('facility_id', options.facilityId);
      }

      const { data: rooms } = await roomsQuery;

      if (!rooms || rooms.length === 0) {
        return [];
      }

      // Get sessions
      let sessionsQuery = supabase
        .from('room_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'completed');

      if (options?.startDate) {
        sessionsQuery = sessionsQuery.gte('start_time', `${options.startDate}T00:00:00`);
      }
      if (options?.endDate) {
        sessionsQuery = sessionsQuery.lte('start_time', `${options.endDate}T23:59:59`);
      }

      const { data: sessions } = await sessionsQuery;

      // Calculate summaries
      const summaries: RoomTimeSummary[] = rooms.map(room => {
        const roomSessions = sessions?.filter(s => s.room_id === room.id) || [];
        const totalMinutes = roomSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const totalHours = totalMinutes / 60;
        const uniqueEmployees = new Set(roomSessions.map(s => s.employee_id)).size;

        return {
          room_id: room.id,
          room_name: room.name,
          room_code: room.code,
          total_hours: Math.round(totalHours * 100) / 100,
          total_sessions: roomSessions.length,
          unique_employees: uniqueEmployees,
          average_session_length: roomSessions.length > 0 ? Math.round(totalMinutes / roomSessions.length) : 0,
          labor_cost: Math.round(totalHours * (room.hourly_rate || 0) * 100) / 100,
        };
      });

      console.log(`[useRoomTimeSummary] Calculated ${summaries.length} room summaries`);
      return summaries;
    },
    enabled: !!organizationId,
  });
}

// ============================================
// ADMIN: REVIEW TIME ADJUSTMENT REQUESTS
// ============================================

export function useReviewTimeAdjustmentRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      reviewerId,
      reviewerName,
      adminResponse,
      adminNotes,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
      reviewerId: string;
      reviewerName: string;
      adminResponse?: string;
      adminNotes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date().toISOString();

      // Get the request first
      const { data: request, error: fetchError } = await supabase
        .from('time_adjustment_requests')
        .select('*')
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !request) {
        throw new Error('Request not found');
      }

      // Update the request
      const { data, error } = await supabase
        .from('time_adjustment_requests')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_by_name: reviewerName,
          reviewed_at: now,
          admin_response: adminResponse || null,
          admin_notes: adminNotes || null,
        })
        .eq('id', requestId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useReviewTimeAdjustmentRequest] Error:', error);
        throw new Error(error.message);
      }

      // If approved, apply the changes
      if (status === 'approved' && request.time_entry_id) {
        const updates: Record<string, unknown> = {};
        
        if (request.requested_clock_in) {
          updates.clock_in = request.requested_clock_in;
        }
        if (request.requested_clock_out) {
          updates.clock_out = request.requested_clock_out;
        }

        if (Object.keys(updates).length > 0) {
          // Recalculate total hours if clock times changed
          if (updates.clock_in || updates.clock_out) {
            const { data: entry } = await supabase
              .from('time_entries')
              .select('*')
              .eq('id', request.time_entry_id)
              .single();

            if (entry) {
              const clockIn = new Date((updates.clock_in as string) || entry.clock_in);
              const clockOut = new Date((updates.clock_out as string) || entry.clock_out);
              const diffMs = clockOut.getTime() - clockIn.getTime();
              const breakMinutes = entry.break_minutes || 0;
              const totalHours = Math.round(((diffMs / (1000 * 60 * 60)) - (breakMinutes / 60)) * 100) / 100;
              updates.total_hours = Math.max(0, totalHours);
            }
          }

          await supabase
            .from('time_entries')
            .update(updates)
            .eq('id', request.time_entry_id)
            .eq('organization_id', organizationId);

          console.log('[useReviewTimeAdjustmentRequest] Applied changes to time entry');
        }
      }

      console.log('[useReviewTimeAdjustmentRequest] Reviewed request:', requestId, 'Status:', status);
      return data as TimeAdjustmentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-adjustment-requests', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId] });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      entryId,
      employeeId,
      updates,
    }: {
      entryId: string;
      employeeId: string;
      updates: {
        clock_in?: string;
        clock_out?: string;
        break_minutes?: number;
        paid_break_minutes?: number;
        unpaid_break_minutes?: number;
        notes?: string;
      };
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      // Get the current entry
      const { data: entry, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', entryId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !entry) {
        throw new Error('Entry not found');
      }

      // Calculate total hours if times changed
      const clockIn = new Date(updates.clock_in || entry.clock_in);
      const clockOut = updates.clock_out ? new Date(updates.clock_out) : (entry.clock_out ? new Date(entry.clock_out) : null);
      
      let totalHours = entry.total_hours;
      if (clockIn && clockOut) {
        const diffMs = clockOut.getTime() - clockIn.getTime();
        const breakMinutes = updates.break_minutes ?? entry.break_minutes ?? 0;
        totalHours = Math.round(((diffMs / (1000 * 60 * 60)) - (breakMinutes / 60)) * 100) / 100;
        totalHours = Math.max(0, totalHours);
      }

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          ...updates,
          total_hours: totalHours,
        })
        .eq('id', entryId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateTimeEntry] Updated entry:', entryId);
      return data as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['week-time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
    },
  });
}

// ============================================
// ADMIN: BREAK VIOLATION MANAGEMENT
// ============================================

export interface BreakViolation {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  time_entry_id?: string;
  time_punch_id?: string;
  violation_type: 'break_too_short' | 'break_too_long' | 'missed_break' | 'early_return' | 'late_return';
  violation_date: string;
  break_type?: 'paid' | 'unpaid';
  scheduled_minutes?: number;
  actual_minutes?: number;
  difference_minutes?: number;
  break_start?: string;
  break_end?: string;
  status: 'pending' | 'acknowledged' | 'excused' | 'warned';
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  hr_notified: boolean;
  hr_notified_at?: string;
  manager_notified: boolean;
  manager_notified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useReviewBreakViolation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      violationId,
      status,
      reviewerId,
      reviewerName,
      reviewNotes,
    }: {
      violationId: string;
      status: 'acknowledged' | 'excused' | 'warned';
      reviewerId: string;
      reviewerName: string;
      reviewNotes?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('break_violations')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_by_name: reviewerName,
          reviewed_at: now,
          review_notes: reviewNotes || null,
        })
        .eq('id', violationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useReviewBreakViolation] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useReviewBreakViolation] Reviewed violation:', violationId, 'Status:', status);
      return data as BreakViolation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['break-violations', organizationId] });
    },
  });
}

// ============================================
// BREAK SETTINGS MANAGEMENT
// ============================================

export interface BreakSettings {
  id: string;
  organization_id: string;
  facility_id?: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  paid_break_durations: number[];
  max_paid_breaks_per_shift: number;
  paid_break_auto_deduct: boolean;
  unpaid_break_durations: number[];
  min_unpaid_break_minutes: number;
  max_unpaid_break_minutes: number;
  unpaid_break_buffer_minutes: number;
  early_return_grace_minutes: number;
  enforce_minimum_break: boolean;
  enforce_maximum_break: boolean;
  break_too_short_action: 'block' | 'warn' | 'allow';
  break_too_long_action: 'alert_hr' | 'warn' | 'allow';
  break_too_long_threshold_minutes: number;
  required_break_after_hours: number;
  auto_deduct_unpaid_break: boolean;
  auto_deduct_duration_minutes: number;
  applicable_departments: string[];
  applicable_roles: string[];
  created_by?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export function useBreakSettings(facilityId?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['break-settings', organizationId, facilityId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('break_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_default', { ascending: false })
        .order('name');

      if (facilityId) {
        query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useBreakSettings] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useBreakSettings] Fetched ${data?.length || 0} break settings`);
      return (data || []) as BreakSettings[];
    },
    enabled: !!organizationId,
  });
}

export function useDefaultBreakSettings() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['default-break-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }

      const { data, error } = await supabase
        .from('break_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[useDefaultBreakSettings] Error:', error);
        return null;
      }

      return data as BreakSettings | null;
    },
    enabled: !!organizationId,
  });
}

export function useCreateBreakSettings() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (settings: Omit<BreakSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      // If setting as default, unset other defaults first
      if (settings.is_default) {
        await supabase
          .from('break_settings')
          .update({ is_default: false })
          .eq('organization_id', organizationId)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('break_settings')
        .insert({
          organization_id: organizationId,
          ...settings,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateBreakSettings] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateBreakSettings] Created settings:', data?.id);
      return data as BreakSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['break-settings', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['default-break-settings', organizationId] });
    },
  });
}

export function useUpdateBreakSettings() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      settingsId,
      updates,
    }: {
      settingsId: string;
      updates: Partial<Omit<BreakSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('break_settings')
          .update({ is_default: false })
          .eq('organization_id', organizationId)
          .eq('is_default', true)
          .neq('id', settingsId);
      }

      const { data, error } = await supabase
        .from('break_settings')
        .update(updates)
        .eq('id', settingsId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateBreakSettings] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateBreakSettings] Updated settings:', settingsId);
      return data as BreakSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['break-settings', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['default-break-settings', organizationId] });
    },
  });
}

export function useDeleteBreakSettings() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (settingsId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { error } = await supabase
        .from('break_settings')
        .delete()
        .eq('id', settingsId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteBreakSettings] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteBreakSettings] Deleted settings:', settingsId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['break-settings', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['default-break-settings', organizationId] });
    },
  });
}

// ============================================
// ADMIN: EMPLOYEE TIME MANAGEMENT
// ============================================

export interface EmployeeTimeData {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  position: string;
  entries: TimeEntry[];
  punches: TimePunch[];
}

export interface TimeAuditLog {
  id: string;
  organization_id: string;
  action_type: 'create' | 'update' | 'delete';
  table_name: 'time_entries' | 'time_punches';
  record_id: string;
  employee_id: string;
  employee_name: string;
  performed_by: string;
  performed_by_name: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export function useAdminEmployeesList() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['admin-employees-list', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, department_code, position, status')
        .eq('organization_id', organizationId)
        .order('last_name');

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        console.error('[useAdminEmployeesList] Error:', errorMsg, error);
        throw new Error(errorMsg);
      }

      const employees = (data || []).map(emp => ({
        id: emp.id,
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        employee_code: emp.employee_code || '',
        department: emp.department_code || '',
        position: emp.position || '',
        status: emp.status || 'active',
      }));

      console.log(`[useAdminEmployeesList] Fetched ${employees.length} employees`);
      return employees;
    },
    enabled: !!organizationId,
  });
}

export function useAdminEmployeeTimeEntries(
  employeeId: string | undefined,
  options?: { startDate?: string; endDate?: string; limit?: number }
) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['admin-employee-time-entries', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });

      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAdminEmployeeTimeEntries] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useAdminEmployeeTimeEntries] Fetched ${data?.length || 0} entries`);
      return (data || []) as TimeEntry[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useAdminEmployeeTimePunches(
  employeeId: string | undefined,
  options?: { startDate?: string; endDate?: string; limit?: number }
) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['admin-employee-time-punches', organizationId, employeeId, options],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      let query = supabase
        .from('time_punches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false });

      if (options?.startDate) {
        query = query.gte('timestamp', `${options.startDate}T00:00:00`);
      }
      if (options?.endDate) {
        query = query.lte('timestamp', `${options.endDate}T23:59:59`);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useAdminEmployeeTimePunches] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useAdminEmployeeTimePunches] Fetched ${data?.length || 0} punches`);
      return (data || []) as TimePunch[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useAdminUpdateTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      entryId,
      employeeId,
      updates,
      reason,
      adminId,
      adminName,
    }: {
      entryId: string;
      employeeId: string;
      updates: {
        clock_in?: string;
        clock_out?: string;
        break_minutes?: number;
        paid_break_minutes?: number;
        unpaid_break_minutes?: number;
        total_hours?: number;
        status?: 'active' | 'completed' | 'pending_approval' | 'approved';
        notes?: string;
      };
      reason?: string;
      adminId: string;
      adminName: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: oldEntry, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', entryId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !oldEntry) {
        throw new Error('Entry not found');
      }

      const clockIn = new Date(updates.clock_in || oldEntry.clock_in);
      const clockOut = updates.clock_out 
        ? new Date(updates.clock_out) 
        : (oldEntry.clock_out ? new Date(oldEntry.clock_out) : null);
      
      let totalHours = updates.total_hours ?? oldEntry.total_hours;
      if (clockIn && clockOut && (updates.clock_in || updates.clock_out || updates.break_minutes !== undefined)) {
        const diffMs = clockOut.getTime() - clockIn.getTime();
        const breakMinutes = updates.break_minutes ?? oldEntry.break_minutes ?? 0;
        totalHours = Math.round(((diffMs / (1000 * 60 * 60)) - (breakMinutes / 60)) * 100) / 100;
        totalHours = Math.max(0, totalHours);
      }

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          ...updates,
          total_hours: totalHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useAdminUpdateTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      try {
        await supabase.from('time_audit_logs').insert({
          organization_id: organizationId,
          action_type: 'update',
          table_name: 'time_entries',
          record_id: entryId,
          employee_id: employeeId,
          performed_by: adminId,
          performed_by_name: adminName,
          old_values: oldEntry,
          new_values: data,
          reason: reason || null,
        });
        console.log('[useAdminUpdateTimeEntry] Created audit log');
      } catch (auditError) {
        console.error('[useAdminUpdateTimeEntry] Audit log error:', auditError);
      }

      console.log('[useAdminUpdateTimeEntry] Updated entry:', entryId);
      return data as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-employee-time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-audit-logs', organizationId] });
    },
  });
}

export function useAdminUpdateTimePunch() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      punchId,
      employeeId,
      updates,
      reason,
      adminId,
      adminName,
    }: {
      punchId: string;
      employeeId: string;
      updates: {
        timestamp?: string;
        type?: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
        notes?: string;
        break_type?: 'paid' | 'unpaid';
        scheduled_minutes?: number;
      };
      reason?: string;
      adminId: string;
      adminName: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: oldPunch, error: fetchError } = await supabase
        .from('time_punches')
        .select('*')
        .eq('id', punchId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !oldPunch) {
        throw new Error('Punch not found');
      }

      const { data, error } = await supabase
        .from('time_punches')
        .update(updates)
        .eq('id', punchId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useAdminUpdateTimePunch] Error:', error);
        throw new Error(error.message);
      }

      try {
        await supabase.from('time_audit_logs').insert({
          organization_id: organizationId,
          action_type: 'update',
          table_name: 'time_punches',
          record_id: punchId,
          employee_id: employeeId,
          performed_by: adminId,
          performed_by_name: adminName,
          old_values: oldPunch,
          new_values: data,
          reason: reason || null,
        });
        console.log('[useAdminUpdateTimePunch] Created audit log');
      } catch (auditError) {
        console.error('[useAdminUpdateTimePunch] Audit log error:', auditError);
      }

      console.log('[useAdminUpdateTimePunch] Updated punch:', punchId);
      return data as TimePunch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-employee-time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-audit-logs', organizationId] });
    },
  });
}

export function useAdminDeleteTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      entryId,
      employeeId,
      reason,
      adminId,
      adminName,
    }: {
      entryId: string;
      employeeId: string;
      reason?: string;
      adminId: string;
      adminName: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: oldEntry, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', entryId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) {
        console.error('[useAdminDeleteTimeEntry] Fetch error:', fetchError);
      }

      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useAdminDeleteTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      try {
        await supabase.from('time_audit_logs').insert({
          organization_id: organizationId,
          action_type: 'delete',
          table_name: 'time_entries',
          record_id: entryId,
          employee_id: employeeId,
          performed_by: adminId,
          performed_by_name: adminName,
          old_values: oldEntry || null,
          new_values: null,
          reason: reason || null,
        });
        console.log('[useAdminDeleteTimeEntry] Created audit log');
      } catch (auditError) {
        console.error('[useAdminDeleteTimeEntry] Audit log error:', auditError);
      }

      console.log('[useAdminDeleteTimeEntry] Deleted entry:', entryId);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-employee-time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['active-time-entry', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-audit-logs', organizationId] });
    },
  });
}

export function useAdminDeleteTimePunch() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      punchId,
      employeeId,
      reason,
      adminId,
      adminName,
    }: {
      punchId: string;
      employeeId: string;
      reason?: string;
      adminId: string;
      adminName: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: oldPunch, error: fetchError } = await supabase
        .from('time_punches')
        .select('*')
        .eq('id', punchId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) {
        console.error('[useAdminDeleteTimePunch] Fetch error:', fetchError);
      }

      const { error } = await supabase
        .from('time_punches')
        .delete()
        .eq('id', punchId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useAdminDeleteTimePunch] Error:', error);
        throw new Error(error.message);
      }

      try {
        await supabase.from('time_audit_logs').insert({
          organization_id: organizationId,
          action_type: 'delete',
          table_name: 'time_punches',
          record_id: punchId,
          employee_id: employeeId,
          performed_by: adminId,
          performed_by_name: adminName,
          old_values: oldPunch || null,
          new_values: null,
          reason: reason || null,
        });
        console.log('[useAdminDeleteTimePunch] Created audit log');
      } catch (auditError) {
        console.error('[useAdminDeleteTimePunch] Audit log error:', auditError);
      }

      console.log('[useAdminDeleteTimePunch] Deleted punch:', punchId);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-employee-time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-punches', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['is-on-break', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-audit-logs', organizationId] });
    },
  });
}

export function useTimeAuditLogs(
  options?: { employeeId?: string; startDate?: string; endDate?: string; limit?: number }
) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['time-audit-logs', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('time_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }
      if (options?.startDate) {
        query = query.gte('created_at', `${options.startDate}T00:00:00`);
      }
      if (options?.endDate) {
        query = query.lte('created_at', `${options.endDate}T23:59:59`);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        console.error('[useTimeAuditLogs] Error:', errorMsg, error);
        return [];
      }

      console.log(`[useTimeAuditLogs] Fetched ${data?.length || 0} audit logs`);
      return (data || []) as TimeAuditLog[];
    },
    enabled: !!organizationId,
  });
}

export function useAdminCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      employeeId,
      date,
      clockIn,
      clockOut,
      breakMinutes,
      paidBreakMinutes,
      unpaidBreakMinutes,
      notes,
      adminId,
      adminName,
      reason,
    }: {
      employeeId: string;
      date: string;
      clockIn: string;
      clockOut?: string;
      breakMinutes?: number;
      paidBreakMinutes?: number;
      unpaidBreakMinutes?: number;
      notes?: string;
      adminId: string;
      adminName: string;
      reason?: string;
    }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      let totalHours = 0;
      if (clockIn && clockOut) {
        const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
        const breaks = breakMinutes || 0;
        totalHours = Math.round(((diffMs / (1000 * 60 * 60)) - (breaks / 60)) * 100) / 100;
        totalHours = Math.max(0, totalHours);
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          organization_id: organizationId,
          employee_id: employeeId,
          date,
          clock_in: clockIn,
          clock_out: clockOut || null,
          break_minutes: breakMinutes || 0,
          paid_break_minutes: paidBreakMinutes || 0,
          unpaid_break_minutes: unpaidBreakMinutes || 0,
          total_hours: totalHours,
          status: clockOut ? 'completed' : 'active',
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useAdminCreateTimeEntry] Error:', error);
        throw new Error(error.message);
      }

      try {
        await supabase.from('time_audit_logs').insert({
          organization_id: organizationId,
          action_type: 'create',
          table_name: 'time_entries',
          record_id: data.id,
          employee_id: employeeId,
          performed_by: adminId,
          performed_by_name: adminName,
          old_values: null,
          new_values: data,
          reason: reason || 'Admin created time entry',
        });
        console.log('[useAdminCreateTimeEntry] Created audit log');
      } catch (auditError) {
        console.error('[useAdminCreateTimeEntry] Audit log error:', auditError);
      }

      console.log('[useAdminCreateTimeEntry] Created entry:', data.id);
      return data as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-employee-time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', organizationId, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-audit-logs', organizationId] });
    },
  });
}
