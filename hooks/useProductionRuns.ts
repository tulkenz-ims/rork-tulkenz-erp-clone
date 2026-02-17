import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

// ── Types ─────────────────────────────────────────────────────

export interface ProductionRun {
  id: string;
  organizationId: string;
  facilityId?: string;
  runNumber: string;
  productionLine: string;
  roomId?: string;
  roomName?: string;
  productName?: string;
  productSku?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  targetCount: number;
  currentCount: number;
  goodCount: number;
  wasteCount: number;
  reworkCount: number;
  wasteReason?: string;
  reworkReason?: string;
  ratePerMinute: number;
  yieldPercentage: number;
  startedAt?: string;
  endedAt?: string;
  durationMinutes: number;
  pausedAt?: string;
  totalPauseMinutes: number;
  startPostId?: string;
  endPostId?: string;
  startedById?: string;
  startedByName?: string;
  endedById?: string;
  endedByName?: string;
  notes?: string;
  endOfRunNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mapper ────────────────────────────────────────────────────

const mapRunFromDb = (row: any): ProductionRun => ({
  id: row.id,
  organizationId: row.organization_id,
  facilityId: row.facility_id,
  runNumber: row.run_number,
  productionLine: row.production_line,
  roomId: row.room_id,
  roomName: row.room_name,
  productName: row.product_name,
  productSku: row.product_sku,
  status: row.status,
  targetCount: row.target_count || 0,
  currentCount: row.current_count || 0,
  goodCount: row.good_count || 0,
  wasteCount: row.waste_count || 0,
  reworkCount: row.rework_count || 0,
  wasteReason: row.waste_reason,
  reworkReason: row.rework_reason,
  ratePerMinute: parseFloat(row.rate_per_minute) || 0,
  yieldPercentage: parseFloat(row.yield_percentage) || 0,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationMinutes: row.duration_minutes || 0,
  pausedAt: row.paused_at,
  totalPauseMinutes: row.total_pause_minutes || 0,
  startPostId: row.start_post_id,
  endPostId: row.end_post_id,
  startedById: row.started_by_id,
  startedByName: row.started_by_name,
  endedById: row.ended_by_id,
  endedByName: row.ended_by_name,
  notes: row.notes,
  endOfRunNotes: row.end_of_run_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── Queries ───────────────────────────────────────────────────

interface RunQueryOptions {
  status?: string;
  productionLine?: string;
  date?: string;
  limit?: number;
  enabled?: boolean;
}

export function useProductionRunsQuery(options?: RunQueryOptions) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['production_runs', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('production_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.productionLine) {
        query = query.eq('production_line', options.productionLine);
      }
      if (options?.date) {
        query = query.gte('started_at', `${options.date}T00:00:00`)
                     .lte('started_at', `${options.date}T23:59:59`);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRunFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

export function useActiveRunsQuery(productionLine?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['production_runs', 'active', organizationId, productionLine],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('production_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (productionLine) {
        query = query.eq('production_line', productionLine);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRunFromDb);
    },
    enabled: !!organizationId,
    refetchInterval: 10000, // Poll every 10s for live count updates
  });
}

export function useProductionRunDetail(runId?: string) {
  return useQuery({
    queryKey: ['production_runs', 'detail', runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .from('production_runs')
        .select('*')
        .eq('id', runId)
        .single();
      if (error) throw error;
      return mapRunFromDb(data);
    },
    enabled: !!runId,
    refetchInterval: 5000, // Live updates every 5s
  });
}

// ── Mutations ─────────────────────────────────────────────────

interface MutationCallbacks<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

// Start a new production run
export function useStartProductionRun(callbacks?: MutationCallbacks<ProductionRun>) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: {
      runNumber: string;
      productionLine: string;
      roomId?: string;
      roomName?: string;
      productName?: string;
      productSku?: string;
      targetCount?: number;
      notes?: string;
      startPostId?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('production_runs')
        .insert({
          organization_id: organizationId,
          run_number: input.runNumber,
          production_line: input.productionLine,
          room_id: input.roomId || null,
          room_name: input.roomName || null,
          product_name: input.productName || null,
          product_sku: input.productSku || null,
          target_count: input.targetCount || 0,
          status: 'active',
          started_at: now,
          started_by_id: user?.id || null,
          started_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          start_post_id: input.startPostId || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRunFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// End a production run
export function useEndProductionRun(callbacks?: MutationCallbacks<ProductionRun>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: {
      runId: string;
      wasteCount?: number;
      reworkCount?: number;
      wasteReason?: string;
      reworkReason?: string;
      endOfRunNotes?: string;
      endPostId?: string;
    }) => {
      // Fetch current run to calculate duration and yield
      const { data: run, error: fetchErr } = await supabase
        .from('production_runs')
        .select('*')
        .eq('id', input.runId)
        .single();

      if (fetchErr) throw fetchErr;

      const now = new Date();
      const startedAt = new Date(run.started_at);
      const totalMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
      const activeMins = totalMinutes - (run.total_pause_minutes || 0);
      
      const waste = input.wasteCount || 0;
      const rework = input.reworkCount || 0;
      const currentCount = run.current_count || 0;
      const goodCount = Math.max(0, currentCount - waste - rework);
      const yieldPct = currentCount > 0 ? Math.round((goodCount / currentCount) * 10000) / 100 : 0;
      const rate = activeMins > 0 ? Math.round((currentCount / activeMins) * 100) / 100 : 0;

      const { data, error } = await supabase
        .from('production_runs')
        .update({
          status: 'completed',
          ended_at: now.toISOString(),
          ended_by_id: user?.id || null,
          ended_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          duration_minutes: activeMins,
          good_count: goodCount,
          waste_count: waste,
          rework_count: rework,
          waste_reason: input.wasteReason || null,
          rework_reason: input.reworkReason || null,
          yield_percentage: yieldPct,
          rate_per_minute: rate,
          end_of_run_notes: input.endOfRunNotes || null,
          end_post_id: input.endPostId || null,
        })
        .eq('id', input.runId)
        .select()
        .single();

      if (error) throw error;
      return mapRunFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// Pause a production run
export function usePauseProductionRun(callbacks?: MutationCallbacks<ProductionRun>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { runId: string }) => {
      const { data, error } = await supabase
        .from('production_runs')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
        })
        .eq('id', input.runId)
        .select()
        .single();

      if (error) throw error;
      return mapRunFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// Resume a paused run
export function useResumeProductionRun(callbacks?: MutationCallbacks<ProductionRun>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { runId: string }) => {
      // Get run to calculate pause duration
      const { data: run } = await supabase
        .from('production_runs')
        .select('paused_at, total_pause_minutes')
        .eq('id', input.runId)
        .single();

      let addedPause = 0;
      if (run?.paused_at) {
        addedPause = Math.round((Date.now() - new Date(run.paused_at).getTime()) / 60000);
      }

      const { data, error } = await supabase
        .from('production_runs')
        .update({
          status: 'active',
          paused_at: null,
          total_pause_minutes: (run?.total_pause_minutes || 0) + addedPause,
        })
        .eq('id', input.runId)
        .select()
        .single();

      if (error) throw error;
      return mapRunFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// Update waste/rework counts (manual entry during or after run)
export function useUpdateRunCounts(callbacks?: MutationCallbacks<ProductionRun>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      runId: string;
      wasteCount?: number;
      reworkCount?: number;
      wasteReason?: string;
      reworkReason?: string;
    }) => {
      // Get current counts to recalculate good and yield
      const { data: run } = await supabase
        .from('production_runs')
        .select('current_count, started_at, total_pause_minutes')
        .eq('id', input.runId)
        .single();

      const currentCount = run?.current_count || 0;
      const waste = input.wasteCount ?? 0;
      const rework = input.reworkCount ?? 0;
      const goodCount = Math.max(0, currentCount - waste - rework);
      const yieldPct = currentCount > 0 ? Math.round((goodCount / currentCount) * 10000) / 100 : 0;

      const updatePayload: any = {
        good_count: goodCount,
        yield_percentage: yieldPct,
      };
      if (input.wasteCount !== undefined) updatePayload.waste_count = input.wasteCount;
      if (input.reworkCount !== undefined) updatePayload.rework_count = input.reworkCount;
      if (input.wasteReason !== undefined) updatePayload.waste_reason = input.wasteReason;
      if (input.reworkReason !== undefined) updatePayload.rework_reason = input.reworkReason;

      const { data, error } = await supabase
        .from('production_runs')
        .update(updatePayload)
        .eq('id', input.runId)
        .select()
        .single();

      if (error) throw error;
      return mapRunFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ══════════════════════════════════════════════════════════════
// SENSOR COUNT UPDATE
// Called by ESP32 via Supabase REST API or Edge Function.
// Can also be called manually for testing.
// ══════════════════════════════════════════════════════════════

export async function updateSensorCount(params: {
  organizationId: string;
  productionLine: string;
  countSinceLast: number;
}) {
  try {
    // Find the active run on this line
    const { data: run, error: findErr } = await supabase
      .from('production_runs')
      .select('id, current_count, started_at, total_pause_minutes')
      .eq('organization_id', params.organizationId)
      .eq('production_line', params.productionLine)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !run) {
      console.log('[updateSensorCount] No active run on line:', params.productionLine);
      return null;
    }

    const newCount = (run.current_count || 0) + params.countSinceLast;
    const startedAt = new Date(run.started_at);
    const activeMins = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000) - (run.total_pause_minutes || 0));
    const rate = Math.round((newCount / activeMins) * 100) / 100;

    const { data, error } = await supabase
      .from('production_runs')
      .update({
        current_count: newCount,
        rate_per_minute: rate,
      })
      .eq('id', run.id)
      .select()
      .single();

    if (error) {
      console.error('[updateSensorCount] Update error:', error);
      return null;
    }

    return mapRunFromDb(data);
  } catch (err) {
    console.error('[updateSensorCount] Error:', err);
    return null;
  }
}
