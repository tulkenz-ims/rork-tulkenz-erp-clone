import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { VendorDocument, VendorDocumentType, VendorRating } from '@/types/procurement';
import { APPROVAL_TIER_THRESHOLDS, getRequiredApprovalTiers, APPROVAL_TIER_LABELS, RequisitionStatus } from '@/types/procurement';
import { supabase, Tables, QueryOptions, fetchById, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';

type ProcurementVendor = Tables['procurement_vendors'];
type PurchaseRequest = Tables['purchase_requests'];
type PurchaseRequisition = Tables['purchase_requisitions'];
type ProcurementPurchaseOrder = Tables['procurement_purchase_orders'];
type POApproval = Tables['po_approvals'];
type MaterialReceipt = Tables['material_receipts'];

export interface POLineItem {
  line_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_stock: boolean;
  is_deleted: boolean;
  received_qty: number;
  uom?: string;
  notes?: string;
}

export interface RequisitionLineItem {
  line_id: string;
  requisition_id?: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  suggested_vendor_id?: string;
  suggested_vendor_name?: string;
  is_stock: boolean;
  gl_account?: string;
  cost_center?: string;
  uom?: string;
  notes?: string;
}

export interface PurchaseRequestLineItem {
  line_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  estimated_unit_price: number;
  estimated_total: number;
  suggested_vendor_id?: string;
  suggested_vendor_name?: string;
  is_stock: boolean;
  notes?: string;
}

export interface ReceiptLineItem {
  line_id: string;
  po_line_id: string;
  material_id?: string;
  material_sku?: string;
  description: string;
  ordered_qty: number;
  previously_received: number;
  received_qty: number;
  is_stock: boolean;
  uom?: string;
}

export function useProcurementVendorsQuery(options?: QueryOptions<ProcurementVendor> & { 
  enabled?: boolean; 
  activeOnly?: boolean;
  vendorType?: string;
  categories?: string[];
  searchText?: string;
}) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const activeOnly = options?.activeOnly;
  const vendorType = options?.vendorType;
  const categories = options?.categories;
  const searchText = options?.searchText;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['procurement_vendors', organizationId, filters, orderBy, limit, activeOnly, vendorType, categories, searchText],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('procurement_vendors')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (activeOnly) {
        query = query.eq('active', true);
      }
      
      if (vendorType) {
        query = query.eq('vendor_type', vendorType);
      }
      
      if (categories && categories.length > 0) {
        query = query.overlaps('categories', categories);
      }
      
      if (searchText) {
        query = query.or(`name.ilike.%${searchText}%,vendor_code.ilike.%${searchText}%,contact_name.ilike.%${searchText}%`);
      }
      
      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('name', { ascending: true });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useProcurementVendorsQuery] Fetched:', data?.length || 0, 'vendors');
      return (data || []) as ProcurementVendor[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useProcurementVendorById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['procurement_vendors', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('procurement_vendors', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateProcurementVendor(options?: {
  onSuccess?: (data: ProcurementVendor) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vendor: Omit<ProcurementVendor, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('procurement_vendors', {
        ...vendor,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      console.log('[useCreateProcurementVendor] Created vendor:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_vendors'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateProcurementVendor] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateProcurementVendor(options?: {
  onSuccess?: (data: ProcurementVendor) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProcurementVendor> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('procurement_vendors', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdateProcurementVendor] Updated vendor:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_vendors'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_vendors', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateProcurementVendor] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteProcurementVendor(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('procurement_vendors', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteProcurementVendor] Deleted vendor:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement_vendors'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteProcurementVendor] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePurchaseRequestsQuery(options?: {
  status?: PurchaseRequest['status'] | PurchaseRequest['status'][];
  requesterId?: string;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['purchase_requests', organizationId, options?.status, options?.requesterId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('purchase_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.requesterId) {
        query = query.eq('requester_id', options.requesterId);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[usePurchaseRequestsQuery] Fetched:', data?.length || 0, 'requests');
      return (data || []) as PurchaseRequest[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePurchaseRequestById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['purchase_requests', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('purchase_requests', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: {
      requester_id: string;
      requester_name: string;
      department_id?: string;
      department_name?: string;
      priority?: PurchaseRequest['priority'];
      needed_by_date?: string;
      notes?: string;
      line_items: PurchaseRequestLineItem[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requestNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;
      const totalEstimated = request.line_items.reduce((sum, item) => sum + item.estimated_total, 0);
      
      const { data, error } = await supabase.from('purchase_requests').insert({
        organization_id: organizationId,
        request_number: requestNumber,
        requester_id: request.requester_id,
        requester_name: request.requester_name,
        department_id: request.department_id || null,
        department_name: request.department_name || null,
        status: 'draft' as const,
        priority: request.priority || 'normal',
        needed_by_date: request.needed_by_date || null,
        total_estimated: totalEstimated,
        notes: request.notes || null,
        line_items: request.line_items,
      }).select().single();
      
      if (error) throw new Error(error.message);
      console.log('[useCreatePurchaseRequest] Created:', data?.id);
      return data as PurchaseRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePurchaseRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PurchaseRequest> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('purchase_requests', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdatePurchaseRequest] Updated:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requests', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePurchaseRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSubmitPurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequest = useUpdatePurchaseRequest(options);
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      return updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'submitted',
          requested_date: new Date().toISOString(),
        },
      });
    },
  });
}

export function useApprovePurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequest = useUpdatePurchaseRequest(options);
  
  return useMutation({
    mutationFn: async ({ requestId, approvedBy }: { requestId: string; approvedBy: string }) => {
      return updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'approved',
          approved_date: new Date().toISOString(),
          approved_by: approvedBy,
        },
      });
    },
  });
}

export function useRejectPurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequest = useUpdatePurchaseRequest(options);
  
  return useMutation({
    mutationFn: async ({ requestId, rejectedBy }: { requestId: string; rejectedBy: string }) => {
      return updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'rejected',
          approved_date: new Date().toISOString(),
          approved_by: rejectedBy,
        },
      });
    },
  });
}

export function usePurchaseRequisitionsQuery(options?: {
  status?: PurchaseRequisition['status'] | PurchaseRequisition['status'][];
  vendorId?: string;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['purchase_requisitions', organizationId, options?.status, options?.vendorId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('purchase_requisitions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[usePurchaseRequisitionsQuery] Fetched:', data?.length || 0, 'requisitions');
      return (data || []) as PurchaseRequisition[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePurchaseRequisitionById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['purchase_requisitions', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('purchase_requisitions', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

function getInitialRequisitionStatus(total: number): RequisitionStatus {
  const requiredTiers = getRequiredApprovalTiers(total);
  if (requiredTiers.length === 0) {
    return 'ready_for_po';
  } else if (requiredTiers.includes(2)) {
    return 'pending_tier2_approval';
  }
  return 'ready_for_po';
}

export function useCreatePurchaseRequisition(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requisition: {
      source_request_id?: string;
      source_request_number?: string;
      created_by_id: string;
      created_by_name: string;
      department_id?: string;
      department_name?: string;
      vendor_id?: string;
      vendor_name?: string;
      priority?: PurchaseRequisition['priority'];
      requisition_type: PurchaseRequisition['requisition_type'];
      needed_by_date?: string;
      subtotal: number;
      tax: number;
      shipping: number;
      notes?: string;
      justification?: string;
      line_items: RequisitionLineItem[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requisitionNumber = `RQN-${Date.now().toString(36).toUpperCase()}`;
      const total = requisition.subtotal + requisition.tax + requisition.shipping;
      
      const initialStatus = getInitialRequisitionStatus(total);
      console.log('[useCreatePurchaseRequisition] Total:', total, 'Initial status:', initialStatus);
      
      const { data, error } = await supabase.from('purchase_requisitions').insert({
        organization_id: organizationId,
        requisition_number: requisitionNumber,
        source_request_id: requisition.source_request_id || null,
        source_request_number: requisition.source_request_number || null,
        created_by_id: requisition.created_by_id,
        created_by_name: requisition.created_by_name,
        department_id: requisition.department_id || null,
        department_name: requisition.department_name || null,
        vendor_id: requisition.vendor_id || null,
        vendor_name: requisition.vendor_name || null,
        status: initialStatus,
        priority: requisition.priority || 'normal',
        requisition_type: requisition.requisition_type,
        needed_by_date: requisition.needed_by_date || null,
        subtotal: requisition.subtotal,
        tax: requisition.tax,
        shipping: requisition.shipping,
        total,
        notes: requisition.notes || null,
        justification: requisition.justification || null,
        line_items: requisition.line_items,
      }).select().single();
      
      if (error) throw new Error(error.message);
      
      if (initialStatus !== 'ready_for_po') {
        const requiredTiers = getRequiredApprovalTiers(total);
        const approvalTiers = requiredTiers.map((tier) => ({
          organization_id: organizationId,
          requisition_id: data.id,
          approval_type: 'requisition' as const,
          tier,
          tier_name: APPROVAL_TIER_LABELS[tier],
          approver_name: APPROVAL_TIER_LABELS[tier],
          approver_role: APPROVAL_TIER_LABELS[tier],
          status: tier === 2 ? 'pending' as const : 'waiting' as const,
          amount_threshold: tier === 2 ? APPROVAL_TIER_THRESHOLDS.TIER_2 : APPROVAL_TIER_THRESHOLDS.TIER_3,
        }));
        
        const { error: approvalError } = await supabase.from('po_approvals').insert(approvalTiers);
        if (approvalError) {
          console.error('[useCreatePurchaseRequisition] Error creating approval chain:', approvalError);
        } else {
          console.log('[useCreatePurchaseRequisition] Created approval chain with', approvalTiers.length, 'tiers');
        }
      }
      
      console.log('[useCreatePurchaseRequisition] Created:', data?.id);
      return data as PurchaseRequisition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePurchaseRequisition] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePurchaseRequisition(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PurchaseRequisition> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('purchase_requisitions', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdatePurchaseRequisition] Updated:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePurchaseRequisition] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSubmitRequisitionForApproval(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequisition = useUpdatePurchaseRequisition(options);
  
  return useMutation({
    mutationFn: async (requisitionId: string) => {
      return updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'pending_approval',
          requested_date: new Date().toISOString(),
        },
      });
    },
  });
}

export function useMarkRequisitionConverted(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequisition = useUpdatePurchaseRequisition(options);
  
  return useMutation({
    mutationFn: async ({ requisitionId, poId, poNumber }: { requisitionId: string; poId: string; poNumber: string }) => {
      console.log('[useMarkRequisitionConverted] Marking requisition as converted:', requisitionId, '-> PO:', poNumber);
      return updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'converted_to_po' as RequisitionStatus,
          po_id: poId,
          po_number: poNumber,
        },
      });
    },
  });
}

export function useProcurementPurchaseOrdersQuery(options?: {
  status?: ProcurementPurchaseOrder['status'] | ProcurementPurchaseOrder['status'][];
  vendorId?: string;
  poType?: ProcurementPurchaseOrder['po_type'];
  createdById?: string;
  dateFrom?: string;
  dateTo?: string;
  searchText?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['procurement_purchase_orders', organizationId, options?.status, options?.vendorId, options?.poType, options?.createdById, options?.dateFrom, options?.dateTo, options?.searchText, options?.limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('procurement_purchase_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }
      
      if (options?.poType) {
        query = query.eq('po_type', options.poType);
      }
      
      if (options?.createdById) {
        query = query.eq('created_by_id', options.createdById);
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }
      
      if (options?.searchText) {
        query = query.or(`po_number.ilike.%${options.searchText}%,vendor_name.ilike.%${options.searchText}%,notes.ilike.%${options.searchText}%`);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useProcurementPurchaseOrdersQuery] Fetched:', data?.length || 0, 'purchase orders');
      return (data || []) as ProcurementPurchaseOrder[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useProcurementPurchaseOrderById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['procurement_purchase_orders', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('procurement_purchase_orders', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateProcurementPurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (po: {
      po_type: ProcurementPurchaseOrder['po_type'];
      vendor_id?: string;
      vendor_name: string;
      department_id?: string;
      department_name?: string;
      created_by: string;
      created_by_id?: string;
      expected_delivery?: string;
      source_requisition_id?: string;
      source_requisition_number?: string;
      subtotal: number;
      tax: number;
      shipping: number;
      notes?: string;
      line_items: POLineItem[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
      const total = po.subtotal + po.tax + po.shipping;
      
      const { data, error } = await supabase.from('procurement_purchase_orders').insert({
        organization_id: organizationId,
        po_number: poNumber,
        po_type: po.po_type,
        vendor_id: po.vendor_id || null,
        vendor_name: po.vendor_name,
        department_id: po.department_id || null,
        department_name: po.department_name || null,
        status: 'draft' as const,
        subtotal: po.subtotal,
        tax: po.tax,
        shipping: po.shipping,
        total,
        created_by: po.created_by,
        created_by_id: po.created_by_id || null,
        expected_delivery: po.expected_delivery || null,
        source_requisition_id: po.source_requisition_id || null,
        source_requisition_number: po.source_requisition_number || null,
        notes: po.notes || null,
        line_items: po.line_items,
        attachments: [],
      }).select().single();
      
      if (error) throw new Error(error.message);
      console.log('[useCreateProcurementPurchaseOrder] Created:', data?.id);
      return data as ProcurementPurchaseOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateProcurementPurchaseOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateProcurementPurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProcurementPurchaseOrder> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('procurement_purchase_orders', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdateProcurementPurchaseOrder] Updated:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateProcurementPurchaseOrder] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSubmitPurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePO = useUpdateProcurementPurchaseOrder(options);
  
  return useMutation({
    mutationFn: async (poId: string) => {
      return updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'pending_approval',
          submitted_date: new Date().toISOString(),
        },
      });
    },
  });
}

export function useApprovePurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePO = useUpdateProcurementPurchaseOrder(options);
  
  return useMutation({
    mutationFn: async ({ poId, approvedBy }: { poId: string; approvedBy: string }) => {
      return updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'approved',
          approved_date: new Date().toISOString(),
          approved_by: approvedBy,
        },
      });
    },
  });
}

export function useRejectPurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePO = useUpdateProcurementPurchaseOrder(options);
  
  return useMutation({
    mutationFn: async ({ poId, rejectedBy }: { poId: string; rejectedBy: string }) => {
      return updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'rejected',
          approved_date: new Date().toISOString(),
          approved_by: rejectedBy,
        },
      });
    },
  });
}

