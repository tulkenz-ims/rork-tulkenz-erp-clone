import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, Tables } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

const ORG_STORAGE_KEY = 'tulkenz_organization';
const FACILITY_STORAGE_KEY = 'tulkenz_facility';

export type Organization = Tables['organizations'];
export type Facility = Tables['facilities'];

interface OrganizationState {
  organization: Organization | null;
  facility: Facility | null;
  facilities: Facility[];
  isLoading: boolean;
  error: string | null;
}

const defaultOrganizationContext = {
  organization: null,
  facility: null,
  facilities: [],
  isLoading: true,
  error: null,
  organizationId: '',
  facilityId: '',
  setOrganization: () => {},
  setFacility: () => {},
  clearOrganization: () => {},
  isSettingOrg: false,
  isSettingFacility: false,
};

export const [OrganizationProvider, useOrganization] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { setCompanyColors } = useTheme();
  const [state, setState] = useState<OrganizationState>({
    organization: null,
    facility: null,
    facilities: [],
    isLoading: true,
    error: null,
  });

  const { data: storedOrg } = useQuery({
    queryKey: ['stored-organization'],
    queryFn: async () => {
      console.log('[OrganizationContext] Fetching stored organization from AsyncStorage...');
      const orgJson = await AsyncStorage.getItem(ORG_STORAGE_KEY);
      const facilityJson = await AsyncStorage.getItem(FACILITY_STORAGE_KEY);
      const org = orgJson ? JSON.parse(orgJson) as Organization : null;
      const facility = facilityJson ? JSON.parse(facilityJson) as Facility : null;
      console.log('[OrganizationContext] Loaded org:', org?.name, 'id:', org?.id);
      return {
        organization: org,
        facility: facility,
      };
    },
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const { data: facilitiesData, isLoading: facilitiesLoading } = useQuery({
    queryKey: ['facilities', state.organization?.id],
    queryFn: async () => {
      if (!state.organization?.id) return [];
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', state.organization.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('[Organization] Failed to fetch facilities:', JSON.stringify(error, null, 2));
        console.error('[Organization] Error code:', error.code);
        console.error('[Organization] Error message:', error.message);
        return [];
      }
      console.log('[Organization] Fetched facilities:', data?.length || 0);
      return data as Facility[];
    },
    enabled: !!state.organization?.id,
  });

  useEffect(() => {
    if (storedOrg) {
      setState(prev => {
        const orgChanged = prev.organization?.id !== storedOrg.organization?.id;
        const facilityChanged = prev.facility?.id !== storedOrg.facility?.id;
        const loadingChanged = prev.isLoading !== false;
        
        if (!orgChanged && !facilityChanged && !loadingChanged) {
          return prev;
        }
        
        return {
          ...prev,
          organization: storedOrg.organization,
          facility: storedOrg.facility,
          isLoading: false,
        };
      });
    }
  }, [storedOrg]);

  // Sync brand colors from organization to ThemeContext on startup
  // This ensures colors persist across deploys even if localStorage is cleared
  useEffect(() => {
    const syncBrandColors = async () => {
      const org = state.organization;
      if (!org?.id) return;

      // First try the org object we already have (from AsyncStorage)
      let colors: string[] = [];
      if (org.primary_color) colors.push(org.primary_color);
      if (org.secondary_color) colors.push(org.secondary_color);
      if (org.accent_color) colors.push(org.accent_color);

      // Also fetch fresh from Supabase in case AsyncStorage is stale
      try {
        const { data } = await supabase
          .from('organizations')
          .select('primary_color, secondary_color, accent_color')
          .eq('id', org.id)
          .single();
        if (data) {
          colors = [];
          if (data.primary_color) colors.push(data.primary_color);
          if (data.secondary_color) colors.push(data.secondary_color);
          if (data.accent_color) colors.push(data.accent_color);
        }
      } catch (e) {
        // Fall back to what we had from AsyncStorage
      }

      if (colors.length > 0) {
        setCompanyColors(colors);
      }
    };
    syncBrandColors();
  }, [state.organization?.id]);

  useEffect(() => {
    if (facilitiesData) {
      setState(prev => {
        const prevIds = prev.facilities.map(f => f.id).join(',');
        const newIds = facilitiesData.map(f => f.id).join(',');
        if (prevIds === newIds && prev.facilities.length === facilitiesData.length) {
          return prev;
        }
        return { ...prev, facilities: facilitiesData };
      });
    }
  }, [facilitiesData]);

  const { mutate: setOrgMutate, isPending: isSettingOrg } = useMutation({
    mutationFn: async (org: Organization) => {
      await AsyncStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));
      return org;
    },
    onSuccess: (org) => {
      setState(prev => ({ ...prev, organization: org, facility: null, error: null }));
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
      console.log('[Organization] Set organization:', org.name);
    },
    onError: (error) => {
      console.error('[Organization] Failed to set organization:', error);
      setState(prev => ({ ...prev, error: 'Failed to set organization' }));
    },
  });

  const { mutate: setFacilityMutate, isPending: isSettingFacility } = useMutation({
    mutationFn: async (facility: Facility) => {
      await AsyncStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(facility));
      return facility;
    },
    onSuccess: (facility) => {
      setState(prev => ({ ...prev, facility, error: null }));
      queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
      console.log('[Organization] Set facility:', facility.name);
    },
    onError: (error) => {
      console.error('[Organization] Failed to set facility:', error);
      setState(prev => ({ ...prev, error: 'Failed to set facility' }));
    },
  });

  const { mutate: clearOrgMutate } = useMutation({
    mutationFn: async () => {
      await AsyncStorage.multiRemove([ORG_STORAGE_KEY, FACILITY_STORAGE_KEY]);
    },
    onSuccess: () => {
      setState({
        organization: null,
        facility: null,
        facilities: [],
        isLoading: false,
        error: null,
      });
      queryClient.clear();
      console.log('[Organization] Cleared organization context');
    },
  });

  const setOrganization = useCallback((org: Organization) => {
    setOrgMutate(org);
  }, [setOrgMutate]);

  const setFacility = useCallback((facility: Facility) => {
    setFacilityMutate(facility);
  }, [setFacilityMutate]);

  const clearOrganization = useCallback(() => {
    clearOrgMutate();
  }, [clearOrgMutate]);

  const organizationId = state.organization?.id || '';
  const facilityId = state.facility?.id || '';

  return {
    ...state,
    isLoading: state.isLoading || facilitiesLoading,
    organizationId,
    facilityId,
    setOrganization,
    setFacility,
    clearOrganization,
    isSettingOrg,
    isSettingFacility,
  };
}, defaultOrganizationContext);

export function useOrganizationId(): string {
  const context = useOrganization();
  return context?.organizationId ?? '';
}

export function useFacilityId(): string {
  const context = useOrganization();
  return context?.facilityId ?? '';
}
