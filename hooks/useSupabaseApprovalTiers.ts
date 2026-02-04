import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  ApprovalTier,
  TierConfiguration,
  TierStats,
  ApprovalTierLevel,
  WorkflowCategory,
  TierApprover,
  ApproverLimit,
  TierThreshold,
} from '@/types/approvalWorkflows';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

function mapDbTierToTier(dbTier: Record<string, unknown>): ApprovalTier {
  return {
    id: dbTier.id as string,
    name: dbTier.name as string,
    description: dbTier.description as string,
    level: dbTier.level as ApprovalTierLevel,
    category: dbTier.category as WorkflowCategory,
    isActive: dbTier.is_active as boolean,
    thresholds: (dbTier.thresholds as TierThreshold[]) || [],
    approvers: (dbTier.approvers as TierApprover[]) || [],
    requireAllApprovers: dbTier.require_all_approvers as boolean,
    autoEscalateHours: dbTier.auto_escalate_hours as number | undefined,
    autoApproveOnTimeout: dbTier.auto_approve_on_timeout as boolean,
    notifyOnEscalation: dbTier.notify_on_escalation as boolean,
    maxApprovalDays: dbTier.max_approval_days as number,
    color: dbTier.color as string,
    icon: dbTier.icon as string | undefined,
    createdAt: dbTier.created_at as string,
    createdBy: dbTier.created_by as string,
    updatedAt: dbTier.updated_at as string,
    updatedBy: dbTier.updated_by as string,
  };
}

function mapDbConfigToConfig(dbConfig: Record<string, unknown>): TierConfiguration {
  return {
    id: dbConfig.id as string,
    name: dbConfig.name as string,
    description: dbConfig.description as string,
    category: dbConfig.category as WorkflowCategory,
    isDefault: dbConfig.is_default as boolean,
    isActive: dbConfig.is_active as boolean,
    tiers: [],
    createdAt: dbConfig.created_at as string,
    createdBy: dbConfig.created_by as string,
    updatedAt: dbConfig.updated_at as string,
    updatedBy: dbConfig.updated_by as string,
  };
}