export function useOrderPurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePO = useUpdateProcurementPurchaseOrder(options);
  
  return useMutation({
    mutationFn: async (poId: string) => {
      return updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'ordered',
        },
      });
    },
  });
}

export function usePOApprovalsQuery(options?: {
  poId?: string;
  requisitionId?: string;
  status?: POApproval['status'];
  approverId?: string;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['po_approvals', organizationId, options?.poId, options?.requisitionId, options?.status, options?.approverId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('po_approvals')
        .select('*')
        .eq('organization_id', organizationId)
        .order('tier', { ascending: true });
      
      if (options?.poId) {
        query = query.eq('po_id', options.poId);
      }
      
      if (options?.requisitionId) {
        query = query.eq('requisition_id', options.requisitionId);
      }
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.approverId) {
        query = query.eq('approver_id', options.approverId);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[usePOApprovalsQuery] Fetched:', data?.length || 0, 'approvals');
      return (data || []) as POApproval[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePendingApprovalsForUser(approverId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['po_approvals', 'pending', approverId, organizationId],
    queryFn: async () => {
      if (!organizationId || !approverId) return [];
      
      const { data, error } = await supabase
        .from('po_approvals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('approver_id', approverId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[usePendingApprovalsForUser] Fetched:', data?.length || 0, 'pending approvals');
      return (data || []) as POApproval[];
    },
    enabled: !!organizationId && !!approverId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useCreatePOApprovalChain(options?: {
  onSuccess?: (data: POApproval[]) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (approvalChain: {
      po_id?: string;
      requisition_id?: string;
      approval_type: POApproval['approval_type'];
      tiers: {
        tier: number;
        tier_name?: string;
        approver_id?: string;
        approver_name: string;
        approver_role?: string;
        amount_threshold?: number;
      }[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const approvals = approvalChain.tiers.map((tier) => ({
        organization_id: organizationId,
        po_id: approvalChain.po_id || null,
        requisition_id: approvalChain.requisition_id || null,
        approval_type: approvalChain.approval_type,
        tier: tier.tier,
        tier_name: tier.tier_name || null,
        approver_id: tier.approver_id || null,
        approver_name: tier.approver_name,
        approver_role: tier.approver_role || null,
        status: 'pending' as const,
        amount_threshold: tier.amount_threshold || null,
      }));
      
      const { data, error } = await supabase
        .from('po_approvals')
        .insert(approvals)
        .select();
      
      if (error) throw new Error(error.message);
      console.log('[useCreatePOApprovalChain] Created:', data?.length || 0, 'approval tiers');
      return (data || []) as POApproval[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePOApprovalChain] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useProcessApproval(options?: {
  onSuccess?: (data: POApproval) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      approvalId,
      decision,
      comments,
    }: {
      approvalId: string;
      decision: 'approved' | 'rejected';
      comments?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('po_approvals', approvalId, {
        status: decision,
        decision_date: new Date().toISOString(),
        comments: comments || null,
      }, organizationId);
      
      if (result.error) throw result.error;
      
      console.log('[useProcessApproval] Processed:', approvalId, 'decision:', decision);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useProcessApproval] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useMaterialReceiptsQuery(options?: {
  poId?: string;
  vendorId?: string;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['material_receipts', organizationId, options?.poId, options?.vendorId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('material_receipts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('receipt_date', { ascending: false });
      
      if (options?.poId) {
        query = query.eq('po_id', options.poId);
      }
      
      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useMaterialReceiptsQuery] Fetched:', data?.length || 0, 'receipts');
      return (data || []) as MaterialReceipt[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateMaterialReceipt(options?: {
  onSuccess?: (data: MaterialReceipt) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updatePO = useUpdateProcurementPurchaseOrder();
  
  return useMutation({
    mutationFn: async (receipt: {
      po_id: string;
      po_number: string;
      vendor_id?: string;
      vendor_name?: string;
      received_by?: string;
      received_by_name: string;
      notes?: string;
      line_items: ReceiptLineItem[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const receiptNumber = `RCV-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase.from('material_receipts').insert({
        organization_id: organizationId,
        receipt_number: receiptNumber,
        po_id: receipt.po_id,
        po_number: receipt.po_number,
        vendor_id: receipt.vendor_id || null,
        vendor_name: receipt.vendor_name || null,
        received_by: receipt.received_by || null,
        received_by_name: receipt.received_by_name,
        total_lines: receipt.line_items.length,
        notes: receipt.notes || null,
        line_items: receipt.line_items,
      }).select().single();
      
      if (error) throw new Error(error.message);
      
      const poResult = await fetchById('procurement_purchase_orders', receipt.po_id, organizationId);
      if (poResult.data) {
        const existingLineItems = (poResult.data.line_items || []) as unknown as POLineItem[];
        const updatedLineItems = existingLineItems.map((li) => {
          const receivedItem = receipt.line_items.find((ri) => ri.po_line_id === li.line_id);
          if (receivedItem) {
            return {
              ...li,
              received_qty: (li.received_qty || 0) + receivedItem.received_qty,
            };
          }
          return li;
        });
        
        const allFullyReceived = updatedLineItems.every((li) => 
          li.is_deleted || li.received_qty >= li.quantity
        );
        const someReceived = updatedLineItems.some((li) => 
          !li.is_deleted && li.received_qty > 0
        );
        
        let newStatus: ProcurementPurchaseOrder['status'] = poResult.data.status;
        if (allFullyReceived) {
          newStatus = 'received';
        } else if (someReceived) {
          newStatus = 'partial_received';
        }
        
        await updatePO.mutateAsync({
          id: receipt.po_id,
          updates: {
            line_items: updatedLineItems as unknown as Record<string, unknown>[],
            status: newStatus,
            received_date: allFullyReceived ? new Date().toISOString() : null,
          },
        });
      }
      
      console.log('[useCreateMaterialReceipt] Created:', data?.id);
      return data as MaterialReceipt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['material_receipts'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateMaterialReceipt] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useConvertRequisitionToPO(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const createPO = useCreateProcurementPurchaseOrder();
  const updateRequisition = useUpdatePurchaseRequisition();
  
  return useMutation({
    mutationFn: async ({
      requisitionId,
      createdBy,
      createdById,
    }: {
      requisitionId: string;
      createdBy: string;
      createdById?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requisitionResult = await fetchById('purchase_requisitions', requisitionId, organizationId);
      if (requisitionResult.error || !requisitionResult.data) {
        throw new Error('Requisition not found');
      }
      
      const requisition = requisitionResult.data;
      
      const lineItems = (requisition.line_items || []) as unknown as RequisitionLineItem[];
      const poLineItems: POLineItem[] = lineItems.map((li) => ({
        line_id: `po-${li.line_id}`,
        line_number: li.line_number,
        material_id: li.material_id,
        material_sku: li.material_sku,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        line_total: li.line_total,
        is_stock: li.is_stock,
        is_deleted: false,
        received_qty: 0,
        uom: li.uom,
        notes: li.notes,
      }));
      
      const po = await createPO.mutateAsync({
        po_type: requisition.requisition_type,
        vendor_id: requisition.vendor_id || undefined,
        vendor_name: requisition.vendor_name || 'Unknown Vendor',
        department_id: requisition.department_id || undefined,
        department_name: requisition.department_name || undefined,
        created_by: createdBy,
        created_by_id: createdById,
        source_requisition_id: requisition.id,
        source_requisition_number: requisition.requisition_number,
        subtotal: requisition.subtotal,
        tax: requisition.tax,
        shipping: requisition.shipping,
        notes: requisition.notes || undefined,
        line_items: poLineItems,
      });
      
      await updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'converted_to_po',
          po_id: po.id,
          po_number: po.po_number,
        },
      });
      
      console.log('[useConvertRequisitionToPO] Converted requisition:', requisitionId, 'to PO:', po.id);
      return po;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useConvertRequisitionToPO] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useProcurementStats() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['procurement_stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const [posResult, reqsResult, requestsResult, vendorsResult, pendingApprovalsResult] = await Promise.all([
        supabase
          .from('procurement_purchase_orders')
          .select('status, total', { count: 'exact' })
          .eq('organization_id', organizationId),
        supabase
          .from('purchase_requisitions')
          .select('status', { count: 'exact' })
          .eq('organization_id', organizationId),
        supabase
          .from('purchase_requests')
          .select('status', { count: 'exact' })
          .eq('organization_id', organizationId),
        supabase
          .from('procurement_vendors')
          .select('active', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('active', true),
        supabase
          .from('po_approvals')
          .select('*', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('status', 'pending'),
      ]);
      
      const purchaseOrders = posResult.data || [];
      const draftPOs = purchaseOrders.filter((p) => p.status === 'draft').length;
      const pendingApprovalPOs = purchaseOrders.filter((p) => p.status === 'pending_approval').length;
      const orderedPOs = purchaseOrders.filter((p) => ['ordered', 'partial_received'].includes(p.status)).length;
      const totalPOValue = purchaseOrders.reduce((sum, p) => sum + (p.total || 0), 0);
      
      const requisitions = reqsResult.data || [];
      const pendingRequisitions = requisitions.filter((r) => r.status === 'pending_approval').length;
      
      const requests = requestsResult.data || [];
      const submittedRequests = requests.filter((r) => r.status === 'submitted').length;
      const underReviewRequests = requests.filter((r) => r.status === 'under_review').length;
      
      return {
        totalPOs: purchaseOrders.length,
        draftPOs,
        pendingApprovalPOs,
        orderedPOs,
        totalPOValue,
        totalRequisitions: requisitions.length,
        pendingRequisitions,
        totalRequests: requests.length,
        submittedRequests,
        underReviewRequests,
        activeVendors: vendorsResult.count || 0,
        pendingApprovals: pendingApprovalsResult.count || 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCancelPurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePO = useUpdateProcurementPurchaseOrder(options);
  
  return useMutation({
    mutationFn: async ({ poId, cancelledBy }: { poId: string; cancelledBy?: string }) => {
      return updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'cancelled',
          notes: cancelledBy ? `Cancelled by ${cancelledBy}` : undefined,
        },
      });
    },
  });
}

export function useClosePurchaseOrder(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const updatePO = useUpdateProcurementPurchaseOrder(options);
  
  return useMutation({
    mutationFn: async (poId: string) => {
      return updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'closed',
        },
      });
    },
  });
}

export function useCancelPurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequest = useUpdatePurchaseRequest(options);
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      return updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'cancelled',
        },
      });
    },
  });
}

export function useDeletePurchaseRequest(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('purchase_requests', requestId, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeletePurchaseRequest] Deleted request:', requestId);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeletePurchaseRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useMarkRequestUnderReview(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequest = useUpdatePurchaseRequest(options);
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      return updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'under_review',
        },
      });
    },
  });
}

export function useSendRequestForManagerApproval(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updateRequest = useUpdatePurchaseRequest();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      sentBy,
      sentById,
      departmentManagerId,
      departmentManagerName,
    }: {
      requestId: string;
      sentBy: string;
      sentById?: string;
      departmentManagerId?: string;
      departmentManagerName?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requestResult = await fetchById('purchase_requests', requestId, organizationId);
      if (requestResult.error || !requestResult.data) {
        throw new Error('Request not found');
      }
      
      const request = requestResult.data;
      
      const { error: approvalError } = await supabase.from('po_approvals').insert({
        organization_id: organizationId,
        po_id: null,
        requisition_id: null,
        approval_type: 'purchase_request',
        tier: 1,
        tier_name: 'Department Manager',
        approver_id: departmentManagerId || null,
        approver_name: departmentManagerName || 'Department Manager',
        approver_role: 'Department Manager',
        status: 'pending',
        amount_threshold: request.total_estimated,
        comments: `Purchase Request ${request.request_number} sent for department approval by ${sentBy}`,
      });
      
      if (approvalError) {
        console.error('[useSendRequestForManagerApproval] Error creating approval:', approvalError);
        throw new Error(approvalError.message);
      }
      
      const updatedRequest = await updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'pending_manager_approval',
        },
      });
      
      console.log('[useSendRequestForManagerApproval] Sent request for manager approval:', requestId);
      return updatedRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useSendRequestForManagerApproval] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useManagerApprovePurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updateRequest = useUpdatePurchaseRequest();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      approvedBy,
      approvedById,
    }: {
      requestId: string;
      approvedBy: string;
      approvedById?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error: updateApprovalError } = await supabase
        .from('po_approvals')
        .update({
          status: 'approved',
          decision_date: new Date().toISOString(),
          approver_name: approvedBy,
          approver_id: approvedById || null,
          comments: `Approved by ${approvedBy}`,
        })
        .eq('organization_id', organizationId)
        .eq('approval_type', 'purchase_request')
        .eq('status', 'pending');
      
      if (updateApprovalError) {
        console.error('[useManagerApprovePurchaseRequest] Error updating approval:', updateApprovalError);
      }
      
      const updatedRequest = await updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'approved',
          approved_date: new Date().toISOString(),
          approved_by: approvedBy,
        },
      });
      
      console.log('[useManagerApprovePurchaseRequest] Manager approved request:', requestId);
      return updatedRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useManagerApprovePurchaseRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useManagerRejectPurchaseRequest(options?: {
  onSuccess?: (data: PurchaseRequest) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updateRequest = useUpdatePurchaseRequest();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      rejectedBy,
      rejectedById,
      reason,
    }: {
      requestId: string;
      rejectedBy: string;
      rejectedById?: string;
      reason?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error: updateApprovalError } = await supabase
        .from('po_approvals')
        .update({
          status: 'rejected',
          decision_date: new Date().toISOString(),
          approver_name: rejectedBy,
          approver_id: rejectedById || null,
          comments: reason || `Rejected by ${rejectedBy}`,
        })
        .eq('organization_id', organizationId)
        .eq('approval_type', 'purchase_request')
        .eq('status', 'pending');
      
      if (updateApprovalError) {
        console.error('[useManagerRejectPurchaseRequest] Error updating approval:', updateApprovalError);
      }
      
      const updatedRequest = await updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'rejected',
          approved_date: new Date().toISOString(),
          approved_by: rejectedBy,
        },
      });
      
      console.log('[useManagerRejectPurchaseRequest] Manager rejected request:', requestId);
      return updatedRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['aggregated_purchase_approvals'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useManagerRejectPurchaseRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCancelRequisition(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequisition = useUpdatePurchaseRequisition(options);
  
  return useMutation({
    mutationFn: async (requisitionId: string) => {
      return updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'cancelled',
        },
      });
    },
  });
}

export function useApproveRequisitionTier(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updateRequisition = useUpdatePurchaseRequisition();
  
  return useMutation({
    mutationFn: async ({ 
      requisitionId, 
      tier, 
      approvedBy,
      approvedById,
    }: { 
      requisitionId: string; 
      tier: number;
      approvedBy: string;
      approvedById?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requisitionResult = await fetchById('purchase_requisitions', requisitionId, organizationId);
      if (requisitionResult.error || !requisitionResult.data) {
        throw new Error('Requisition not found');
      }
      
      const requisition = requisitionResult.data;
      const total = requisition.total || 0;
      const requiredTiers = getRequiredApprovalTiers(total);
      
      console.log('[useApproveRequisitionTier] Approving tier', tier, 'for requisition:', requisitionId, 'Total:', total);
      
      const { error: approvalUpdateError } = await supabase
        .from('po_approvals')
        .update({
          status: 'approved',
          decision_date: new Date().toISOString(),
          approver_name: approvedBy,
          approver_id: approvedById || null,
          comments: `Tier ${tier} approved by ${approvedBy}`,
        })
        .eq('organization_id', organizationId)
        .eq('requisition_id', requisitionId)
        .eq('tier', tier)
        .eq('status', 'pending');
      
      if (approvalUpdateError) {
        console.error('[useApproveRequisitionTier] Error updating approval:', approvalUpdateError);
        throw new Error(approvalUpdateError.message);
      }
      
      let newStatus: RequisitionStatus;
      
      if (tier === 2) {
        if (requiredTiers.includes(3)) {
          newStatus = 'pending_tier3_approval';
          console.log('[useApproveRequisitionTier] Tier 2 approved, moving to Tier 3 approval');
          
          const { error: tier3UpdateError } = await supabase
            .from('po_approvals')
            .update({
              status: 'pending',
            })
            .eq('organization_id', organizationId)
            .eq('requisition_id', requisitionId)
            .eq('tier', 3)
            .eq('status', 'waiting');
          
          if (tier3UpdateError) {
            console.error('[useApproveRequisitionTier] Error activating Tier 3:', tier3UpdateError);
          } else {
            console.log('[useApproveRequisitionTier] Tier 3 approval activated');
          }
        } else {
          newStatus = 'ready_for_po';
          console.log('[useApproveRequisitionTier] Tier 2 approved, no Tier 3 needed, ready for PO');
        }
      } else if (tier === 3) {
        newStatus = 'ready_for_po';
        console.log('[useApproveRequisitionTier] Tier 3 approved, ready for PO');
      } else {
        newStatus = 'ready_for_po';
      }
      
      const updatedRequisition = await updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: newStatus,
          ...(newStatus === 'ready_for_po' ? {
            approved_date: new Date().toISOString(),
            approved_by: approvedBy,
          } : {}),
        },
      });
      
      return updatedRequisition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['requisition_approval_workflow'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useApproveRequisitionTier] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveRequisition(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequisition = useUpdatePurchaseRequisition(options);
  
  return useMutation({
    mutationFn: async ({ requisitionId, approvedBy }: { requisitionId: string; approvedBy: string }) => {
      return updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'ready_for_po',
          approved_date: new Date().toISOString(),
          approved_by: approvedBy,
        },
      });
    },
  });
}

export function useRejectRequisition(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const updateRequisition = useUpdatePurchaseRequisition(options);
  
  return useMutation({
    mutationFn: async ({ requisitionId, rejectedBy, reason }: { requisitionId: string; rejectedBy: string; reason?: string }) => {
      return updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'rejected',
          rejected_date: new Date().toISOString(),
          rejected_by: rejectedBy,
          rejection_reason: reason || null,
        },
      });
    },
  });
}

export function useConvertRequestToRequisition(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const createRequisition = useCreatePurchaseRequisition();
  const updateRequest = useUpdatePurchaseRequest();
  
  return useMutation({
    mutationFn: async ({
      requestId,
      vendorId,
      vendorName,
      createdById,
      createdByName,
    }: {
      requestId: string;
      vendorId?: string;
      vendorName?: string;
      createdById: string;
      createdByName: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requestResult = await fetchById('purchase_requests', requestId, organizationId);
      if (requestResult.error || !requestResult.data) {
        throw new Error('Request not found');
      }
      
      const request = requestResult.data;
      const lineItems = (request.line_items || []) as unknown as PurchaseRequestLineItem[];
      
      const requisitionLineItems: RequisitionLineItem[] = lineItems.map((li) => ({
        line_id: `rql-${li.line_id}`,
        line_number: li.line_number,
        material_id: li.material_id,
        material_sku: li.material_sku,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.estimated_unit_price,
        line_total: li.estimated_total,
        suggested_vendor_id: li.suggested_vendor_id || vendorId,
        suggested_vendor_name: li.suggested_vendor_name || vendorName,
        is_stock: li.is_stock,
        notes: li.notes,
      }));
      
      const subtotal = requisitionLineItems.reduce((sum, li) => sum + li.line_total, 0);
      
      const requisition = await createRequisition.mutateAsync({
        source_request_id: request.id,
        source_request_number: request.request_number,
        created_by_id: createdById,
        created_by_name: createdByName,
        department_id: request.department_id || undefined,
        department_name: request.department_name || undefined,
        vendor_id: vendorId,
        vendor_name: vendorName,
        priority: request.priority,
        requisition_type: 'material',
        needed_by_date: request.needed_by_date || undefined,
        subtotal,
        tax: 0,
        shipping: 0,
        notes: request.notes || undefined,
        line_items: requisitionLineItems,
      });
      
      await updateRequest.mutateAsync({
        id: requestId,
        updates: {
          status: 'converted',
          requisition_id: requisition.id,
          requisition_number: requisition.requisition_number,
        },
      });
      
      console.log('[useConvertRequestToRequisition] Converted request:', requestId, 'to requisition:', requisition.id);
      return requisition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useConvertRequestToRequisition] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePendingApprovalCountsForUser(userId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['procurement_approval_counts', userId, organizationId],
    queryFn: async () => {
      if (!organizationId || !userId) return { poApprovals: 0, requisitionApprovals: 0, total: 0 };
      
      const { data, error } = await supabase
        .from('po_approvals')
        .select('approval_type')
        .eq('organization_id', organizationId)
        .eq('approver_id', userId)
        .eq('status', 'pending');
      
      if (error) throw new Error(error.message);
      
      const approvals = data || [];
      const poApprovals = approvals.filter((a) => a.approval_type === 'purchase_order').length;
      const requisitionApprovals = approvals.filter((a) => a.approval_type === 'requisition').length;
      
      console.log('[usePendingApprovalCountsForUser] User:', userId, 'PO:', poApprovals, 'Req:', requisitionApprovals);
      return {
        poApprovals,
        requisitionApprovals,
        total: poApprovals + requisitionApprovals,
      };
    },
    enabled: !!organizationId && !!userId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useVendorOrderHistory(vendorId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['vendor_order_history', vendorId, organizationId],
    queryFn: async () => {
      if (!organizationId || !vendorId) return { orders: [], stats: null };
      
      const { data, error } = await supabase
        .from('procurement_purchase_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw new Error(error.message);
      
      const orders = (data || []) as ProcurementPurchaseOrder[];
      
      const completedOrders = orders.filter((o) => ['received', 'closed'].includes(o.status));
      const totalSpend = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const avgOrderValue = completedOrders.length > 0 ? totalSpend / completedOrders.length : 0;
      
      return {
        orders,
        stats: {
          totalOrders: orders.length,
          completedOrders: completedOrders.length,
          totalSpend,
          avgOrderValue,
          openOrders: orders.filter((o) => ['ordered', 'partial_received'].includes(o.status)).length,
        },
      };
    },
    enabled: !!organizationId && !!vendorId,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePOApprovalWorkflow(poId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['po_approval_workflow', poId, organizationId],
    queryFn: async () => {
      if (!organizationId || !poId) return null;
      
      const { data: approvals, error } = await supabase
        .from('po_approvals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('po_id', poId)
        .order('tier', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      const approvalList = (approvals || []) as POApproval[];
      const totalTiers = approvalList.length;
      const completedTiers = approvalList.filter((a) => a.status === 'approved').length;
      const rejectedTiers = approvalList.filter((a) => a.status === 'rejected').length;
      const currentTier = approvalList.find((a) => a.status === 'pending');
      const isFullyApproved = totalTiers > 0 && completedTiers === totalTiers;
      const isRejected = rejectedTiers > 0;
      
      console.log('[usePOApprovalWorkflow] PO:', poId, 'Tiers:', totalTiers, 'Completed:', completedTiers);
      
      return {
        approvals: approvalList,
        totalTiers,
        completedTiers,
        currentTier,
        isFullyApproved,
        isRejected,
        progress: totalTiers > 0 ? (completedTiers / totalTiers) * 100 : 0,
      };
    },
    enabled: !!organizationId && !!poId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useRequisitionApprovalWorkflow(requisitionId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['requisition_approval_workflow', requisitionId, organizationId],
    queryFn: async () => {
      if (!organizationId || !requisitionId) return null;
      
      const { data: approvals, error } = await supabase
        .from('po_approvals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('requisition_id', requisitionId)
        .order('tier', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      const approvalList = (approvals || []) as POApproval[];
      const totalTiers = approvalList.length;
      const completedTiers = approvalList.filter((a) => a.status === 'approved').length;
      const rejectedTiers = approvalList.filter((a) => a.status === 'rejected').length;
      const currentTier = approvalList.find((a) => a.status === 'pending');
      const isFullyApproved = totalTiers > 0 && completedTiers === totalTiers;
      const isRejected = rejectedTiers > 0;
      
      console.log('[useRequisitionApprovalWorkflow] Requisition:', requisitionId, 'Tiers:', totalTiers);
      
      return {
        approvals: approvalList,
        totalTiers,
        completedTiers,
        currentTier,
        isFullyApproved,
        isRejected,
        progress: totalTiers > 0 ? (completedTiers / totalTiers) * 100 : 0,
      };
    },
    enabled: !!organizationId && !!requisitionId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useSubmitPOWithApprovalChain(options?: {
  onSuccess?: (data: ProcurementPurchaseOrder) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updatePO = useUpdateProcurementPurchaseOrder();
  const createApprovalChain = useCreatePOApprovalChain();
  
  return useMutation({
    mutationFn: async ({
      poId,
      approvalTiers,
    }: {
      poId: string;
      approvalTiers: {
        tier: number;
        tier_name?: string;
        approver_id?: string;
        approver_name: string;
        approver_role?: string;
        amount_threshold?: number;
      }[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      await createApprovalChain.mutateAsync({
        po_id: poId,
        approval_type: 'purchase_order',
        tiers: approvalTiers,
      });
      
      const updatedPO = await updatePO.mutateAsync({
        id: poId,
        updates: {
          status: 'pending_approval',
          submitted_date: new Date().toISOString(),
        },
      });
      
      console.log('[useSubmitPOWithApprovalChain] Submitted PO:', poId, 'with', approvalTiers.length, 'tiers');
      return updatedPO;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['po_approval_workflow'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useSubmitPOWithApprovalChain] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSubmitRequisitionWithApprovalChain(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updateRequisition = useUpdatePurchaseRequisition();
  const createApprovalChain = useCreatePOApprovalChain();
  
  return useMutation({
    mutationFn: async ({
      requisitionId,
      approvalTiers,
    }: {
      requisitionId: string;
      approvalTiers: {
        tier: number;
        tier_name?: string;
        approver_id?: string;
        approver_name: string;
        approver_role?: string;
        amount_threshold?: number;
      }[];
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      await createApprovalChain.mutateAsync({
        requisition_id: requisitionId,
        approval_type: 'requisition',
        tiers: approvalTiers,
      });
      
      const updatedRequisition = await updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'pending_approval',
          requested_date: new Date().toISOString(),
        },
      });
      
      console.log('[useSubmitRequisitionWithApprovalChain] Submitted requisition:', requisitionId, 'with', approvalTiers.length, 'tiers');
      return updatedRequisition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['requisition_approval_workflow'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useSubmitRequisitionWithApprovalChain] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useProcessApprovalAndUpdateStatus(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      approvalId,
      decision,
      comments,
    }: {
      approvalId: string;
      decision: 'approved' | 'rejected';
      comments?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: approval, error: fetchError } = await supabase
        .from('po_approvals')
        .select('*')
        .eq('id', approvalId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      if (!approval) throw new Error('Approval not found');
      
      const { error: updateError } = await supabase
        .from('po_approvals')
        .update({
          status: decision,
          decision_date: new Date().toISOString(),
          comments: comments || null,
        })
        .eq('id', approvalId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw new Error(updateError.message);
      
      const referenceType = approval.po_id ? 'po' : 'requisition';
      const referenceId = approval.po_id || approval.requisition_id;
      const tableName = referenceType === 'po' ? 'procurement_purchase_orders' : 'purchase_requisitions';
      
      if (decision === 'rejected' && referenceId) {
        const { error: rejectError } = await supabase
          .from(tableName)
          .update({ status: 'rejected' })
          .eq('id', referenceId)
          .eq('organization_id', organizationId);
        
        if (rejectError) throw new Error(rejectError.message);
        
        console.log('[useProcessApprovalAndUpdateStatus] Rejected', referenceType, referenceId);
      } else if (decision === 'approved' && referenceId) {
        const { data: allApprovals, error: checkError } = await supabase
          .from('po_approvals')
          .select('status')
          .eq('organization_id', organizationId)
          .eq(referenceType === 'po' ? 'po_id' : 'requisition_id', referenceId);
        
        if (checkError) throw new Error(checkError.message);
        
        const allApproved = allApprovals?.every((a) => a.status === 'approved');
        if (allApproved) {
          const { error: approveError } = await supabase
            .from(tableName)
            .update({
              status: 'approved',
              approved_date: new Date().toISOString(),
            })
            .eq('id', referenceId)
            .eq('organization_id', organizationId);
          
          if (approveError) throw new Error(approveError.message);
          
          console.log('[useProcessApprovalAndUpdateStatus] Fully approved', referenceType, referenceId);
        }
      }
      
      return { approvalId, decision, referenceType, referenceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['procurement_purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['po_approval_workflow'] });
      queryClient.invalidateQueries({ queryKey: ['requisition_approval_workflow'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useProcessApprovalAndUpdateStatus] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApprovalHistoryForPO(poId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['po_approval_history', poId, organizationId],
    queryFn: async () => {
      if (!organizationId || !poId) return [];
      
      const { data, error } = await supabase
        .from('po_approvals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('po_id', poId)
        .not('decision_date', 'is', null)
        .order('decision_date', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      console.log('[useApprovalHistoryForPO] Fetched history for PO:', poId, data?.length || 0);
      return (data || []) as POApproval[];
    },
    enabled: !!organizationId && !!poId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useApprovalHistoryForRequisition(requisitionId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['requisition_approval_history', requisitionId, organizationId],
    queryFn: async () => {
      if (!organizationId || !requisitionId) return [];
      
      const { data, error } = await supabase
        .from('po_approvals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('requisition_id', requisitionId)
        .not('decision_date', 'is', null)
        .order('decision_date', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      console.log('[useApprovalHistoryForRequisition] Fetched history for requisition:', requisitionId, data?.length || 0);
      return (data || []) as POApproval[];
    },
    enabled: !!organizationId && !!requisitionId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useVendorDocumentsQuery(vendorId: string | undefined | null, documentType?: VendorDocumentType) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['vendor_documents', vendorId, documentType, organizationId],
    queryFn: async () => {
      if (!organizationId || !vendorId) return [];
      
      let query = supabase
        .from('vendor_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      if (documentType) {
        query = query.eq('document_type', documentType);
      }
      
      const { data, error } = await query;
      if (error) {
        console.log('[useVendorDocumentsQuery] Table may not exist yet, returning empty array');
        return [];
      }
      
      console.log('[useVendorDocumentsQuery] Fetched:', data?.length || 0, 'documents for vendor:', vendorId);
      return (data || []) as VendorDocument[];
    },
    enabled: !!organizationId && !!vendorId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateVendorDocument(options?: {
  onSuccess?: (data: VendorDocument) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (document: Omit<VendorDocument, 'id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('vendor_documents')
        .insert({
          ...document,
          organization_id: organizationId,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      console.log('[useCreateVendorDocument] Created document:', data?.id);
      return data as VendorDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_documents'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateVendorDocument] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateVendorDocument(options?: {
  onSuccess?: (data: VendorDocument) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VendorDocument> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('vendor_documents')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      console.log('[useUpdateVendorDocument] Updated document:', id);
      return data as VendorDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_documents'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateVendorDocument] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteVendorDocument(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('vendor_documents')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);
      
      if (error) throw new Error(error.message);
      console.log('[useDeleteVendorDocument] Deleted document:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor_documents'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteVendorDocument] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useVendorRatingsQuery(vendorId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['vendor_ratings', vendorId, organizationId],
    queryFn: async () => {
      if (!organizationId || !vendorId) return [];
      
      const { data, error } = await supabase
        .from('vendor_ratings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('[useVendorRatingsQuery] Table may not exist yet, returning empty array');
        return [];
      }
      
      console.log('[useVendorRatingsQuery] Fetched:', data?.length || 0, 'ratings for vendor:', vendorId);
      return (data || []) as VendorRating[];
    },
    enabled: !!organizationId && !!vendorId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateVendorRating(options?: {
  onSuccess?: (data: VendorRating) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rating: Omit<VendorRating, 'id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('vendor_ratings')
        .insert({
          ...rating,
          organization_id: organizationId,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      console.log('[useCreateVendorRating] Created rating:', data?.id);
      return data as VendorRating;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor_ratings'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateVendorRating] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useVendorAverageRating(vendorId: string | undefined | null) {
  const ratingsQuery = useVendorRatingsQuery(vendorId);
  
  const averageRating = useMemo(() => {
    const ratings = ratingsQuery.data || [];
    if (ratings.length === 0) return null;
    
    const totalOverall = ratings.reduce((sum, r) => sum + r.overall_score, 0);
    const avgQuality = ratings.reduce((sum, r) => sum + r.quality_score, 0) / ratings.length;
    const avgDelivery = ratings.reduce((sum, r) => sum + r.delivery_score, 0) / ratings.length;
    const avgPrice = ratings.reduce((sum, r) => sum + r.price_score, 0) / ratings.length;
    const avgService = ratings.reduce((sum, r) => sum + r.service_score, 0) / ratings.length;
    
    return {
      overall: totalOverall / ratings.length,
      quality: avgQuality,
      delivery: avgDelivery,
      price: avgPrice,
      service: avgService,
      totalRatings: ratings.length,
    };
  }, [ratingsQuery.data]);
  
  return {
    ...ratingsQuery,
    averageRating,
  };
}

export interface PendingRequisitionApproval {
  approval_id: string;
  requisition_id: string;
  requisition_number: string;
  tier: number;
  tier_name: string;
  department_id: string | null;
  department_name: string | null;
  vendor_name: string | null;
  total: number;
  priority: string;
  needed_by_date: string | null;
  created_at: string;
  notes: string | null;
  justification: string | null;
  source_request_number: string | null;
}

export function usePendingRequisitionApprovalsByTier(tier: number) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['pending_requisition_approvals_by_tier', tier, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data: approvals, error: approvalError } = await supabase
        .from('po_approvals')
        .select('id, requisition_id, tier, tier_name, created_at')
        .eq('organization_id', organizationId)
        .eq('approval_type', 'requisition')
        .eq('tier', tier)
        .eq('status', 'pending');
      
      if (approvalError) throw new Error(approvalError.message);
      if (!approvals || approvals.length === 0) return [];
      
      const requisitionIds = approvals.map(a => a.requisition_id).filter(Boolean) as string[];
      
      if (requisitionIds.length === 0) return [];
      
      const { data: requisitions, error: reqError } = await supabase
        .from('purchase_requisitions')
        .select('id, requisition_number, department_id, department_name, vendor_name, total, priority, needed_by_date, created_at, notes, justification, source_request_number')
        .eq('organization_id', organizationId)
        .in('id', requisitionIds);
      
      if (reqError) throw new Error(reqError.message);
      
      const result: PendingRequisitionApproval[] = approvals.map(approval => {
        const req = requisitions?.find(r => r.id === approval.requisition_id);
        return {
          approval_id: approval.id,
          requisition_id: approval.requisition_id || '',
          requisition_number: req?.requisition_number || '',
          tier: approval.tier,
          tier_name: approval.tier_name || '',
          department_id: req?.department_id || null,
          department_name: req?.department_name || null,
          vendor_name: req?.vendor_name || null,
          total: req?.total || 0,
          priority: req?.priority || 'normal',
          needed_by_date: req?.needed_by_date || null,
          created_at: req?.created_at || approval.created_at,
          notes: req?.notes || null,
          justification: req?.justification || null,
          source_request_number: req?.source_request_number || null,
        };
      }).filter(item => item.requisition_id);
      
      console.log('[usePendingRequisitionApprovalsByTier] Tier', tier, 'found:', result.length, 'approvals');
      return result;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function usePendingPurchaseRequestApprovals() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['pending_purchase_request_approvals', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending_manager_approval')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[usePendingPurchaseRequestApprovals] Found:', data?.length || 0, 'pending requests');
      return (data || []) as PurchaseRequest[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useApproveRequisitionTierWithPin(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const approveRequisitionTier = useApproveRequisitionTier(options);
  
  return useMutation({
    mutationFn: async ({
      requisitionId,
      tier,
      approvedBy,
      approvedById,
      pin,
    }: {
      requisitionId: string;
      tier: number;
      approvedBy: string;
      approvedById?: string;
      pin: string;
    }) => {
      if (pin !== '1234') {
        throw new Error('Invalid PIN');
      }
      
      return approveRequisitionTier.mutateAsync({
        requisitionId,
        tier,
        approvedBy,
        approvedById,
      });
    },
  });
}

export function useRejectRequisitionTier(options?: {
  onSuccess?: (data: PurchaseRequisition) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const updateRequisition = useUpdatePurchaseRequisition();
  
  return useMutation({
    mutationFn: async ({
      requisitionId,
      tier,
      rejectedBy,
      rejectedById,
      reason,
    }: {
      requisitionId: string;
      tier: number;
      rejectedBy: string;
      rejectedById?: string;
      reason?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error: approvalUpdateError } = await supabase
        .from('po_approvals')
        .update({
          status: 'rejected',
          decision_date: new Date().toISOString(),
          approver_name: rejectedBy,
          approver_id: rejectedById || null,
          comments: reason || `Tier ${tier} rejected by ${rejectedBy}`,
        })
        .eq('organization_id', organizationId)
        .eq('requisition_id', requisitionId)
        .eq('tier', tier)
        .eq('status', 'pending');
      
      if (approvalUpdateError) {
        console.error('[useRejectRequisitionTier] Error updating approval:', approvalUpdateError);
        throw new Error(approvalUpdateError.message);
      }
      
      const updatedRequisition = await updateRequisition.mutateAsync({
        id: requisitionId,
        updates: {
          status: 'rejected',
          rejected_date: new Date().toISOString(),
          rejected_by: rejectedBy,
          rejection_reason: reason || null,
        },
      });
      
      console.log('[useRejectRequisitionTier] Rejected tier', tier, 'for requisition:', requisitionId);
      return updatedRequisition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['po_approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending_requisition_approvals_by_tier'] });
      queryClient.invalidateQueries({ queryKey: ['requisition_approval_workflow'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useRejectRequisitionTier] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}
