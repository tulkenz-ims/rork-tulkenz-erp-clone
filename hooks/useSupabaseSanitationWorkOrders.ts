import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { autoLogRoomHygieneEntry } from '@/hooks/useRoomHygieneLog';

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
  org_id: string;
  wo_number: string;
  template_id: string | null;
  template_code: string | null;
  task_name: string;
  room: string | null;
  area_description: string | null;
  equipment: string | null;
  ssop_id: string | null;
  department_id: number | null;
  departments_notified: number[];
  frequency: SanWOFrequency;
  scheduled_date: string;
  due_date: string | null;
  is_preop: boolean;
  requires_qa_signoff: boolean;
  requires_atp_test: boolean;
  atp_pass_threshold: number;
  status: SanWOStatus;
  assigned_to: string | null;
  assigned_user_id: string | null;
  chemical_used: string | null;
  actual_concentration: string | null;
  contact_time_min: number | null;
  application_method: string | null;
  checklist_completion: ChecklistCompletion;
  atp_reading: number | null;
  atp_result: 'pass' | 'fail' | null;
  photos: SanPhoto[];
  tech_initial: string | null;
  tech_ppn: string | null;
  tech_signed_at: string | null;
  qa_initial: string | null;
  qa_ppn: string | null;
  qa_signed_at: string | null;
  qa_user_id: string | null;
  completed_at: string | null;
  notes: string | null;
  task_feed_post_id: string | null;
  post_status: string | null;
  timer_started_at: string | null;
  total_elapsed_sec: number;
  created_at: string;
  updated_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  all:     (orgId: string) => ['san_work_orders', orgId] as const,
  single:  (orgId: string, id: string) => ['san_work_orders', orgId, id] as const,
  pending: (orgId: string) => ['san_work_orders', orgId, 'pending'] as const,
};

// ─── Department maps ──────────────────────────────────────────────────────────

const DEPT_NAMES: Record<string, string> = {
  '1001': 'Maintenance',
  '1002': 'Sanitation',
  '1003': 'Production',
  '1004': 'Quality',
  '1005': 'Safety',
};

type WOType = 'cmms' | 'sanitation' | 'quality' | 'safety' | 'production';

const DEPT_WO_TYPE: Record<string, WOType> = {
  '1001': 'cmms',
  '1002': 'sanitation',
  '1003': 'production',
  '1004': 'quality',
  '1005': 'safety',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSupabaseSanitationWorkOrders() {
  const queryClient = useQueryClient();
  const { organizationId, facilityId } = useOrganization();
  const { user } = useUser();

  // ── All WOs ───────────────────────────────────────────────────────────────────
  const workOrdersQuery = useQuery({
    queryKey: KEYS.all(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .select('*')
        .eq('org_id', organizationId)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SanitationWorkOrder[];
    },
    enabled: !!organizationId,
  });

  // ── Pending / In-Progress WOs ─────────────────────────────────────────────────
  const pendingQuery = useQuery({
    queryKey: KEYS.pending(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .select('*')
        .eq('org_id', organizationId)
        .in('status', ['pending', 'in_progress', 'awaiting_qa'])
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return (data || []) as SanitationWorkOrder[];
    },
    enabled: !!organizationId,
  });

  // ── Single WO by ID ───────────────────────────────────────────────────────────
  const useSingleWorkOrder = (id: string | null) =>
    useQuery({
      queryKey: KEYS.single(organizationId || '', id || ''),
      queryFn: async () => {
        if (!organizationId || !id) return null;
        const { data, error } = await supabase
          .from('sanitation_work_orders')
          .select('*')
          .eq('id', id)
          .eq('org_id', organizationId)
          .single();
        if (error) throw error;
        return data as SanitationWorkOrder;
      },
      enabled: !!organizationId && !!id,
    });

  // ── Invalidate ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['san_work_orders', organizationId || ''] });
  };

  // ── Shared hygiene log helper ─────────────────────────────────────────────────
  // Fires for any department's scheduled WO on completion
  const logHygieneOnComplete = (data: SanitationWorkOrder) => {
    const deptCode = String(data.department_id || 1002);
    const workOrderType = DEPT_WO_TYPE[deptCode] || 'sanitation';
    const deptName = DEPT_NAMES[deptCode] || 'Sanitation';

    autoLogRoomHygieneEntry({
      organizationId: organizationId || '',
      facilityId: facilityId || undefined,
      locationName: data.room || undefined,
      purpose: 'work_order',
      workOrderType,
      referenceId: data.id,
      referenceNumber: data.wo_number,
      departmentCode: deptCode,
      departmentName: deptName,
      performedById: user?.id,
      performedByName: user ? `${user.first_name} ${user.last_name}` : `${deptName} Tech`,
      description: `${deptName} task completed: ${data.task_name}`,
    }).catch(e => console.warn('[SanWO] autoLogRoomHygiene error:', e));
  };

  // ── Start Timer ───────────────────────────────────────────────────────────────
  const startTimerMutation = useMutation({
    mutationFn: async ({ id }: { id: string; isFirstStart?: boolean }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({ timer_started_at: now, status: 'in_progress' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SanitationWorkOrder;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
      invalidate();
    },
  });

  // ── Pause Timer ───────────────────────────────────────────────────────────────
  const pauseTimerMutation = useMutation({
    mutationFn: async ({ id, additionalSec }: { id: string; additionalSec: number }) => {
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
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
      invalidate();
    },
  });

  // ── Update Work Order (generic) ───────────────────────────────────────────────
  const updateWorkOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SanitationWorkOrder> }) => {
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
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
      invalidate();
    },
  });

  // ── Submit Tech Signature ─────────────────────────────────────────────────────
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
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
      invalidate();
      // Fire hygiene log only when fully completed (no QA required)
      if (data.status === 'completed') {
        logHygieneOnComplete(data);
      }
    },
  });

  // ── Submit QA Signature ───────────────────────────────────────────────────────
  const submitQASignatureMutation = useMutation({
    mutationFn: async ({
      id,
      initial,
      ppn,
      signedById,
    }: {
      id: string;
      initial: string;
      ppn: string;
      signedById: string;
    }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sanitation_work_orders')
        .update({
          qa_initial: initial.toUpperCase().trim(),
          qa_ppn: ppn.toUpperCase().trim(),
          qa_signed_at: now,
          qa_user_id: signedById,
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
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
      invalidate();
      // QA sign-off always means completed
      logHygieneOnComplete(data);
    },
  });

  // ── Add Photo ─────────────────────────────────────────────────────────────────
  const addPhotoMutation = useMutation({
    mutationFn: async ({ id, photo }: { id: string; photo: SanPhoto }) => {
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
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
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
      queryClient.setQueryData(KEYS.single(organizationId || '', data.id), data);
      invalidate();
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const computeElapsed = (wo: SanitationWorkOrder): number => {
    let total = wo.total_elapsed_sec ?? 0;
    if (wo.timer_started_at) {
      const started = new Date(wo.timer_started_at).getTime();
      total += Math.floor((Date.now() - started) / 1000);
    }
    return total;
  };

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

// Alias so screens can import either name
export const useSanitationWorkOrders = useSupabaseSanitationWorkOrders;
