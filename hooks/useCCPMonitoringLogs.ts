import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface CCPMonitoringLog {
  id: string;
  organization_id: string;
  facility_id: string | null;
  ccp_number: string;
  ccp_name: string;
  ccp_type: 'cooking' | 'cooling' | 'hot_holding' | 'cold_holding' | 'receiving' | 'metal_detection' | 'other';
  process_step: string;
  monitoring_date: string;
  monitoring_time: string;
  monitoring_frequency: 'continuous' | 'every_15_min' | 'every_30_min' | 'hourly' | 'per_batch' | 'per_lot' | null;
  critical_limit_min: number | null;
  critical_limit_max: number | null;
  critical_limit_unit: string | null;
  target_value: number | null;
  actual_value: number;
  is_within_limits: boolean;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_tag: string | null;
  deviation_occurred: boolean;
  corrective_action_taken: string | null;
  corrective_action_time: string | null;
  product_disposition: 'released' | 'held' | 'reworked' | 'destroyed' | 'returned' | 'n/a' | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  verification_method: string | null;
  recorded_by: string;
  recorded_by_id: string | null;
  status: 'recorded' | 'verified' | 'flagged' | 'corrected';
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export type CCPMonitoringLogInsert = Omit<CCPMonitoringLog, 'id' | 'created_at' | 'updated_at'>;

export function useCCPMonitoringLogs(dateFilter?: string) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['ccp_monitoring_logs', organizationId, dateFilter],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      let query = supabase
        .from('ccp_monitoring_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('monitoring_date', { ascending: false })
        .order('monitoring_time', { ascending: false });

      if (dateFilter) {
        query = query.eq('monitoring_date', dateFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[useCCPMonitoringLogs] Fetch error:', error);
        throw error;
      }
      
      console.log('[useCCPMonitoringLogs] Fetched:', data?.length || 0, 'records');
      return data as CCPMonitoringLog[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (log: CCPMonitoringLogInsert) => {
      const { data, error } = await supabase
        .from('ccp_monitoring_logs')
        .insert(log)
        .select()
        .single();

      if (error) {
        console.error('[useCCPMonitoringLogs] Create error:', error);
        throw error;
      }
      
      console.log('[useCCPMonitoringLogs] Created:', data.id);
      return data as CCPMonitoringLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ccp_monitoring_logs'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CCPMonitoringLog> }) => {
      const { data, error } = await supabase
        .from('ccp_monitoring_logs')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useCCPMonitoringLogs] Update error:', error);
        throw error;
      }
      
      console.log('[useCCPMonitoringLogs] Updated:', id);
      return data as CCPMonitoringLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ccp_monitoring_logs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ccp_monitoring_logs')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useCCPMonitoringLogs] Delete error:', error);
        throw error;
      }
      
      console.log('[useCCPMonitoringLogs] Deleted:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ccp_monitoring_logs'] });
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
