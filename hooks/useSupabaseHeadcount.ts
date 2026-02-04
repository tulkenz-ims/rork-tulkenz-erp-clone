import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type PresenceStatus = 'clocked_in' | 'on_break' | 'clocked_out' | 'not_arrived' | 'absent';
export type AccountabilityStatus = 'accounted' | 'unaccounted' | 'absent_known';

export interface EmployeePresence {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentCode: string | null;
  departmentName: string;
  facilityId: string | null;
  employeeType: 'hourly' | 'salaried';
  position: string;
  managerId: string | null;
  managerName: string | null;
  presenceStatus: PresenceStatus;
  lastClockIn: string | null;
  lastClockOut: string | null;
  lastBreakStart: string | null;
  lastBreakEnd: string | null;
  currentShiftStart: string | null;
  currentShiftEnd: string | null;
  hoursToday: number;
  isOnsite: boolean;
  accountabilityStatus: AccountabilityStatus;
  absenceReason: string | null;
}

export interface DepartmentHeadcount {
  departmentCode: string;
  departmentName: string;
  managerId: string | null;
  managerName: string;
  totalEmployees: number;
  clockedIn: number;
  onBreak: number;
  clockedOut: number;
  notArrived: number;
  absentKnown: number;
  accountedFor: number;
  unaccounted: number;
  complianceRate: number;
}

export interface ShiftHeadcount {
  shiftName: string;
  startTime: string;
  endTime: string;
  totalScheduled: number;
  clockedIn: number;
  onBreak: number;
  notArrived: number;
  absent: number;
  complianceRate: number;
}

export interface HeadcountSummary {
  facilityId: string | null;
  facilityName: string;
  totalEmployees: number;
  activeEmployees: number;
  onsite: number;
  clockedIn: number;
  onBreak: number;
  clockedOut: number;
  notArrived: number;
  expectedToday: number;
  absentKnown: number;
  complianceRate: number;
  lastUpdated: string;
}

export interface HeadcountTrend {
  date: string;
  totalEmployees: number;
  clockedIn: number;
  absent: number;
  averageHours: number;
  complianceRate: number;
}

export interface FacilityHeadcount {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  totalEmployees: number;
  clockedIn: number;
  onBreak: number;
  notArrived: number;
  complianceRate: number;
}

export function useHeadcountSummary(options?: { facilityId?: string }) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['headcount-summary', organizationId, today, options?.facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useHeadcountSummary] No organization ID');
        return null;
      }

      let employeeQuery = supabase
        .from('employees')
        .select('id, first_name, last_name, status, department_code, facility_id, position, manager_id, hourly_rate')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        employeeQuery = employeeQuery.eq('facility_id', options.facilityId);
      }

      const { data: employees, error: empError } = await employeeQuery;

      if (empError) {
        console.error('[useHeadcountSummary] Error fetching employees:', empError);
        throw new Error(empError.message);
      }

      const activeEmployees = employees?.filter(e => e.status === 'active') || [];
      const onLeaveEmployees = employees?.filter(e => e.status === 'on_leave') || [];
      const employeeIds = activeEmployees.map(e => e.id);

      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out, total_hours, status, break_minutes')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (timeError) {
        console.error('[useHeadcountSummary] Error fetching time entries:', timeError);
      }

      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('id, employee_id, start_time, end_time, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (shiftError) {
        console.error('[useHeadcountSummary] Error fetching shifts:', shiftError);
      }

      const { data: timeOffRequests, error: toError } = await supabase
        .from('time_off_requests')
        .select('id, employee_id, status, type')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (toError) {
        console.error('[useHeadcountSummary] Error fetching time off:', toError);
      }

      const approvedTimeOffIds = new Set(timeOffRequests?.map(to => to.employee_id) || []);
      const clockedInEntries = timeEntries?.filter(te => te.clock_in && !te.clock_out) || [];
      const clockedInIds = new Set(clockedInEntries.map(te => te.employee_id));
      const clockedOutEntries = timeEntries?.filter(te => te.clock_in && te.clock_out) || [];
      const clockedOutIds = new Set(clockedOutEntries.map(te => te.employee_id));

      const scheduledEmployeeIds = new Set(
        shifts?.filter(s => s.status === 'scheduled' || s.status === 'confirmed').map(s => s.employee_id) || []
      );

      let clockedIn = 0;
      let onBreak = 0;
      let clockedOut = 0;
      let notArrived = 0;
      let absentKnown = onLeaveEmployees.length + approvedTimeOffIds.size;

      activeEmployees.forEach(emp => {
        if (approvedTimeOffIds.has(emp.id)) {
          return;
        }
        if (clockedInIds.has(emp.id)) {
          clockedIn++;
        } else if (clockedOutIds.has(emp.id)) {
          clockedOut++;
        } else if (scheduledEmployeeIds.has(emp.id)) {
          notArrived++;
        }
      });

      const onsite = clockedIn + onBreak;
      const expectedToday = scheduledEmployeeIds.size;
      const complianceRate = expectedToday > 0 
        ? Math.round(((clockedIn + clockedOut) / expectedToday) * 100) 
        : 100;

      const summary: HeadcountSummary = {
        facilityId: options?.facilityId || null,
        facilityName: options?.facilityId ? 'Selected Facility' : 'All Facilities',
        totalEmployees: employees?.length || 0,
        activeEmployees: activeEmployees.length,
        onsite,
        clockedIn,
        onBreak,
        clockedOut,
        notArrived,
        expectedToday,
        absentKnown,
        complianceRate,
        lastUpdated: new Date().toISOString(),
      };

      console.log('[useHeadcountSummary] Summary:', summary);
      return summary;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}

