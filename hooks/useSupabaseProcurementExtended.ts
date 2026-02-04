import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export interface POTemplate {
  id: string;
  organization_id: string;
  template_code: string;
  name: string;
  description: string | null;
  po_type: 'material' | 'service' | 'capex';
  default_vendor_id: string | null;
  default_vendor_name: string | null;
  default_department_id: string | null;
  default_department_name: string | null;
  default_terms: string | null;
  default_shipping_method: string | null;
  default_payment_terms: string | null;
  default_notes: string | null;
  line_items: POTemplateLineItem[];
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface POTemplateLineItem {
  line_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  default_quantity: number;
  default_unit_price: number;
  uom?: string;
}

export interface BlanketPurchaseOrder {
  id: string;
  organization_id: string;
  blanket_po_number: string;
  vendor_id: string | null;
  vendor_name: string;
  department_id: string | null;
  department_name: string | null;
  description: string | null;
  status: 'draft' | 'active' | 'expired' | 'closed' | 'cancelled';
  start_date: string;
  end_date: string;
  total_amount: number;
  released_amount: number;
  remaining_amount: number;
  release_count: number;
  terms_conditions: string | null;
  payment_terms: string | null;
  auto_renew: boolean;
  renewal_notice_days: number;
  line_items: BlanketPOLineItem[];
  created_by: string;
  created_by_id: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlanketPOLineItem {
  line_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  uom?: string;
}

export interface BlanketPORelease {
  id: string;
  organization_id: string;
  blanket_po_id: string;
  release_number: string;
  po_id: string | null;
  po_number: string | null;
  release_amount: number;
  release_date: string;
  expected_delivery: string | null;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  line_items: Record<string, unknown>[];
  released_by: string;
  released_by_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface DropShipOrder {
  id: string;
  organization_id: string;
  drop_ship_number: string;
  po_id: string | null;
  po_number: string | null;
  vendor_id: string | null;
  vendor_name: string;
  customer_name: string;
  customer_company: string | null;
  ship_to_address: string;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_zip: string | null;
  ship_to_country: string;
  ship_to_phone: string | null;
  ship_to_email: string | null;
  sales_order_number: string | null;
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  blind_ship: boolean;
  tracking_number: string | null;
  carrier: string | null;
  shipped_date: string | null;
  delivered_date: string | null;
  total_amount: number;
  line_items: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServicePurchaseOrder {
  id: string;
  organization_id: string;
  service_po_number: string;
  po_id: string | null;
  po_number: string | null;
  vendor_id: string | null;
  vendor_name: string;
  department_id: string | null;
  department_name: string | null;
  service_type: string;
  description: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  service_location: string | null;
  total_amount: number;
  completed_amount: number;
  completion_percent: number;
  payment_schedule: 'on_completion' | 'milestone' | 'monthly' | 'weekly' | 'upfront';
  milestones: ServiceMilestone[];
  labor_hours_estimated: number | null;
  labor_hours_actual: number | null;
  hourly_rate: number | null;
  line_items: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceMilestone {
  id: string;
  name: string;
  description?: string;
  amount: number;
  due_date: string;
  completed: boolean;
  completed_date?: string;
}

export interface VendorOnboarding {
  id: string;
  organization_id: string;
  vendor_id: string | null;
  vendor_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'initiated' | 'documents_pending' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
  vendor_type: 'supplier' | 'service' | 'contractor' | 'distributor';
  onboarding_type: 'new' | 'reactivation' | 'update';
  initiated_by: string;
  initiated_by_id: string | null;
  initiated_at: string;
  w9_received: boolean;
  w9_received_at: string | null;
  insurance_received: boolean;
  insurance_received_at: string | null;
  insurance_expiry: string | null;
  certifications_received: boolean;
  certifications: Record<string, unknown>[];
  bank_info_received: boolean;
  bank_info_verified: boolean;
  questionnaire_sent: boolean;
  questionnaire_sent_at: string | null;
  questionnaire_completed: boolean;
  questionnaire_completed_at: string | null;
  questionnaire_responses: Record<string, unknown>;
  background_check_required: boolean;
  background_check_completed: boolean;
  background_check_result: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  documents: Record<string, unknown>[];
  checklist_items: OnboardingChecklistItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingChecklistItem {
  id: string;
  name: string;
  required: boolean;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface PORevision {
  id: string;
  organization_id: string;
  po_id: string;
  po_number: string;
  revision_number: number;
  revision_type: 'quantity_change' | 'price_change' | 'line_add' | 'line_remove' | 'date_change' | 'terms_change' | 'vendor_change' | 'cancellation' | 'other';
  description: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  amount_change: number | null;
  effective_date: string | null;
  reason: string | null;
  requested_by: string;
  requested_by_id: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  vendor_notified: boolean;
  vendor_notified_at: string | null;
  vendor_acknowledged: boolean;
  vendor_acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}

// PO Templates Hooks
export function usePOTemplatesQuery(options?: { activeOnly?: boolean; poType?: string; enabled?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['po_templates', organizationId, options?.activeOnly, options?.poType],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('po_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }

      if (options?.poType) {
        query = query.eq('po_type', options.poType);
      }

      const { data, error } = await query;
      if (error) {
        console.log('[usePOTemplatesQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[usePOTemplatesQuery] Fetched:', data?.length || 0, 'templates');
      return (data || []) as POTemplate[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePOTemplate(options?: { onSuccess?: (data: POTemplate) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<POTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('po_templates')
        .insert({ ...template, organization_id: organizationId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreatePOTemplate] Created template:', data?.id);
      return data as POTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po_templates'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePOTemplate] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePOTemplate(options?: { onSuccess?: (data: POTemplate) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<POTemplate> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('po_templates')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useUpdatePOTemplate] Updated template:', id);
      return data as POTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po_templates'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePOTemplate] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeletePOTemplate(options?: { onSuccess?: () => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');

      const { error } = await supabase
        .from('po_templates')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      console.log('[useDeletePOTemplate] Deleted template:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po_templates'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeletePOTemplate] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Blanket PO Hooks
export function useBlanketPOsQuery(options?: { status?: string; vendorId?: string; enabled?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['blanket_purchase_orders', organizationId, options?.status, options?.vendorId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('blanket_purchase_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }

      const { data, error } = await query;
      if (error) {
        console.log('[useBlanketPOsQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[useBlanketPOsQuery] Fetched:', data?.length || 0, 'blanket POs');
      return (data || []) as BlanketPurchaseOrder[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateBlanketPO(options?: { onSuccess?: (data: BlanketPurchaseOrder) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blanketPO: Omit<BlanketPurchaseOrder, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'remaining_amount' | 'released_amount' | 'release_count'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const blanketPONumber = `BPO-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('blanket_purchase_orders')
        .insert({
          ...blanketPO,
          blanket_po_number: blanketPONumber,
          organization_id: organizationId,
          released_amount: 0,
          release_count: 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreateBlanketPO] Created blanket PO:', data?.id);
      return data as BlanketPurchaseOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blanket_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateBlanketPO] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateBlanketPO(options?: { onSuccess?: (data: BlanketPurchaseOrder) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BlanketPurchaseOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('blanket_purchase_orders')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useUpdateBlanketPO] Updated blanket PO:', id);
      return data as BlanketPurchaseOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blanket_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateBlanketPO] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Drop Ship Hooks
export function useDropShipOrdersQuery(options?: { status?: string; enabled?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['drop_ship_orders', organizationId, options?.status],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('drop_ship_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) {
        console.log('[useDropShipOrdersQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[useDropShipOrdersQuery] Fetched:', data?.length || 0, 'drop ship orders');
      return (data || []) as DropShipOrder[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateDropShipOrder(options?: { onSuccess?: (data: DropShipOrder) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Omit<DropShipOrder, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'drop_ship_number'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const dropShipNumber = `DS-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('drop_ship_orders')
        .insert({
          ...order,
          drop_ship_number: dropShipNumber,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreateDropShipOrder] Created drop ship order:', data?.id);
      return data as DropShipOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drop_ship_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateDropShipOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateDropShipOrder(options?: { onSuccess?: (data: DropShipOrder) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DropShipOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('drop_ship_orders')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useUpdateDropShipOrder] Updated drop ship order:', id);
      return data as DropShipOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drop_ship_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateDropShipOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Service PO Hooks
export function useServicePOsQuery(options?: { status?: string; vendorId?: string; enabled?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['service_purchase_orders', organizationId, options?.status, options?.vendorId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('service_purchase_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }

      const { data, error } = await query;
      if (error) {
        console.log('[useServicePOsQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[useServicePOsQuery] Fetched:', data?.length || 0, 'service POs');
      return (data || []) as ServicePurchaseOrder[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateServicePO(options?: { onSuccess?: (data: ServicePurchaseOrder) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (servicePO: Omit<ServicePurchaseOrder, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'service_po_number'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const servicePONumber = `SPO-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('service_purchase_orders')
        .insert({
          ...servicePO,
          service_po_number: servicePONumber,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreateServicePO] Created service PO:', data?.id);
      return data as ServicePurchaseOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateServicePO] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateServicePO(options?: { onSuccess?: (data: ServicePurchaseOrder) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServicePurchaseOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('service_purchase_orders')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useUpdateServicePO] Updated service PO:', id);
      return data as ServicePurchaseOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateServicePO] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Vendor Onboarding Hooks
export function useVendorOnboardingQuery(options?: { status?: string; vendorId?: string; enabled?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['vendor_onboarding', organizationId, options?.status, options?.vendorId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('vendor_onboarding')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }

      const { data, error } = await query;
      if (error) {
        console.log('[useVendorOnboardingQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[useVendorOnboardingQuery] Fetched:', data?.length || 0, 'onboarding records');
      return (data || []) as VendorOnboarding[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateVendorOnboarding(options?: { onSuccess?: (data: VendorOnboarding) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onboarding: Omit<VendorOnboarding, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('vendor_onboarding')
        .insert({ ...onboarding, organization_id: organizationId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreateVendorOnboarding] Created onboarding record:', data?.id);
      return data as VendorOnboarding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_onboarding'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateVendorOnboarding] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateVendorOnboarding(options?: { onSuccess?: (data: VendorOnboarding) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VendorOnboarding> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('vendor_onboarding')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useUpdateVendorOnboarding] Updated onboarding record:', id);
      return data as VendorOnboarding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_onboarding'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateVendorOnboarding] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// PO Revisions Hooks
export function usePORevisionsQuery(options?: { poId?: string; status?: string; enabled?: boolean }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['po_revisions', organizationId, options?.poId, options?.status],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('po_revisions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.poId) {
        query = query.eq('po_id', options.poId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) {
        console.log('[usePORevisionsQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[usePORevisionsQuery] Fetched:', data?.length || 0, 'revisions');
      return (data || []) as PORevision[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePORevision(options?: { onSuccess?: (data: PORevision) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (revision: Omit<PORevision, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('po_revisions')
        .insert({ ...revision, organization_id: organizationId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreatePORevision] Created revision:', data?.id);
      return data as PORevision;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po_revisions'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePORevision] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePORevision(options?: { onSuccess?: (data: PORevision) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PORevision> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('po_revisions')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useUpdatePORevision] Updated revision:', id);
      return data as PORevision;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po_revisions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePORevision] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Blanket PO Releases Hooks
export function useBlanketPOReleasesQuery(blanketPOId: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['blanket_po_releases', organizationId, blanketPOId],
    queryFn: async () => {
      if (!organizationId || !blanketPOId) return [];

      const { data, error } = await supabase
        .from('blanket_po_releases')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('blanket_po_id', blanketPOId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('[useBlanketPOReleasesQuery] Table may not exist yet, returning empty array');
        return [];
      }

      console.log('[useBlanketPOReleasesQuery] Fetched:', data?.length || 0, 'releases');
      return (data || []) as BlanketPORelease[];
    },
    enabled: !!organizationId && !!blanketPOId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateBlanketPORelease(options?: { onSuccess?: (data: BlanketPORelease) => void; onError?: (error: Error) => void }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (release: Omit<BlanketPORelease, 'id' | 'organization_id' | 'created_at' | 'release_number'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const releaseNumber = `REL-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('blanket_po_releases')
        .insert({
          ...release,
          release_number: releaseNumber,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreateBlanketPORelease] Created release:', data?.id);
      return data as BlanketPORelease;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blanket_po_releases'] });
      queryClient.invalidateQueries({ queryKey: ['blanket_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateBlanketPORelease] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}
