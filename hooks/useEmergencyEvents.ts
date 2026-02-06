import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import {
  EmergencyEvent,
  EmergencyEventFormData,
  EmergencyEventStatus,
  EmergencyTimelineEntry,
} from '@/types/emergencyEvents';

type CreateEmergencyEventInput = EmergencyEventFormData;

type UpdateEmergencyEventInput = {
  id: string;
  status?: EmergencyEventStatus;
  all_clear_at?: string;
  resolved_at?: string;
  total_evacuated?: number;
  total_sheltered?: number;
  injuries_reported?: number;
  fatalities_reported?: number;
  emergency_services_arrival?: string;
  assembly_points_used?: string[];
  actions_taken?: string[];
  after_action_notes?: string;
  corrective_actions?: string;
  root_cause?: string;
  property_damage?: boolean;
  property_damage_description?: string;
  estimated_damage_cost?: number;
  notifications_sent?: boolean;
};

export function useEmergencyEvents() {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const userContext = useUser();
  const organizationId = orgContext?.organizationId;
  const facilityId = orgContext?.facilityId;
  const userName = userContext?.userProfile
    ? `${userContext.userProfile.first_name} ${userContext.userProfile.last_name}`.trim()
    : 'Unknown';
  const userId = userContext?.userProfile?.id;

  const eventsQuery = useQuery({
    queryKey: ['emergency_events', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEmergencyEvents] No organization ID, returning empty array');
        return [];
      }
      console.log('[useEmergencyEvents] Fetching events for org:', organizationId);

      const { data, error } = await supabase
        .from('emergency_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('initiated_at', { ascending: false });

      if (error) {
        console.error('[useEmergencyEvents] Error fetching events:', error.message);
        return [];
      }

      console.log('[useEmergencyEvents] Fetched', data?.length || 0, 'events');
      return (data || []) as EmergencyEvent[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateEmergencyEventInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useEmergencyEvents] Creating event:', input.event_type, input.title);

      const now = new Date().toISOString();
      const initialTimeline: EmergencyTimelineEntry[] = [
        {
          id: `tl-${Date.now()}`,
          timestamp: now,
          action: `Emergency ${input.drill ? 'drill' : 'event'} initiated: ${input.title}`,
          performed_by: userName,
        },
      ];

      const record = {
        organization_id: organizationId,
        facility_id: facilityId || null,
        event_type: input.event_type,
        severity: input.severity,
        status: 'initiated' as const,
        title: input.title,
        description: input.description || null,
        location_details: input.location_details || null,
        initiated_by: userName,
        initiated_by_id: userId || null,
        initiated_at: now,
        injuries_reported: 0,
        fatalities_reported: 0,
        emergency_services_called: input.emergency_services_called,
        assembly_points_used: [],
        departments_affected: input.departments_affected,
        actions_taken: [],
        timeline_entries: initialTimeline,
        media_urls: [],
        notifications_sent: false,
        drill: input.drill,
      };

      const { data, error } = await supabase
        .from('emergency_events')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyEvents] Error creating event:', error.message);
        throw error;
      }

      console.log('[useEmergencyEvents] Created event:', data.id);
      return data as EmergencyEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateEmergencyEventInput) => {
      if (!organizationId) throw new Error('No organization selected');
      const { id, ...updates } = input;
      console.log('[useEmergencyEvents] Updating event:', id, updates);

      const { data, error } = await supabase
        .from('emergency_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyEvents] Error updating event:', error.message);
        throw error;
      }

      console.log('[useEmergencyEvents] Updated event:', data.id);
      return data as EmergencyEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
    },
  });

  const addTimelineEntryMutation = useMutation({
    mutationFn: async ({ eventId, action, notes }: { eventId: string; action: string; notes?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useEmergencyEvents] Adding timeline entry to event:', eventId);

      const { data: existing, error: fetchError } = await supabase
        .from('emergency_events')
        .select('timeline_entries')
        .eq('id', eventId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) {
        console.error('[useEmergencyEvents] Error fetching event for timeline:', fetchError.message);
        throw fetchError;
      }

      const currentEntries = (existing?.timeline_entries || []) as EmergencyTimelineEntry[];
      const newEntry: EmergencyTimelineEntry = {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        performed_by: userName,
        notes: notes || undefined,
      };

      const { data, error } = await supabase
        .from('emergency_events')
        .update({
          timeline_entries: [...currentEntries, newEntry],
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useEmergencyEvents] Error adding timeline entry:', error.message);
        throw error;
      }

      return data as EmergencyEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useEmergencyEvents] Deleting event:', eventId);

      const { error } = await supabase
        .from('emergency_events')
        .delete()
        .eq('id', eventId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useEmergencyEvents] Error deleting event:', error.message);
        throw error;
      }

      console.log('[useEmergencyEvents] Deleted event:', eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency_events', organizationId] });
    },
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    refetch: eventsQuery.refetch,
    createEvent: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateEvent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    addTimelineEntry: addTimelineEntryMutation.mutateAsync,
    isAddingTimeline: addTimelineEntryMutation.isPending,
    deleteEvent: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useEmergencyEvent(eventId: string | undefined) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;

  return useQuery({
    queryKey: ['emergency_events', organizationId, eventId],
    queryFn: async () => {
      if (!organizationId || !eventId) return null;
      console.log('[useEmergencyEvent] Fetching event:', eventId);

      const { data, error } = await supabase
        .from('emergency_events')
        .select('*')
        .eq('id', eventId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useEmergencyEvent] Error:', error.message);
        return null;
      }

      return data as EmergencyEvent;
    },
    enabled: !!organizationId && !!eventId,
  });
}
