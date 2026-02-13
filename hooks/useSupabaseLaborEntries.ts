import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export interface LaborEntry {
  id: string;
  organization_id: string;
  work_order_id: string | null;
  work_order_number: string | null;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
  regular_rate: number | null;
  total_labor_cost: number;
  work_type: string;
  task_description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Fetch labor entries for a specific work order
// ============================================================================
export function useLaborEntriesForWorkOrder(workOrderId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['labor_entries', organizationId, workOrderId],
    queryFn: async () => {
      if (!organizationId || !workOrderId) return [];

      const { data, error } = await supabase
        .from('labor_costs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('[useLaborEntries] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useLaborEntries] Fetched ${data?.length || 0} entries for WO ${workOrderId}`);
      return (data || []) as LaborEntry[];
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1000 * 30, // 30 seconds - refresh often for active timers
  });
}

// ============================================================================
// Get active (running) timers for a work order
// ============================================================================
export function useActiveTimers(workOrderId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['labor_entries', 'active', organizationId, workOrderId],
    queryFn: async () => {
      if (!organizationId || !workOrderId) return [];

      const { data, error } = await supabase
        .from('labor_costs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .is('end_time', null)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[useActiveTimers] Error:', error);
        throw new Error(error.message);
      }

      return (data || []) as LaborEntry[];
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1000 * 10, // 10 seconds for active timers
    refetchInterval: 1000 * 30, // auto-refresh every 30 seconds
  });
}

// ============================================================================
// Start a timer (create labor entry with no end_time)
// ============================================================================
export function useStartTimer() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      work_order_id: string;
      work_order_number: string;
      employee_id: string;
      employee_name: string;
      employee_code?: string;
      work_type?: string;
      task_description?: string;
      hourly_rate?: number;
    }) => {
      if (!organizationId) throw new Error('No organization');

      const { data, error } = await supabase
        .from('labor_costs')
        .insert({
          organization_id: organizationId,
          work_order_id: input.work_order_id,
          work_order_number: input.work_order_number,
          employee_id: input.employee_id,
          employee_name: input.employee_name,
          employee_code: input.employee_code || null,
          start_time: new Date().toISOString(),
          end_time: null,
          work_date: new Date().toISOString().split('T')[0],
          hours_worked: 0,
          hours_regular: 0,
          regular_rate: input.hourly_rate || 0,
          total_labor_cost: 0,
          work_type: input.work_type || 'corrective',
          task_description: input.task_description || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useStartTimer] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useStartTimer] Started timer for ${input.employee_name} on WO ${input.work_order_number}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['labor_entries'] });
    },
  });
}

// ============================================================================
// Stop a timer (set end_time and calculate hours)
// ============================================================================
export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      entry_id: string;
      task_description?: string;
    }) => {
      // First get the entry to calculate hours
      const { data: entry, error: fetchError } = await supabase
        .from('labor_costs')
        .select('*')
        .eq('id', input.entry_id)
        .single();

      if (fetchError || !entry) {
        throw new Error('Could not find labor entry');
      }

      const endTime = new Date();
      const startTime = new Date(entry.start_time);
      const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const roundedHours = Math.round(hoursWorked * 100) / 100;
      const rate = entry.regular_rate || 0;
      const totalCost = roundedHours * rate;

      const { data, error } = await supabase
        .from('labor_costs')
        .update({
          end_time: endTime.toISOString(),
          hours_worked: roundedHours,
          hours_regular: roundedHours,
          total_labor_cost: Math.round(totalCost * 100) / 100,
          task_description: input.task_description || entry.task_description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.entry_id)
        .select()
        .single();

      if (error) {
        console.error('[useStopTimer] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useStopTimer] Stopped timer ${input.entry_id}: ${roundedHours} hrs, $${totalCost.toFixed(2)}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor_entries'] });
    },
  });
}

// ============================================================================
// Add a manual labor entry (no timer, just log hours)
// ============================================================================
export function useAddManualLaborEntry() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      work_order_id: string;
      work_order_number: string;
      employee_id: string;
      employee_name: string;
      employee_code?: string;
      hours_worked: number;
      work_type?: string;
      task_description?: string;
      hourly_rate?: number;
      work_date?: string;
    }) => {
      if (!organizationId) throw new Error('No organization');

      const rate = input.hourly_rate || 0;
      const totalCost = input.hours_worked * rate;
      const workDate = input.work_date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('labor_costs')
        .insert({
          organization_id: organizationId,
          work_order_id: input.work_order_id,
          work_order_number: input.work_order_number,
          employee_id: input.employee_id,
          employee_name: input.employee_name,
          employee_code: input.employee_code || null,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          work_date: workDate,
          hours_worked: input.hours_worked,
          hours_regular: input.hours_worked,
          regular_rate: rate,
          total_labor_cost: Math.round(totalCost * 100) / 100,
          work_type: input.work_type || 'corrective',
          task_description: input.task_description || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useAddManualLaborEntry] Error:', error);
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor_entries'] });
    },
  });
}

// ============================================================================
// Delete a labor entry
// ============================================================================
export function useDeleteLaborEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('labor_costs')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('[useDeleteLaborEntry] Error:', error);
        throw new Error(error.message);
      }

      console.log(`[useDeleteLaborEntry] Deleted entry ${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor_entries'] });
    },
  });
}

// ============================================================================
// Get total labor summary for a work order
// ============================================================================
export function useLaborSummary(workOrderId: string | undefined) {
  const { data: entries = [] } = useLaborEntriesForWorkOrder(workOrderId);
  const { data: activeTimers = [] } = useActiveTimers(workOrderId);

  const completedEntries = entries.filter(e => e.end_time !== null);
  const totalHours = completedEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalCost = completedEntries.reduce((sum, e) => sum + (e.total_labor_cost || 0), 0);
  const uniqueWorkers = [...new Set(entries.map(e => e.employee_id))].length;

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalEntries: completedEntries.length,
    activeTimers: activeTimers.length,
    uniqueWorkers,
    entries,
    activeTimerEntries: activeTimers,
  };
}