export function useEmployeePresence(options?: { facilityId?: string; departmentCode?: string }) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['employee-presence', organizationId, today, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEmployeePresence] No organization ID');
        return [];
      }

      let employeeQuery = supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name, status, department_code, facility_id, position, manager_id, hourly_rate')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (options?.facilityId) {
        employeeQuery = employeeQuery.eq('facility_id', options.facilityId);
      }
      if (options?.departmentCode) {
        employeeQuery = employeeQuery.eq('department_code', options.departmentCode);
      }

      const { data: employees, error: empError } = await employeeQuery;

      if (empError) {
        console.error('[useEmployeePresence] Error:', empError);
        throw new Error(empError.message);
      }

      const employeeIds = employees?.map(e => e.id) || [];

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out, total_hours, status, break_minutes')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: timePunches } = await supabase
        .from('time_punches')
        .select('id, employee_id, type, timestamp')
        .eq('organization_id', organizationId)
        .gte('timestamp', `${today}T00:00:00`)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none'])
        .order('timestamp', { ascending: false });

      const { data: shifts } = await supabase
        .from('shifts')
        .select('id, employee_id, start_time, end_time, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: timeOffRequests } = await supabase
        .from('time_off_requests')
        .select('id, employee_id, status, type')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: managers } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organizationId);

      const managerMap = new Map(managers?.map(m => [m.id, `${m.first_name} ${m.last_name}`]) || []);
      const timeEntryMap = new Map(timeEntries?.map(te => [te.employee_id, te]) || []);
      const shiftMap = new Map(shifts?.map(s => [s.employee_id, s]) || []);
      const timeOffMap = new Map(timeOffRequests?.map(to => [to.employee_id, to]) || []);

      const punchMap = new Map<string, { lastClockIn?: string; lastClockOut?: string; lastBreakStart?: string; lastBreakEnd?: string }>();
      timePunches?.forEach(punch => {
        const existing = punchMap.get(punch.employee_id) || {};
        if (punch.type === 'clock_in' && !existing.lastClockIn) {
          existing.lastClockIn = punch.timestamp;
        } else if (punch.type === 'clock_out' && !existing.lastClockOut) {
          existing.lastClockOut = punch.timestamp;
        } else if (punch.type === 'break_start' && !existing.lastBreakStart) {
          existing.lastBreakStart = punch.timestamp;
        } else if (punch.type === 'break_end' && !existing.lastBreakEnd) {
          existing.lastBreakEnd = punch.timestamp;
        }
        punchMap.set(punch.employee_id, existing);
      });

      const presenceList: EmployeePresence[] = (employees || []).map(emp => {
        const timeEntry = timeEntryMap.get(emp.id);
        const shift = shiftMap.get(emp.id);
        const timeOff = timeOffMap.get(emp.id);
        const punches = punchMap.get(emp.id) || {};

        let presenceStatus: PresenceStatus = 'not_arrived';
        let accountabilityStatus: AccountabilityStatus = 'unaccounted';
        let isOnsite = false;

        if (timeOff) {
          presenceStatus = 'absent';
          accountabilityStatus = 'absent_known';
        } else if (timeEntry) {
          if (timeEntry.clock_in && !timeEntry.clock_out) {
            if (punches.lastBreakStart && (!punches.lastBreakEnd || punches.lastBreakStart > punches.lastBreakEnd)) {
              presenceStatus = 'on_break';
            } else {
              presenceStatus = 'clocked_in';
            }
            isOnsite = true;
            accountabilityStatus = 'accounted';
          } else if (timeEntry.clock_in && timeEntry.clock_out) {
            presenceStatus = 'clocked_out';
            accountabilityStatus = 'accounted';
          }
        }

        return {
          employeeId: emp.id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          departmentCode: emp.department_code,
          departmentName: emp.department_code || 'Unassigned',
          facilityId: emp.facility_id,
          employeeType: emp.hourly_rate ? 'hourly' : 'salaried',
          position: emp.position || 'Employee',
          managerId: emp.manager_id,
          managerName: emp.manager_id ? managerMap.get(emp.manager_id) || null : null,
          presenceStatus,
          lastClockIn: punches.lastClockIn || timeEntry?.clock_in || null,
          lastClockOut: punches.lastClockOut || timeEntry?.clock_out || null,
          lastBreakStart: punches.lastBreakStart || null,
          lastBreakEnd: punches.lastBreakEnd || null,
          currentShiftStart: shift?.start_time || null,
          currentShiftEnd: shift?.end_time || null,
          hoursToday: timeEntry?.total_hours || 0,
          isOnsite,
          accountabilityStatus,
          absenceReason: timeOff?.type || null,
        };
      });

      console.log(`[useEmployeePresence] Fetched presence for ${presenceList.length} employees`);
      return presenceList;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}

