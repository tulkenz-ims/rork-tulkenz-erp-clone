import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  EmergencyActionPlanEntry,
  FireDrillEntry,
  EvacuationDrillEntry,
  SevereWeatherDrillEntry,
  EmergencyContact,
  AssemblyHeadcountEntry,
} from '@/types/emergencyPreparedness';

type CreateEAPInput = Omit<EmergencyActionPlanEntry, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateFireDrillInput = Omit<FireDrillEntry, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateEvacDrillInput = Omit<EvacuationDrillEntry, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateWeatherDrillInput = Omit<SevereWeatherDrillEntry, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateContactInput = Omit<EmergencyContact, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateHeadcountInput = Omit<AssemblyHeadcountEntry, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useEmergencyActionPlan() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const entriesQuery = useQuery({
    queryKey: ['emergency_action_plan_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEmergencyActionPlan] No organization ID, returning empty array');
        return [];
      }
      console.log('[useEmergencyActionPlan] Fetching entries for org:', organizationId);

      const { data, error } = await supabase
        .from('emergency_action_plan_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useEmergencyActionPlan] Error fetching entries:', error.message);
        return [];
      }

      console.log('[useEmergencyActionPlan] Fetched', data?.length || 0, 'entries');
      return (data || []) as EmergencyActionPlanEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateEAPInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useEmergencyActionPlan] Creating entry for:', input.employee_name);

      const { data, error } = await supabase
        .from('emergency_action_plan_entries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyActionPlan] Error creating entry:', error.message);
        throw error;
      }

      console.log('[useEmergencyActionPlan] Entry created:', data.id);
      return data as EmergencyActionPlanEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_action_plan_entries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmergencyActionPlanEntry> & { id: string }) => {
      console.log('[useEmergencyActionPlan] Updating entry:', id);

      const { data, error } = await supabase
        .from('emergency_action_plan_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyActionPlan] Error updating entry:', error.message);
        throw error;
      }

      return data as EmergencyActionPlanEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_action_plan_entries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useEmergencyActionPlan] Deleting entry:', id);

      const { error } = await supabase
        .from('emergency_action_plan_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useEmergencyActionPlan] Error deleting entry:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_action_plan_entries'] });
    },
  });

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: entriesQuery.refetch,
  };
}

export function useFireDrillLog() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const entriesQuery = useQuery({
    queryKey: ['fire_drill_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useFireDrillLog] No organization ID, returning empty array');
        return [];
      }
      console.log('[useFireDrillLog] Fetching entries for org:', organizationId);

      const { data, error } = await supabase
        .from('fire_drill_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('drill_date', { ascending: false });

      if (error) {
        console.error('[useFireDrillLog] Error fetching entries:', error.message);
        return [];
      }

      console.log('[useFireDrillLog] Fetched', data?.length || 0, 'entries');
      return (data || []) as FireDrillEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFireDrillInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useFireDrillLog] Creating entry for:', input.drill_date);

      const { data, error } = await supabase
        .from('fire_drill_entries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useFireDrillLog] Error creating entry:', error.message);
        throw error;
      }

      console.log('[useFireDrillLog] Entry created:', data.id);
      return data as FireDrillEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_drill_entries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FireDrillEntry> & { id: string }) => {
      console.log('[useFireDrillLog] Updating entry:', id);

      const { data, error } = await supabase
        .from('fire_drill_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useFireDrillLog] Error updating entry:', error.message);
        throw error;
      }

      return data as FireDrillEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_drill_entries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useFireDrillLog] Deleting entry:', id);

      const { error } = await supabase
        .from('fire_drill_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useFireDrillLog] Error deleting entry:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_drill_entries'] });
    },
  });

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: entriesQuery.refetch,
  };
}

export function useEvacuationDrill() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const entriesQuery = useQuery({
    queryKey: ['evacuation_drill_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEvacuationDrill] No organization ID, returning empty array');
        return [];
      }
      console.log('[useEvacuationDrill] Fetching entries for org:', organizationId);

      const { data, error } = await supabase
        .from('evacuation_drill_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('drill_date', { ascending: false });

      if (error) {
        console.error('[useEvacuationDrill] Error fetching entries:', error.message);
        return [];
      }

      console.log('[useEvacuationDrill] Fetched', data?.length || 0, 'entries');
      return (data || []) as EvacuationDrillEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateEvacDrillInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useEvacuationDrill] Creating entry for:', input.drill_date);

      const { data, error } = await supabase
        .from('evacuation_drill_entries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useEvacuationDrill] Error creating entry:', error.message);
        throw error;
      }

      console.log('[useEvacuationDrill] Entry created:', data.id);
      return data as EvacuationDrillEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evacuation_drill_entries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvacuationDrillEntry> & { id: string }) => {
      console.log('[useEvacuationDrill] Updating entry:', id);

      const { data, error } = await supabase
        .from('evacuation_drill_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useEvacuationDrill] Error updating entry:', error.message);
        throw error;
      }

      return data as EvacuationDrillEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evacuation_drill_entries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useEvacuationDrill] Deleting entry:', id);

      const { error } = await supabase
        .from('evacuation_drill_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useEvacuationDrill] Error deleting entry:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evacuation_drill_entries'] });
    },
  });

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: entriesQuery.refetch,
  };
}

