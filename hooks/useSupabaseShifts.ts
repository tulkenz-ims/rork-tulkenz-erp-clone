import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

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

export interface CreateShiftInput {
  employee_id: string;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  facility_id?: string;
  position?: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
}

export interface UpdateShiftInput {
  employee_id?: string;
  employee_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  facility_id?: string | null;
  position?: string | null;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
  notes?: string | null;
}

export function useShifts(options?: { 
  startDate?: string; 
  endDate?: string; 
  employeeId?: string;
  facilityId?: string;
  status?: Shift['status'] | Shift['status'][];
}) {
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

      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
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

export function useShift(shiftId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shift', organizationId, shiftId],
    queryFn: async () => {
      if (!organizationId || !shiftId) {
        return null;
      }

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', shiftId)
        .maybeSingle();

      if (error) {
        console.error('[useShift] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useShift] Fetched shift ${shiftId}:`, data ? 'found' : 'not found');
      return data as Shift | null;
    },
    enabled: !!organizationId && !!shiftId,
  });
}

export function useEmployeeShifts(employeeId: string | undefined, options?: { 
  startDate?: string; 
  endDate?: string;
  includeCompleted?: boolean;
}) {
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
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }

      if (!options?.includeCompleted) {
        query = query.in('status', ['scheduled', 'confirmed']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEmployeeShifts] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useEmployeeShifts] Fetched ${data?.length || 0} shifts for employee ${employeeId}`);
      return (data || []) as Shift[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useUpcomingShifts(employeeId: string | undefined, days: number = 7) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const endDate = futureDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['upcoming-shifts', organizationId, employeeId, today, endDate],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return [];
      }

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .gte('date', today)
        .lte('date', endDate)
        .in('status', ['scheduled', 'confirmed'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[useUpcomingShifts] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useUpcomingShifts] Fetched ${data?.length || 0} upcoming shifts`);
      return (data || []) as Shift[];
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useTodayShifts(facilityId?: string) {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-shifts', organizationId, today, facilityId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today)
        .order('start_time', { ascending: true });

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTodayShifts] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useTodayShifts] Fetched ${data?.length || 0} shifts for today`);
      return (data || []) as Shift[];
    },
    enabled: !!organizationId,
    refetchInterval: 60000,
  });
}

export function useWeeklySchedule(startDate: string, facilityId?: string) {
  const { organizationId } = useOrganization();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const endDateStr = endDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['weekly-schedule', organizationId, startDate, endDateStr, facilityId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      let query = supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', startDate)
        .lte('date', endDateStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useWeeklySchedule] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useWeeklySchedule] Fetched ${data?.length || 0} shifts for week starting ${startDate}`);
      return (data || []) as Shift[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateShiftInput) => {
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
        facility_id: input.facility_id || null,
        position: input.position || null,
        status: input.status || 'scheduled',
        notes: input.notes || null,
      });

      if (error) {
        console.error('[useCreateShift] Error:', error);
        throw error;
      }

      console.log('[useCreateShift] Shift created:', data?.id);
      return data as Shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ shiftId, updates }: { shiftId: string; updates: UpdateShiftInput }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('shifts', shiftId, updates, organizationId);

      if (error) {
        console.error('[useUpdateShift] Error:', error);
        throw error;
      }

      console.log('[useUpdateShift] Shift updated:', shiftId);
      return data as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { success, error } = await deleteRecord('shifts', shiftId, organizationId);

      if (error) {
        console.error('[useDeleteShift] Error:', error);
        throw error;
      }

      console.log('[useDeleteShift] Shift deleted:', shiftId);
      return { success, shiftId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useConfirmShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('shifts', shiftId, { status: 'confirmed' }, organizationId);

      if (error) {
        console.error('[useConfirmShift] Error:', error);
        throw error;
      }

      console.log('[useConfirmShift] Shift confirmed:', shiftId);
      return data as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useCompleteShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ shiftId, notes }: { shiftId: string; notes?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const updates: UpdateShiftInput = { status: 'completed' };
      if (notes) {
        updates.notes = notes;
      }

      const { data, error } = await updateRecord('shifts', shiftId, updates, organizationId);

      if (error) {
        console.error('[useCompleteShift] Error:', error);
        throw error;
      }

      console.log('[useCompleteShift] Shift completed:', shiftId);
      return data as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ shiftId, notes }: { shiftId: string; notes?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const updates: UpdateShiftInput = { status: 'cancelled' };
      if (notes) {
        updates.notes = notes;
      }

      const { data, error } = await updateRecord('shifts', shiftId, updates, organizationId);

      if (error) {
        console.error('[useCancelShift] Error:', error);
        throw error;
      }

      console.log('[useCancelShift] Shift cancelled:', shiftId);
      return data as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shift', organizationId, data?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useBulkCreateShifts() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (shifts: CreateShiftInput[]) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const records = shifts.map(shift => ({
        organization_id: organizationId,
        employee_id: shift.employee_id,
        employee_name: shift.employee_name,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        facility_id: shift.facility_id || null,
        position: shift.position || null,
        status: shift.status || 'scheduled',
        notes: shift.notes || null,
      }));

      const { data, error } = await supabase
        .from('shifts')
        .insert(records)
        .select();

      if (error) {
        console.error('[useBulkCreateShifts] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useBulkCreateShifts] Created ${data?.length || 0} shifts`);
      return (data || []) as Shift[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['today-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-shifts'] });
    },
  });
}

export function useShiftStats(options?: { startDate?: string; endDate?: string; facilityId?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shift-stats', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }

      let query = supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId);

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
        console.error('[useShiftStats] Error:', error);
        throw new Error(error.message);
      }

      const shifts = (data || []) as Shift[];

      const totalShifts = shifts.length;
      const scheduledShifts = shifts.filter(s => s.status === 'scheduled').length;
      const confirmedShifts = shifts.filter(s => s.status === 'confirmed').length;
      const completedShifts = shifts.filter(s => s.status === 'completed').length;
      const cancelledShifts = shifts.filter(s => s.status === 'cancelled').length;
      const missedShifts = shifts.filter(s => s.status === 'missed').length;

      const calculateHours = (startTime: string, endTime: string): number => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        let hours = endH - startH + (endM - startM) / 60;
        if (hours < 0) hours += 24;
        return hours;
      };

      const totalScheduledHours = shifts
        .filter(s => s.status !== 'cancelled')
        .reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);

      const completedHours = shifts
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);

      const uniqueEmployees = new Set(shifts.map(s => s.employee_id)).size;

      const shiftsByEmployee = shifts.reduce((acc, s) => {
        acc[s.employee_id] = (acc[s.employee_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stats = {
        totalShifts,
        scheduledShifts,
        confirmedShifts,
        completedShifts,
        cancelledShifts,
        missedShifts,
        totalScheduledHours: Math.round(totalScheduledHours * 10) / 10,
        completedHours: Math.round(completedHours * 10) / 10,
        uniqueEmployees,
        avgShiftsPerEmployee: uniqueEmployees > 0 ? Math.round((totalShifts / uniqueEmployees) * 10) / 10 : 0,
        completionRate: totalShifts > 0 ? Math.round((completedShifts / (totalShifts - cancelledShifts)) * 1000) / 10 : 0,
        shiftsByEmployee,
      };

      console.log('[useShiftStats] Calculated stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
  });
}
