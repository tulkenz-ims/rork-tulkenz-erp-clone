import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

export interface RoomHygieneEntry {
  id: string;
  organizationId: string;
  facilityId?: string;
  roomId: string;
  roomName: string;
  productionLine?: string;
  entryTime: string;
  exitTime?: string;
  durationMinutes?: number;
  enteredById?: string;
  enteredByName: string;
  departmentCode: string;
  departmentName: string;
  role?: string;
  purpose: string;
  purposeDetail?: string;
  actionsPerformed: string;
  equipmentTouched: string[];
  chemicalsUsed: string[];
  toolsBroughtIn: string[];
  handwashOnEntry: boolean;
  ppeWorn: string[];
  hairnet: boolean;
  gloves: boolean;
  smock: boolean;
  bootCovers: boolean;
  contaminationRisk: 'none' | 'low' | 'medium' | 'high';
  contaminationNotes?: string;
  taskFeedPostId?: string;
  workOrderId?: string;
  status: 'active' | 'completed' | 'flagged';
  notes?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

const mapFromDb = (row: any): RoomHygieneEntry => ({
  id: row.id,
  organizationId: row.organization_id,
  facilityId: row.facility_id,
  roomId: row.room_id,
  roomName: row.room_name,
  productionLine: row.production_line,
  entryTime: row.entry_time,
  exitTime: row.exit_time,
  durationMinutes: row.duration_minutes,
  enteredById: row.entered_by_id,
  enteredByName: row.entered_by_name,
  departmentCode: row.department_code,
  departmentName: row.department_name,
  role: row.role,
  purpose: row.purpose,
  purposeDetail: row.purpose_detail,
  actionsPerformed: row.actions_performed,
  equipmentTouched: row.equipment_touched || [],
  chemicalsUsed: row.chemicals_used || [],
  toolsBroughtIn: row.tools_brought_in || [],
  handwashOnEntry: row.handwash_on_entry ?? true,
  ppeWorn: row.ppe_worn || [],
  hairnet: row.hairnet ?? true,
  gloves: row.gloves ?? true,
  smock: row.smock ?? true,
  bootCovers: row.boot_covers ?? false,
  contaminationRisk: row.contamination_risk || 'none',
  contaminationNotes: row.contamination_notes,
  taskFeedPostId: row.task_feed_post_id,
  workOrderId: row.work_order_id,
  status: row.status || 'active',
  notes: row.notes,
  attachments: row.attachments || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── Query: get entries for a room on a given date ──────────────
export function useRoomHygieneLogQuery(options?: {
  roomId?: string;
  date?: string; // YYYY-MM-DD
  departmentCode?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['room_hygiene_log', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('room_hygiene_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('entry_time', { ascending: false });

      if (options?.roomId) {
        query = query.eq('room_id', options.roomId);
      }

      if (options?.date) {
        const startOfDay = `${options.date}T00:00:00.000Z`;
        const endOfDay = `${options.date}T23:59:59.999Z`;
        query = query.gte('entry_time', startOfDay).lte('entry_time', endOfDay);
      }

      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

// ── Query: today's entries for a room ──────────────────────────
export function useTodayRoomLog(roomId: string) {
  const today = new Date().toISOString().split('T')[0];
  return useRoomHygieneLogQuery({ roomId, date: today });
}

// ── Mutation: create entry ─────────────────────────────────────
export interface CreateRoomHygieneInput {
  roomId: string;
  roomName: string;
  productionLine?: string;
  purpose: string;
  purposeDetail?: string;
  actionsPerformed: string;
  equipmentTouched?: string[];
  chemicalsUsed?: string[];
  toolsBroughtIn?: string[];
  handwashOnEntry?: boolean;
  ppeWorn?: string[];
  hairnet?: boolean;
  gloves?: boolean;
  smock?: boolean;
  bootCovers?: boolean;
  contaminationRisk?: 'none' | 'low' | 'medium' | 'high';
  contaminationNotes?: string;
  taskFeedPostId?: string;
  workOrderId?: string;
  notes?: string;
}

export function useCreateRoomHygieneEntry(callbacks?: {
  onSuccess?: (data: RoomHygieneEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { organizationId, facilityId } = useOrganization();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: CreateRoomHygieneInput) => {
      const { data, error } = await supabase
        .from('room_hygiene_log')
        .insert({
          organization_id: organizationId,
          facility_id: facilityId,
          room_id: input.roomId,
          room_name: input.roomName,
          production_line: input.productionLine,
          entry_time: new Date().toISOString(),
          entered_by_id: user?.id,
          entered_by_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
          department_code: user?.department || '1004',
          department_name: user?.departmentName || 'Quality',
          role: user?.jobTitle || '',
          purpose: input.purpose,
          purpose_detail: input.purposeDetail,
          actions_performed: input.actionsPerformed,
          equipment_touched: input.equipmentTouched || [],
          chemicals_used: input.chemicalsUsed || [],
          tools_brought_in: input.toolsBroughtIn || [],
          handwash_on_entry: input.handwashOnEntry ?? true,
          ppe_worn: input.ppeWorn || ['hairnet', 'gloves', 'smock'],
          hairnet: input.hairnet ?? true,
          gloves: input.gloves ?? true,
          smock: input.smock ?? true,
          boot_covers: input.bootCovers ?? false,
          contamination_risk: input.contaminationRisk || 'none',
          contamination_notes: input.contaminationNotes,
          task_feed_post_id: input.taskFeedPostId,
          work_order_id: input.workOrderId,
          status: 'active',
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return mapFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Mutation: complete entry (exit room) ───────────────────────
export function useCompleteRoomHygieneEntry(callbacks?: {
  onSuccess?: (data: RoomHygieneEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { entryId: string; notes?: string }) => {
      const exitTime = new Date().toISOString();

      // Get entry time to calculate duration
      const { data: entry } = await supabase
        .from('room_hygiene_log')
        .select('entry_time')
        .eq('id', input.entryId)
        .single();

      let durationMinutes = 0;
      if (entry?.entry_time) {
        durationMinutes = Math.round(
          (new Date(exitTime).getTime() - new Date(entry.entry_time).getTime()) / 60000
        );
      }

      const { data, error } = await supabase
        .from('room_hygiene_log')
        .update({
          exit_time: exitTime,
          duration_minutes: durationMinutes,
          status: 'completed',
          notes: input.notes,
        })
        .eq('id', input.entryId)
        .select()
        .single();

      if (error) throw error;
      return mapFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Mutation: flag entry ───────────────────────────────────────
export function useFlagRoomHygieneEntry(callbacks?: {
  onSuccess?: (data: RoomHygieneEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { entryId: string; contaminationRisk: string; notes: string }) => {
      const { data, error } = await supabase
        .from('room_hygiene_log')
        .update({
          status: 'flagged',
          contamination_risk: input.contaminationRisk,
          contamination_notes: input.notes,
        })
        .eq('id', input.entryId)
        .select()
        .single();

      if (error) throw error;
      return mapFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}