export function useDepartmentHeadcount(options?: { facilityId?: string }) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['department-headcount', organizationId, today, options?.facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useDepartmentHeadcount] No organization ID');
        return [];
      }

      let employeeQuery = supabase
        .from('employees')
        .select('id, first_name, last_name, status, department_code, facility_id, manager_id')
        .eq('organization_id', organizationId)
        .not('department_code', 'is', null);

      if (options?.facilityId) {
        employeeQuery = employeeQuery.eq('facility_id', options.facilityId);
      }

      const { data: employees, error: empError } = await employeeQuery;

      if (empError) {
        console.error('[useDepartmentHeadcount] Error:', empError);
        throw new Error(empError.message);
      }

      const activeEmployees = employees?.filter(e => e.status === 'active') || [];
      const employeeIds = activeEmployees.map(e => e.id);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: shifts } = await supabase
        .from('shifts')
        .select('employee_id, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('status', ['scheduled', 'confirmed'])
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: timeOffRequests } = await supabase
        .from('time_off_requests')
        .select('employee_id')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: managers } = await supabase
        .from('employees')
        .select('id, first_name, last_name, department_code')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      const timeEntryMap = new Map<string, { clockIn: boolean; clockOut: boolean }>();
      timeEntries?.forEach(te => {
        timeEntryMap.set(te.employee_id, {
          clockIn: !!te.clock_in && !te.clock_out,
          clockOut: !!te.clock_in && !!te.clock_out,
        });
      });

      const scheduledIds = new Set(shifts?.map(s => s.employee_id) || []);
      const timeOffIds = new Set(timeOffRequests?.map(to => to.employee_id) || []);
      const onLeaveIds = new Set(employees?.filter(e => e.status === 'on_leave').map(e => e.id) || []);

      const deptMap = new Map<string, {
        employees: typeof activeEmployees;
        managerId: string | null;
        managerName: string;
      }>();

      activeEmployees.forEach(emp => {
        if (!emp.department_code) return;
        
        const existing = deptMap.get(emp.department_code) || {
          employees: [],
          managerId: null,
          managerName: 'Unassigned',
        };
        existing.employees.push(emp);
        deptMap.set(emp.department_code, existing);
      });

      managers?.forEach(mgr => {
        if (mgr.department_code && deptMap.has(mgr.department_code)) {
          const dept = deptMap.get(mgr.department_code)!;
          if (!dept.managerId) {
            dept.managerId = mgr.id;
            dept.managerName = `${mgr.first_name} ${mgr.last_name}`;
          }
        }
      });

      const headcountList: DepartmentHeadcount[] = [];

      deptMap.forEach((data, deptCode) => {
        const { employees: deptEmployees, managerId, managerName } = data;
        
        let clockedIn = 0;
        let onBreak = 0;
        let clockedOut = 0;
        let notArrived = 0;
        let absentKnown = 0;

        deptEmployees.forEach(emp => {
          if (timeOffIds.has(emp.id) || onLeaveIds.has(emp.id)) {
            absentKnown++;
            return;
          }

          const timeEntry = timeEntryMap.get(emp.id);
          if (timeEntry?.clockIn) {
            clockedIn++;
          } else if (timeEntry?.clockOut) {
            clockedOut++;
          } else if (scheduledIds.has(emp.id)) {
            notArrived++;
          }
        });

        const accountedFor = clockedIn + clockedOut + absentKnown;
        const unaccounted = deptEmployees.length - accountedFor;
        const expectedCount = scheduledIds.size > 0 
          ? deptEmployees.filter(e => scheduledIds.has(e.id)).length 
          : deptEmployees.length - absentKnown;
        const complianceRate = expectedCount > 0 
          ? Math.round(((clockedIn + clockedOut) / expectedCount) * 100) 
          : 100;

        headcountList.push({
          departmentCode: deptCode,
          departmentName: deptCode,
          managerId,
          managerName,
          totalEmployees: deptEmployees.length,
          clockedIn,
          onBreak,
          clockedOut,
          notArrived,
          absentKnown,
          accountedFor,
          unaccounted: Math.max(0, unaccounted),
          complianceRate,
        });
      });

      console.log(`[useDepartmentHeadcount] Computed headcount for ${headcountList.length} departments`);
      return headcountList.sort((a, b) => b.totalEmployees - a.totalEmployees);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

