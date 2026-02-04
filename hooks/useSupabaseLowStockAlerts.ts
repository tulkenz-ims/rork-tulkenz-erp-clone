import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface LowStockAlert {
  id: string;
  organization_id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  category: string | null;
  facility_id: string | null;
  facility_name: string | null;
  current_stock: number;
  min_level: number;
  safety_stock: number | null;
  percent_of_min: number | null;
  severity: 'info' | 'warning' | 'critical';
  trigger_type: 'stockout' | 'below_min' | 'approaching_min' | 'below_safety_stock' | 'high_consumption';
  status: 'active' | 'acknowledged' | 'snoozed' | 'resolved' | 'auto_resolved';
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  snoozed_until: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolved_reason: string | null;
  pending_po_id: string | null;
  pending_po_number: string | null;
  pending_po_qty: number | null;
  pending_po_expected_date: string | null;
  actions: AlertAction[];
  created_at: string;
  updated_at: string;
}

export interface AlertAction {
  id: string;
  type: string;
  description: string;
  performedBy: string;
  performedAt: string;
}

export interface CreateAlertInput {
  material_id: string;
  material_name: string;
  material_sku: string;
  category?: string;
  facility_id?: string;
  facility_name?: string;
  current_stock: number;
  min_level: number;
  safety_stock?: number;
  percent_of_min?: number;
  severity: 'info' | 'warning' | 'critical';
  trigger_type: 'stockout' | 'below_min' | 'approaching_min' | 'below_safety_stock' | 'high_consumption';
}

export interface AcknowledgeAlertInput {
  alertId: string;
  acknowledgedBy: string;
  acknowledgedByName: string;
}

export interface SnoozeAlertInput {
  alertId: string;
  snoozedUntil: string;
  acknowledgedBy: string;
  acknowledgedByName: string;
}

export interface ResolveAlertInput {
  alertId: string;
  resolvedBy: string;
  resolvedByName: string;
  resolvedReason?: string;
}

export interface LinkPOInput {
  alertId: string;
  poId: string;
  poNumber: string;
  poQty: number;
  expectedDate?: string;
}

