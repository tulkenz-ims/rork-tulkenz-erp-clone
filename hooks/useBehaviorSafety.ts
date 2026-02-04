import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  SafetyObservation,
  PeerSafetyAudit,
  SafetySuggestion,
  SafetyCommitteeMeeting,
  SafetyRecognition,
} from '@/types/behaviorSafety';

type CreateSafetyObservationInput = Omit<SafetyObservation, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreatePeerSafetyAuditInput = Omit<PeerSafetyAudit, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateSafetySuggestionInput = Omit<SafetySuggestion, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateSafetyCommitteeMeetingInput = Omit<SafetyCommitteeMeeting, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateSafetyRecognitionInput = Omit<SafetyRecognition, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSafetyObservations() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const observationsQuery = useQuery({
    queryKey: ['safety_observations', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSafetyObservations] No organization ID');
        return [];
      }
      console.log('[useSafetyObservations] Fetching observations');

      const { data, error } = await supabase
        .from('safety_observations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('observation_date', { ascending: false });

      if (error) {
        console.error('[useSafetyObservations] Error:', error.message);
        return [];
      }

      console.log('[useSafetyObservations] Fetched', data?.length || 0, 'records');
      return (data || []) as SafetyObservation[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSafetyObservationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSafetyObservations] Creating:', input.observation_number);

      const { data, error } = await supabase
        .from('safety_observations')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useSafetyObservations] Error creating:', error.message);
        throw error;
      }
      return data as SafetyObservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_observations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyObservation> & { id: string }) => {
      console.log('[useSafetyObservations] Updating:', id);

      const { data, error } = await supabase
        .from('safety_observations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyObservations] Error updating:', error.message);
        throw error;
      }
      return data as SafetyObservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_observations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSafetyObservations] Deleting:', id);

      const { error } = await supabase
        .from('safety_observations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useSafetyObservations] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_observations'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SOC-${year}${month}-${random}`;
  }, []);

  return {
    observations: observationsQuery.data || [],
    isLoading: observationsQuery.isLoading,
    isRefetching: observationsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: observationsQuery.refetch,
  };
}

export function usePeerSafetyAudits() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const auditsQuery = useQuery({
    queryKey: ['peer_safety_audits', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[usePeerSafetyAudits] No organization ID');
        return [];
      }
      console.log('[usePeerSafetyAudits] Fetching audits');

      const { data, error } = await supabase
        .from('peer_safety_audits')
        .select('*')
        .eq('organization_id', organizationId)
        .order('audit_date', { ascending: false });

      if (error) {
        console.error('[usePeerSafetyAudits] Error:', error.message);
        return [];
      }

      console.log('[usePeerSafetyAudits] Fetched', data?.length || 0, 'records');
      return (data || []) as PeerSafetyAudit[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePeerSafetyAuditInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[usePeerSafetyAudits] Creating:', input.audit_number);

      const { data, error } = await supabase
        .from('peer_safety_audits')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[usePeerSafetyAudits] Error creating:', error.message);
        throw error;
      }
      return data as PeerSafetyAudit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer_safety_audits'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PeerSafetyAudit> & { id: string }) => {
      console.log('[usePeerSafetyAudits] Updating:', id);

      const { data, error } = await supabase
        .from('peer_safety_audits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[usePeerSafetyAudits] Error updating:', error.message);
        throw error;
      }
      return data as PeerSafetyAudit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer_safety_audits'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[usePeerSafetyAudits] Deleting:', id);

      const { error } = await supabase
        .from('peer_safety_audits')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[usePeerSafetyAudits] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer_safety_audits'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PSA-${year}${month}-${random}`;
  }, []);

  return {
    audits: auditsQuery.data || [],
    isLoading: auditsQuery.isLoading,
    isRefetching: auditsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: auditsQuery.refetch,
  };
}