export function useShiftHeadcount(options?: { facilityId?: string }) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['shift-headcount', organizationId, today, options?.facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useShiftHeadcount] No organization ID');
        return [];
      }

      let shiftQuery = supabase
        .from('shifts')
        .select('id, employee_id, start_time, end_time, status, facility_id')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('status', ['scheduled', 'confirmed', 'completed']);

      if (options?.facilityId) {
        shiftQuery = shiftQuery.eq('facility_id', options.facilityId);
      }

      const { data: shifts, error: shiftError } = await shiftQuery;

      if (shiftError) {
        console.error('[useShiftHeadcount] Error:', shiftError);
        throw new Error(shiftError.message);
      }

      const employeeIds = [...new Set(shifts?.map(s => s.employee_id) || [])];

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: timeOffRequests } = await supabase
        .from('time_off_requests')
        .select('employee_id')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const timeEntryMap = new Map<string, { clockIn: boolean; clockOut: boolean }>();
      timeEntries?.forEach(te => {
        timeEntryMap.set(te.employee_id, {
          clockIn: !!te.clock_in && !te.clock_out,
          clockOut: !!te.clock_in && !!te.clock_out,
        });
      });

      const timeOffIds = new Set(timeOffRequests?.map(to => to.employee_id) || []);

      const shiftGroups = new Map<string, typeof shifts>();
      shifts?.forEach(shift => {
        const key = `${shift.start_time}-${shift.end_time}`;
        const existing = shiftGroups.get(key) || [];
        existing.push(shift);
        shiftGroups.set(key, existing);
      });

      const headcountList: ShiftHeadcount[] = [];

      shiftGroups.forEach((shiftList, key) => {
        const [startTime, endTime] = key.split('-');
        
        let clockedIn = 0;
        let onBreak = 0;
        let notArrived = 0;
        let absent = 0;

        shiftList.forEach(shift => {
          if (timeOffIds.has(shift.employee_id)) {
            absent++;
            return;
          }

          const timeEntry = timeEntryMap.get(shift.employee_id);
          if (timeEntry?.clockIn) {
            clockedIn++;
          } else if (timeEntry?.clockOut) {
            clockedIn++;
          } else {
            notArrived++;
          }
        });

        const totalScheduled = shiftList.length;
        const complianceRate = totalScheduled > 0 
          ? Math.round((clockedIn / (totalScheduled - absent)) * 100) 
          : 100;

        const shiftHour = parseInt(startTime.split(':')[0]);
        let shiftName = 'Day Shift';
        if (shiftHour >= 14 && shiftHour < 22) {
          shiftName = 'Swing Shift';
        } else if (shiftHour >= 22 || shiftHour < 6) {
          shiftName = 'Night Shift';
        }

        headcountList.push({
          shiftName,
          startTime,
          endTime,
          totalScheduled,
          clockedIn,
          onBreak,
          notArrived,
          absent,
          complianceRate: isNaN(complianceRate) ? 100 : complianceRate,
        });
      });

      console.log(`[useShiftHeadcount] Computed headcount for ${headcountList.length} shifts`);
      return headcountList.sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

