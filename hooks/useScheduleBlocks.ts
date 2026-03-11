import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'production'
  | 'training'
  | 'pm'
  | 'preop'
  | 'quality_check'
  | 'safety_check';

export type BlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type PMClearanceType = 'none' | 'people_out' | 'full_clear';

export interface RequiredEmployee {
  id: string;
  name: string;
  role: string;
}

export interface ScheduleBlock {
  id: string;
  organization_id: string;
  block_type: BlockType;
  title: string;
  notes: string | null;
  start_time: string;
  end_time: string;
  room_id: string | null;
  room_name: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  employee_id: string | null;
  employee_name: string | null;
  department_id: string | null;
  department_name: string | null;
  product_name: string | null;
  target_units: number | null;
  crew_size: number | null;
  required_employees: RequiredEmployee[];
  production_run_id: string | null;
  work_order_id: string | null;
  pm_schedule_id: string | null;
  training_record_id: string | null;
  status: BlockStatus;
  has_conflict: boolean;
  conflict_reason: string | null;
  pm_clearance_type: PMClearanceType | null;
  pm_duration_minutes: number | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleBlockInput {
  block_type: BlockType;
  title: string;
  notes?: string;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
  equipment_id?: string;
  equipment_name?: string;
  employee_id?: string;
  employee_name?: string;
  department_id?: string;
  department_name?: string;
  product_name?: string;
  target_units?: number;
  crew_size?: number;
  required_employees?: RequiredEmployee[];
  production_run_id?: string;
  work_order_id?: string;
  pm_schedule_id?: string;
  training_record_id?: string;
  pm_clearance_type?: PMClearanceType;
  pm_duration_minutes?: number;
}

export interface UpdateScheduleBlockInput {
  id: string;
  title?: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
  room_id?: string;
  room_name?: string;
  equipment_id?: string;
  equipment_name?: string;
  employee_id?: string;
  employee_name?: string;
  status?: BlockStatus;
  required_employees?: RequiredEmployee[];
  product_name?: string;
  target_units?: number;
  crew_size?: number;
  pm_clearance_type?: PMClearanceType;
  pm_duration_minutes?: number;
}

export interface ConflictResult {
  conflict_type: string;
  conflicting_block_id: string;
  conflicting_block_title: string;
  conflicting_start: string;
  conflicting_end: string;
  message: string;
}

export interface PMSuggestion {
  suggestion_rank: number;
  window_type: string;
  window_label: string;
  window_start: string;
  window_end: string;
  suggested_shift_start: string;
  suggested_shift_end: string;
  fits_in_window: boolean;
  disruption_score: number;
  notes: string;
}

export interface BreakTemplate {
  id: string;
  organization_id: string;
  break_name: string;
  offset_minutes: number;
  duration_minutes: number;
  product_cleared: boolean;
  sort_order: number;
}

// ─── Color + label helpers (used by screen) ───────────────────────────────────

export const BLOCK_TYPE_CONFIG: Record<BlockType, { label: string; color: string; lightColor: string }> = {
  production:    { label: 'Production',    color: '#00e5ff', lightColor: '#00e5ff22' },
  training:      { label: 'Training',      color: '#7b61ff', lightColor: '#7b61ff22' },
  pm:            { label: 'PM',            color: '#ffb800', lightColor: '#ffb80022' },
  preop:         { label: 'Pre-Op',        color: '#00ff88', lightColor: '#00ff8822' },
  quality_check: { label: 'Quality Check', color: '#f97316', lightColor: '#f9731622' },
  safety_check:  { label: 'Safety Check',  color: '#ff2d55', lightColor: '#ff2d5522' },
};

export const DISRUPTION_LABELS: Record<number, string> = {
  0: 'No impact',
  1: 'Low impact',
  2: 'Medium impact',
  3: 'High impact',
};

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useScheduleBlocks(weekStart?: Date) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const userContext = useUser();
  const organizationId = orgContext?.organizationId;
  const userName = userContext?.userProfile
    ? `${userContext.userProfile.first_name} ${userContext.userProfile.last_name}`.trim()
    : 'Unknown';
  const userId = userContext?.userProfile?.id;