export function useSevereWeatherDrill() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const entriesQuery = useQuery({
    queryKey: ['severe_weather_drill_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useSevereWeatherDrill] No organization ID, returning empty array');
        return [];
      }
      console.log('[useSevereWeatherDrill] Fetching entries for org:', organizationId);

      const { data, error } = await supabase
        .from('severe_weather_drill_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('drill_date', { ascending: false });

      if (error) {
        console.error('[useSevereWeatherDrill] Error fetching entries:', error.message);
        return [];
      }

      console.log('[useSevereWeatherDrill] Fetched', data?.length || 0, 'entries');
      return (data || []) as SevereWeatherDrillEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWeatherDrillInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSevereWeatherDrill] Creating entry for:', input.drill_date);

      const { data, error } = await supabase
        .from('severe_weather_drill_entries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useSevereWeatherDrill] Error creating entry:', error.message);
        throw error;
      }

      console.log('[useSevereWeatherDrill] Entry created:', data.id);
      return data as SevereWeatherDrillEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['severe_weather_drill_entries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SevereWeatherDrillEntry> & { id: string }) => {
      console.log('[useSevereWeatherDrill] Updating entry:', id);

      const { data, error } = await supabase
        .from('severe_weather_drill_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSevereWeatherDrill] Error updating entry:', error.message);
        throw error;
      }

      return data as SevereWeatherDrillEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['severe_weather_drill_entries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSevereWeatherDrill] Deleting entry:', id);

      const { error } = await supabase
        .from('severe_weather_drill_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useSevereWeatherDrill] Error deleting entry:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['severe_weather_drill_entries'] });
    },
  });

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: entriesQuery.refetch,
  };
}

export function useEmergencyContacts() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const contactsQuery = useQuery({
    queryKey: ['emergency_contacts', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEmergencyContacts] No organization ID, returning empty array');
        return [];
      }
      console.log('[useEmergencyContacts] Fetching contacts for org:', organizationId);

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('priority', { ascending: true })
        .order('category', { ascending: true });

      if (error) {
        console.error('[useEmergencyContacts] Error fetching contacts:', error.message);
        return [];
      }

      console.log('[useEmergencyContacts] Fetched', data?.length || 0, 'contacts');
      return (data || []) as EmergencyContact[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateContactInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useEmergencyContacts] Creating contact:', input.name);

      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyContacts] Error creating contact:', error.message);
        throw error;
      }

      console.log('[useEmergencyContacts] Contact created:', data.id);
      return data as EmergencyContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_contacts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmergencyContact> & { id: string }) => {
      console.log('[useEmergencyContacts] Updating contact:', id);

      const { data, error } = await supabase
        .from('emergency_contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyContacts] Error updating contact:', error.message);
        throw error;
      }

      return data as EmergencyContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_contacts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useEmergencyContacts] Deleting contact:', id);

      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useEmergencyContacts] Error deleting contact:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_contacts'] });
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    isRefetching: contactsQuery.isRefetching,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: contactsQuery.refetch,
  };
}

export function useAssemblyHeadcount() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const entriesQuery = useQuery({
    queryKey: ['assembly_headcount_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useAssemblyHeadcount] No organization ID, returning empty array');
        return [];
      }
      console.log('[useAssemblyHeadcount] Fetching entries for org:', organizationId);

      const { data, error } = await supabase
        .from('assembly_headcount_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('[useAssemblyHeadcount] Error fetching entries:', error.message);
        return [];
      }

      console.log('[useAssemblyHeadcount] Fetched', data?.length || 0, 'entries');
      return (data || []) as AssemblyHeadcountEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateHeadcountInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useAssemblyHeadcount] Creating entry for:', input.event_date);

      const { data, error } = await supabase
        .from('assembly_headcount_entries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) {
        console.error('[useAssemblyHeadcount] Error creating entry:', error.message);
        throw error;
      }

      console.log('[useAssemblyHeadcount] Entry created:', data.id);
      return data as AssemblyHeadcountEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly_headcount_entries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssemblyHeadcountEntry> & { id: string }) => {
      console.log('[useAssemblyHeadcount] Updating entry:', id);

      const { data, error } = await supabase
        .from('assembly_headcount_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useAssemblyHeadcount] Error updating entry:', error.message);
        throw error;
      }

      return data as AssemblyHeadcountEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly_headcount_entries'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useAssemblyHeadcount] Deleting entry:', id);

      const { error } = await supabase
        .from('assembly_headcount_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[useAssemblyHeadcount] Error deleting entry:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly_headcount_entries'] });
    },
  });

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: entriesQuery.refetch,
  };
}
