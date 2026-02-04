import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface CheckItem {
  id: string;
  name: string;
  category: string;
  result: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface IssueFound {
  id: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  resolved: boolean;
}

export interface CorrectiveAction {
  id: string;
  issue_id: string;
  action: string;
  completed: boolean;
  completed_at?: string;
}

export interface ProductionLineCheck {
  id: string;
  organization_id: string;
  facility_id: string | null;
  line_number: string;
  line_name: string;
  area: string | null;
  check_date: string;
  check_time: string;
  shift: '1st' | '2nd' | '3rd' | 'day' | 'night' | null;
  check_type: 'startup' | 'hourly' | 'changeover' | 'shutdown' | 'random';
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  check_items: CheckItem[];
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  overall_result: 'pass' | 'fail' | 'conditional';
  issues_found: IssueFound[];
  corrective_actions: CorrectiveAction[];
  checked_by: string;
  checked_by_id: string | null;
  supervisor_name: string | null;
  supervisor_id: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  status: 'in_progress' | 'completed' | 'verified' | 'requires_action';
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export type ProductionLineCheckInsert = Omit<ProductionLineCheck, 'id' | 'created_at' | 'updated_at'>;

export function useProductionLineChecks(dateFilter?: string) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const checksQuery = useQuery({
    queryKey: ['production_line_checks', organizationId, dateFilter],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      let query = supabase
        .from('production_line_checks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('check_date', { ascending: false })
        .order('check_time', { ascending: false });

      if (dateFilter) {
        query = query.eq('check_date', dateFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[useProductionLineChecks] Fetch error:', error);
        throw error;
      }
      
      console.log('[useProductionLineChecks] Fetched:', data?.length || 0, 'records');
      return data as ProductionLineCheck[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (check: ProductionLineCheckInsert) => {
      const { data, error } = await supabase
        .from('production_line_checks')
        .insert(check)
        .select()
        .single();

      if (error) {
        console.error('[useProductionLineChecks] Create error:', error);
        throw error;
      }
      
      console.log('[useProductionLineChecks] Created:', data.id);
      return data as ProductionLineCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_line_checks'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductionLineCheck> }) => {
      const { data, error } = await supabase
        .from('production_line_checks')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useProductionLineChecks] Update error:', error);
        throw error;
      }
      
      console.log('[useProductionLineChecks] Updated:', id);
      return data as ProductionLineCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_line_checks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('production_line_checks')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useProductionLineChecks] Delete error:', error);
        throw error;
      }
      
      console.log('[useProductionLineChecks] Deleted:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_line_checks'] });
    },
  });

  return {
    checks: checksQuery.data || [],
    isLoading: checksQuery.isLoading,
    isError: checksQuery.isError,
    error: checksQuery.error,
    refetch: checksQuery.refetch,
    createCheck: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCheck: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCheck: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
