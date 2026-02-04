import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import type { 
  AdjustmentReason, 
  InventoryAdjustment, 
  VarianceRecord,
  InventoryReserve,
  InventoryAuditTrailEntry 
} from '@/types/inventory-adjustments';

type CreateAdjustmentReasonInput = Omit<AdjustmentReason, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateAdjustmentInput = Omit<InventoryAdjustment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateVarianceInput = Omit<VarianceRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateReserveInput = Omit<InventoryReserve, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseAdjustments() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useUser();

  const reasonsQuery = useQuery({
    queryKey: ['adjustment-reasons', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching adjustment reasons');

      const { data, error } = await supabase
        .from('adjustment_reasons')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as AdjustmentReason[];
    },
    enabled: !!organizationId,
  });

  const activeReasonsQuery = useQuery({
    queryKey: ['adjustment-reasons', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching active adjustment reasons');

      const { data, error } = await supabase
        .from('adjustment_reasons')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as AdjustmentReason[];
    },
    enabled: !!organizationId,
  });

  const adjustmentsQuery = useQuery({
    queryKey: ['inventory-adjustments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching inventory adjustments');

      const { data, error } = await supabase
        .from('inventory_adjustments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InventoryAdjustment[];
    },
    enabled: !!organizationId,
  });

  const pendingAdjustmentsQuery = useQuery({
    queryKey: ['inventory-adjustments', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching pending adjustments');

      const { data, error } = await supabase
        .from('inventory_adjustments')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'pending_approval'])
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InventoryAdjustment[];
    },
    enabled: !!organizationId,
  });

  const variancesQuery = useQuery({
    queryKey: ['variance-records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching variance records');

      const { data, error } = await supabase
        .from('variance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('counted_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VarianceRecord[];
    },
    enabled: !!organizationId,
  });

  const pendingVariancesQuery = useQuery({
    queryKey: ['variance-records', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching pending variances');

      const { data, error } = await supabase
        .from('variance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending_review', 'under_investigation'])
        .order('severity', { ascending: false })
        .order('counted_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VarianceRecord[];
    },
    enabled: !!organizationId,
  });

  const reservesQuery = useQuery({
    queryKey: ['inventory-reserves', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching inventory reserves');

      const { data, error } = await supabase
        .from('inventory_reserves')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InventoryReserve[];
    },
    enabled: !!organizationId,
  });

  const activeReservesQuery = useQuery({
    queryKey: ['inventory-reserves', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching active reserves');

      const { data, error } = await supabase
        .from('inventory_reserves')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InventoryReserve[];
    },
    enabled: !!organizationId,
  });

  const auditTrailQuery = useQuery({
    queryKey: ['inventory-audit-trail', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAdjustments] Fetching audit trail');

      const { data, error } = await supabase
        .from('inventory_audit_trail')
        .select('*')
        .eq('organization_id', organizationId)
        .order('performed_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as InventoryAuditTrailEntry[];
    },
    enabled: !!organizationId,
  });

  const createReasonMutation = useMutation({
    mutationFn: async (input: CreateAdjustmentReasonInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseAdjustments] Creating adjustment reason');

      const { data, error } = await supabase
        .from('adjustment_reasons')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as AdjustmentReason;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustment-reasons'] });
    },
  });

  const updateReasonMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdjustmentReason> & { id: string }) => {
      console.log('[useSupabaseAdjustments] Updating adjustment reason:', id);

      const { data, error } = await supabase
        .from('adjustment_reasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AdjustmentReason;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustment-reasons'] });
    },
  });

  const deleteReasonMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseAdjustments] Deleting adjustment reason:', id);

      const { error } = await supabase
        .from('adjustment_reasons')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustment-reasons'] });
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (input: CreateAdjustmentInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseAdjustments] Creating inventory adjustment');

      const adjustmentNumber = `ADJ-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('inventory_adjustments')
        .insert({ 
          organization_id: organizationId, 
          adjustment_number: adjustmentNumber,
          ...input 
        })
        .select()
        .single();

      if (error) throw error;
      return data as InventoryAdjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-audit-trail'] });
    },
  });

  const approveAdjustmentMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseAdjustments] Approving adjustment:', id);

      const { data, error } = await supabase
        .from('inventory_adjustments')
        .update({
          status: 'approved',
          approved_by: `${user.first_name} ${user.last_name}`,
          approved_by_id: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryAdjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
    },
  });

  const rejectAdjustmentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseAdjustments] Rejecting adjustment:', id);

      const { data, error } = await supabase
        .from('inventory_adjustments')
        .update({
          status: 'rejected',
          rejected_by: `${user.first_name} ${user.last_name}`,
          rejected_by_id: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryAdjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
    },
  });

  const postAdjustmentMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseAdjustments] Posting adjustment:', id);

      const { data, error } = await supabase
        .from('inventory_adjustments')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: `${user.first_name} ${user.last_name}`,
          posted_by_id: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryAdjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-audit-trail'] });
    },
  });

  const createVarianceMutation = useMutation({
    mutationFn: async (input: CreateVarianceInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseAdjustments] Creating variance record');

      const varianceNumber = `VAR-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('variance_records')
        .insert({ 
          organization_id: organizationId, 
          variance_number: varianceNumber,
          ...input 
        })
        .select()
        .single();

      if (error) throw error;
      return data as VarianceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-records'] });
    },
  });

  const reviewVarianceMutation = useMutation({
    mutationFn: async ({ id, notes, rootCause, rootCauseCategory, resolution }: { 
      id: string; 
      notes: string;
      rootCause?: string;
      rootCauseCategory?: VarianceRecord['root_cause_category'];
      resolution?: VarianceRecord['resolution'];
    }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseAdjustments] Reviewing variance:', id);

      const { data, error } = await supabase
        .from('variance_records')
        .update({
          status: resolution === 'investigate' ? 'under_investigation' : 'approved',
          reviewed_by: `${user.first_name} ${user.last_name}`,
          reviewed_by_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          root_cause: rootCause,
          root_cause_category: rootCauseCategory,
          resolution,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as VarianceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-records'] });
    },
  });

  const createReserveMutation = useMutation({
    mutationFn: async (input: CreateReserveInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseAdjustments] Creating inventory reserve');

      const reserveNumber = `RES-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('inventory_reserves')
        .insert({ 
          organization_id: organizationId, 
          reserve_number: reserveNumber,
          ...input 
        })
        .select()
        .single();

      if (error) throw error;
      return data as InventoryReserve;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-reserves'] });
    },
  });

  const releaseReserveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseAdjustments] Releasing reserve:', id);

      const { data, error } = await supabase
        .from('inventory_reserves')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          released_by: `${user.first_name} ${user.last_name}`,
          released_by_id: user.id,
          release_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryReserve;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-reserves'] });
    },
  });

  const getReasonsByCategory = (category: AdjustmentReason['category']) => {
    return activeReasonsQuery.data?.filter(r => r.category === category) || [];
  };

  const getAdjustmentsByStatus = (status: InventoryAdjustment['status']) => {
    return adjustmentsQuery.data?.filter(a => a.status === status) || [];
  };

  const getAdjustmentsByMaterial = (materialId: string) => {
    return adjustmentsQuery.data?.filter(a => a.material_id === materialId) || [];
  };

  const getVariancesBySeverity = (severity: VarianceRecord['severity']) => {
    return variancesQuery.data?.filter(v => v.severity === severity) || [];
  };

  const getAuditTrailByMaterial = (materialId: string) => {
    return auditTrailQuery.data?.filter(a => a.material_id === materialId) || [];
  };

  const getReservesByMaterial = (materialId: string) => {
    return reservesQuery.data?.filter(r => r.material_id === materialId) || [];
  };

  return {
    reasons: reasonsQuery.data || [],
    activeReasons: activeReasonsQuery.data || [],
    adjustments: adjustmentsQuery.data || [],
    pendingAdjustments: pendingAdjustmentsQuery.data || [],
    variances: variancesQuery.data || [],
    pendingVariances: pendingVariancesQuery.data || [],
    reserves: reservesQuery.data || [],
    activeReserves: activeReservesQuery.data || [],
    auditTrail: auditTrailQuery.data || [],
    isLoading: reasonsQuery.isLoading || adjustmentsQuery.isLoading,

    createReason: createReasonMutation.mutateAsync,
    updateReason: updateReasonMutation.mutateAsync,
    deleteReason: deleteReasonMutation.mutateAsync,

    createAdjustment: createAdjustmentMutation.mutateAsync,
    approveAdjustment: approveAdjustmentMutation.mutateAsync,
    rejectAdjustment: rejectAdjustmentMutation.mutateAsync,
    postAdjustment: postAdjustmentMutation.mutateAsync,

    createVariance: createVarianceMutation.mutateAsync,
    reviewVariance: reviewVarianceMutation.mutateAsync,

    createReserve: createReserveMutation.mutateAsync,
    releaseReserve: releaseReserveMutation.mutateAsync,

    getReasonsByCategory,
    getAdjustmentsByStatus,
    getAdjustmentsByMaterial,
    getVariancesBySeverity,
    getAuditTrailByMaterial,
    getReservesByMaterial,

    refetch: () => {
      reasonsQuery.refetch();
      adjustmentsQuery.refetch();
      pendingAdjustmentsQuery.refetch();
      variancesQuery.refetch();
      pendingVariancesQuery.refetch();
      reservesQuery.refetch();
      auditTrailQuery.refetch();
    },
  };
}
