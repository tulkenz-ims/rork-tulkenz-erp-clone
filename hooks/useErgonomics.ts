import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  ErgonomicAssessment,
  WorkstationEvaluation,
  NoiseMonitoring,
  HeatStressMonitoring,
  AirQualityMonitoring,
  RepetitiveMotionAssessment,
} from '@/types/ergonomics';

type CreateErgonomicAssessmentInput = Omit<ErgonomicAssessment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateWorkstationEvaluationInput = Omit<WorkstationEvaluation, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateNoiseMonitoringInput = Omit<NoiseMonitoring, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateHeatStressInput = Omit<HeatStressMonitoring, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateAirQualityInput = Omit<AirQualityMonitoring, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateRepetitiveMotionInput = Omit<RepetitiveMotionAssessment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useErgonomicAssessments() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const assessmentsQuery = useQuery({
    queryKey: ['ergonomic_assessments', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useErgonomicAssessments] No organization ID');
        return [];
      }
      console.log('[useErgonomicAssessments] Fetching assessments');

      const { data, error } = await supabase
        .from('ergonomic_assessments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('assessment_date', { ascending: false });

      if (error) {
        console.error('[useErgonomicAssessments] Error:', error.message);
        return [];
      }

      console.log('[useErgonomicAssessments] Fetched', data?.length || 0, 'records');
      return (data || []) as ErgonomicAssessment[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateErgonomicAssessmentInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useErgonomicAssessments] Creating:', input.assessment_number);

      const { data, error } = await supabase
        .from('ergonomic_assessments')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useErgonomicAssessments] Error creating:', error.message);
        throw error;
      }
      return data as ErgonomicAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ergonomic_assessments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ErgonomicAssessment> & { id: string }) => {
      console.log('[useErgonomicAssessments] Updating:', id);

      const { data, error } = await supabase
        .from('ergonomic_assessments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useErgonomicAssessments] Error updating:', error.message);
        throw error;
      }
      return data as ErgonomicAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ergonomic_assessments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useErgonomicAssessments] Deleting:', id);

      const { error } = await supabase
        .from('ergonomic_assessments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useErgonomicAssessments] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ergonomic_assessments'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ERG-${year}${month}-${random}`;
  }, []);

  return {
    assessments: assessmentsQuery.data || [],
    isLoading: assessmentsQuery.isLoading,
    isRefetching: assessmentsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: assessmentsQuery.refetch,
  };
}

export function useWorkstationEvaluations() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const evaluationsQuery = useQuery({
    queryKey: ['workstation_evaluations', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useWorkstationEvaluations] No organization ID');
        return [];
      }
      console.log('[useWorkstationEvaluations] Fetching evaluations');

      const { data, error } = await supabase
        .from('workstation_evaluations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('evaluation_date', { ascending: false });

      if (error) {
        console.error('[useWorkstationEvaluations] Error:', error.message);
        return [];
      }

      console.log('[useWorkstationEvaluations] Fetched', data?.length || 0, 'records');
      return (data || []) as WorkstationEvaluation[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWorkstationEvaluationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useWorkstationEvaluations] Creating:', input.evaluation_number);

      const { data, error } = await supabase
        .from('workstation_evaluations')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useWorkstationEvaluations] Error creating:', error.message);
        throw error;
      }
      return data as WorkstationEvaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstation_evaluations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkstationEvaluation> & { id: string }) => {
      console.log('[useWorkstationEvaluations] Updating:', id);

      const { data, error } = await supabase
        .from('workstation_evaluations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useWorkstationEvaluations] Error updating:', error.message);
        throw error;
      }
      return data as WorkstationEvaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstation_evaluations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useWorkstationEvaluations] Deleting:', id);

      const { error } = await supabase
        .from('workstation_evaluations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useWorkstationEvaluations] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstation_evaluations'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WSE-${year}${month}-${random}`;
  }, []);

  return {
    evaluations: evaluationsQuery.data || [],
    isLoading: evaluationsQuery.isLoading,
    isRefetching: evaluationsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: evaluationsQuery.refetch,
  };
}

export function useNoiseMonitoring() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const recordsQuery = useQuery({
    queryKey: ['noise_monitoring', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useNoiseMonitoring] No organization ID');
        return [];
      }
      console.log('[useNoiseMonitoring] Fetching records');

      const { data, error } = await supabase
        .from('noise_monitoring')
        .select('*')
        .eq('organization_id', organizationId)
        .order('monitoring_date', { ascending: false });

      if (error) {
        console.error('[useNoiseMonitoring] Error:', error.message);
        return [];
      }

      console.log('[useNoiseMonitoring] Fetched', data?.length || 0, 'records');
      return (data || []) as NoiseMonitoring[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateNoiseMonitoringInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useNoiseMonitoring] Creating:', input.monitoring_number);

      const { data, error } = await supabase
        .from('noise_monitoring')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useNoiseMonitoring] Error creating:', error.message);
        throw error;
      }
      return data as NoiseMonitoring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noise_monitoring'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NoiseMonitoring> & { id: string }) => {
      console.log('[useNoiseMonitoring] Updating:', id);

      const { data, error } = await supabase
        .from('noise_monitoring')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useNoiseMonitoring] Error updating:', error.message);
        throw error;
      }
      return data as NoiseMonitoring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noise_monitoring'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useNoiseMonitoring] Deleting:', id);

      const { error } = await supabase
        .from('noise_monitoring')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useNoiseMonitoring] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noise_monitoring'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NSE-${year}${month}-${random}`;
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

