import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  ContractorPrequal,
  ContractorOrientation,
  ContractorSignIn,
  VisitorSafety,
  ContractorWorkAuth,
  ContractorInsurance,
  PrequalStatus,
  OrientationStatus,
  WorkAuthStatus,
  InsuranceStatus,
} from '@/types/contractorSafety';

// ==================== CONTRACTOR PRE-QUALIFICATION ====================

type CreatePrequalInput = Omit<ContractorPrequal, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useContractorPrequals() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const prequalsQuery = useQuery({
    queryKey: ['contractor_prequals', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useContractorPrequals] No organization ID, returning empty array');
        return [];
      }
      console.log('[useContractorPrequals] Fetching pre-qualifications');

      const { data, error } = await supabase
        .from('contractor_prequals')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useContractorPrequals] Error fetching:', error.message);
        return [];
      }

      console.log('[useContractorPrequals] Fetched', data?.length || 0, 'records');
      return (data || []) as ContractorPrequal[];
    },
    enabled: !!organizationId,
  });

  const approvedPrequalsQuery = useQuery({
    queryKey: ['contractor_prequals', 'approved', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('contractor_prequals')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['approved', 'conditionally_approved'])
        .order('company_name', { ascending: true });

      if (error) {
        console.error('[useContractorPrequals] Error fetching approved:', error.message);
        return [];
      }

      return (data || []) as ContractorPrequal[];
    },
    enabled: !!organizationId,
  });

  const createPrequalMutation = useMutation({
    mutationFn: async (input: CreatePrequalInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useContractorPrequals] Creating:', input.prequal_number);

      const { data, error } = await supabase
        .from('contractor_prequals')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useContractorPrequals] Error creating:', error.message);
        throw error;
      }
      
      console.log('[useContractorPrequals] Created:', data.id);
      return data as ContractorPrequal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_prequals'] });
    },
  });

  const updatePrequalMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractorPrequal> & { id: string }) => {
      console.log('[useContractorPrequals] Updating:', id);

      const { data, error } = await supabase
        .from('contractor_prequals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorPrequals] Error updating:', error.message);
        throw error;
      }
      
      return data as ContractorPrequal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_prequals'] });
    },
  });

  const deletePrequalMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useContractorPrequals] Deleting:', id);

      const { error } = await supabase
        .from('contractor_prequals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useContractorPrequals] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_prequals'] });
    },
  });

  const generatePrequalNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CPQ-${year}${month}-${random}`;
  }, []);

  return {
    prequals: prequalsQuery.data || [],
    approvedPrequals: approvedPrequalsQuery.data || [],
    isLoading: prequalsQuery.isLoading,
    isRefetching: prequalsQuery.isRefetching,
    createPrequal: createPrequalMutation.mutateAsync,
    updatePrequal: updatePrequalMutation.mutateAsync,
    deletePrequal: deletePrequalMutation.mutateAsync,
    isCreating: createPrequalMutation.isPending,
    isUpdating: updatePrequalMutation.isPending,
    isDeleting: deletePrequalMutation.isPending,
    generatePrequalNumber,
    refetch: () => {
      prequalsQuery.refetch();
      approvedPrequalsQuery.refetch();
    },
  };
}

// ==================== CONTRACTOR ORIENTATION ====================

type CreateOrientationInput = Omit<ContractorOrientation, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useContractorOrientations() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const orientationsQuery = useQuery({
    queryKey: ['contractor_orientations', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useContractorOrientations] No organization ID, returning empty array');
        return [];
      }
      console.log('[useContractorOrientations] Fetching orientations');

      const { data, error } = await supabase
        .from('contractor_orientations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useContractorOrientations] Error fetching:', error.message);
        return [];
      }

      console.log('[useContractorOrientations] Fetched', data?.length || 0, 'records');
      return (data || []) as ContractorOrientation[];
    },
    enabled: !!organizationId,
  });

  const completedOrientationsQuery = useQuery({
    queryKey: ['contractor_orientations', 'completed', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('contractor_orientations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('completed_date', { ascending: false });

      if (error) {
        console.error('[useContractorOrientations] Error fetching completed:', error.message);
        return [];
      }

      return (data || []) as ContractorOrientation[];
    },
    enabled: !!organizationId,
  });

  const createOrientationMutation = useMutation({
    mutationFn: async (input: CreateOrientationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useContractorOrientations] Creating:', input.orientation_number);

      const { data, error } = await supabase
        .from('contractor_orientations')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useContractorOrientations] Error creating:', error.message);
        throw error;
      }
      
      console.log('[useContractorOrientations] Created:', data.id);
      return data as ContractorOrientation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_orientations'] });
    },
  });

  const updateOrientationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractorOrientation> & { id: string }) => {
      console.log('[useContractorOrientations] Updating:', id);

      const { data, error } = await supabase
        .from('contractor_orientations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorOrientations] Error updating:', error.message);
        throw error;
      }
      
      return data as ContractorOrientation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_orientations'] });
    },
  });

  const deleteOrientationMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useContractorOrientations] Deleting:', id);

      const { error } = await supabase
        .from('contractor_orientations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useContractorOrientations] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_orientations'] });
    },
  });

  const generateOrientationNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `COR-${year}${month}${day}-${random}`;
  }, []);

  return {
    orientations: orientationsQuery.data || [],
    completedOrientations: completedOrientationsQuery.data || [],
    isLoading: orientationsQuery.isLoading,
    isRefetching: orientationsQuery.isRefetching,
    createOrientation: createOrientationMutation.mutateAsync,
    updateOrientation: updateOrientationMutation.mutateAsync,
    deleteOrientation: deleteOrientationMutation.mutateAsync,
    isCreating: createOrientationMutation.isPending,
    isUpdating: updateOrientationMutation.isPending,
    isDeleting: deleteOrientationMutation.isPending,
    generateOrientationNumber,
    refetch: () => {
      orientationsQuery.refetch();
      completedOrientationsQuery.refetch();
    },
  };
}

// ==================== CONTRACTOR SIGN-IN ====================

type CreateSignInInput = Omit<ContractorSignIn, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useContractorSignIns() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const signInsQuery = useQuery({
    queryKey: ['contractor_sign_ins', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useContractorSignIns] No organization ID, returning empty array');
        return [];
      }
      console.log('[useContractorSignIns] Fetching sign-ins');

      const { data, error } = await supabase
        .from('contractor_sign_ins')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sign_in_time', { ascending: false });

      if (error) {
        console.error('[useContractorSignIns] Error fetching:', error.message);
        return [];
      }

      console.log('[useContractorSignIns] Fetched', data?.length || 0, 'records');
      return (data || []) as ContractorSignIn[];
    },
    enabled: !!organizationId,
  });

  const activeSignInsQuery = useQuery({
    queryKey: ['contractor_sign_ins', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('contractor_sign_ins')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'signed_in')
        .order('sign_in_time', { ascending: false });

      if (error) {
        console.error('[useContractorSignIns] Error fetching active:', error.message);
        return [];
      }

      return (data || []) as ContractorSignIn[];
    },
    enabled: !!organizationId,
  });

  const createSignInMutation = useMutation({
    mutationFn: async (input: CreateSignInInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useContractorSignIns] Creating:', input.sign_in_number);

      const { data, error } = await supabase
        .from('contractor_sign_ins')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useContractorSignIns] Error creating:', error.message);
        throw error;
      }
      
      console.log('[useContractorSignIns] Created:', data.id);
      return data as ContractorSignIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_sign_ins'] });
    },
  });

  const updateSignInMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractorSignIn> & { id: string }) => {
      console.log('[useContractorSignIns] Updating:', id);

      const { data, error } = await supabase
        .from('contractor_sign_ins')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorSignIns] Error updating:', error.message);
        throw error;
      }
      
      return data as ContractorSignIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_sign_ins'] });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useContractorSignIns] Signing out:', id);

      const { data, error } = await supabase
        .from('contractor_sign_ins')
        .update({ 
          status: 'signed_out',
          sign_out_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorSignIns] Error signing out:', error.message);
        throw error;
      }
      
      return data as ContractorSignIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_sign_ins'] });
    },
  });

  const deleteSignInMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useContractorSignIns] Deleting:', id);

      const { error } = await supabase
        .from('contractor_sign_ins')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useContractorSignIns] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_sign_ins'] });
    },
  });

  const generateSignInNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CSI-${year}${month}${day}-${random}`;
  }, []);

  return {
    signIns: signInsQuery.data || [],
    activeSignIns: activeSignInsQuery.data || [],
    isLoading: signInsQuery.isLoading,
    isRefetching: signInsQuery.isRefetching,
    createSignIn: createSignInMutation.mutateAsync,
    updateSignIn: updateSignInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    deleteSignIn: deleteSignInMutation.mutateAsync,
    isCreating: createSignInMutation.isPending,
    isUpdating: updateSignInMutation.isPending,
    isDeleting: deleteSignInMutation.isPending,
    generateSignInNumber,
    refetch: () => {
      signInsQuery.refetch();
      activeSignInsQuery.refetch();
    },
  };
}

