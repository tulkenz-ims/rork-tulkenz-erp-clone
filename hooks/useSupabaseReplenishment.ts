import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import type { 
  ReorderPointSetting, 
  ReplenishmentSuggestion, 
  WeeklyReplenishmentPlan,
  WeeklyReplenishmentLineItem 
} from '@/types/inventory-replenishment';

type CreateReorderPointInput = Omit<ReorderPointSetting, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateSuggestionInput = Omit<ReplenishmentSuggestion, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateWeeklyPlanInput = Omit<WeeklyReplenishmentPlan, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseReplenishment() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useUser();

  const reorderPointsQuery = useQuery({
    queryKey: ['reorder-point-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseReplenishment] Fetching reorder point settings');

      const { data, error } = await supabase
        .from('reorder_point_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('material_name', { ascending: true });

      if (error) throw error;
      return (data || []) as ReorderPointSetting[];
    },
    enabled: !!organizationId,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['replenishment-suggestions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseReplenishment] Fetching replenishment suggestions');

      const { data, error } = await supabase
        .from('replenishment_suggestions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ReplenishmentSuggestion[];
    },
    enabled: !!organizationId,
  });

  const pendingSuggestionsQuery = useQuery({
    queryKey: ['replenishment-suggestions', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseReplenishment] Fetching pending suggestions');

      const { data, error } = await supabase
        .from('replenishment_suggestions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('suggested_order_date', { ascending: true });

      if (error) throw error;
      return (data || []) as ReplenishmentSuggestion[];
    },
    enabled: !!organizationId,
  });

  const weeklyPlansQuery = useQuery({
    queryKey: ['weekly-replenishment-plans', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseReplenishment] Fetching weekly replenishment plans');

      const { data, error } = await supabase
        .from('weekly_replenishment_plans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      return (data || []) as WeeklyReplenishmentPlan[];
    },
    enabled: !!organizationId,
  });

  const createReorderPointMutation = useMutation({
    mutationFn: async (input: CreateReorderPointInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseReplenishment] Creating reorder point setting');

      const { data, error } = await supabase
        .from('reorder_point_settings')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as ReorderPointSetting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-point-settings'] });
    },
  });

  const updateReorderPointMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReorderPointSetting> & { id: string }) => {
      console.log('[useSupabaseReplenishment] Updating reorder point setting:', id);

      const { data, error } = await supabase
        .from('reorder_point_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ReorderPointSetting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-point-settings'] });
    },
  });

  const deleteReorderPointMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseReplenishment] Deleting reorder point setting:', id);

      const { error } = await supabase
        .from('reorder_point_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-point-settings'] });
    },
  });

  const createSuggestionMutation = useMutation({
    mutationFn: async (input: CreateSuggestionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseReplenishment] Creating replenishment suggestion');

      const suggestionNumber = `RS-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('replenishment_suggestions')
        .insert({ 
          organization_id: organizationId, 
          suggestion_number: suggestionNumber,
          ...input 
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReplenishmentSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replenishment-suggestions'] });
    },
  });

  const approveSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseReplenishment] Approving suggestion:', id);

      const { data, error } = await supabase
        .from('replenishment_suggestions')
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
      return data as ReplenishmentSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replenishment-suggestions'] });
    },
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseReplenishment] Rejecting suggestion:', id);

      const { data, error } = await supabase
        .from('replenishment_suggestions')
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
      return data as ReplenishmentSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replenishment-suggestions'] });
    },
  });

  const convertSuggestionToPOMutation = useMutation({
    mutationFn: async ({ id, poNumber }: { id: string; poNumber: string }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseReplenishment] Converting suggestion to PO:', id);

      const { data, error } = await supabase
        .from('replenishment_suggestions')
        .update({
          status: 'converted',
          converted_to_po: true,
          po_number: poNumber,
          converted_at: new Date().toISOString(),
          converted_by: `${user.first_name} ${user.last_name}`,
          converted_by_id: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ReplenishmentSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replenishment-suggestions'] });
    },
  });

  const createWeeklyPlanMutation = useMutation({
    mutationFn: async (input: CreateWeeklyPlanInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseReplenishment] Creating weekly plan');

      const planNumber = `WRP-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('weekly_replenishment_plans')
        .insert({ 
          organization_id: organizationId, 
          plan_number: planNumber,
          ...input 
        })
        .select()
        .single();

      if (error) throw error;
      return data as WeeklyReplenishmentPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-replenishment-plans'] });
    },
  });

  const updateWeeklyPlanMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklyReplenishmentPlan> & { id: string }) => {
      console.log('[useSupabaseReplenishment] Updating weekly plan:', id);

      const { data, error } = await supabase
        .from('weekly_replenishment_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WeeklyReplenishmentPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-replenishment-plans'] });
    },
  });

  const submitWeeklyPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseReplenishment] Submitting weekly plan:', id);

      const { data, error } = await supabase
        .from('weekly_replenishment_plans')
        .update({
          status: 'pending_approval',
          submitted_by: `${user.first_name} ${user.last_name}`,
          submitted_by_id: user.id,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WeeklyReplenishmentPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-replenishment-plans'] });
    },
  });

  const approveWeeklyPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[useSupabaseReplenishment] Approving weekly plan:', id);

      const { data, error } = await supabase
        .from('weekly_replenishment_plans')
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
      return data as WeeklyReplenishmentPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-replenishment-plans'] });
    },
  });

  const calculateEOQ = (annualDemand: number, orderingCost: number, holdingCostPercent: number, unitCost: number): number => {
    const holdingCost = (holdingCostPercent / 100) * unitCost;
    if (holdingCost <= 0) return 0;
    return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
  };

  const getReorderPointByMaterial = (materialId: string) => {
    return reorderPointsQuery.data?.find(rp => rp.material_id === materialId);
  };

  const getSuggestionsByPriority = (priority: string) => {
    return suggestionsQuery.data?.filter(s => s.priority === priority) || [];
  };

  const getSuggestionsByStatus = (status: string) => {
    return suggestionsQuery.data?.filter(s => s.status === status) || [];
  };

  const generateSuggestionNumber = () => {
    return `RS-${Date.now().toString(36).toUpperCase()}`;
  };

  return {
    reorderPoints: reorderPointsQuery.data || [],
    suggestions: suggestionsQuery.data || [],
    pendingSuggestions: pendingSuggestionsQuery.data || [],
    weeklyPlans: weeklyPlansQuery.data || [],
    isLoading: reorderPointsQuery.isLoading || suggestionsQuery.isLoading,

    createReorderPoint: createReorderPointMutation.mutateAsync,
    updateReorderPoint: updateReorderPointMutation.mutateAsync,
    deleteReorderPoint: deleteReorderPointMutation.mutateAsync,

    createSuggestion: createSuggestionMutation.mutateAsync,
    approveSuggestion: approveSuggestionMutation.mutateAsync,
    rejectSuggestion: rejectSuggestionMutation.mutateAsync,
    convertSuggestionToPO: convertSuggestionToPOMutation.mutateAsync,

    createWeeklyPlan: createWeeklyPlanMutation.mutateAsync,
    updateWeeklyPlan: updateWeeklyPlanMutation.mutateAsync,
    submitWeeklyPlan: submitWeeklyPlanMutation.mutateAsync,
    approveWeeklyPlan: approveWeeklyPlanMutation.mutateAsync,

    calculateEOQ,
    getReorderPointByMaterial,
    getSuggestionsByPriority,
    getSuggestionsByStatus,
    generateSuggestionNumber,

    refetch: () => {
      reorderPointsQuery.refetch();
      suggestionsQuery.refetch();
      pendingSuggestionsQuery.refetch();
      weeklyPlansQuery.refetch();
    },
  };
}
