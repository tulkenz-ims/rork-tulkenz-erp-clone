import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  OSHA300ASummary,
  WorkersCompClaim,
  ReturnToWorkForm,
  MedicalRestriction,
  DrugAlcoholTest,
  PSMComplianceRecord,
  FireSuppressionImpairment,
} from '@/types/regulatoryCompliance';

type CreateOSHA300AInput = Omit<OSHA300ASummary, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateWorkersCompInput = Omit<WorkersCompClaim, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateReturnToWorkInput = Omit<ReturnToWorkForm, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateMedicalRestrictionInput = Omit<MedicalRestriction, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateDrugAlcoholTestInput = Omit<DrugAlcoholTest, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreatePSMComplianceInput = Omit<PSMComplianceRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateFireSuppressionInput = Omit<FireSuppressionImpairment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useOSHA300ASummaries() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const summariesQuery = useQuery({
    queryKey: ['osha_300a_summaries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useOSHA300ASummaries] No organization ID');
        return [];
      }
      console.log('[useOSHA300ASummaries] Fetching summaries');

      const { data, error } = await supabase
        .from('osha_300a_summaries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('year', { ascending: false });

      if (error) {
        console.error('[useOSHA300ASummaries] Error:', error.message);
        return [];
      }

      console.log('[useOSHA300ASummaries] Fetched', data?.length || 0, 'records');
      return (data || []) as OSHA300ASummary[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateOSHA300AInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useOSHA300ASummaries] Creating:', input.summary_number);

      const { data, error } = await supabase
        .from('osha_300a_summaries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useOSHA300ASummaries] Error creating:', error.message);
        throw error;
      }
      return data as OSHA300ASummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha_300a_summaries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OSHA300ASummary> & { id: string }) => {
      console.log('[useOSHA300ASummaries] Updating:', id);

      const { data, error } = await supabase
        .from('osha_300a_summaries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useOSHA300ASummaries] Error updating:', error.message);
        throw error;
      }
      return data as OSHA300ASummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha_300a_summaries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useOSHA300ASummaries] Deleting:', id);

      const { error } = await supabase
        .from('osha_300a_summaries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useOSHA300ASummaries] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha_300a_summaries'] });
    },
  });

  const generateNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `300A-${year}-${random}`;
  }, []);

  return {
    summaries: summariesQuery.data || [],
    isLoading: summariesQuery.isLoading,
    isRefetching: summariesQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: summariesQuery.refetch,
  };
}

export function useWorkersCompClaims() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const claimsQuery = useQuery({
    queryKey: ['workers_comp_claims', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useWorkersCompClaims] No organization ID');
        return [];
      }
      console.log('[useWorkersCompClaims] Fetching claims');

      const { data, error } = await supabase
        .from('workers_comp_claims')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date_of_injury', { ascending: false });

      if (error) {
        console.error('[useWorkersCompClaims] Error:', error.message);
        return [];
      }

      console.log('[useWorkersCompClaims] Fetched', data?.length || 0, 'records');
      return (data || []) as WorkersCompClaim[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWorkersCompInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useWorkersCompClaims] Creating:', input.claim_number);

      const { data, error } = await supabase
        .from('workers_comp_claims')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useWorkersCompClaims] Error creating:', error.message);
        throw error;
      }
      return data as WorkersCompClaim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers_comp_claims'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkersCompClaim> & { id: string }) => {
      console.log('[useWorkersCompClaims] Updating:', id);

      const { data, error } = await supabase
        .from('workers_comp_claims')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useWorkersCompClaims] Error updating:', error.message);
        throw error;
      }
      return data as WorkersCompClaim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers_comp_claims'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useWorkersCompClaims] Deleting:', id);

      const { error } = await supabase
        .from('workers_comp_claims')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useWorkersCompClaims] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers_comp_claims'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WC-${year}${month}-${random}`;
  }, []);

  return {
    claims: claimsQuery.data || [],
    isLoading: claimsQuery.isLoading,
    isRefetching: claimsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: claimsQuery.refetch,
  };
}

