import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
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

// ── Helper: map an emergency_events row → FireDrillEntry shape ──
function mapEventToFireDrill(row: any): FireDrillEntry {
  const tl = row.timeline_entries || [];
  const meta = row.drill_metadata || {};
  return {
    id:                       row.id,
    organization_id:          row.organization_id,
    drill_date:               row.initiated_at
                                ? new Date(row.initiated_at).toISOString().split('T')[0]
                                : (meta.drill_date || ''),
    drill_time:               row.initiated_at
                                ? new Date(row.initiated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                                : (meta.drill_time || ''),
    drill_type:               meta.drill_type || 'announced',
    shift:                    meta.shift || '',
    facility_name:            row.facility_name || meta.facility_name || '',
    alarm_activation_time:    meta.alarm_activation_time || '',
    building_clear_time:      meta.building_clear_time || '',
    total_evacuation_time: meta.total_evacuation_time ||
  (row.all_clear_at && row.initiated_at
    ? (() => {
        const secs = Math.floor((new Date(row.all_clear_at).getTime() - new Date(row.initiated_at).getTime()) / 1000);
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${s.toString().padStart(2, '0')}`;
      })()
    : ''),
    total_participants:       row.total_evacuated || meta.total_participants || 0,
    assembly_points_used:     row.assembly_points_used || meta.assembly_points_used || [],
    headcount_completed:      meta.headcount_completed ?? true,
    headcount_time:           meta.headcount_time || '',
    all_accounted_for:        row.total_evacuated > 0 && !meta.missing_persons,
    missing_persons:          meta.missing_persons || '',
    fire_extinguishers_tested:meta.fire_extinguishers_tested ?? false,
    alarms_audible:           meta.alarms_audible ?? false,
    exit_signs_lit:           meta.exit_signs_lit ?? false,
    exits_unobstructed:       meta.exits_unobstructed ?? false,
    evacuation_aids_used:     meta.evacuation_aids_used || [],
    issues_identified:        meta.issues_identified || [],
    corrective_actions:       row.corrective_actions || meta.corrective_actions || '',
    conducted_by:             row.initiated_by || meta.conducted_by || '',
    observer_names:           meta.observer_names || '',
    weather_conditions:       meta.weather_conditions || '',
    announcement_made:        meta.announcement_made ?? false,
    status:                   mapEventStatusToDrillStatus(row.status, meta.issues_identified),
    next_drill_due:           meta.next_drill_due || '',
    notes:                    row.description || meta.notes || '',
    created_at:               row.created_at,
    updated_at:               row.updated_at,
  };
}

function mapEventStatusToDrillStatus(eventStatus: string, issues: string[] | undefined): FireDrillEntry['status'] {
  if (eventStatus === 'cancelled') return 'issues_found';
  if (issues && issues.length > 0) return 'corrective_pending';
  if (eventStatus === 'all_clear' || eventStatus === 'resolved') return 'completed';
  if (eventStatus === 'initiated' || eventStatus === 'in_progress') return 'scheduled';
  return 'completed';
}

// ── useFireDrillLog — now reads/writes emergency_events ────────
export function useFireDrillLog() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const userContext = useUser();
  // Fallback to company.id if OrganizationContext not hydrated
  const organizationId = orgContext?.organizationId || userContext?.company?.id || null;
  const userName = userContext?.userProfile
    ? `${userContext.userProfile.first_name} ${userContext.userProfile.last_name}`.trim()
    : 'Unknown';

  const entriesQuery = useQuery({
    queryKey: ['fire_drill_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useFireDrillLog] Fetching fire drills from emergency_events for org:', organizationId);

      const { data, error } = await supabase
        .from('emergency_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('event_type', 'fire')
        .eq('drill', true)
        .order('initiated_at', { ascending: false });

      if (error) {
        console.error('[useFireDrillLog] Error fetching entries:', error.message);
        return [];
      }

      console.log('[useFireDrillLog] Fetched', data?.length || 0, 'fire drills');
      return (data || []).map(mapEventToFireDrill) as FireDrillEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFireDrillInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useFireDrillLog] Creating fire drill for:', input.drill_date);

      const drillDate = input.drill_date ? new Date(input.drill_date + 'T' + (input.drill_time || '00:00') + ':00') : new Date();
      const hasIssues = (input.issues_identified || []).length > 0 || !input.all_accounted_for;

      const record = {
        organization_id:          organizationId,
        event_type:               'fire',
        severity:                 hasIssues ? 'high' : 'low',
        status:                   hasIssues ? 'resolved' : 'all_clear',
        title:                    `Fire Drill - ${input.drill_date}`,
        description:              input.notes || null,
        location_details:         input.facility_name || null,
        initiated_by:             input.conducted_by || userName,
        initiated_at:             drillDate.toISOString(),
        resolved_at:              drillDate.toISOString(),
        all_clear_at:             hasIssues ? null : drillDate.toISOString(),
        total_evacuated:          input.total_participants || 0,
        assembly_points_used:     input.assembly_points_used || [],
        corrective_actions:       input.corrective_actions || null,
        emergency_services_called:false,
        drill:                    true,
        notifications_sent:       false,
        departments_affected:     [],
        actions_taken:            [],
        media_urls:               [],
        timeline_entries:         [{
          id: `tl-${Date.now()}`,
          timestamp: drillDate.toISOString(),
          action: `Fire drill conducted — ${input.drill_type || 'announced'} — ${input.total_participants || 0} participants`,
          performed_by: input.conducted_by || userName,
        }],
        // Store fire-drill-specific fields in after_action_notes as JSON
        after_action_notes:       JSON.stringify({
          drill_type:               input.drill_type,
          shift:                    input.shift,
          facility_name:            input.facility_name,
          alarm_activation_time:    input.alarm_activation_time,
          building_clear_time:      input.building_clear_time,
          total_evacuation_time:    input.total_evacuation_time,
          headcount_completed:      input.headcount_completed,
          headcount_time:           input.headcount_time,
          all_accounted_for:        input.all_accounted_for,
          missing_persons:          input.missing_persons,
          fire_extinguishers_tested:input.fire_extinguishers_tested,
          alarms_audible:           input.alarms_audible,
          exit_signs_lit:           input.exit_signs_lit,
          exits_unobstructed:       input.exits_unobstructed,
          evacuation_aids_used:     input.evacuation_aids_used,
          issues_identified:        input.issues_identified,
          observer_names:           input.observer_names,
          weather_conditions:       input.weather_conditions,
          announcement_made:        input.announcement_made,
          next_drill_due:           input.next_drill_due,
          drill_date:               input.drill_date,
          drill_time:               input.drill_time,
        }),
      };

      const { data, error } = await supabase
        .from('emergency_events')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('[useFireDrillLog] Error creating entry:', error.message);
        throw error;
      }

      console.log('[useFireDrillLog] Fire drill created:', data.id);
      return mapEventToFireDrill(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_drill_entries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FireDrillEntry> & { id: string }) => {
      console.log('[useFireDrillLog] Updating fire drill:', id);

      const hasIssues = (updates.issues_identified || []).length > 0 || !updates.all_accounted_for;

      const { data, error } = await supabase
        .from('emergency_events')
        .update({
          title:              updates.drill_date ? `Fire Drill - ${updates.drill_date}` : undefined,
          description:        updates.notes || null,
          location_details:   updates.facility_name || null,
          total_evacuated:    updates.total_participants,
          assembly_points_used: updates.assembly_points_used,
          corrective_actions: updates.corrective_actions || null,
          severity:           hasIssues ? 'high' : 'low',
          status:             hasIssues ? 'resolved' : 'all_clear',
          after_action_notes: JSON.stringify({
            drill_type:               updates.drill_type,
            shift:                    updates.shift,
            facility_name:            updates.facility_name,
            alarm_activation_time:    updates.alarm_activation_time,
            building_clear_time:      updates.building_clear_time,
            total_evacuation_time:    updates.total_evacuation_time,
            headcount_completed:      updates.headcount_completed,
            headcount_time:           updates.headcount_time,
            all_accounted_for:        updates.all_accounted_for,
            missing_persons:          updates.missing_persons,
            fire_extinguishers_tested:updates.fire_extinguishers_tested,
            alarms_audible:           updates.alarms_audible,
            exit_signs_lit:           updates.exit_signs_lit,
            exits_unobstructed:       updates.exits_unobstructed,
            evacuation_aids_used:     updates.evacuation_aids_used,
            issues_identified:        updates.issues_identified,
            observer_names:           updates.observer_names,
            weather_conditions:       updates.weather_conditions,
            announcement_made:        updates.announcement_made,
            next_drill_due:           updates.next_drill_due,
            drill_date:               updates.drill_date,
            drill_time:               updates.drill_time,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId!)
        .select()
        .single();

      if (error) {
        console.error('[useFireDrillLog] Error updating entry:', error.message);
        throw error;
      }

      return mapEventToFireDrill(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_drill_entries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useFireDrillLog] Deleting fire drill:', id);
      const { error } = await supabase
        .from('emergency_events')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId!);
      if (error) {
        console.error('[useFireDrillLog] Error deleting entry:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire_drill_entries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
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

// ── All other hooks below are UNCHANGED ───────────────────────

export function useEmergencyActionPlan() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  const entriesQuery = useQuery({
    queryKey: ['emergency_action_plan_entries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('emergency_action_plan_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) { console.error('[useEmergencyActionPlan] Error:', error.message); return []; }
      return (data || []) as EmergencyActionPlanEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateEAPInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase.from('emergency_action_plan_entries').insert({ organization_id: organizationId, ...input }).select().single();
      if (error) throw error;
      return data as EmergencyActionPlanEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergency_action_plan_entries'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmergencyActionPlanEntry> & { id: string }) => {
      const { data, error } = await supabase.from('emergency_action_plan_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as EmergencyActionPlanEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergency_action_plan_entries'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('emergency_action_plan_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergency_action_plan_entries'] }); },
  });

  return {
    entries: entriesQuery.data || [], isLoading: entriesQuery.isLoading, isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync, updateEntry: updateMutation.mutateAsync, deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending,
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
      if (!organizationId) return [];
      const { data, error } = await supabase.from('evacuation_drill_entries').select('*').eq('organization_id', organizationId).order('drill_date', { ascending: false });
      if (error) { console.error('[useEvacuationDrill] Error:', error.message); return []; }
      return (data || []) as EvacuationDrillEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateEvacDrillInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase.from('evacuation_drill_entries').insert({ organization_id: organizationId, ...input }).select().single();
      if (error) throw error;
      return data as EvacuationDrillEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evacuation_drill_entries'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvacuationDrillEntry> & { id: string }) => {
      const { data, error } = await supabase.from('evacuation_drill_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as EvacuationDrillEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evacuation_drill_entries'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evacuation_drill_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evacuation_drill_entries'] }); },
  });

  return {
    entries: entriesQuery.data || [], isLoading: entriesQuery.isLoading, isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync, updateEntry: updateMutation.mutateAsync, deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending,
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
      if (!organizationId) return [];
      const { data, error } = await supabase.from('severe_weather_drill_entries').select('*').eq('organization_id', organizationId).order('drill_date', { ascending: false });
      if (error) { console.error('[useSevereWeatherDrill] Error:', error.message); return []; }
      return (data || []) as SevereWeatherDrillEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWeatherDrillInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase.from('severe_weather_drill_entries').insert({ organization_id: organizationId, ...input }).select().single();
      if (error) throw error;
      return data as SevereWeatherDrillEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['severe_weather_drill_entries'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SevereWeatherDrillEntry> & { id: string }) => {
      const { data, error } = await supabase.from('severe_weather_drill_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as SevereWeatherDrillEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['severe_weather_drill_entries'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('severe_weather_drill_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['severe_weather_drill_entries'] }); },
  });

  return {
    entries: entriesQuery.data || [], isLoading: entriesQuery.isLoading, isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync, updateEntry: updateMutation.mutateAsync, deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending,
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
      if (!organizationId) return [];
      const { data, error } = await supabase.from('emergency_contacts').select('*').eq('organization_id', organizationId).order('priority', { ascending: true }).order('category', { ascending: true });
      if (error) { console.error('[useEmergencyContacts] Error:', error.message); return []; }
      return (data || []) as EmergencyContact[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateContactInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase.from('emergency_contacts').insert({ organization_id: organizationId, ...input }).select().single();
      if (error) throw error;
      return data as EmergencyContact;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergency_contacts'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmergencyContact> & { id: string }) => {
      const { data, error } = await supabase.from('emergency_contacts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as EmergencyContact;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergency_contacts'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emergency_contacts'] }); },
  });

  return {
    contacts: contactsQuery.data || [], isLoading: contactsQuery.isLoading, isRefetching: contactsQuery.isRefetching,
    createContact: createMutation.mutateAsync, updateContact: updateMutation.mutateAsync, deleteContact: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending,
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
      if (!organizationId) return [];
      const { data, error } = await supabase.from('assembly_headcount_entries').select('*').eq('organization_id', organizationId).order('event_date', { ascending: false });
      if (error) { console.error('[useAssemblyHeadcount] Error:', error.message); return []; }
      return (data || []) as AssemblyHeadcountEntry[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateHeadcountInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase.from('assembly_headcount_entries').insert({ organization_id: organizationId, ...input }).select().single();
      if (error) throw error;
      return data as AssemblyHeadcountEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assembly_headcount_entries'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssemblyHeadcountEntry> & { id: string }) => {
      const { data, error } = await supabase.from('assembly_headcount_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as AssemblyHeadcountEntry;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assembly_headcount_entries'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assembly_headcount_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assembly_headcount_entries'] }); },
  });

  return {
    entries: entriesQuery.data || [], isLoading: entriesQuery.isLoading, isRefetching: entriesQuery.isRefetching,
    createEntry: createMutation.mutateAsync, updateEntry: updateMutation.mutateAsync, deleteEntry: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending,
    refetch: entriesQuery.refetch,
  };
}
