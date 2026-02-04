import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface MetalDetectorLog {
  id: string;
  organization_id: string;
  facility_id: string | null;
  detector_id: string;
  detector_name: string;
  detector_location: string | null;
  line_number: string | null;
  check_date: string;
  check_time: string;
  check_type: 'startup' | 'hourly' | 'lot_change' | 'product_change' | 'shutdown' | 'after_reject' | 'verification';
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  ferrous_standard_size: number | null;
  non_ferrous_standard_size: number | null;
  stainless_standard_size: number | null;
  standard_unit: string;
  ferrous_detected: boolean | null;
  non_ferrous_detected: boolean | null;
  stainless_detected: boolean | null;
  all_standards_detected: boolean;
  sensitivity_ferrous: number | null;
  sensitivity_non_ferrous: number | null;
  sensitivity_stainless: number | null;
  reject_system_tested: boolean;
  reject_system_functional: boolean | null;
  reject_bin_checked: boolean;
  reject_bin_empty: boolean | null;
  rejects_found: number;
  test_failed: boolean;
  failure_reason: string | null;
  corrective_action: string | null;
  corrective_action_time: string | null;
  products_held_from: string | null;
  products_held_to: string | null;
  retest_passed: boolean | null;
  retest_time: string | null;
  tested_by: string;
  tested_by_id: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  status: 'pass' | 'fail' | 'corrected' | 'pending_verification';
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export type MetalDetectorLogInsert = Omit<MetalDetectorLog, 'id' | 'created_at' | 'updated_at'>;

export function useMetalDetectorLogs(dateFilter?: string) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['metal_detector_logs', organizationId, dateFilter],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      let query = supabase
        .from('metal_detector_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('check_date', { ascending: false })
        .order('check_time', { ascending: false });

      if (dateFilter) {
        query = query.eq('check_date', dateFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[useMetalDetectorLogs] Fetch error:', error);
        throw error;
      }
      
      console.log('[useMetalDetectorLogs] Fetched:', data?.length || 0, 'records');
      return data as MetalDetectorLog[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (log: MetalDetectorLogInsert) => {
      const { data, error } = await supabase
        .from('metal_detector_logs')
        .insert(log)
        .select()
        .single();

      if (error) {
        console.error('[useMetalDetectorLogs] Create error:', error);
        throw error;
      }
      
      console.log('[useMetalDetectorLogs] Created:', data.id);
      return data as MetalDetectorLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metal_detector_logs'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MetalDetectorLog> }) => {
      const { data, error } = await supabase
        .from('metal_detector_logs')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useMetalDetectorLogs] Update error:', error);
        throw error;
      }
      
      console.log('[useMetalDetectorLogs] Updated:', id);
      return data as MetalDetectorLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metal_detector_logs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('metal_detector_logs')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useMetalDetectorLogs] Delete error:', error);
        throw error;
      }
      
      console.log('[useMetalDetectorLogs] Deleted:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metal_detector_logs'] });
    },
  });

  return {
    logs: logsQuery.data || [],
    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    error: logsQuery.error,
    refetch: logsQuery.refetch,
    createLog: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLog: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLog: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