export function useApprovalTiersQuery(options?: { 
  filters?: { category?: WorkflowCategory; level?: ApprovalTierLevel; isActive?: boolean };
  enabled?: boolean 
}) {
  const { company } = useUser();
  const organizationId = company?.id;
  const enabled = options?.enabled;
  const filters = options?.filters;
  
  return useQuery({
    queryKey: ['approval_tiers', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useApprovalTiersQuery] No organization ID');
        return [];
      }
      
      console.log('[useApprovalTiersQuery] Fetching tiers with filters:', filters);
      
      let query = supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      query = query.order('level', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useApprovalTiersQuery] Error:', error);
        throw error;
      }
      
      const result = (data || []).map(mapDbTierToTier);
      console.log('[useApprovalTiersQuery] Fetched tiers:', result.length);
      return result;
    },
    enabled: enabled !== false && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useApprovalTierById(id: string | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['approval_tiers', 'byId', id, organizationId],
    queryFn: async () => {
      if (!id || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('[useApprovalTierById] Error:', error);
        return null;
      }
      
      console.log('[useApprovalTierById] Fetched tier:', data?.id);
      return data ? mapDbTierToTier(data) : null;
    },
    enabled: !!id && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useApprovalTiersByCategory(category: WorkflowCategory | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['approval_tiers', 'byCategory', category, organizationId],
    queryFn: async () => {
      if (!category || !organizationId) return [];
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .eq('is_active', true)
        .order('level', { ascending: true });
      
      if (error) {
        console.error('[useApprovalTiersByCategory] Error:', error);
        return [];
      }
      
      const result = (data || []).map(mapDbTierToTier);
      console.log('[useApprovalTiersByCategory] Fetched:', result.length, 'for category:', category);
      return result;
    },
    enabled: !!category && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useApprovalTiersByLevel(level: ApprovalTierLevel | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['approval_tiers', 'byLevel', level, organizationId],
    queryFn: async () => {
      if (!level || !organizationId) return [];
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('level', level)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('[useApprovalTiersByLevel] Error:', error);
        return [];
      }
      
      const result = (data || []).map(mapDbTierToTier);
      console.log('[useApprovalTiersByLevel] Fetched:', result.length, 'for level:', level);
      return result;
    },
    enabled: !!level && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveTiers() {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['approval_tiers', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('level', { ascending: true });
      
      if (error) {
        console.error('[useActiveTiers] Error:', error);
        return [];
      }
      
      const result = (data || []).map(mapDbTierToTier);
      console.log('[useActiveTiers] Fetched:', result.length);
      return result;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTierConfigurationsQuery(options?: { 
  filters?: { category?: WorkflowCategory; isActive?: boolean };
  enabled?: boolean 
}) {
  const { company } = useUser();
  const organizationId = company?.id;
  const enabled = options?.enabled;
  const filters = options?.filters;
  
  return useQuery({
    queryKey: ['tier_configurations', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('[useTierConfigurationsQuery] Fetching configurations with filters:', filters);
      
      let query = supabase
        .from('tier_configurations')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      query = query.order('name', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useTierConfigurationsQuery] Error:', error);
        return [];
      }
      
      const result = (data || []).map(mapDbConfigToConfig);
      console.log('[useTierConfigurationsQuery] Fetched configurations:', result.length);
      return result;
    },
    enabled: enabled !== false && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTierConfigurationById(id: string | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['tier_configurations', 'byId', id, organizationId],
    queryFn: async () => {
      if (!id || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('tier_configurations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('[useTierConfigurationById] Error:', error);
        return null;
      }
      
      console.log('[useTierConfigurationById] Fetched configuration:', data?.id);
      return data ? mapDbConfigToConfig(data) : null;
    },
    enabled: !!id && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTierConfigurationWithTiers(id: string | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['tier_configurations', 'withTiers', id, organizationId],
    queryFn: async () => {
      if (!id || !organizationId) return null;
      
      const { data: config, error: configError } = await supabase
        .from('tier_configurations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (configError || !config) {
        console.error('[useTierConfigurationWithTiers] Config error:', configError);
        return null;
      }
      
      const { data: tiers, error: tiersError } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', config.category)
        .order('level', { ascending: true });
      
      if (tiersError) {
        console.error('[useTierConfigurationWithTiers] Tiers error:', tiersError);
      }
      
      const mappedConfig = mapDbConfigToConfig(config);
      mappedConfig.tiers = (tiers || []).map(mapDbTierToTier);
      
      console.log('[useTierConfigurationWithTiers] Fetched config with', mappedConfig.tiers.length, 'tiers');
      return mappedConfig;
    },
    enabled: !!id && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDefaultTierConfiguration(category: WorkflowCategory | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['tier_configurations', 'default', category, organizationId],
    queryFn: async () => {
      if (!category || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('tier_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[useDefaultTierConfiguration] Error:', error);
        }
        return null;
      }
      
      console.log('[useDefaultTierConfiguration] Fetched default for:', category, data?.id);
      return data ? mapDbConfigToConfig(data) : null;
    },
    enabled: !!category && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTierStats() {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['tier_stats', organizationId],
    queryFn: async (): Promise<TierStats> => {
      if (!organizationId) {
        return {
          totalConfigurations: 0,
          activeConfigurations: 0,
          totalTiers: 0,
          tiersByLevel: [],
          tiersByCategory: [],
          avgApprovalTime: [],
        };
      }
      
      const { data: configs } = await supabase
        .from('tier_configurations')
        .select('id, is_active')
        .eq('organization_id', organizationId);
      
      const { data: tiers } = await supabase
        .from('approval_tiers')
        .select('id, level, category')
        .eq('organization_id', organizationId);
      
      const totalConfigurations = configs?.length || 0;
      const activeConfigurations = configs?.filter(c => c.is_active).length || 0;
      const totalTiers = tiers?.length || 0;
      
      const levels: ApprovalTierLevel[] = [1, 2, 3, 4, 5];
      const tiersByLevel = levels.map(level => ({
        level,
        count: tiers?.filter(t => t.level === level).length || 0,
      }));
      
      const categories: WorkflowCategory[] = ['purchase', 'time_off', 'permit', 'expense', 'contract', 'custom'];
      const tiersByCategory = categories.map(category => ({
        category,
        count: tiers?.filter(t => t.category === category).length || 0,
      }));
      
      const avgApprovalTime = levels.map(level => ({
        level,
        hours: level * 12,
      }));
      
      console.log('[useTierStats] Computed stats:', { totalConfigurations, activeConfigurations, totalTiers });
      
      return {
        totalConfigurations,
        activeConfigurations,
        totalTiers,
        tiersByLevel,
        tiersByCategory,
        avgApprovalTime,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateApprovalTier() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async (tier: Omit<ApprovalTier, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .insert({
          organization_id: organizationId,
          name: tier.name,
          description: tier.description,
          level: tier.level,
          category: tier.category,
          is_active: tier.isActive,
          thresholds: tier.thresholds,
          approvers: tier.approvers,
          require_all_approvers: tier.requireAllApprovers,
          auto_escalate_hours: tier.autoEscalateHours,
          auto_approve_on_timeout: tier.autoApproveOnTimeout,
          notify_on_escalation: tier.notifyOnEscalation,
          max_approval_days: tier.maxApprovalDays,
          color: tier.color,
          icon: tier.icon,
          created_by: user?.id || 'system',
          updated_by: user?.id || 'system',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[useCreateApprovalTier] Created tier:', data.id);
      return mapDbTierToTier(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useUpdateApprovalTier() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApprovalTier> & { id: string }) => {
      if (!organizationId) throw new Error('No organization');
      
      const dbUpdates: Record<string, unknown> = {
        updated_by: user?.id || 'system',
      };
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.thresholds !== undefined) dbUpdates.thresholds = updates.thresholds;
      if (updates.approvers !== undefined) dbUpdates.approvers = updates.approvers;
      if (updates.requireAllApprovers !== undefined) dbUpdates.require_all_approvers = updates.requireAllApprovers;
      if (updates.autoEscalateHours !== undefined) dbUpdates.auto_escalate_hours = updates.autoEscalateHours;
      if (updates.autoApproveOnTimeout !== undefined) dbUpdates.auto_approve_on_timeout = updates.autoApproveOnTimeout;
      if (updates.notifyOnEscalation !== undefined) dbUpdates.notify_on_escalation = updates.notifyOnEscalation;
      if (updates.maxApprovalDays !== undefined) dbUpdates.max_approval_days = updates.maxApprovalDays;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[useUpdateApprovalTier] Updated tier:', id);
      return mapDbTierToTier(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers', 'byId', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useDeleteApprovalTier() {
  const queryClient = useQueryClient();
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization');
      
      const { error } = await supabase
        .from('approval_tiers')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      
      console.log('[useDeleteApprovalTier] Deleted tier:', id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useCreateTierConfiguration() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async (config: Omit<TierConfiguration, 'id' | 'createdAt' | 'updatedAt' | 'tiers'>) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data, error } = await supabase
        .from('tier_configurations')
        .insert({
          organization_id: organizationId,
          name: config.name,
          description: config.description,
          category: config.category,
          is_default: config.isDefault,
          is_active: config.isActive,
          created_by: user?.id || 'system',
          updated_by: user?.id || 'system',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[useCreateTierConfiguration] Created configuration:', data.id);
      return mapDbConfigToConfig(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier_configurations'] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useUpdateTierConfiguration() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TierConfiguration> & { id: string }) => {
      if (!organizationId) throw new Error('No organization');
      
      const dbUpdates: Record<string, unknown> = {
        updated_by: user?.id || 'system',
      };
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      
      const { data, error } = await supabase
        .from('tier_configurations')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[useUpdateTierConfiguration] Updated configuration:', id);
      return mapDbConfigToConfig(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tier_configurations'] });
      queryClient.invalidateQueries({ queryKey: ['tier_configurations', 'byId', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tier_configurations', 'withTiers', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useDeleteTierConfiguration() {
  const queryClient = useQueryClient();
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization');
      
      const { error } = await supabase
        .from('tier_configurations')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      
      console.log('[useDeleteTierConfiguration] Deleted configuration:', id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier_configurations'] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useDuplicateTierConfiguration() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ sourceId, newName }: { sourceId: string; newName: string }) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data: source, error: sourceError } = await supabase
        .from('tier_configurations')
        .select('*')
        .eq('id', sourceId)
        .eq('organization_id', organizationId)
        .single();
      
      if (sourceError || !source) throw new Error('Source configuration not found');
      
      const { data, error } = await supabase
        .from('tier_configurations')
        .insert({
          organization_id: organizationId,
          name: newName,
          description: source.description,
          category: source.category,
          is_default: false,
          is_active: false,
          created_by: user?.id || 'system',
          updated_by: user?.id || 'system',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[useDuplicateTierConfiguration] Duplicated configuration:', sourceId, 'to', data.id);
      return mapDbConfigToConfig(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier_configurations'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    },
  });
}

export function useMatchTierForAmount(category: WorkflowCategory | undefined, amount: number | undefined) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['approval_tiers', 'matchAmount', category, amount, organizationId],
    queryFn: async () => {
      if (!category || amount === undefined || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .eq('is_active', true)
        .order('level', { ascending: true });
      
      if (error) {
        console.error('[useMatchTierForAmount] Error:', error);
        return null;
      }
      
      const tiers = (data || []).map(mapDbTierToTier);
      
      if (tiers.length === 0) return null;
      
      for (const tier of tiers) {
        if (!tier.thresholds || tier.thresholds.length === 0) continue;
        
        const amountThreshold = tier.thresholds.find(t => t.triggerType === 'amount');
        if (!amountThreshold) continue;
        
        const { operator, value, valueEnd } = amountThreshold;
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        const numValueEnd = valueEnd ? (typeof valueEnd === 'number' ? valueEnd : parseFloat(String(valueEnd))) : undefined;
        
        let matches = false;
        switch (operator) {
          case 'less_than':
            matches = amount < numValue;
            break;
          case 'greater_than':
            matches = amount > numValue;
            break;
          case 'between':
            matches = numValueEnd !== undefined && amount >= numValue && amount <= numValueEnd;
            break;
          case 'equals':
            matches = amount === numValue;
            break;
        }
        
        if (matches) {
          console.log('[useMatchTierForAmount] Matched tier:', tier.name, 'for amount:', amount);
          return tier;
        }
      }
      
      const lastTier = tiers[tiers.length - 1];
      console.log('[useMatchTierForAmount] Defaulting to highest tier:', lastTier?.name);
      return lastTier;
    },
    enabled: !!category && amount !== undefined && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useResetTierData() {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
    queryClient.invalidateQueries({ queryKey: ['tier_configurations'] });
    queryClient.invalidateQueries({ queryKey: ['tier_stats'] });
    console.log('[useResetTierData] Invalidated all tier data');
  }, [queryClient]);
}

export function useAddTierApprover() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ tierId, approver }: { tierId: string; approver: Omit<TierApprover, 'id' | 'order'> }) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data: tier, error: fetchError } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !tier) throw new Error('Tier not found');
      
      const existingApprovers = (tier.approvers as TierApprover[]) || [];
      const newApprover: TierApprover = {
        ...approver,
        id: `apr-${Date.now()}`,
        order: existingApprovers.length + 1,
      };
      
      const { error: updateError } = await supabase
        .from('approval_tiers')
        .update({
          approvers: [...existingApprovers, newApprover],
          updated_by: user?.id || 'system',
        })
        .eq('id', tierId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      console.log('[useAddTierApprover] Added approver to tier:', tierId, newApprover.id);
      return newApprover;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers', 'byId', variables.tierId] });
    },
  });
}

export function useUpdateTierApprover() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ tierId, approverId, updates }: { tierId: string; approverId: string; updates: Partial<TierApprover> }) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data: tier, error: fetchError } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !tier) throw new Error('Tier not found');
      
      const approvers = (tier.approvers as TierApprover[]) || [];
      const index = approvers.findIndex(a => a.id === approverId);
      if (index === -1) throw new Error('Approver not found');
      
      approvers[index] = { ...approvers[index], ...updates };
      
      const { error: updateError } = await supabase
        .from('approval_tiers')
        .update({
          approvers,
          updated_by: user?.id || 'system',
        })
        .eq('id', tierId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      console.log('[useUpdateTierApprover] Updated approver:', approverId, 'in tier:', tierId);
      return approvers[index];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers', 'byId', variables.tierId] });
    },
  });
}

export function useRemoveTierApprover() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ tierId, approverId }: { tierId: string; approverId: string }) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data: tier, error: fetchError } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !tier) throw new Error('Tier not found');
      
      const approvers = (tier.approvers as TierApprover[]) || [];
      const filtered = approvers.filter(a => a.id !== approverId);
      filtered.forEach((a, i) => a.order = i + 1);
      
      const { error: updateError } = await supabase
        .from('approval_tiers')
        .update({
          approvers: filtered,
          updated_by: user?.id || 'system',
        })
        .eq('id', tierId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      console.log('[useRemoveTierApprover] Removed approver:', approverId, 'from tier:', tierId);
      return { tierId, approverId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers', 'byId', variables.tierId] });
    },
  });
}

export function useReorderTierApprovers() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ tierId, approverIds }: { tierId: string; approverIds: string[] }) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data: tier, error: fetchError } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !tier) throw new Error('Tier not found');
      
      const approvers = (tier.approvers as TierApprover[]) || [];
      const reordered = approverIds.map((id, index) => {
        const approver = approvers.find(a => a.id === id);
        if (!approver) throw new Error(`Approver ${id} not found`);
        return { ...approver, order: index + 1 };
      });
      
      const { error: updateError } = await supabase
        .from('approval_tiers')
        .update({
          approvers: reordered,
          updated_by: user?.id || 'system',
        })
        .eq('id', tierId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      console.log('[useReorderTierApprovers] Reordered approvers for tier:', tierId);
      return reordered;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers', 'byId', variables.tierId] });
    },
  });
}

