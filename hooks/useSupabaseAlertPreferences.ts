import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import {
  type AlertPreferences,
  type AlertCategoryOverride,
  DEFAULT_ALERT_PREFERENCES,
} from '@/types/alertPreferences';

export interface SupabaseAlertPreferences {
  id: string;
  organization_id: string;
  user_id: string | null;
  is_global: boolean;
  thresholds: AlertPreferences['thresholds'];
  notifications: AlertPreferences['notifications'];
  auto_escalation: AlertPreferences['autoEscalation'];
  snooze: AlertPreferences['snooze'];
  display: AlertPreferences['display'];
  category_overrides: AlertCategoryOverride[];
  facility_overrides: AlertPreferences['facilityOverrides'];
  enable_low_stock_alerts: boolean;
  enable_out_of_stock_alerts: boolean;
  enable_overstock_alerts: boolean;
  enable_high_consumption_alerts: boolean;
  enable_lead_time_alerts: boolean;
  created_at: string;
  updated_at: string;
}

function mapSupabaseToAlertPreferences(sp: SupabaseAlertPreferences): AlertPreferences {
  return {
    id: sp.id,
    userId: sp.user_id || undefined,
    isGlobal: sp.is_global,
    thresholds: sp.thresholds,
    notifications: sp.notifications,
    autoEscalation: sp.auto_escalation,
    snooze: sp.snooze,
    display: sp.display,
    categoryOverrides: sp.category_overrides || [],
    facilityOverrides: sp.facility_overrides || [],
    enableLowStockAlerts: sp.enable_low_stock_alerts,
    enableOutOfStockAlerts: sp.enable_out_of_stock_alerts,
    enableOverstockAlerts: sp.enable_overstock_alerts,
    enableHighConsumptionAlerts: sp.enable_high_consumption_alerts,
    enableLeadTimeAlerts: sp.enable_lead_time_alerts,
    createdAt: sp.created_at,
    updatedAt: sp.updated_at,
  };
}

function mapAlertPreferencesToSupabase(
  prefs: AlertPreferences,
  organizationId: string,
  userId?: string
): Omit<SupabaseAlertPreferences, 'id' | 'created_at' | 'updated_at'> {
  return {
    organization_id: organizationId,
    user_id: userId || null,
    is_global: prefs.isGlobal,
    thresholds: prefs.thresholds,
    notifications: prefs.notifications,
    auto_escalation: prefs.autoEscalation,
    snooze: prefs.snooze,
    display: prefs.display,
    category_overrides: prefs.categoryOverrides,
    facility_overrides: prefs.facilityOverrides,
    enable_low_stock_alerts: prefs.enableLowStockAlerts,
    enable_out_of_stock_alerts: prefs.enableOutOfStockAlerts,
    enable_overstock_alerts: prefs.enableOverstockAlerts,
    enable_high_consumption_alerts: prefs.enableHighConsumptionAlerts,
    enable_lead_time_alerts: prefs.enableLeadTimeAlerts,
  };
}

const DEMO_ORG_ID = 'demo-org-001';