export function useHeatStressMonitoring() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const recordsQuery = useQuery({
    queryKey: ['heat_stress_monitoring', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useHeatStressMonitoring] No organization ID');
        return [];
      }
      console.log('[useHeatStressMonitoring] Fetching records');

      const { data, error } = await supabase
        .from('heat_stress_monitoring')
        .select('*')
        .eq('organization_id', organizationId)
        .order('monitoring_date', { ascending: false });

      if (error) {
        console.error('[useHeatStressMonitoring] Error:', error.message);
        return [];
      }

      console.log('[useHeatStressMonitoring] Fetched', data?.length || 0, 'records');
      return (data || []) as HeatStressMonitoring[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateHeatStressInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useHeatStressMonitoring] Creating:', input.monitoring_number);

      const { data, error } = await supabase
        .from('heat_stress_monitoring')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useHeatStressMonitoring] Error creating:', error.message);
        throw error;
      }
      return data as HeatStressMonitoring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heat_stress_monitoring'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HeatStressMonitoring> & { id: string }) => {
      console.log('[useHeatStressMonitoring] Updating:', id);

      const { data, error } = await supabase
        .from('heat_stress_monitoring')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useHeatStressMonitoring] Error updating:', error.message);
        throw error;
      }
      return data as HeatStressMonitoring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heat_stress_monitoring'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useHeatStressMonitoring] Deleting:', id);

      const { error } = await supabase
        .from('heat_stress_monitoring')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useHeatStressMonitoring] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heat_stress_monitoring'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HSM-${year}${month}-${random}`;
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

export function useAirQualityMonitoring() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const recordsQuery = useQuery({
    queryKey: ['air_quality_monitoring', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useAirQualityMonitoring] No organization ID');
        return [];
      }
      console.log('[useAirQualityMonitoring] Fetching records');

      const { data, error } = await supabase
        .from('air_quality_monitoring')
        .select('*')
        .eq('organization_id', organizationId)
        .order('monitoring_date', { ascending: false });

      if (error) {
        console.error('[useAirQualityMonitoring] Error:', error.message);
        return [];
      }

      console.log('[useAirQualityMonitoring] Fetched', data?.length || 0, 'records');
      return (data || []) as AirQualityMonitoring[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAirQualityInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useAirQualityMonitoring] Creating:', input.monitoring_number);

      const { data, error } = await supabase
        .from('air_quality_monitoring')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useAirQualityMonitoring] Error creating:', error.message);
        throw error;
      }
      return data as AirQualityMonitoring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['air_quality_monitoring'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AirQualityMonitoring> & { id: string }) => {
      console.log('[useAirQualityMonitoring] Updating:', id);

      const { data, error } = await supabase
        .from('air_quality_monitoring')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useAirQualityMonitoring] Error updating:', error.message);
        throw error;
      }
      return data as AirQualityMonitoring;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['air_quality_monitoring'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useAirQualityMonitoring] Deleting:', id);

      const { error } = await supabase
        .from('air_quality_monitoring')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useAirQualityMonitoring] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['air_quality_monitoring'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `AQM-${year}${month}-${random}`;
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

export function useRepetitiveMotionAssessments() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const assessmentsQuery = useQuery({
    queryKey: ['repetitive_motion_assessments', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useRepetitiveMotionAssessments] No organization ID');
        return [];
      }
      console.log('[useRepetitiveMotionAssessments] Fetching assessments');

      const { data, error } = await supabase
        .from('repetitive_motion_assessments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('assessment_date', { ascending: false });

      if (error) {
        console.error('[useRepetitiveMotionAssessments] Error:', error.message);
        return [];
      }

      console.log('[useRepetitiveMotionAssessments] Fetched', data?.length || 0, 'records');
      return (data || []) as RepetitiveMotionAssessment[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateRepetitiveMotionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useRepetitiveMotionAssessments] Creating:', input.assessment_number);

      const { data, error } = await supabase
        .from('repetitive_motion_assessments')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useRepetitiveMotionAssessments] Error creating:', error.message);
        throw error;
      }
      return data as RepetitiveMotionAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repetitive_motion_assessments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RepetitiveMotionAssessment> & { id: string }) => {
      console.log('[useRepetitiveMotionAssessments] Updating:', id);

      const { data, error } = await supabase
        .from('repetitive_motion_assessments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useRepetitiveMotionAssessments] Error updating:', error.message);
        throw error;
      }
      return data as RepetitiveMotionAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repetitive_motion_assessments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useRepetitiveMotionAssessments] Deleting:', id);

      const { error } = await supabase
        .from('repetitive_motion_assessments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useRepetitiveMotionAssessments] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repetitive_motion_assessments'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RMA-${year}${month}-${random}`;
  }, []);

  return {
    assessments: assessmentsQuery.data || [],
    isLoading: assessmentsQuery.isLoading,
    isRefetching: assessmentsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: assessmentsQuery.refetch,
  };
}