// ==================== VISITOR SAFETY ====================

type CreateVisitorInput = Omit<VisitorSafety, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useVisitorSafety() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const visitorsQuery = useQuery({
    queryKey: ['visitor_safety', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useVisitorSafety] No organization ID, returning empty array');
        return [];
      }
      console.log('[useVisitorSafety] Fetching visitors');

      const { data, error } = await supabase
        .from('visitor_safety')
        .select('*')
        .eq('organization_id', organizationId)
        .order('check_in_time', { ascending: false });

      if (error) {
        console.error('[useVisitorSafety] Error fetching:', error.message);
        return [];
      }

      console.log('[useVisitorSafety] Fetched', data?.length || 0, 'records');
      return (data || []) as VisitorSafety[];
    },
    enabled: !!organizationId,
  });

  const activeVisitorsQuery = useQuery({
    queryKey: ['visitor_safety', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('visitor_safety')
        .select('*')
        .eq('organization_id', organizationId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false });

      if (error) {
        console.error('[useVisitorSafety] Error fetching active:', error.message);
        return [];
      }

      return (data || []) as VisitorSafety[];
    },
    enabled: !!organizationId,
  });

  const createVisitorMutation = useMutation({
    mutationFn: async (input: CreateVisitorInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useVisitorSafety] Creating:', input.visitor_number);

      const { data, error } = await supabase
        .from('visitor_safety')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useVisitorSafety] Error creating:', error.message);
        throw error;
      }
      
      console.log('[useVisitorSafety] Created:', data.id);
      return data as VisitorSafety;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor_safety'] });
    },
  });

  const updateVisitorMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VisitorSafety> & { id: string }) => {
      console.log('[useVisitorSafety] Updating:', id);

      const { data, error } = await supabase
        .from('visitor_safety')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useVisitorSafety] Error updating:', error.message);
        throw error;
      }
      
      return data as VisitorSafety;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor_safety'] });
    },
  });

  const checkOutVisitorMutation = useMutation({
    mutationFn: async ({ id, badge_returned }: { id: string; badge_returned: boolean }) => {
      console.log('[useVisitorSafety] Checking out:', id);

      const { data, error } = await supabase
        .from('visitor_safety')
        .update({ 
          check_out_time: new Date().toISOString(),
          badge_returned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useVisitorSafety] Error checking out:', error.message);
        throw error;
      }
      
      return data as VisitorSafety;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor_safety'] });
    },
  });

  const deleteVisitorMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useVisitorSafety] Deleting:', id);

      const { error } = await supabase
        .from('visitor_safety')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useVisitorSafety] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor_safety'] });
    },
  });

  const generateVisitorNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VIS-${year}${month}${day}-${random}`;
  }, []);

  return {
    visitors: visitorsQuery.data || [],
    activeVisitors: activeVisitorsQuery.data || [],
    isLoading: visitorsQuery.isLoading,
    isRefetching: visitorsQuery.isRefetching,
    createVisitor: createVisitorMutation.mutateAsync,
    updateVisitor: updateVisitorMutation.mutateAsync,
    checkOutVisitor: checkOutVisitorMutation.mutateAsync,
    deleteVisitor: deleteVisitorMutation.mutateAsync,
    isCreating: createVisitorMutation.isPending,
    isUpdating: updateVisitorMutation.isPending,
    isDeleting: deleteVisitorMutation.isPending,
    generateVisitorNumber,
    refetch: () => {
      visitorsQuery.refetch();
      activeVisitorsQuery.refetch();
    },
  };
}

// ==================== CONTRACTOR WORK AUTHORIZATION ====================

type CreateWorkAuthInput = Omit<ContractorWorkAuth, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useContractorWorkAuths() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const workAuthsQuery = useQuery({
    queryKey: ['contractor_work_auths', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useContractorWorkAuths] No organization ID, returning empty array');
        return [];
      }
      console.log('[useContractorWorkAuths] Fetching work authorizations');

      const { data, error } = await supabase
        .from('contractor_work_auths')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useContractorWorkAuths] Error fetching:', error.message);
        return [];
      }

      console.log('[useContractorWorkAuths] Fetched', data?.length || 0, 'records');
      return (data || []) as ContractorWorkAuth[];
    },
    enabled: !!organizationId,
  });

  const activeWorkAuthsQuery = useQuery({
    queryKey: ['contractor_work_auths', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('contractor_work_auths')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['approved', 'active'])
        .order('start_date', { ascending: true });

      if (error) {
        console.error('[useContractorWorkAuths] Error fetching active:', error.message);
        return [];
      }

      return (data || []) as ContractorWorkAuth[];
    },
    enabled: !!organizationId,
  });

  const createWorkAuthMutation = useMutation({
    mutationFn: async (input: CreateWorkAuthInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useContractorWorkAuths] Creating:', input.auth_number);

      const { data, error } = await supabase
        .from('contractor_work_auths')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useContractorWorkAuths] Error creating:', error.message);
        throw error;
      }
      
      console.log('[useContractorWorkAuths] Created:', data.id);
      return data as ContractorWorkAuth;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_work_auths'] });
    },
  });

  const updateWorkAuthMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractorWorkAuth> & { id: string }) => {
      console.log('[useContractorWorkAuths] Updating:', id);

      const { data, error } = await supabase
        .from('contractor_work_auths')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorWorkAuths] Error updating:', error.message);
        throw error;
      }
      
      return data as ContractorWorkAuth;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_work_auths'] });
    },
  });

  const approveWorkAuthMutation = useMutation({
    mutationFn: async ({ id, approved_by, approved_by_id }: { id: string; approved_by: string; approved_by_id?: string }) => {
      console.log('[useContractorWorkAuths] Approving:', id);

      const { data, error } = await supabase
        .from('contractor_work_auths')
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
        console.error('[useContractorWorkAuths] Error approving:', error.message);
        throw error;
      }
      
      return data as ContractorWorkAuth;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_work_auths'] });
    },
  });

  const deleteWorkAuthMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useContractorWorkAuths] Deleting:', id);

      const { error } = await supabase
        .from('contractor_work_auths')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useContractorWorkAuths] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_work_auths'] });
    },
  });

  const generateWorkAuthNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CWA-${year}${month}-${random}`;
  }, []);

  return {
    workAuths: workAuthsQuery.data || [],
    activeWorkAuths: activeWorkAuthsQuery.data || [],
    isLoading: workAuthsQuery.isLoading,
    isRefetching: workAuthsQuery.isRefetching,
    createWorkAuth: createWorkAuthMutation.mutateAsync,
    updateWorkAuth: updateWorkAuthMutation.mutateAsync,
    approveWorkAuth: approveWorkAuthMutation.mutateAsync,
    deleteWorkAuth: deleteWorkAuthMutation.mutateAsync,
    isCreating: createWorkAuthMutation.isPending,
    isUpdating: updateWorkAuthMutation.isPending,
    isDeleting: deleteWorkAuthMutation.isPending,
    generateWorkAuthNumber,
    refetch: () => {
      workAuthsQuery.refetch();
      activeWorkAuthsQuery.refetch();
    },
  };
}