export function useAlertPreferences() {
  const { organizationId: contextOrgId } = useOrganization();
  const { userProfile } = useUser();
  const userId = userProfile?.id;
  const organizationId = contextOrgId || DEMO_ORG_ID;

  return useQuery({
    queryKey: ['alert-preferences', organizationId, userId],
    queryFn: async (): Promise<AlertPreferences> => {
      if (!organizationId) {
        console.log('[useAlertPreferences] No organization ID, returning defaults');
        return DEFAULT_ALERT_PREFERENCES;
      }

      let query = supabase
        .from('alert_preferences')
        .select('*')
        .eq('organization_id', organizationId);

      if (userId) {
        query = query.or(`user_id.eq.${userId},is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query.order('is_global', { ascending: true });

      if (error) {
        console.error('[useAlertPreferences] Error:', error);
        return DEFAULT_ALERT_PREFERENCES;
      }

      if (!data || data.length === 0) {
        console.log('[useAlertPreferences] No preferences found, returning defaults');
        return DEFAULT_ALERT_PREFERENCES;
      }

      const userPrefs = data.find(p => p.user_id === userId);
      const globalPrefs = data.find(p => p.is_global);

      const prefsToUse = userPrefs || globalPrefs;
      if (prefsToUse) {
        console.log(`[useAlertPreferences] Using ${userPrefs ? 'user' : 'global'} preferences`);
        return mapSupabaseToAlertPreferences(prefsToUse as SupabaseAlertPreferences);
      }

      return DEFAULT_ALERT_PREFERENCES;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateAlertPreferences() {
  const queryClient = useQueryClient();
  const { organizationId: contextOrgId } = useOrganization();
  const { userProfile } = useUser();
  const userId = userProfile?.id;
  const organizationId = contextOrgId || DEMO_ORG_ID;

  return useMutation({
    mutationFn: async (prefs: AlertPreferences) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const existingQuery = supabase
        .from('alert_preferences')
        .select('id')
        .eq('organization_id', organizationId);

      if (userId && !prefs.isGlobal) {
        existingQuery.eq('user_id', userId);
      } else {
        existingQuery.eq('is_global', true);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      const mappedPrefs = mapAlertPreferencesToSupabase(
        prefs,
        organizationId,
        prefs.isGlobal ? undefined : userId
      );

      if (existing) {
        const { data, error } = await supabase
          .from('alert_preferences')
          .update({
            ...mappedPrefs,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('[useUpdateAlertPreferences] Update error:', error);
          throw new Error(error.message);
        }

        console.log('[useUpdateAlertPreferences] Updated preferences:', data.id);
        return mapSupabaseToAlertPreferences(data as SupabaseAlertPreferences);
      } else {
        const { data, error } = await supabase
          .from('alert_preferences')
          .insert(mappedPrefs)
          .select()
          .single();

        if (error) {
          console.error('[useUpdateAlertPreferences] Insert error:', error);
          throw new Error(error.message);
        }

        console.log('[useUpdateAlertPreferences] Created preferences:', data.id);
        return mapSupabaseToAlertPreferences(data as SupabaseAlertPreferences);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences', organizationId] });
    },
  });
}

export function useResetAlertPreferences() {
  const queryClient = useQueryClient();
  const { organizationId: contextOrgId } = useOrganization();
  const { userProfile } = useUser();
  const userId = userProfile?.id;
  const organizationId = contextOrgId || DEMO_ORG_ID;

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      if (userId) {
        const { error } = await supabase
          .from('alert_preferences')
          .delete()
          .eq('organization_id', organizationId)
          .eq('user_id', userId);

        if (error) {
          console.error('[useResetAlertPreferences] Error:', error);
          throw new Error(error.message);
        }
      }

      console.log('[useResetAlertPreferences] Reset to defaults');
      return DEFAULT_ALERT_PREFERENCES;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences', organizationId] });
    },
  });
}

export function useGlobalAlertPreferences() {
  const { organizationId: contextOrgId } = useOrganization();
  const organizationId = contextOrgId || DEMO_ORG_ID;

  return useQuery({
    queryKey: ['alert-preferences-global', organizationId],
    queryFn: async (): Promise<AlertPreferences> => {
      if (!organizationId) {
        return DEFAULT_ALERT_PREFERENCES;
      }

      const { data, error } = await supabase
        .from('alert_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_global', true)
        .maybeSingle();

      if (error) {
        console.error('[useGlobalAlertPreferences] Error:', error);
        return DEFAULT_ALERT_PREFERENCES;
      }

      if (!data) {
        return DEFAULT_ALERT_PREFERENCES;
      }

      return mapSupabaseToAlertPreferences(data as SupabaseAlertPreferences);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateGlobalAlertPreferences() {
  const queryClient = useQueryClient();
  const { organizationId: contextOrgId } = useOrganization();
  const organizationId = contextOrgId || DEMO_ORG_ID;

  return useMutation({
    mutationFn: async (prefs: Partial<AlertPreferences>) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: existing } = await supabase
        .from('alert_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_global', true)
        .maybeSingle();

      const currentPrefs = existing 
        ? mapSupabaseToAlertPreferences(existing as SupabaseAlertPreferences)
        : DEFAULT_ALERT_PREFERENCES;

      const mergedPrefs: AlertPreferences = {
        ...currentPrefs,
        ...prefs,
        thresholds: { ...currentPrefs.thresholds, ...prefs.thresholds },
        notifications: { ...currentPrefs.notifications, ...prefs.notifications },
        autoEscalation: { ...currentPrefs.autoEscalation, ...prefs.autoEscalation },
        snooze: { ...currentPrefs.snooze, ...prefs.snooze },
        display: { ...currentPrefs.display, ...prefs.display },
        isGlobal: true,
      };

      const mappedPrefs = mapAlertPreferencesToSupabase(mergedPrefs, organizationId);

      if (existing) {
        const { data, error } = await supabase
          .from('alert_preferences')
          .update({
            ...mappedPrefs,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return mapSupabaseToAlertPreferences(data as SupabaseAlertPreferences);
      } else {
        const { data, error } = await supabase
          .from('alert_preferences')
          .insert(mappedPrefs)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return mapSupabaseToAlertPreferences(data as SupabaseAlertPreferences);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['alert-preferences-global', organizationId] });
    },
  });
}