export function useReturnToWorkForms() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const formsQuery = useQuery({
    queryKey: ['return_to_work_forms', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useReturnToWorkForms] No organization ID');
        return [];
      }
      console.log('[useReturnToWorkForms] Fetching forms');

      const { data, error } = await supabase
        .from('return_to_work_forms')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useReturnToWorkForms] Error:', error.message);
        return [];
      }

      console.log('[useReturnToWorkForms] Fetched', data?.length || 0, 'records');
      return (data || []) as ReturnToWorkForm[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateReturnToWorkInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useReturnToWorkForms] Creating:', input.form_number);

      const { data, error } = await supabase
        .from('return_to_work_forms')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useReturnToWorkForms] Error creating:', error.message);
        throw error;
      }
      return data as ReturnToWorkForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return_to_work_forms'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReturnToWorkForm> & { id: string }) => {
      console.log('[useReturnToWorkForms] Updating:', id);

      const { data, error } = await supabase
        .from('return_to_work_forms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useReturnToWorkForms] Error updating:', error.message);
        throw error;
      }
      return data as ReturnToWorkForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return_to_work_forms'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useReturnToWorkForms] Deleting:', id);

      const { error } = await supabase
        .from('return_to_work_forms')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useReturnToWorkForms] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return_to_work_forms'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RTW-${year}${month}-${random}`;
  }, []);

  return {
    forms: formsQuery.data || [],
    isLoading: formsQuery.isLoading,
    isRefetching: formsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: formsQuery.refetch,
  };
}

export function useMedicalRestrictions() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const restrictionsQuery = useQuery({
    queryKey: ['medical_restrictions', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useMedicalRestrictions] No organization ID');
        return [];
      }
      console.log('[useMedicalRestrictions] Fetching restrictions');

      const { data, error } = await supabase
        .from('medical_restrictions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('effective_date', { ascending: false });

      if (error) {
        console.error('[useMedicalRestrictions] Error:', error.message);
        return [];
      }

      console.log('[useMedicalRestrictions] Fetched', data?.length || 0, 'records');
      return (data || []) as MedicalRestriction[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateMedicalRestrictionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useMedicalRestrictions] Creating:', input.restriction_number);

      const { data, error } = await supabase
        .from('medical_restrictions')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useMedicalRestrictions] Error creating:', error.message);
        throw error;
      }
      return data as MedicalRestriction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_restrictions'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MedicalRestriction> & { id: string }) => {
      console.log('[useMedicalRestrictions] Updating:', id);

      const { data, error } = await supabase
        .from('medical_restrictions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useMedicalRestrictions] Error updating:', error.message);
        throw error;
      }
      return data as MedicalRestriction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_restrictions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useMedicalRestrictions] Deleting:', id);

      const { error } = await supabase
        .from('medical_restrictions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useMedicalRestrictions] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_restrictions'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `MR-${year}${month}-${random}`;
  }, []);

  return {
    restrictions: restrictionsQuery.data || [],
    isLoading: restrictionsQuery.isLoading,
    isRefetching: restrictionsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: restrictionsQuery.refetch,
  };
}

