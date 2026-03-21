/**
 * hooks/useRoomLaborEntries.ts
 *
 * Room labor tracking — check employee into/out of a production room,
 * query active occupancy, and pull labor reports by room/date.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

// ── Types ──────────────────────────────────────────────────────
export interface RoomLaborEntry {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  time_entry_id: string | null;
  entered_at: string;
  exited_at: string | null;
  hours_in_room: number | null;
  work_order_id: string | null;
  task_description: string | null;
  notes: string | null;
  created_at: string;
}

export interface RoomOccupant {
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  entered_at: string;
}

export interface RoomOccupancy {
  organization_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  current_count: number;
  employees: RoomOccupant[];
}

export interface RoomLaborSummary {
  location_id: string;
  location_code: string;
  location_name: string;
  work_date: string;
  unique_employees: number;
  total_entries: number;
  total_hours: number;
  avg_hours_per_entry: number;
}

export interface CheckIntoRoomParams {
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  location_id: string;
  location_code: string;
  location_name: string;
  time_entry_id?: string;
  work_order_id?: string;
  task_description?: string;
  notes?: string;
}

// ── Active room entry for an employee ─────────────────────────
export function useActiveRoomEntry(employeeId: string | undefined) {
  const { company } = useUser();
  return useQuery({
    queryKey: ['room-labor-active', employeeId],
    queryFn: async () => {
      if (!employeeId || !company?.id) return null;
      const { data, error } = await supabase
        .from('room_labor_entries')
        .select('*')
        .eq('organization_id', company.id)
        .eq('employee_id', employeeId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as RoomLaborEntry | null;
    },
    enabled: !!employeeId && !!company?.id,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

// ── Current occupancy for all rooms ───────────────────────────
export function useRoomOccupancy() {
  const { company } = useUser();
  return useQuery({
    queryKey: ['room-occupancy', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('room_current_occupancy')
        .select('*')
        .eq('organization_id', company.id);
      if (error) throw error;
      return (data || []) as RoomOccupancy[];
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

// ── Labor summary by room (date range) ────────────────────────
export function useRoomLaborSummary(startDate?: string, endDate?: string) {
  const { company } = useUser();
  return useQuery({
    queryKey: ['room-labor-summary', company?.id, startDate, endDate],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = supabase
        .from('room_labor_daily_summary')
        .select('*')
        .eq('organization_id', company.id)
        .order('work_date', { ascending: false });
      if (startDate) query = query.gte('work_date', startDate);
      if (endDate)   query = query.lte('work_date', endDate);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RoomLaborSummary[];
    },
    enabled: !!company?.id,
  });
}

// ── Recent entries for an employee ────────────────────────────
export function useEmployeeRoomHistory(employeeId: string | undefined, limit = 20) {
  const { company } = useUser();
  return useQuery({
    queryKey: ['room-labor-history', employeeId, limit],
    queryFn: async () => {
      if (!employeeId || !company?.id) return [];
      const { data, error } = await supabase
        .from('room_labor_entries')
        .select('*')
        .eq('organization_id', company.id)
        .eq('employee_id', employeeId)
        .order('entered_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as RoomLaborEntry[];
    },
    enabled: !!employeeId && !!company?.id,
  });
}

// ── Check INTO a room ──────────────────────────────────────────
export function useCheckIntoRoom() {
  const { company } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CheckIntoRoomParams) => {
      if (!company?.id) throw new Error('No organization');

      // Auto-exit any existing active room entry for this employee
      const { data: existing } = await supabase
        .from('room_labor_entries')
        .select('id')
        .eq('organization_id', company.id)
        .eq('employee_id', params.employee_id)
        .is('exited_at', null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('room_labor_entries')
          .update({ exited_at: new Date().toISOString() })
          .eq('id', existing.id);
      }

      // Create new room entry
      const { data, error } = await supabase
        .from('room_labor_entries')
        .insert({
          organization_id:  company.id,
          employee_id:      params.employee_id,
          employee_name:    params.employee_name,
          employee_code:    params.employee_code || null,
          location_id:      params.location_id,
          location_code:    params.location_code,
          location_name:    params.location_name,
          time_entry_id:    params.time_entry_id || null,
          work_order_id:    params.work_order_id || null,
          task_description: params.task_description || null,
          notes:            params.notes || null,
          entered_at:       new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as RoomLaborEntry;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['room-labor-active', params.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['room-occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['room-labor-history', params.employee_id] });
    },
  });
}

// ── Check OUT of current room ──────────────────────────────────
export function useCheckOutOfRoom() {
  const { company } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, entryId }: { employeeId: string; entryId: string }) => {
      if (!company?.id) throw new Error('No organization');
      const { data, error } = await supabase
        .from('room_labor_entries')
        .update({ exited_at: new Date().toISOString() })
        .eq('id', entryId)
        .eq('organization_id', company.id)
        .select()
        .single();
      if (error) throw error;
      return data as RoomLaborEntry;
    },
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-labor-active', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['room-occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['room-labor-history', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['room-labor-summary'] });
    },
  });
}

// ── Change room (exit current, enter new) ─────────────────────
// Convenience wrapper — same as checkIntoRoom (auto-exits previous)
export { useCheckIntoRoom as useChangeRoom };
