import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface WorkOrderChemical {
  id: string;
  work_order_id: string;
  sds_record_id: string;
  product_name: string;
  manufacturer: string | null;
  sds_number: string | null;
  sds_master_number: number | null;
  department_prefix: string | null;
  contains_allergens: boolean;
  allergens: string[];
  usage_notes: string | null;
  logged_by: string | null;
  logged_at: string;
}

// Fetch chemicals linked to a work order
export function useWorkOrderChemicals(workOrderId: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['work_order_chemicals', workOrderId, organizationId],
    queryFn: async () => {
      if (!organizationId || !workOrderId) return [];
      const { data, error } = await supabase
        .from('work_order_chemicals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WorkOrderChemical[];
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1000 * 60 * 2,
  });
}

// Add a chemical to a work order (from SDS record)
export function useAddWorkOrderChemical() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (params: {
      workOrderId: string;
      sdsRecord: {
        id: string;
        product_name: string;
        manufacturer?: string | null;
        sds_number?: string | null;
        sds_master_number?: number | null;
        primary_department?: string | null;
        contains_allergens?: boolean;
        allergens?: string[];
      };
      usageNotes?: string;
      loggedBy?: string;
    }) => {
      if (!organizationId) throw new Error('No organization');

      const DEPT_PREFIXES: Record<string, string> = {
        maintenance: 'MAINT', sanitation: 'SANI', production: 'PROD',
        quality: 'QUAL', warehouse: 'WHSE', cold_storage: 'COLD',
        refrigeration: 'REFRIG', receiving: 'RECV', safety: 'SAFE', general: 'GEN',
      };

      const { data, error } = await supabase
        .from('work_order_chemicals')
        .insert({
          organization_id: organizationId,
          work_order_id: params.workOrderId,
          sds_record_id: params.sdsRecord.id,
          product_name: params.sdsRecord.product_name,
          manufacturer: params.sdsRecord.manufacturer || null,
          sds_number: params.sdsRecord.sds_number || null,
          sds_master_number: params.sdsRecord.sds_master_number || null,
          department_prefix: DEPT_PREFIXES[params.sdsRecord.primary_department || ''] || null,
          contains_allergens: params.sdsRecord.contains_allergens || false,
          allergens: params.sdsRecord.allergens || [],
          usage_notes: params.usageNotes || null,
          logged_by: params.loggedBy || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work_order_chemicals', variables.workOrderId] });
    },
  });
}

// Remove a chemical from a work order
export function useRemoveWorkOrderChemical() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; workOrderId: string }) => {
      const { error } = await supabase
        .from('work_order_chemicals')
        .delete()
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work_order_chemicals', variables.workOrderId] });
    },
  });
}
