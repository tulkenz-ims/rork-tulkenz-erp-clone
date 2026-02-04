import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Facility, FacilityCreateInput, FacilityUpdateInput } from '@/types/facility';

export function useFacilities() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['facilities', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useFacilities] No organization ID');
        return [];
      }

      console.log('[useFacilities] Fetching facilities for org:', organizationId);

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', organizationId)
        .order('facility_number', { ascending: true });

      if (error) {
        console.error('[useFacilities] Error fetching facilities:', error);
        throw new Error(error.message);
      }

      console.log('[useFacilities] Fetched', data?.length || 0, 'facilities');
      return (data || []) as Facility[];
    },
    enabled: !!organizationId,
  });
}

export function useFacility(facilityId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['facility', facilityId, organizationId],
    queryFn: async () => {
      if (!organizationId || !facilityId) {
        return null;
      }

      console.log('[useFacility] Fetching facility:', facilityId);

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useFacility] Error fetching facility:', error);
        throw new Error(error.message);
      }

      return data as Facility;
    },
    enabled: !!organizationId && !!facilityId,
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: Omit<FacilityCreateInput, 'organization_id'>) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreateFacility] Creating facility:', input.name);

      const { data, error } = await supabase
        .from('facilities')
        .insert({
          ...input,
          organization_id: organization.id,
          country: input.country || 'USA',
          timezone: input.timezone || 'America/Chicago',
          active: input.active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateFacility] Error creating facility:', JSON.stringify(error, null, 2));
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          throw new Error('A facility with this number already exists. Please use a different facility number.');
        }
        throw new Error(error.message || 'Failed to create facility');
      }

      console.log('[useCreateFacility] Created facility:', data.id);
      return data as Facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['next-facility-number'] });
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FacilityUpdateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateFacility] Updating facility:', id);

      const { data, error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateFacility] Error updating facility:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateFacility] Updated facility:', data.id);
      return data as Facility;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (facilityId: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeleteFacility] Deleting facility:', facilityId);

      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facilityId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeleteFacility] Error deleting facility:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteFacility] Deleted facility:', facilityId);
      return facilityId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useToggleFacilityStatus() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useToggleFacilityStatus] Toggling facility status:', id, 'to', active);

      const { data, error } = await supabase
        .from('facilities')
        .update({ active })
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useToggleFacilityStatus] Error toggling facility:', error);
        throw new Error(error.message);
      }

      console.log('[useToggleFacilityStatus] Toggled facility:', data.id);
      return data as Facility;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', data.id] });
    },
  });
}

export function useNextFacilityNumber() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['next-facility-number', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return 1;
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('facility_number')
        .eq('organization_id', organizationId)
        .order('facility_number', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[useNextFacilityNumber] Error:', error);
        return 1;
      }

      const maxNumber = data?.[0]?.facility_number || 0;
      return maxNumber + 1;
    },
    enabled: !!organizationId,
  });
}