export function useHeadcountTrends(options?: { days?: number; facilityId?: string }) {
  const { organizationId } = useOrganization();
  const days = options?.days || 30;

  return useQuery({
    queryKey: ['headcount-trends', organizationId, days, options?.facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useHeadcountTrends] No organization ID');
        return [];
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      let employeeQuery = supabase
        .from('employees')
        .select('id, status, facility_id')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        employeeQuery = employeeQuery.eq('facility_id', options.facilityId);
      }

      const { data: employees, error: empError } = await employeeQuery;

      if (empError) {
        console.error('[useHeadcountTrends] Error fetching employees:', empError);
        throw new Error(empError.message);
      }

      const employeeIds = employees?.filter(e => e.status === 'active').map(e => e.id) || [];
      const totalEmployees = employeeIds.length;

      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('id, employee_id, date, total_hours, status')
        .eq('organization_id', organizationId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (timeError) {
        console.error('[useHeadcountTrends] Error fetching time entries:', timeError);
      }

      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('id, employee_id, date, status')
        .eq('organization_id', organizationId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .in('status', ['scheduled', 'confirmed', 'completed'])
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      if (shiftError) {
        console.error('[useHeadcountTrends] Error fetching shifts:', shiftError);
      }

      const dailyData = new Map<string, {
        clockedIn: Set<string>;
        totalHours: number;
        scheduled: Set<string>;
      }>();

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyData.set(dateStr, {
          clockedIn: new Set(),
          totalHours: 0,
          scheduled: new Set(),
        });
      }

      timeEntries?.forEach(te => {
        const data = dailyData.get(te.date);
        if (data) {
          data.clockedIn.add(te.employee_id);
          data.totalHours += te.total_hours || 0;
        }
      });

      shifts?.forEach(shift => {
        const data = dailyData.get(shift.date);
        if (data) {
          data.scheduled.add(shift.employee_id);
        }
      });

      const trends: HeadcountTrend[] = [];

      dailyData.forEach((data, date) => {
        const clockedIn = data.clockedIn.size;
        const scheduled = data.scheduled.size;
        const absent = Math.max(0, scheduled - clockedIn);
        const averageHours = clockedIn > 0 ? Math.round((data.totalHours / clockedIn) * 10) / 10 : 0;
        const complianceRate = scheduled > 0 ? Math.round((clockedIn / scheduled) * 100) : 100;

        trends.push({
          date,
          totalEmployees,
          clockedIn,
          absent,
          averageHours,
          complianceRate,
        });
      });

      console.log(`[useHeadcountTrends] Computed trends for ${trends.length} days`);
      return trends.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFacilityHeadcount() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['facility-headcount', organizationId, today],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useFacilityHeadcount] No organization ID');
        return [];
      }

      const { data: facilities, error: facError } = await supabase
        .from('facilities')
        .select('id, name, facility_code')
        .eq('organization_id', organizationId)
        .eq('active', true);

      if (facError) {
        console.error('[useFacilityHeadcount] Error fetching facilities:', facError);
        throw new Error(facError.message);
      }

      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, facility_id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('facility_id', 'is', null);

      if (empError) {
        console.error('[useFacilityHeadcount] Error fetching employees:', empError);
        throw new Error(empError.message);
      }

      const facilityEmployeeMap = new Map<string, string[]>();
      employees?.forEach(emp => {
        if (emp.facility_id) {
          const existing = facilityEmployeeMap.get(emp.facility_id) || [];
          existing.push(emp.id);
          facilityEmployeeMap.set(emp.facility_id, existing);
        }
      });

      const allEmployeeIds = employees?.map(e => e.id) || [];

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      const { data: shifts } = await supabase
        .from('shifts')
        .select('employee_id, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('status', ['scheduled', 'confirmed'])
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['none']);

      const timeEntryMap = new Map<string, { clockIn: boolean }>();
      timeEntries?.forEach(te => {
        timeEntryMap.set(te.employee_id, {
          clockIn: !!te.clock_in && !te.clock_out,
        });
      });

      const scheduledIds = new Set(shifts?.map(s => s.employee_id) || []);

      const headcountList: FacilityHeadcount[] = [];

      facilities?.forEach(facility => {
        const empIds = facilityEmployeeMap.get(facility.id) || [];
        const totalEmployees = empIds.length;

        let clockedIn = 0;
        let onBreak = 0;
        let notArrived = 0;

        empIds.forEach(empId => {
          const timeEntry = timeEntryMap.get(empId);
          if (timeEntry?.clockIn) {
            clockedIn++;
          } else if (scheduledIds.has(empId)) {
            notArrived++;
          }
        });

        const expectedCount = empIds.filter(id => scheduledIds.has(id)).length;
        const complianceRate = expectedCount > 0 
          ? Math.round((clockedIn / expectedCount) * 100) 
          : 100;

        headcountList.push({
          facilityId: facility.id,
          facilityName: facility.name,
          facilityCode: facility.facility_code,
          totalEmployees,
          clockedIn,
          onBreak,
          notArrived,
          complianceRate,
        });
      });

      console.log(`[useFacilityHeadcount] Computed headcount for ${headcountList.length} facilities`);
      return headcountList.sort((a, b) => b.totalEmployees - a.totalEmployees);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

export function useHeadcountStats() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['headcount-stats', organizationId, today],
    queryFn: async () => {
      if (!organizationId) {
        return {
          onsite: 0,
          clockedIn: 0,
          onBreak: 0,
          expected: 0,
          clockedOut: 0,
          absentKnown: 0,
        };
      }

      const { data: employees } = await supabase
        .from('employees')
        .select('id, status')
        .eq('organization_id', organizationId);

      const activeEmployees = employees?.filter(e => e.status === 'active') || [];
      const onLeaveCount = employees?.filter(e => e.status === 'on_leave').length || 0;
      const employeeIds = activeEmployees.map(e => e.id);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('employee_id, clock_in, clock_out')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: shifts } = await supabase
        .from('shifts')
        .select('employee_id, status')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .in('status', ['scheduled', 'confirmed'])
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const { data: timeOffRequests } = await supabase
        .from('time_off_requests')
        .select('employee_id')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['none']);

      const clockedInIds = new Set(
        timeEntries?.filter(te => te.clock_in && !te.clock_out).map(te => te.employee_id) || []
      );
      const clockedOutIds = new Set(
        timeEntries?.filter(te => te.clock_in && te.clock_out).map(te => te.employee_id) || []
      );
      const scheduledIds = new Set(shifts?.map(s => s.employee_id) || []);
      const timeOffIds = new Set(timeOffRequests?.map(to => to.employee_id) || []);

      const clockedIn = clockedInIds.size;
      const onBreak = 0;
      const clockedOut = clockedOutIds.size;
      const absentKnown = onLeaveCount + timeOffIds.size;

      let expected = 0;
      scheduledIds.forEach(id => {
        if (!clockedInIds.has(id) && !clockedOutIds.has(id) && !timeOffIds.has(id)) {
          expected++;
        }
      });

      const onsite = clockedIn + onBreak;

      console.log('[useHeadcountStats] Stats:', { onsite, clockedIn, onBreak, expected, clockedOut, absentKnown });
      return { onsite, clockedIn, onBreak, expected, clockedOut, absentKnown };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  });
}
