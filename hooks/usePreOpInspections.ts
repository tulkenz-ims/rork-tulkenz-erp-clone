import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface InspectionCheckItem {
  id: string;
  name: string;
  result: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface InspectionIssue {
  id: string;
  category: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  resolved: boolean;
}

export interface InspectionCorrectiveAction {
  id: string;
  issue_id: string;
  action: string;
  responsible: string;
  due_time?: string;
  completed: boolean;
}

export interface PreOpInspection {
  id: string;
  organization_id: string;
  facility_id: string | null;
  inspection_date: string;
  inspection_time: string;
  shift: '1st' | '2nd' | '3rd' | 'day' | 'night' | null;
  area_name: string;
  line_number: string | null;
  room_number: string | null;
  sanitation_checks: InspectionCheckItem[];
  equipment_checks: InspectionCheckItem[];
  safety_checks: InspectionCheckItem[];
  allergen_checks: InspectionCheckItem[];
  gmp_checks: InspectionCheckItem[];
  total_items: number;
  passed_items: number;
  failed_items: number;
  na_items: number;
  overall_result: 'acceptable' | 'unacceptable' | 'conditional';
  issues_found: InspectionIssue[];
  corrective_actions: InspectionCorrectiveAction[];
  line_released: boolean;
  released_at: string | null;
  released_by: string | null;
  released_by_id: string | null;
  hold_reason: string | null;
  inspector_name: string;
  inspector_id: string | null;
  supervisor_name: string | null;
  supervisor_id: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  status: 'in_progress' | 'completed' | 'verified' | 'released' | 'on_hold';
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export type PreOpInspectionInsert = Omit<PreOpInspection, 'id' | 'created_at' | 'updated_at'>;

export function usePreOpInspections(dateFilter?: string) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const inspectionsQuery = useQuery({
    queryKey: ['pre_op_inspections', organizationId, dateFilter],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      let query = supabase
        .from('pre_op_inspections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('inspection_date', { ascending: false })
        .order('inspection_time', { ascending: false });

      if (dateFilter) {
        query = query.eq('inspection_date', dateFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[usePreOpInspections] Fetch error:', error);
        throw error;
      }
      
      console.log('[usePreOpInspections] Fetched:', data?.length || 0, 'records');
      return data as PreOpInspection[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (inspection: PreOpInspectionInsert) => {
      const { data, error } = await supabase
        .from('pre_op_inspections')
        .insert(inspection)
        .select()
        .single();

      if (error) {
        console.error('[usePreOpInspections] Create error:', error);
        throw error;
      }
      
      console.log('[usePreOpInspections] Created:', data.id);
      return data as PreOpInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre_op_inspections'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PreOpInspection> }) => {
      const { data, error } = await supabase
        .from('pre_op_inspections')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[usePreOpInspections] Update error:', error);
        throw error;
      }
      
      console.log('[usePreOpInspections] Updated:', id);
      return data as PreOpInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre_op_inspections'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pre_op_inspections')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[usePreOpInspections] Delete error:', error);
        throw error;
      }
      
      console.log('[usePreOpInspections] Deleted:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre_op_inspections'] });
    },
  });

  return {
    inspections: inspectionsQuery.data || [],
    isLoading: inspectionsQuery.isLoading,
    isError: inspectionsQuery.isError,
    error: inspectionsQuery.error,
    refetch: inspectionsQuery.refetch,
    createInspection: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateInspection: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteInspection: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