export function useSafetySuggestions() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const suggestionsQuery = useQuery({
    queryKey: ['safety_suggestions', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSafetySuggestions] No organization ID');
        return [];
      }
      console.log('[useSafetySuggestions] Fetching suggestions');

      const { data, error } = await supabase
        .from('safety_suggestions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('submission_date', { ascending: false });

      if (error) {
        console.error('[useSafetySuggestions] Error:', error.message);
        return [];
      }

      console.log('[useSafetySuggestions] Fetched', data?.length || 0, 'records');
      return (data || []) as SafetySuggestion[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSafetySuggestionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSafetySuggestions] Creating:', input.suggestion_number);

      const { data, error } = await supabase
        .from('safety_suggestions')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useSafetySuggestions] Error creating:', error.message);
        throw error;
      }
      return data as SafetySuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_suggestions'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetySuggestion> & { id: string }) => {
      console.log('[useSafetySuggestions] Updating:', id);

      const { data, error } = await supabase
        .from('safety_suggestions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetySuggestions] Error updating:', error.message);
        throw error;
      }
      return data as SafetySuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_suggestions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSafetySuggestions] Deleting:', id);

      const { error } = await supabase
        .from('safety_suggestions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useSafetySuggestions] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_suggestions'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SSG-${year}${month}-${random}`;
  }, []);

  return {
    suggestions: suggestionsQuery.data || [],
    isLoading: suggestionsQuery.isLoading,
    isRefetching: suggestionsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: suggestionsQuery.refetch,
  };
}

export function useSafetyCommitteeMeetings() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const meetingsQuery = useQuery({
    queryKey: ['safety_committee_meetings', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSafetyCommitteeMeetings] No organization ID');
        return [];
      }
      console.log('[useSafetyCommitteeMeetings] Fetching meetings');

      const { data, error } = await supabase
        .from('safety_committee_meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.error('[useSafetyCommitteeMeetings] Error:', error.message);
        return [];
      }

      console.log('[useSafetyCommitteeMeetings] Fetched', data?.length || 0, 'records');
      return (data || []) as SafetyCommitteeMeeting[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSafetyCommitteeMeetingInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSafetyCommitteeMeetings] Creating:', input.meeting_number);

      const { data, error } = await supabase
        .from('safety_committee_meetings')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useSafetyCommitteeMeetings] Error creating:', error.message);
        throw error;
      }
      return data as SafetyCommitteeMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_committee_meetings'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyCommitteeMeeting> & { id: string }) => {
      console.log('[useSafetyCommitteeMeetings] Updating:', id);

      const { data, error } = await supabase
        .from('safety_committee_meetings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyCommitteeMeetings] Error updating:', error.message);
        throw error;
      }
      return data as SafetyCommitteeMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_committee_meetings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSafetyCommitteeMeetings] Deleting:', id);

      const { error } = await supabase
        .from('safety_committee_meetings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useSafetyCommitteeMeetings] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_committee_meetings'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SCM-${year}${month}-${random}`;
  }, []);

  return {
    meetings: meetingsQuery.data || [],
    isLoading: meetingsQuery.isLoading,
    isRefetching: meetingsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: meetingsQuery.refetch,
  };
}

export function useSafetyRecognitions() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const recognitionsQuery = useQuery({
    queryKey: ['safety_recognitions', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSafetyRecognitions] No organization ID');
        return [];
      }
      console.log('[useSafetyRecognitions] Fetching recognitions');

      const { data, error } = await supabase
        .from('safety_recognitions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('recognition_date', { ascending: false });

      if (error) {
        console.error('[useSafetyRecognitions] Error:', error.message);
        return [];
      }

      console.log('[useSafetyRecognitions] Fetched', data?.length || 0, 'records');
      return (data || []) as SafetyRecognition[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSafetyRecognitionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSafetyRecognitions] Creating:', input.recognition_number);

      const { data, error } = await supabase
        .from('safety_recognitions')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useSafetyRecognitions] Error creating:', error.message);
        throw error;
      }
      return data as SafetyRecognition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_recognitions'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyRecognition> & { id: string }) => {
      console.log('[useSafetyRecognitions] Updating:', id);

      const { data, error } = await supabase
        .from('safety_recognitions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSafetyRecognitions] Error updating:', error.message);
        throw error;
      }
      return data as SafetyRecognition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_recognitions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSafetyRecognitions] Deleting:', id);

      const { error } = await supabase
        .from('safety_recognitions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useSafetyRecognitions] Error deleting:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_recognitions'] });
    },
  });

  const generateNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SRN-${year}${month}-${random}`;
  }, []);

  return {
    recognitions: recognitionsQuery.data || [],
    isLoading: recognitionsQuery.isLoading,
    isRefetching: recognitionsQuery.isRefetching,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    generateNumber,
    refetch: recognitionsQuery.refetch,
  };
}