  // ── Query: blocks for the selected week ──────────────────────────────────
  const blocksQuery = useQuery({
    queryKey: ['schedule_blocks', organizationId, weekStart?.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('schedule_blocks')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      if (weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        query = query
          .gte('start_time', weekStart.toISOString())
          .lt('start_time', weekEnd.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error('[useScheduleBlocks] Error fetching blocks:', error.message);
        return [];
      }

      console.log('[useScheduleBlocks] Fetched', data?.length || 0, 'blocks');
      return (data || []) as ScheduleBlock[];
    },
    enabled: !!organizationId,
  });

  // ── Check conflicts before saving ────────────────────────────────────────
  const checkConflicts = async (params: {
    block_type: BlockType;
    start_time: string;
    end_time: string;
    room_id?: string | null;
    employee_id?: string | null;
    equipment_id?: string | null;
    required_employees?: RequiredEmployee[];
    exclude_id?: string;
  }): Promise<ConflictResult[]> => {
    if (!organizationId) return [];

    console.log('[useScheduleBlocks] Checking conflicts for:', params.block_type);

    const allConflicts: ConflictResult[] = [];

    // Check primary employee + room + equipment
    const { data, error } = await supabase.rpc('check_schedule_conflicts', {
      p_org_id:       organizationId,
      p_block_type:   params.block_type,
      p_start_time:   params.start_time,
      p_end_time:     params.end_time,
      p_room_id:      params.room_id || null,
      p_employee_id:  params.employee_id || null,
      p_equipment_id: params.equipment_id || null,
      p_exclude_id:   params.exclude_id || null,
    });

    if (error) {
      console.error('[useScheduleBlocks] Conflict check error:', error.message);
    } else {
      allConflicts.push(...((data || []) as ConflictResult[]));
    }

    // Check each additional attendee individually
    if (params.required_employees && params.required_employees.length > 0) {
      for (const emp of params.required_employees) {
        // Skip if already checked as primary employee
        if (emp.id === params.employee_id) continue;

        const { data: empData, error: empError } = await supabase.rpc('check_schedule_conflicts', {
          p_org_id:       organizationId,
          p_block_type:   params.block_type,
          p_start_time:   params.start_time,
          p_end_time:     params.end_time,
          p_room_id:      null,         // room already checked above
          p_employee_id:  emp.id,
          p_equipment_id: null,
          p_exclude_id:   params.exclude_id || null,
        });

        if (empError) {
          console.error('[useScheduleBlocks] Employee conflict check error:', empError.message);
        } else if (empData && empData.length > 0) {
          // Tag each conflict with the employee name so the message is clear
          const tagged = (empData as ConflictResult[]).map(c => ({
            ...c,
            message: `${emp.name}: ${c.message}`,
          }));
          allConflicts.push(...tagged);
        }
      }
    }

    console.log('[useScheduleBlocks] Total conflicts found:', allConflicts.length);
    return allConflicts;
  };

  // ── Create block (runs conflict check first — blocks on conflict) ─────────
  const createMutation = useMutation({
    mutationFn: async (input: CreateScheduleBlockInput) => {
      if (!organizationId) throw new Error('No organization selected');

      // ── Conflict check — block if any conflicts found ──
      const conflicts = await checkConflicts({
        block_type:         input.block_type,
        start_time:         input.start_time,
        end_time:           input.end_time,
        room_id:            input.room_id,
        employee_id:        input.employee_id,
        equipment_id:       input.equipment_id,
        required_employees: input.required_employees,
      });

      if (conflicts.length > 0) {
        const messages = conflicts.map(c => c.message).join('\n\n');
        throw new Error(`CONFLICT:${messages}`);
      }

      console.log('[useScheduleBlocks] Creating block:', input.block_type, input.title);

      const record = {
        organization_id:    organizationId,
        block_type:         input.block_type,
        title:              input.title,
        notes:              input.notes || null,
        start_time:         input.start_time,
        end_time:           input.end_time,
        room_id:            input.room_id || null,
        room_name:          input.room_name || null,
        equipment_id:       input.equipment_id || null,
        equipment_name:     input.equipment_name || null,
        employee_id:        input.employee_id || null,
        employee_name:      input.employee_name || null,
        department_id:      input.department_id || null,
        department_name:    input.department_name || null,
        product_name:       input.product_name || null,
        target_units:       input.target_units || null,
        crew_size:          input.crew_size || null,
        required_employees: input.required_employees || [],
        production_run_id:  input.production_run_id || null,
        work_order_id:      input.work_order_id || null,
        pm_schedule_id:     input.pm_schedule_id || null,
        training_record_id: input.training_record_id || null,
        status:             'scheduled' as BlockStatus,
        has_conflict:       false,
        pm_clearance_type:  input.pm_clearance_type || null,
        pm_duration_minutes: input.pm_duration_minutes || null,
        created_by:         userId || null,
        created_by_name:    userName,
      };

      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('[useScheduleBlocks] Error creating block:', error.message);
        throw error;
      }

      console.log('[useScheduleBlocks] Created block:', data.id);
      return data as ScheduleBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks', organizationId] });
    },
  });

  // ── Update block ──────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateScheduleBlockInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { id, ...updates } = input;

      // If time, room, employee, or equipment changed — re-check conflicts
      if (updates.start_time || updates.end_time || updates.room_id ||
          updates.employee_id || updates.equipment_id) {

        // Fetch current block to fill in unchanged fields for conflict check
        const { data: current } = await supabase
          .from('schedule_blocks')
          .select('block_type, start_time, end_time, room_id, employee_id, equipment_id')
          .eq('id', id)
          .single();

        if (current) {
          const conflicts = await checkConflicts({
            block_type:   current.block_type,
            start_time:   updates.start_time   || current.start_time,
            end_time:     updates.end_time     || current.end_time,
            room_id:      updates.room_id      !== undefined ? updates.room_id      : current.room_id,
            employee_id:  updates.employee_id  !== undefined ? updates.employee_id  : current.employee_id,
            equipment_id: updates.equipment_id !== undefined ? updates.equipment_id : current.equipment_id,
            exclude_id:   id,
          });

          if (conflicts.length > 0) {
            const messages = conflicts.map(c => c.message).join('\n\n');
            throw new Error(`CONFLICT:${messages}`);
          }
        }
      }