export function useSupabaseLowStockAlerts() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const alertsQuery = useQuery({
    queryKey: ['low-stock-alerts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('[useSupabaseLowStockAlerts] Fetching alerts for org:', organizationId);
      
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = error.message || error.code || JSON.stringify(error);
        console.error('[useSupabaseLowStockAlerts] Error fetching alerts:', errorMessage);
        console.error('[useSupabaseLowStockAlerts] Error code:', error.code);
        console.error('[useSupabaseLowStockAlerts] Error details:', error.details);
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('Failed to fetch')) {
          console.warn('[useSupabaseLowStockAlerts] Table may not exist, returning empty array');
          return [];
        }
        throw new Error(errorMessage);
      }

      console.log('[useSupabaseLowStockAlerts] Fetched alerts:', data?.length);
      return (data || []) as LowStockAlert[];
    },
    enabled: !!organizationId,
  });

  const activeAlertsQuery = useQuery({
    queryKey: ['low-stock-alerts', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('[useSupabaseLowStockAlerts] Fetching active alerts');
      
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'acknowledged'])
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = error.message || error.code || JSON.stringify(error);
        console.error('[useSupabaseLowStockAlerts] Error fetching active alerts:', errorMessage);
        console.error('[useSupabaseLowStockAlerts] Error code:', error.code);
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('Failed to fetch')) {
          console.warn('[useSupabaseLowStockAlerts] Table may not exist, returning empty array');
          return [];
        }
        throw new Error(errorMessage);
      }

      return (data || []) as LowStockAlert[];
    },
    enabled: !!organizationId,
  });

  const createAlertMutation = useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useSupabaseLowStockAlerts] Creating alert:', input);

      const { data, error } = await supabase
        .from('low_stock_alerts')
        .insert({
          organization_id: organizationId,
          ...input,
          status: 'active',
          actions: [],
        })
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error creating alert:', error);
        throw error;
      }

      return data as LowStockAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (input: AcknowledgeAlertInput) => {
      console.log('[useSupabaseLowStockAlerts] Acknowledging alert:', input.alertId);

      const { data: existing } = await supabase
        .from('low_stock_alerts')
        .select('actions')
        .eq('id', input.alertId)
        .single();

      const existingActions = (existing?.actions || []) as AlertAction[];
      const newAction: AlertAction = {
        id: `action-${Date.now()}`,
        type: 'acknowledged',
        description: 'Alert acknowledged',
        performedBy: input.acknowledgedByName,
        performedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('low_stock_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: input.acknowledgedBy,
          acknowledged_by_name: input.acknowledgedByName,
          acknowledged_at: new Date().toISOString(),
          actions: [...existingActions, newAction],
        })
        .eq('id', input.alertId)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error acknowledging alert:', error);
        throw error;
      }

      return data as LowStockAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  const snoozeAlertMutation = useMutation({
    mutationFn: async (input: SnoozeAlertInput) => {
      console.log('[useSupabaseLowStockAlerts] Snoozing alert:', input.alertId);

      const { data: existing } = await supabase
        .from('low_stock_alerts')
        .select('actions')
        .eq('id', input.alertId)
        .single();

      const existingActions = (existing?.actions || []) as AlertAction[];
      const newAction: AlertAction = {
        id: `action-${Date.now()}`,
        type: 'snoozed',
        description: `Alert snoozed until ${input.snoozedUntil}`,
        performedBy: input.acknowledgedByName,
        performedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('low_stock_alerts')
        .update({
          status: 'snoozed',
          snoozed_until: input.snoozedUntil,
          acknowledged_by: input.acknowledgedBy,
          acknowledged_by_name: input.acknowledgedByName,
          acknowledged_at: new Date().toISOString(),
          actions: [...existingActions, newAction],
        })
        .eq('id', input.alertId)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error snoozing alert:', error);
        throw error;
      }

      return data as LowStockAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (input: ResolveAlertInput) => {
      console.log('[useSupabaseLowStockAlerts] Resolving alert:', input.alertId);

      const { data: existing } = await supabase
        .from('low_stock_alerts')
        .select('actions')
        .eq('id', input.alertId)
        .single();

      const existingActions = (existing?.actions || []) as AlertAction[];
      const newAction: AlertAction = {
        id: `action-${Date.now()}`,
        type: 'resolved',
        description: input.resolvedReason || 'Alert resolved',
        performedBy: input.resolvedByName,
        performedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('low_stock_alerts')
        .update({
          status: 'resolved',
          resolved_by: input.resolvedBy,
          resolved_by_name: input.resolvedByName,
          resolved_at: new Date().toISOString(),
          resolved_reason: input.resolvedReason,
          actions: [...existingActions, newAction],
        })
        .eq('id', input.alertId)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error resolving alert:', error);
        throw error;
      }

      return data as LowStockAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  const linkPOMutation = useMutation({
    mutationFn: async (input: LinkPOInput) => {
      console.log('[useSupabaseLowStockAlerts] Linking PO to alert:', input);

      const { data: existing } = await supabase
        .from('low_stock_alerts')
        .select('actions')
        .eq('id', input.alertId)
        .single();

      const existingActions = (existing?.actions || []) as AlertAction[];
      const newAction: AlertAction = {
        id: `action-${Date.now()}`,
        type: 'po_linked',
        description: `Linked to PO ${input.poNumber}`,
        performedBy: 'System',
        performedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('low_stock_alerts')
        .update({
          pending_po_id: input.poId,
          pending_po_number: input.poNumber,
          pending_po_qty: input.poQty,
          pending_po_expected_date: input.expectedDate,
          actions: [...existingActions, newAction],
        })
        .eq('id', input.alertId)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error linking PO:', error);
        throw error;
      }

      return data as LowStockAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  const autoResolveForMaterialMutation = useMutation({
    mutationFn: async ({ materialId, reason }: { materialId: string; reason: string }) => {
      console.log('[useSupabaseLowStockAlerts] Auto-resolving alerts for material:', materialId);

      const { data, error } = await supabase
        .from('low_stock_alerts')
        .update({
          status: 'auto_resolved',
          resolved_at: new Date().toISOString(),
          resolved_reason: reason,
        })
        .eq('material_id', materialId)
        .in('status', ['active', 'acknowledged', 'snoozed'])
        .select();

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error auto-resolving:', error);
        throw error;
      }

      return data as LowStockAlert[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      console.log('[useSupabaseLowStockAlerts] Deleting alert:', alertId);

      const { error } = await supabase
        .from('low_stock_alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('[useSupabaseLowStockAlerts] Error deleting alert:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });

  return {
    alerts: alertsQuery.data || [],
    activeAlerts: activeAlertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    isLoadingActive: activeAlertsQuery.isLoading,
    error: alertsQuery.error,

    createAlert: createAlertMutation.mutateAsync,
    isCreating: createAlertMutation.isPending,

    acknowledgeAlert: acknowledgeAlertMutation.mutateAsync,
    isAcknowledging: acknowledgeAlertMutation.isPending,

    snoozeAlert: snoozeAlertMutation.mutateAsync,
    isSnoozing: snoozeAlertMutation.isPending,

    resolveAlert: resolveAlertMutation.mutateAsync,
    isResolving: resolveAlertMutation.isPending,

    linkPO: linkPOMutation.mutateAsync,
    isLinkingPO: linkPOMutation.isPending,

    autoResolveForMaterial: autoResolveForMaterialMutation.mutateAsync,
    isAutoResolving: autoResolveForMaterialMutation.isPending,

    deleteAlert: deleteAlertMutation.mutateAsync,
    isDeleting: deleteAlertMutation.isPending,

    refetch: () => {
      alertsQuery.refetch();
      activeAlertsQuery.refetch();
    },
  };
}
