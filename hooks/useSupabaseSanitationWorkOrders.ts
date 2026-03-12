import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SanWOStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_qa'
  | 'completed'
  | 'cancelled';

export type SanWOFrequency =
  | 'hourly'
  | 'per_shift'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'as_needed'
  | 'pre_op';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

export interface ChecklistCompletion {
  [itemId: string]: boolean;
}

export interface SanPhoto {
  uri: string;
  capturedAt: string;
  storagePath?: string;
}

export interface SanitationWorkOrder {
  id: string;
  sanitation_wo_number: string;
  template_id: string | null;
  template_code: string | null;
  task_name: string;
  task_code: string | null;
  organization_id: string;
  facility_id: string | null;
  area: string | null;
  room_code: string | null;
  scheduled_date: string;
  frequency: SanWOFrequency;
  is_preop: boolean;
  requires_atp_test: boolean;
  requires_qa_signoff: boolean;
  atp_pass_threshold: number;
  checklist_items: ChecklistItem[];
  departments_notified: number[];
  status: SanWOStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  timer_started_at: string | null;
  total_elapsed_sec: number;
  chemical_used: string | null;
  actual_concentration: string | null;
  application_method: string | null;
  checklist_completion: ChecklistCompletion;
  photos: SanPhoto[];
  tech_initial: string | null;
  tech_ppn: string | null;
  tech_signed_at: string | null;
  qa_initial: string | null;
  qa_ppn: string | null;
  qa_signed_at: string | null;
  qa_signed_by: string | null;
  qa_signed_by_name: string | null;
  atp_reading_rlu: number | null;
  atp_result: 'pass' | 'fail' | null;
  task_feed_post_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  all: (orgId: string) => ['san_work_orders', orgId] as const,
  single: (orgId: string, id: string) => ['san_work_orders', orgId, id] as const,
  pending: (orgId: string) => ['san_work_orders', orgId, 'pending'] as const,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSupabaseSanitationWorkOrders() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // ── All WOs ──────────────────────────────────────────────────────────────────
  const workOrdersQuery = useQuery({
    queryKey: KEYS.all(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SanitationWorkOrder[];
    },
    enabled: !!organizationId,
  });