export function useDrugAlcoholTests() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const testsQuery = useQuery({
    queryKey: ['drug_alcohol_tests', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useDrugAlcoholTests] No organization ID');
        return [];
      }
      console.log('[useDrugAlcoholTests] Fetching tests');

      const { data, error } = await supabase
        .from('drug_alcohol_tests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('test_date', { ascending: false });

      if (error) {
        console.error('[useDrugAlcoholTests] Error:', error.message);
        return [];
      }

      console.log('[useDrugAlcoholTests] Fetched', data?.length || 0, 'records');
      return (data || []) as DrugAlcoholTest[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateDrugAlcoholTestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useDrugAlcoholTests] Creating:', input.test_number);

      const { data, error } = await supabase
        .from('drug_alcohol_tests')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useDrugAlcoholTests] Error creating:', error.message);
        throw error;
      }
      return data as DrugAlcoholTest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drug_alcohol_tests'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DrugAlcoholTest> & { id: string }) => {
      console.log('[useDrugAlcoholTests] Updating:', id);

      const { data, error } = await supabase
        .from('drug_alcohol_tests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useDrugAlcoholTests] Error updating:', error.message);
        throw error;
      }
      return data as DrugAlcoholTest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drug_alcohol_tests'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDrugAlcoholTests] Deleting:', id);

      const { error } = await supabase
        .from('drug_alcohol_tests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useDrugAlcoholTests] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drug_alcohol_tests'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DAT-${year}${month}-${random}`;
  }, []);

  return {
    tests: testsQuery.data || [],
    isLoading: testsQuery.isLoading,
    isRefetching: testsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: testsQuery.refetch,
  };
}

export function usePSMComplianceRecords() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const recordsQuery = useQuery({
    queryKey: ['psm_compliance_records', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[usePSMComplianceRecords] No organization ID');
        return [];
      }
      console.log('[usePSMComplianceRecords] Fetching records');

      const { data, error } = await supabase
        .from('psm_compliance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('activity_date', { ascending: false });

      if (error) {
        console.error('[usePSMComplianceRecords] Error:', error.message);
        return [];
      }

      console.log('[usePSMComplianceRecords] Fetched', data?.length || 0, 'records');
      return (data || []) as PSMComplianceRecord[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePSMComplianceInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[usePSMComplianceRecords] Creating:', input.record_number);

      const { data, error } = await supabase
        .from('psm_compliance_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[usePSMComplianceRecords] Error creating:', error.message);
        throw error;
      }
      return data as PSMComplianceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psm_compliance_records'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PSMComplianceRecord> & { id: string }) => {
      console.log('[usePSMComplianceRecords] Updating:', id);

      const { data, error } = await supabase
        .from('psm_compliance_records')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[usePSMComplianceRecords] Error updating:', error.message);
        throw error;
      }
      return data as PSMComplianceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psm_compliance_records'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[usePSMComplianceRecords] Deleting:', id);

      const { error } = await supabase
        .from('psm_compliance_records')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[usePSMComplianceRecords] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psm_compliance_records'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PSM-${year}${month}-${random}`;
  }, []);

  return {
    records: recordsQuery.data || [],
    isLoading: recordsQuery.isLoading,
    isRefetching: recordsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: recordsQuery.refetch,
  };
}

export function useFireSuppressionImpairments() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const impAirmentsQuery = useQuery({
    queryKey: ['fire_suppression_impairments', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useFireSuppressionImpairments] No organization ID');
        return [];
      }
      console.log('[useFireSuppressionImpairments] Fetching impairments');

      const { data, error } = await supabase
        .from('fire_suppression_impairments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('[useFireSuppressionImpairments] Error:', error.message);
        return [];
      }

      console.log('[useFireSuppressionImpairments] Fetched', data?.length || 0, 'records');
      return (data || []) as FireSuppressionImpairment[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFireSuppressionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useFireSuppressionImpairments] Creating:', input.impairment_number);

      const { data, error } = await supabase
        .from('fire_suppression_impairments')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useFireSuppressionImpairments] Error creating:', error.message);
        throw error;
      }
      return data as FireSuppressionImpairment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_suppression_impairments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FireSuppressionImpairment> & { id: string }) => {
      console.log('[useFireSuppressionImpairments] Updating:', id);

      const { data, error } = await supabase
        .from('fire_suppression_impairments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useFireSuppressionImpairments] Error updating:', error.message);
        throw error;
      }
      return data as FireSuppressionImpairment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_suppression_impairments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useFireSuppressionImpairments] Deleting:', id);

      const { error } = await supabase
        .from('fire_suppression_impairments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useFireSuppressionImpairments] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_suppression_impairments'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FSI-${year}${month}-${random}`;
  }, []);

  return {
    impairments: impAirmentsQuery.data || [],
    isLoading: impAirmentsQuery.isLoading,
    isRefetching: impAirmentsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: impAirmentsQuery.refetch,
  };
}