      console.log('[useScheduleBlocks] Updating block:', id);

      const { data, error } = await supabase
        .from('schedule_blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useScheduleBlocks] Error updating block:', error.message);
        throw error;
      }

      return data as ScheduleBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks', organizationId] });
    },
  });

  // ── Delete block ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (blockId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useScheduleBlocks] Deleting block:', blockId);

      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', blockId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useScheduleBlocks] Error deleting block:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks', organizationId] });
    },
  });

  // ── Cancel block (soft delete) ────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (blockId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useScheduleBlocks] Cancelling block:', blockId);

      const { data, error } = await supabase
        .from('schedule_blocks')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', blockId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useScheduleBlocks] Error cancelling block:', error.message);
        throw error;
      }

      return data as ScheduleBlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks', organizationId] });
    },
  });

  return {
    // Data
    blocks:     blocksQuery.data || [],
    isLoading:  blocksQuery.isLoading,
    isError:    blocksQuery.isError,
    refetch:    blocksQuery.refetch,

    // Actions
    createBlock:   createMutation.mutateAsync,
    isCreating:    createMutation.isPending,
    updateBlock:   updateMutation.mutateAsync,
    isUpdating:    updateMutation.isPending,
    deleteBlock:   deleteMutation.mutateAsync,
    isDeleting:    deleteMutation.isPending,
    cancelBlock:   cancelMutation.mutateAsync,
    isCancelling:  cancelMutation.isPending,

    // Conflict checking (callable standalone for live validation)
    checkConflicts,
  };
}

// ─── PM Optimizer hook ────────────────────────────────────────────────────────

export function usePMSuggestions(params: {
  roomId: string;
  targetDate: string;        // 'YYYY-MM-DD'
  durationMinutes: number;
  clearanceType: PMClearanceType;
  employeeId?: string;
} | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  return useQuery({
    queryKey: ['pm_suggestions', organizationId, params],
    queryFn: async () => {
      if (!organizationId || !params) return [];

      console.log('[usePMSuggestions] Fetching suggestions for room:', params.roomId, 'date:', params.targetDate);

      const { data, error } = await supabase.rpc('get_pm_scheduling_suggestions', {
        p_org_id:           organizationId,
        p_room_id:          params.roomId,
        p_target_date:      params.targetDate,
        p_duration_minutes: params.durationMinutes,
        p_clearance_type:   params.clearanceType,
        p_employee_id:      params.employeeId || null,
        p_exclude_block_id: null,
      });

      if (error) {
        console.error('[usePMSuggestions] Error:', error.message);
        return [];
      }

      console.log('[usePMSuggestions] Got', data?.length || 0, 'suggestions');
      return (data || []) as PMSuggestion[];
    },
    enabled: !!organizationId && !!params,
  });
}

// ─── Break Templates hook ─────────────────────────────────────────────────────

export function useBreakTemplates() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const templatesQuery = useQuery({
    queryKey: ['break_templates', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('schedule_break_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[useBreakTemplates] Error:', error.message);
        return [];
      }

      // If no templates exist yet — seed defaults
      if (!data || data.length === 0) {
        console.log('[useBreakTemplates] No templates found — seeding defaults');
        await supabase.rpc('seed_default_break_templates', { p_org_id: organizationId });
        // Refetch after seed
        const { data: seeded } = await supabase
          .from('schedule_break_templates')
          .select('*')
          .eq('organization_id', organizationId)
          .order('sort_order', { ascending: true });
        return (seeded || []) as BreakTemplate[];
      }

      return data as BreakTemplate[];
    },
    enabled: !!organizationId,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<BreakTemplate> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      const { id, ...updates } = template;

      const { data, error } = await supabase
        .from('schedule_break_templates')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data as BreakTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['break_templates', organizationId] });
    },
  });

  return {
    breakTemplates:       templatesQuery.data || [],
    isLoading:            templatesQuery.isLoading,
    updateBreakTemplate:  updateTemplateMutation.mutateAsync,
    isUpdating:           updateTemplateMutation.isPending,
  };
}

// ─── Helper: parse conflict error thrown by mutations ────────────────────────
// Usage: const msgs = parseConflictError(error)
// If msgs is non-null, show them as a conflict alert. Otherwise re-throw.

export function parseConflictError(error: unknown): string[] | null {
  if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
    return error.message.replace('CONFLICT:', '').split('\n\n').filter(Boolean);
  }
  return null;
}