  // ── Pending / In-Progress WOs (for inbox) ────────────────────────────────────
  const pendingQuery = useQuery({
    queryKey: KEYS.pending(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'in_progress', 'awaiting_qa'])
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return (data || []) as SanitationWorkOrder[];
    },
    enabled: !!organizationId,
  });

  // ── Single WO by ID ──────────────────────────────────────────────────────────
  const useSingleWorkOrder = (id: string | null) =>
    useQuery({
      queryKey: KEYS.single(organizationId || '', id || ''),
      queryFn: async () => {
        if (!organizationId || !id) return null;
        const { data, error } = await supabase
          .from('sanitation_work_orders')
          .select('*')
          .eq('id', id)
          .eq('organization_id', organizationId)
          .single();
        if (error) throw error;
        return data as SanitationWorkOrder;
      },
      enabled: !!organizationId && !!id,
    });

  // ── Invalidate helpers ───────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['san_work_orders', organizationId || ''] });
  };
  const invalidateSingle = (id: string) => {
    queryClient.invalidateQueries({
      queryKey: KEYS.single(organizationId || '', id),
    });
  };

  // ── Start Timer ──────────────────────────────────────────────────────────────
  // Sets timer_started_at = now, status → in_progress, records started_at if first start
  const startTimerMutation = useMutation({
    mutationFn: async ({ id, isFirstStart }: { id: string; isFirstStart: boolean }) => {
      const now = new Date().toISOString();
      const updates: Partial<SanitationWorkOrder> = {
        timer_started_at: now,
        status: 'in_progress',
      };
      if (isFirstStart) {
        updates.started_at = now;
        updates.assigned_to_name = updates.assigned_to_name; // preserved from existing
      }
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Pause Timer ──────────────────────────────────────────────────────────────
  // Accumulates elapsed seconds into total_elapsed_sec, clears timer_started_at
  const pauseTimerMutation = useMutation({
    mutationFn: async ({
      id,
      additionalSec,
    }: {
      id: string;
      additionalSec: number;
    }) => {
      // First fetch current total to avoid race condition
      const { data: current } = await supabase
        .from('sanitation_work_orders')
        .select('total_elapsed_sec')
        .eq('id', id)
        .single();

      const currentTotal = current?.total_elapsed_sec ?? 0;

      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({
          timer_started_at: null,
          total_elapsed_sec: currentTotal + Math.floor(additionalSec),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Update Work Order (generic field save) ───────────────────────────────────
  const updateWorkOrderMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SanitationWorkOrder>;
    }) => {
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Submit Tech Signature ─────────────────────────────────────────────────────
  // Marks tech complete. If no QA required → status = completed. If QA → awaiting_qa.
  const submitTechSignatureMutation = useMutation({
    mutationFn: async ({
      id,
      initial,
      ppn,
      requiresQA,
      finalUpdates,
    }: {
      id: string;
      initial: string;
      ppn: string;
      requiresQA: boolean;
      finalUpdates: Partial<SanitationWorkOrder>;
    }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({
          ...finalUpdates,
          tech_initial: initial.toUpperCase().trim(),
          tech_ppn: ppn.toUpperCase().trim(),
          tech_signed_at: now,
          status: requiresQA ? 'awaiting_qa' : 'completed',
          completed_at: requiresQA ? null : now,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Submit QA Signature ──────────────────────────────────────────────────────
  // Only callable after tech_signed_at is set. Marks completed.
  const submitQASignatureMutation = useMutation({
    mutationFn: async ({
      id,
      initial,
      ppn,
      signedByName,
      signedById,
    }: {
      id: string;
      initial: string;
      ppn: string;
      signedByName: string;
      signedById: string;
    }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({
          qa_initial: initial.toUpperCase().trim(),
          qa_ppn: ppn.toUpperCase().trim(),
          qa_signed_at: now,
          qa_signed_by: signedById,
          qa_signed_by_name: signedByName,
          status: 'completed',
          completed_at: now,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Add Photo ─────────────────────────────────────────────────────────────────
  // Appends a photo to the photos jsonb array
  const addPhotoMutation = useMutation({
    mutationFn: async ({ id, photo }: { id: string; photo: SanPhoto }) => {
      // Fetch current photos first
      const { data: current } = await supabase
        .from('sanitation_work_orders')
        .select('photos')
        .eq('id', id)
        .single();

      const existing: SanPhoto[] = current?.photos ?? [];

      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({ photos: [...existing, photo] })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Remove Photo ──────────────────────────────────────────────────────────────
  const removePhotoMutation = useMutation({
    mutationFn: async ({ id, photoIndex }: { id: string; photoIndex: number }) => {
      const { data: current } = await supabase
        .from('sanitation_work_orders')
        .select('photos')
        .eq('id', id)
        .single();

      const existing: SanPhoto[] = current?.photos ?? [];
      const updated = existing.filter((_, i) => i !== photoIndex);

      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({ photos: updated })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        KEYS.single(organizationId || '', data.id),
        data
      );
      invalidate();
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /** Computes total elapsed seconds including any currently-running segment */
  const computeElapsed = (wo: SanitationWorkOrder): number => {
    let total = wo.total_elapsed_sec ?? 0;
    if (wo.timer_started_at) {
      const started = new Date(wo.timer_started_at).getTime();
      total += Math.floor((Date.now() - started) / 1000);
    }
    return total;
  };

  /** Formats seconds → HH:MM:SS */
  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  return {
    workOrders: workOrdersQuery.data || [],
    pendingWorkOrders: pendingQuery.data || [],
    isLoading: workOrdersQuery.isLoading,
    useSingleWorkOrder,

    startTimer: startTimerMutation.mutateAsync,
    pauseTimer: pauseTimerMutation.mutateAsync,
    updateWorkOrder: updateWorkOrderMutation.mutateAsync,
    submitTechSignature: submitTechSignatureMutation.mutateAsync,
    submitQASignature: submitQASignatureMutation.mutateAsync,
    addPhoto: addPhotoMutation.mutateAsync,
    removePhoto: removePhotoMutation.mutateAsync,

    isStartingTimer: startTimerMutation.isPending,
    isPausingTimer: pauseTimerMutation.isPending,
    isSubmittingTech: submitTechSignatureMutation.isPending,
    isSubmittingQA: submitQASignatureMutation.isPending,

    computeElapsed,
    formatElapsed,

    refetch: () => {
      workOrdersQuery.refetch();
      pendingQuery.refetch();
    },
  };
}

export const useSanitationWorkOrders = useSupabaseSanitationWorkOrders;
