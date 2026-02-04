import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Location, LocationCreateInput, LocationUpdateInput, LocationWithFacility, LocationStatus } from '@/types/location';

export function useLocations() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['locations', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useLocations] No organization ID');
        return [];
      }

      console.log('[useLocations] Fetching locations for org:', organizationId);

      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          facility:facilities(id, name, facility_code, facility_number),
          department:departments(id, name, department_code),
          parent_location:locations!parent_location_id(id, name, location_code)
        `)
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })
        .order('location_code', { ascending: true });

      if (error) {
        console.error('[useLocations] Error fetching locations:', error);
        throw new Error(error.message);
      }

      console.log('[useLocations] Fetched', data?.length || 0, 'locations');
      return (data || []) as LocationWithFacility[];
    },
    enabled: !!organizationId,
  });
}

export function useLocationsByFacility(facilityId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['locations', organizationId, 'facility', facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useLocationsByFacility] No organization ID');
        return [];
      }

      console.log('[useLocationsByFacility] Fetching locations for facility:', facilityId);

      let query = supabase
        .from('locations')
        .select(`
          *,
          facility:facilities(id, name, facility_code, facility_number),
          department:departments(id, name, department_code),
          parent_location:locations!parent_location_id(id, name, location_code)
        `)
        .eq('organization_id', organizationId);

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query
        .order('sort_order', { ascending: true })
        .order('location_code', { ascending: true });

      if (error) {
        console.error('[useLocationsByFacility] Error fetching locations:', error);
        throw new Error(error.message);
      }

      console.log('[useLocationsByFacility] Fetched', data?.length || 0, 'locations');
      return (data || []) as LocationWithFacility[];
    },
    enabled: !!organizationId,
  });
}

export function useLocation(locationId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['location', locationId, organizationId],
    queryFn: async () => {
      if (!organizationId || !locationId) {
        return null;
      }

      console.log('[useLocation] Fetching location:', locationId);

      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          facility:facilities(id, name, facility_code, facility_number),
          department:departments(id, name, department_code),
          parent_location:locations!parent_location_id(id, name, location_code)
        `)
        .eq('id', locationId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useLocation] Error fetching location:', error);
        throw new Error(error.message);
      }

      return data as LocationWithFacility;
    },
    enabled: !!organizationId && !!locationId,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: Omit<LocationCreateInput, 'organization_id'>) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreateLocation] Creating location:', input.name);

      const { data, error } = await supabase
        .from('locations')
        .insert({
          ...input,
          organization_id: organization.id,
          status: input.status || 'active',
          color: input.color || '#6B7280',
          level: 1,
          current_occupancy: 0,
          equipment_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateLocation] Error creating location:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateLocation] Created location:', data.id);
      return data as Location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LocationUpdateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateLocation] Updating location:', id);

      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateLocation] Error updating location:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateLocation] Updated location:', data.id);
      return data as Location;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location', data.id] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (locationId: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeleteLocation] Deleting location:', locationId);

      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeleteLocation] Error deleting location:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteLocation] Deleted location:', locationId);
      return locationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useToggleLocationStatus() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LocationStatus }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useToggleLocationStatus] Toggling location status:', id, 'to', status);

      const { data, error } = await supabase
        .from('locations')
        .update({ status })
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useToggleLocationStatus] Error toggling location:', error);
        throw new Error(error.message);
      }

      console.log('[useToggleLocationStatus] Toggled location:', data.id);
      return data as Location;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location', data.id] });
    },
  });
}

export function useNextLocationCode(facilityId: string | null) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['next-location-code', organizationId, facilityId],
    queryFn: async () => {
      if (!organizationId || !facilityId) {
        return 'LOC-001';
      }

      const { data, error } = await supabase
        .from('locations')
        .select('location_code')
        .eq('organization_id', organizationId)
        .eq('facility_id', facilityId)
        .order('location_code', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[useNextLocationCode] Error:', error);
        return 'LOC-001';
      }

      if (!data || data.length === 0) {
        return 'LOC-001';
      }

      const lastCode = data[0].location_code;
      const match = lastCode.match(/(\d+)$/);
      if (match) {
        const nextNumber = parseInt(match[1], 10) + 1;
        const prefix = lastCode.replace(/\d+$/, '');
        return `${prefix}${String(nextNumber).padStart(3, '0')}`;
      }

      return 'LOC-001';
    },
    enabled: !!organizationId && !!facilityId,
  });
}
