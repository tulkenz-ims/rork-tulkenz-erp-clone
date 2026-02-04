import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  SafetyPermit,
  PermitType,
  PermitStatus,
  PERMIT_TYPE_LABELS,
} from '@/types/safety';

type CreatePermitInput = Omit<SafetyPermit, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSafetyPermits(permitType?: PermitType) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const permitsQuery = useQuery({
    queryKey: ['safety_permits', organizationId, permitType],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSafetyPermits] No organization ID, returning empty array');
        return [];
      }
      console.log('[useSafetyPermits] Fetching permits', { permitType, organizationId });

      let query = supabase
        .from('safety_permits')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (permitType) {
        query = query.eq('permit_type', permitType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSafetyPermits] Error fetching permits:', error.message);
        return [];
      }

      console.log('[useSafetyPermits] Fetched', data?.length || 0, 'permits');
      return (data || []) as SafetyPermit[];
    },
    enabled: !!organizationId,
  });

  const activePermitsQuery = useQuery({
    queryKey: ['safety_permits', 'active', organizationId, permitType],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const activeStatuses: PermitStatus[] = ['approved', 'active'];
      console.log('[useSafetyPermits] Fetching active permits');

      let query = supabase
        .from('safety_permits')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false });

      if (permitType) {
        query = query.eq('permit_type', permitType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSafetyPermits] Error fetching active permits:', error.message);
        return [];
      }

      return (data || []) as SafetyPermit[];
    },
    enabled: !!organizationId,
  });

  const pendingPermitsQuery = useQuery({
    queryKey: ['safety_permits', 'pending', organizationId, permitType],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('safety_permits')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending_approval')
        .order('requested_date', { ascending: true });

      if (permitType) {
        query = query.eq('permit_type', permitType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSafetyPermits] Error fetching pending permits:', error.message);
        return [];
      }

      return (data || []) as SafetyPermit[];
    },
    enabled: !!organizationId,
  });

  const createPermitMutation = useMutation({
    mutationFn: async (input: CreatePermitInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSafetyPermits] Creating permit:', input.permit_number);

      const { data, error } = await supabase
        .from('safety_permits')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useSafetyPermits] Error creating permit:', error.message);
        throw error;
      }
      
      console.log('[useSafetyPermits] Permit created:', data.id);
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const updatePermitMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyPermit> & { id: string }) => {
      console.log('[useSafetyPermits] Updating permit:', id);

      const { data, error } = await supabase
        .from('safety_permits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyPermits] Error updating permit:', error.message);
        throw error;
      }
      
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const approvePermitMutation = useMutation({
    mutationFn: async ({ id, approved_by, approved_by_id }: { id: string; approved_by: string; approved_by_id?: string }) => {
      console.log('[useSafetyPermits] Approving permit:', id);

      const { data, error } = await supabase
        .from('safety_permits')
        .update({
          status: 'approved',
          approved_by,
          approved_by_id,
          approved_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyPermits] Error approving permit:', error.message);
        throw error;
      }
      
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const activatePermitMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      console.log('[useSafetyPermits] Activating permit:', id);

      const { data, error } = await supabase
        .from('safety_permits')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyPermits] Error activating permit:', error.message);
        throw error;
      }
      
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const completePermitMutation = useMutation({
    mutationFn: async ({ 
      id, 
      completed_by, 
      completed_by_id, 
      completion_notes 
    }: { 
      id: string; 
      completed_by: string; 
      completed_by_id?: string;
      completion_notes?: string;
    }) => {
      console.log('[useSafetyPermits] Completing permit:', id);

      const { data, error } = await supabase
        .from('safety_permits')
        .update({
          status: 'completed',
          completed_by,
          completed_by_id,
          completed_date: new Date().toISOString(),
          completion_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyPermits] Error completing permit:', error.message);
        throw error;
      }
      
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const cancelPermitMutation = useMutation({
    mutationFn: async ({ 
      id, 
      cancelled_by, 
      cancellation_reason 
    }: { 
      id: string; 
      cancelled_by: string; 
      cancellation_reason: string;
    }) => {
      console.log('[useSafetyPermits] Cancelling permit:', id);

      const { data, error } = await supabase
        .from('safety_permits')
        .update({
          status: 'cancelled',
          cancelled_by,
          cancelled_date: new Date().toISOString(),
          cancellation_reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyPermits] Error cancelling permit:', error.message);
        throw error;
      }
      
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const deletePermitMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSafetyPermits] Deleting permit:', id);

      const { error } = await supabase
        .from('safety_permits')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useSafetyPermits] Error deleting permit:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const generatePermitNumber = useCallback((type: PermitType) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const prefixMap: Record<PermitType, string> = {
      loto: 'LOTO',
      confined_space: 'CSE',
      hot_work: 'HW',
      fall_protection: 'FP',
      electrical: 'ESW',
      line_break: 'LB',
      excavation: 'EXC',
      roof_access: 'RA',
      chemical_handling: 'CH',
      temporary_equipment: 'TE',
    };
    
    return `${prefixMap[type]}-${year}${month}${day}-${random}`;
  }, []);

  const getPermitStats = () => {
    const permits = permitsQuery.data || [];
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: permits.length,
      active: permits.filter(p => p.status === 'active' || p.status === 'approved').length,
      pending: permits.filter(p => p.status === 'pending_approval').length,
      completedToday: permits.filter(p => 
        p.status === 'completed' && 
        p.completed_date?.split('T')[0] === today
      ).length,
      expiringSoon: permits.filter(p => {
        if (p.status !== 'active' && p.status !== 'approved') return false;
        const endDate = new Date(p.end_date);
        const now = new Date();
        const hoursRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursRemaining > 0 && hoursRemaining <= 2;
      }).length,
      byType: Object.keys(PERMIT_TYPE_LABELS).reduce((acc, type) => {
        acc[type as PermitType] = permits.filter(p => p.permit_type === type).length;
        return acc;
      }, {} as Record<PermitType, number>),
      byStatus: {
        draft: permits.filter(p => p.status === 'draft').length,
        pending_approval: permits.filter(p => p.status === 'pending_approval').length,
        approved: permits.filter(p => p.status === 'approved').length,
        active: permits.filter(p => p.status === 'active').length,
        completed: permits.filter(p => p.status === 'completed').length,
        cancelled: permits.filter(p => p.status === 'cancelled').length,
        expired: permits.filter(p => p.status === 'expired').length,
      },
    };
  };

  const isPermitExpired = (permit: SafetyPermit) => {
    if (permit.status === 'completed' || permit.status === 'cancelled') return false;
    const endDateTime = new Date(`${permit.end_date}T${permit.end_time || '23:59'}`);
    return new Date() > endDateTime;
  };

  const getTimeRemaining = (permit: SafetyPermit) => {
    const endDateTime = new Date(`${permit.end_date}T${permit.end_time || '23:59'}`);
    const now = new Date();
    const diff = endDateTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  return {
    permits: permitsQuery.data || [],
    activePermits: activePermitsQuery.data || [],
    pendingPermits: pendingPermitsQuery.data || [],
    isLoading: permitsQuery.isLoading,
    isRefetching: permitsQuery.isRefetching,

    createPermit: createPermitMutation.mutateAsync,
    updatePermit: updatePermitMutation.mutateAsync,
    approvePermit: approvePermitMutation.mutateAsync,
    activatePermit: activatePermitMutation.mutateAsync,
    completePermit: completePermitMutation.mutateAsync,
    cancelPermit: cancelPermitMutation.mutateAsync,
    deletePermit: deletePermitMutation.mutateAsync,

    isCreating: createPermitMutation.isPending,
    isUpdating: updatePermitMutation.isPending,
    isDeleting: deletePermitMutation.isPending,

    generatePermitNumber,
    getPermitStats,
    isPermitExpired,
    getTimeRemaining,

    refetch: () => {
      permitsQuery.refetch();
      activePermitsQuery.refetch();
      pendingPermitsQuery.refetch();
    },
  };
}

export function usePermitById(permitId: string | undefined) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  return useQuery({
    queryKey: ['safety_permits', 'detail', organizationId, permitId],
    queryFn: async () => {
      if (!permitId || !organizationId) return null;

      const { data, error } = await supabase
        .from('safety_permits')
        .select('*')
        .eq('id', permitId)
        .single();

      if (error) {
        console.error('[usePermitById] Error fetching permit:', error.message);
        return null;
      }

      return data as SafetyPermit;
    },
    enabled: !!permitId && !!organizationId,
  });
}