// ==================== CONTRACTOR INSURANCE ====================

type CreateInsuranceInput = Omit<ContractorInsurance, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useContractorInsurance() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const insuranceQuery = useQuery({
    queryKey: ['contractor_insurance', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useContractorInsurance] No organization ID, returning empty array');
        return [];
      }
      console.log('[useContractorInsurance] Fetching insurance records');

      const { data, error } = await supabase
        .from('contractor_insurance')
        .select('*')
        .eq('organization_id', organizationId)
        .order('expiration_date', { ascending: true });

      if (error) {
        console.error('[useContractorInsurance] Error fetching:', error.message);
        return [];
      }

      console.log('[useContractorInsurance] Fetched', data?.length || 0, 'records');
      return (data || []) as ContractorInsurance[];
    },
    enabled: !!organizationId,
  });

  const activeInsuranceQuery = useQuery({
    queryKey: ['contractor_insurance', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('contractor_insurance')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('expiration_date', today)
        .order('expiration_date', { ascending: true });

      if (error) {
        console.error('[useContractorInsurance] Error fetching active:', error.message);
        return [];
      }

      return (data || []) as ContractorInsurance[];
    },
    enabled: !!organizationId,
  });

  const expiringInsuranceQuery = useQuery({
    queryKey: ['contractor_insurance', 'expiring', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('contractor_insurance')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('expiration_date', today.toISOString().split('T')[0])
        .lte('expiration_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });

      if (error) {
        console.error('[useContractorInsurance] Error fetching expiring:', error.message);
        return [];
      }

      return (data || []) as ContractorInsurance[];
    },
    enabled: !!organizationId,
  });

  const createInsuranceMutation = useMutation({
    mutationFn: async (input: CreateInsuranceInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useContractorInsurance] Creating:', input.policy_number);

      const { data, error } = await supabase
        .from('contractor_insurance')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useContractorInsurance] Error creating:', error.message);
        throw error;
      }
      
      console.log('[useContractorInsurance] Created:', data.id);
      return data as ContractorInsurance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_insurance'] });
    },
  });

  const updateInsuranceMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractorInsurance> & { id: string }) => {
      console.log('[useContractorInsurance] Updating:', id);

      const { data, error } = await supabase
        .from('contractor_insurance')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorInsurance] Error updating:', error.message);
        throw error;
      }
      
      return data as ContractorInsurance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_insurance'] });
    },
  });

  const verifyInsuranceMutation = useMutation({
    mutationFn: async ({ id, verified_by, verified_by_id, verification_method }: { 
      id: string; 
      verified_by: string; 
      verified_by_id?: string;
      verification_method?: string;
    }) => {
      console.log('[useContractorInsurance] Verifying:', id);

      const { data, error } = await supabase
        .from('contractor_insurance')
        .update({
          verified: true,
          verified_by,
          verified_by_id,
          verified_date: new Date().toISOString(),
          verification_method,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useContractorInsurance] Error verifying:', error.message);
        throw error;
      }
      
      return data as ContractorInsurance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_insurance'] });
    },
  });

  const deleteInsuranceMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useContractorInsurance] Deleting:', id);

      const { error } = await supabase
        .from('contractor_insurance')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useContractorInsurance] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_insurance'] });
    },
  });

  const getInsuranceStatus = useCallback((insurance: ContractorInsurance): InsuranceStatus => {
    const today = new Date();
    const expirationDate = new Date(insurance.expiration_date);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (expirationDate < today) return 'expired';
    if (expirationDate <= thirtyDaysFromNow) return 'expiring_soon';
    if (!insurance.verified) return 'pending_verification';
    return 'active';
  }, []);

  return {
    insurance: insuranceQuery.data || [],
    activeInsurance: activeInsuranceQuery.data || [],
    expiringInsurance: expiringInsuranceQuery.data || [],
    isLoading: insuranceQuery.isLoading,
    isRefetching: insuranceQuery.isRefetching,
    createInsurance: createInsuranceMutation.mutateAsync,
    updateInsurance: updateInsuranceMutation.mutateAsync,
    verifyInsurance: verifyInsuranceMutation.mutateAsync,
    deleteInsurance: deleteInsuranceMutation.mutateAsync,
    isCreating: createInsuranceMutation.isPending,
    isUpdating: updateInsuranceMutation.isPending,
    isDeleting: deleteInsuranceMutation.isPending,
    getInsuranceStatus,
    refetch: () => {
      insuranceQuery.refetch();
      activeInsuranceQuery.refetch();
      expiringInsuranceQuery.refetch();
    },
  };
}