export function useUpdateApproverLimits() {
  const queryClient = useQueryClient();
  const { company, user } = useUser();
  const organizationId = company?.id;
  
  return useMutation({
    mutationFn: async ({ tierId, approverId, limits }: { tierId: string; approverId: string; limits: ApproverLimit }) => {
      if (!organizationId) throw new Error('No organization');
      
      const { data: tier, error: fetchError } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !tier) throw new Error('Tier not found');
      
      const approvers = (tier.approvers as TierApprover[]) || [];
      const index = approvers.findIndex(a => a.id === approverId);
      if (index === -1) throw new Error('Approver not found');
      
      approvers[index].limits = limits;
      
      const { error: updateError } = await supabase
        .from('approval_tiers')
        .update({
          approvers,
          updated_by: user?.id || 'system',
        })
        .eq('id', tierId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw updateError;
      
      console.log('[useUpdateApproverLimits] Updated limits for approver:', approverId, 'in tier:', tierId);
      return approvers[index];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval_tiers'] });
      queryClient.invalidateQueries({ queryKey: ['approval_tiers', 'byId', variables.tierId] });
    },
  });
}

export function useTierApprovers(tierId: string | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['tier_approvers', tierId, organizationId],
    queryFn: async () => {
      if (!tierId || !organizationId) return [];
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('[useTierApprovers] Error:', error);
        return [];
      }
      
      const approvers = (data?.approvers as TierApprover[]) || [];
      const sorted = [...approvers].sort((a, b) => a.order - b.order);
      
      console.log('[useTierApprovers] Fetched approvers for tier:', tierId, sorted.length);
      return sorted;
    },
    enabled: !!tierId && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useApproversByRole(roleId: string | undefined | null) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['approvers_by_role', roleId, organizationId],
    queryFn: async () => {
      if (!roleId || !organizationId) return [];
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (error) {
        console.error('[useApproversByRole] Error:', error);
        return [];
      }
      
      const result: { tier: ApprovalTier; approver: TierApprover }[] = [];
      
      (data || []).forEach(dbTier => {
        const tier = mapDbTierToTier(dbTier);
        tier.approvers.forEach(approver => {
          if (approver.roleId === roleId || approver.type === roleId) {
            result.push({ tier, approver });
          }
        });
      });
      
      console.log('[useApproversByRole] Found approvers for role:', roleId, result.length);
      return result;
    },
    enabled: !!roleId && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useValidateApproverLimit(tierId: string | undefined, approverId: string | undefined, amount: number | undefined) {
  const { company } = useUser();
  const organizationId = company?.id;
  
  return useQuery({
    queryKey: ['validate_approver_limit', tierId, approverId, amount, organizationId],
    queryFn: async () => {
      if (!tierId || !approverId || amount === undefined || !organizationId) {
        return { valid: false, reason: 'Missing parameters' };
      }
      
      const { data, error } = await supabase
        .from('approval_tiers')
        .select('approvers')
        .eq('id', tierId)
        .eq('organization_id', organizationId)
        .single();
      
      if (error || !data) return { valid: false, reason: 'Tier not found' };
      
      const approvers = (data.approvers as TierApprover[]) || [];
      const approver = approvers.find(a => a.id === approverId);
      if (!approver) return { valid: false, reason: 'Approver not found' };
      
      if (!approver.limits) return { valid: true, reason: 'No limits configured' };
      
      const { maxApprovalAmount, minApprovalAmount } = approver.limits;
      
      if (maxApprovalAmount && amount > maxApprovalAmount) {
        return { valid: false, reason: `Amount exceeds maximum approval limit of ${maxApprovalAmount.toLocaleString()}` };
      }
      
      if (minApprovalAmount && amount < minApprovalAmount) {
        return { valid: false, reason: `Amount is below minimum approval limit of ${minApprovalAmount.toLocaleString()}` };
      }
      
      console.log('[useValidateApproverLimit] Validated amount:', amount, 'for approver:', approverId);
      return { valid: true, reason: 'Within limits' };
    },
    enabled: !!tierId && !!approverId && amount !== undefined && !!organizationId,
    staleTime: 1000 * 60,
  });
}
