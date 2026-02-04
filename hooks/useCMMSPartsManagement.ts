import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  PartsIssue,
  PartsIssueItem,
  PartsIssueStatus,
  PartsRequest,
  PartsRequestItem,
  PartsRequestStatus,
  PartsReturn,
  PartsReturnItem,
  PartsReturnStatus,
  PartsReturnReason,
  StockLevel,
  ReorderPoint,
  generatePartsIssueNumber,
  generatePartsRequestNumber,
  generatePartsReturnNumber,
} from '@/types/cmms';

// =============================================================================
// PARTS ISSUE HOOKS
// =============================================================================

export function usePartsIssuesQuery(options?: {
  enabled?: boolean;
  status?: PartsIssueStatus | PartsIssueStatus[];
  facilityId?: string;
  workOrderId?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsIssues', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_parts_issues')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.workOrderId) {
        query = query.eq('work_order_id', options.workOrderId);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePartsIssuesQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsIssuesQuery] Fetched:', data?.length || 0, 'parts issues');
      return (data || []).map(mapPartsIssueFromDB) as PartsIssue[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePartsIssueById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsIssues', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_parts_issues')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[usePartsIssueById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsIssueById] Fetched parts issue:', id);
      return mapPartsIssueFromDB(data) as PartsIssue;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePartsIssue(options?: {
  onSuccess?: (data: PartsIssue) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issue: Omit<PartsIssue, 'id' | 'issueNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const issueNumber = generatePartsIssueNumber();

      const { data, error } = await supabase
        .from('cmms_parts_issues')
        .insert({
          organization_id: organizationId,
          issue_number: issueNumber,
          facility_id: issue.facilityId,
          work_order_id: issue.workOrderId || null,
          work_order_number: issue.workOrderNumber || null,
          equipment_id: issue.equipmentId || null,
          equipment_name: issue.equipmentName || null,
          requested_by: issue.requestedBy,
          requested_by_name: issue.requestedByName,
          requested_at: issue.requestedAt,
          status: issue.status || 'pending',
          items: issue.items,
          total_cost: issue.totalCost,
          cost_center: issue.costCenter || null,
          gl_account: issue.glAccount || null,
          notes: issue.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreatePartsIssue] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreatePartsIssue] Created parts issue:', data?.id);
      return mapPartsIssueFromDB(data) as PartsIssue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'partsIssues'] });
      queryClient.invalidateQueries({ queryKey: ['cmms', 'stockLevels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePartsIssue] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePartsIssue(options?: {
  onSuccess?: (data: PartsIssue) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PartsIssue> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.issuedBy !== undefined) dbUpdates.issued_by = updates.issuedBy;
      if (updates.issuedByName !== undefined) dbUpdates.issued_by_name = updates.issuedByName;
      if (updates.issuedAt !== undefined) dbUpdates.issued_at = updates.issuedAt;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.totalCost !== undefined) dbUpdates.total_cost = updates.totalCost;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;

      const { data, error } = await supabase
        .from('cmms_parts_issues')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdatePartsIssue] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdatePartsIssue] Updated parts issue:', id);
      return mapPartsIssueFromDB(data) as PartsIssue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'partsIssues'] });
      queryClient.invalidateQueries({ queryKey: ['cmms', 'stockLevels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePartsIssue] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApprovePartsIssue(options?: {
  onSuccess?: (data: PartsIssue) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdatePartsIssue(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'approved',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

export function useIssuePartsIssue(options?: {
  onSuccess?: (data: PartsIssue) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdatePartsIssue(options);

  return useMutation({
    mutationFn: async ({ id, issuedBy, issuedByName, items }: { id: string; issuedBy: string; issuedByName: string; items: PartsIssueItem[] }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'issued',
          issuedBy,
          issuedByName,
          issuedAt: new Date().toISOString(),
          items,
          totalCost: items.reduce((sum, item) => sum + item.totalCost, 0),
        },
      });
    },
  });
}

// =============================================================================
// PARTS REQUEST HOOKS
// =============================================================================

export function usePartsRequestsQuery(options?: {
  enabled?: boolean;
  status?: PartsRequestStatus | PartsRequestStatus[];
  facilityId?: string;
  priority?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsRequests', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_parts_requests')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.priority) {
        query = query.eq('priority', options.priority);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePartsRequestsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsRequestsQuery] Fetched:', data?.length || 0, 'parts requests');
      return (data || []).map(mapPartsRequestFromDB) as PartsRequest[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePartsRequestById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsRequests', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_parts_requests')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[usePartsRequestById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsRequestById] Fetched parts request:', id);
      return mapPartsRequestFromDB(data) as PartsRequest;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePartsRequest(options?: {
  onSuccess?: (data: PartsRequest) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<PartsRequest, 'id' | 'requestNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const requestNumber = generatePartsRequestNumber();

      const { data, error } = await supabase
        .from('cmms_parts_requests')
        .insert({
          organization_id: organizationId,
          request_number: requestNumber,
          facility_id: request.facilityId,
          requested_by: request.requestedBy,
          requested_by_name: request.requestedByName,
          requested_at: request.requestedAt,
          needed_by_date: request.neededByDate || null,
          priority: request.priority,
          status: request.status || 'draft',
          items: request.items,
          total_estimated_cost: request.totalEstimatedCost,
          justification: request.justification,
          work_order_id: request.workOrderId || null,
          work_order_number: request.workOrderNumber || null,
          equipment_id: request.equipmentId || null,
          equipment_name: request.equipmentName || null,
          cost_center: request.costCenter || null,
          gl_account: request.glAccount || null,
          notes: request.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreatePartsRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreatePartsRequest] Created parts request:', data?.id);
      return mapPartsRequestFromDB(data) as PartsRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'partsRequests'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePartsRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePartsRequest(options?: {
  onSuccess?: (data: PartsRequest) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PartsRequest> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.neededByDate !== undefined) dbUpdates.needed_by_date = updates.neededByDate;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.totalEstimatedCost !== undefined) dbUpdates.total_estimated_cost = updates.totalEstimatedCost;
      if (updates.justification !== undefined) dbUpdates.justification = updates.justification;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.purchaseOrderId !== undefined) dbUpdates.purchase_order_id = updates.purchaseOrderId;
      if (updates.purchaseOrderNumber !== undefined) dbUpdates.purchase_order_number = updates.purchaseOrderNumber;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;

      const { data, error } = await supabase
        .from('cmms_parts_requests')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdatePartsRequest] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdatePartsRequest] Updated parts request:', id);
      return mapPartsRequestFromDB(data) as PartsRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'partsRequests'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePartsRequest] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSubmitPartsRequest(options?: {
  onSuccess?: (data: PartsRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdatePartsRequest(options);

  return useMutation({
    mutationFn: async (id: string) => {
      return updateMutation.mutateAsync({
        id,
        updates: { status: 'submitted' },
      });
    },
  });
}

export function useApprovePartsRequest(options?: {
  onSuccess?: (data: PartsRequest) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdatePartsRequest(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'approved',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

// =============================================================================
// PARTS RETURN HOOKS
// =============================================================================

export function usePartsReturnsQuery(options?: {
  enabled?: boolean;
  status?: PartsReturnStatus | PartsReturnStatus[];
  facilityId?: string;
  reason?: PartsReturnReason;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsReturns', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_parts_returns')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.reason) {
        query = query.eq('reason', options.reason);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePartsReturnsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsReturnsQuery] Fetched:', data?.length || 0, 'parts returns');
      return (data || []).map(mapPartsReturnFromDB) as PartsReturn[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePartsReturnById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsReturns', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_parts_returns')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[usePartsReturnById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsReturnById] Fetched parts return:', id);
      return mapPartsReturnFromDB(data) as PartsReturn;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePartsReturn(options?: {
  onSuccess?: (data: PartsReturn) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (returnData: Omit<PartsReturn, 'id' | 'returnNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const returnNumber = generatePartsReturnNumber();

      const { data, error } = await supabase
        .from('cmms_parts_returns')
        .insert({
          organization_id: organizationId,
          return_number: returnNumber,
          facility_id: returnData.facilityId,
          work_order_id: returnData.workOrderId || null,
          work_order_number: returnData.workOrderNumber || null,
          returned_by: returnData.returnedBy,
          returned_by_name: returnData.returnedByName,
          returned_at: returnData.returnedAt,
          status: returnData.status || 'pending',
          reason: returnData.reason,
          items: returnData.items,
          total_credit_value: returnData.totalCreditValue,
          notes: returnData.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreatePartsReturn] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreatePartsReturn] Created parts return:', data?.id);
      return mapPartsReturnFromDB(data) as PartsReturn;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'partsReturns'] });
      queryClient.invalidateQueries({ queryKey: ['cmms', 'stockLevels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePartsReturn] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePartsReturn(options?: {
  onSuccess?: (data: PartsReturn) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PartsReturn> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.inspectedBy !== undefined) dbUpdates.inspected_by = updates.inspectedBy;
      if (updates.inspectedByName !== undefined) dbUpdates.inspected_by_name = updates.inspectedByName;
      if (updates.inspectedAt !== undefined) dbUpdates.inspected_at = updates.inspectedAt;
      if (updates.processedBy !== undefined) dbUpdates.processed_by = updates.processedBy;
      if (updates.processedByName !== undefined) dbUpdates.processed_by_name = updates.processedByName;
      if (updates.processedAt !== undefined) dbUpdates.processed_at = updates.processedAt;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.totalCreditValue !== undefined) dbUpdates.total_credit_value = updates.totalCreditValue;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('cmms_parts_returns')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdatePartsReturn] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdatePartsReturn] Updated parts return:', id);
      return mapPartsReturnFromDB(data) as PartsReturn;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'partsReturns'] });
      queryClient.invalidateQueries({ queryKey: ['cmms', 'stockLevels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePartsReturn] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useInspectPartsReturn(options?: {
  onSuccess?: (data: PartsReturn) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdatePartsReturn(options);

  return useMutation({
    mutationFn: async ({ id, inspectedBy, inspectedByName, items }: { id: string; inspectedBy: string; inspectedByName: string; items: PartsReturnItem[] }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'inspected',
          inspectedBy,
          inspectedByName,
          inspectedAt: new Date().toISOString(),
          items,
        },
      });
    },
  });
}

export function useProcessPartsReturn(options?: {
  onSuccess?: (data: PartsReturn) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdatePartsReturn(options);

  return useMutation({
    mutationFn: async ({ id, processedBy, processedByName, items, status }: { id: string; processedBy: string; processedByName: string; items: PartsReturnItem[]; status: 'restocked' | 'scrapped' }) => {
      const totalCreditValue = items.reduce((sum, item) => sum + item.creditValue, 0);
      return updateMutation.mutateAsync({
        id,
        updates: {
          status,
          processedBy,
          processedByName,
          processedAt: new Date().toISOString(),
          items,
          totalCreditValue,
        },
      });
    },
  });
}

// =============================================================================
// STOCK LEVELS HOOKS
// =============================================================================

export function useStockLevelsQuery(options?: {
  enabled?: boolean;
  facilityId?: string;
  category?: string;
  status?: string | string[];
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'stockLevels', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_stock_levels')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      query = query.order('material_name', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useStockLevelsQuery] Error:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to fetch stock levels');
      }

      console.log('[useStockLevelsQuery] Fetched:', data?.length || 0, 'stock levels');
      return (data || []).map(mapStockLevelFromDB) as StockLevel[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLowStockItems(options?: { facilityId?: string; limit?: number }) {
  return useStockLevelsQuery({
    ...options,
    status: ['low', 'critical', 'out_of_stock'],
  });
}

export function useStockLevelById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'stockLevels', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_stock_levels')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useStockLevelById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useStockLevelById] Fetched stock level:', id);
      return mapStockLevelFromDB(data) as StockLevel;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateStockLevel(options?: {
  onSuccess?: (data: StockLevel) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StockLevel> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.onHand !== undefined) dbUpdates.on_hand = updates.onHand;
      if (updates.minLevel !== undefined) dbUpdates.min_level = updates.minLevel;
      if (updates.maxLevel !== undefined) dbUpdates.max_level = updates.maxLevel;
      if (updates.reorderPoint !== undefined) dbUpdates.reorder_point = updates.reorderPoint;
      if (updates.reorderQty !== undefined) dbUpdates.reorder_qty = updates.reorderQty;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.bin !== undefined) dbUpdates.bin = updates.bin;
      if (updates.lastCountedAt !== undefined) dbUpdates.last_counted_at = updates.lastCountedAt;

      const { data, error } = await supabase
        .from('cmms_stock_levels')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateStockLevel] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateStockLevel] Updated stock level:', id);
      return mapStockLevelFromDB(data) as StockLevel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'stockLevels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateStockLevel] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// REORDER POINTS HOOKS
// =============================================================================

export function useReorderPointsQuery(options?: {
  enabled?: boolean;
  facilityId?: string;
  needsReorder?: boolean;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'reorderPoints', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_reorder_points')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      query = query.order('material_name', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useReorderPointsQuery] Error:', error);
        throw new Error(error.message);
      }

      let results = (data || []).map(mapReorderPointFromDB) as ReorderPoint[];

      if (options?.needsReorder) {
        results = results.filter(rp => rp.currentOnHand <= rp.reorderPoint);
      }

      console.log('[useReorderPointsQuery] Fetched:', results.length, 'reorder points');
      return results;
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useItemsNeedingReorder(options?: { facilityId?: string; limit?: number }) {
  return useReorderPointsQuery({
    ...options,
    needsReorder: true,
  });
}

export function useReorderPointById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'reorderPoints', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_reorder_points')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useReorderPointById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useReorderPointById] Fetched reorder point:', id);
      return mapReorderPointFromDB(data) as ReorderPoint;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateReorderPoint(options?: {
  onSuccess?: (data: ReorderPoint) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReorderPoint> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.reorderPoint !== undefined) dbUpdates.reorder_point = updates.reorderPoint;
      if (updates.reorderQty !== undefined) dbUpdates.reorder_qty = updates.reorderQty;
      if (updates.minLevel !== undefined) dbUpdates.min_level = updates.minLevel;
      if (updates.maxLevel !== undefined) dbUpdates.max_level = updates.maxLevel;
      if (updates.leadTimeDays !== undefined) dbUpdates.lead_time_days = updates.leadTimeDays;
      if (updates.safetyStockDays !== undefined) dbUpdates.safety_stock_days = updates.safetyStockDays;
      if (updates.preferredVendorId !== undefined) dbUpdates.preferred_vendor_id = updates.preferredVendorId;
      if (updates.preferredVendorName !== undefined) dbUpdates.preferred_vendor_name = updates.preferredVendorName;
      if (updates.isAutoReorder !== undefined) dbUpdates.is_auto_reorder = updates.isAutoReorder;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('cmms_reorder_points')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateReorderPoint] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateReorderPoint] Updated reorder point:', id);
      return mapReorderPointFromDB(data) as ReorderPoint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'reorderPoints'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateReorderPoint] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS - DB MAPPING
// =============================================================================

function mapPartsIssueFromDB(data: Record<string, unknown>): PartsIssue {
  return {
    id: data.id as string,
    issueNumber: data.issue_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    workOrderId: data.work_order_id as string | undefined,
    workOrderNumber: data.work_order_number as string | undefined,
    equipmentId: data.equipment_id as string | undefined,
    equipmentName: data.equipment_name as string | undefined,
    requestedBy: data.requested_by as string,
    requestedByName: data.requested_by_name as string,
    requestedAt: data.requested_at as string,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    issuedBy: data.issued_by as string | undefined,
    issuedByName: data.issued_by_name as string | undefined,
    issuedAt: data.issued_at as string | undefined,
    status: data.status as PartsIssueStatus,
    items: (data.items || []) as PartsIssueItem[],
    totalCost: data.total_cost as number,
    costCenter: data.cost_center as string | undefined,
    glAccount: data.gl_account as string | undefined,
    notes: data.notes as string | undefined,
    rejectionReason: data.rejection_reason as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapPartsRequestFromDB(data: Record<string, unknown>): PartsRequest {
  return {
    id: data.id as string,
    requestNumber: data.request_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    requestedBy: data.requested_by as string,
    requestedByName: data.requested_by_name as string,
    requestedAt: data.requested_at as string,
    neededByDate: data.needed_by_date as string | undefined,
    priority: data.priority as 'low' | 'medium' | 'high' | 'critical',
    status: data.status as PartsRequestStatus,
    items: (data.items || []) as PartsRequestItem[],
    totalEstimatedCost: data.total_estimated_cost as number,
    justification: data.justification as string,
    workOrderId: data.work_order_id as string | undefined,
    workOrderNumber: data.work_order_number as string | undefined,
    equipmentId: data.equipment_id as string | undefined,
    equipmentName: data.equipment_name as string | undefined,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    purchaseOrderId: data.purchase_order_id as string | undefined,
    purchaseOrderNumber: data.purchase_order_number as string | undefined,
    costCenter: data.cost_center as string | undefined,
    glAccount: data.gl_account as string | undefined,
    notes: data.notes as string | undefined,
    rejectionReason: data.rejection_reason as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapPartsReturnFromDB(data: Record<string, unknown>): PartsReturn {
  return {
    id: data.id as string,
    returnNumber: data.return_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    workOrderId: data.work_order_id as string | undefined,
    workOrderNumber: data.work_order_number as string | undefined,
    returnedBy: data.returned_by as string,
    returnedByName: data.returned_by_name as string,
    returnedAt: data.returned_at as string,
    inspectedBy: data.inspected_by as string | undefined,
    inspectedByName: data.inspected_by_name as string | undefined,
    inspectedAt: data.inspected_at as string | undefined,
    processedBy: data.processed_by as string | undefined,
    processedByName: data.processed_by_name as string | undefined,
    processedAt: data.processed_at as string | undefined,
    status: data.status as PartsReturnStatus,
    reason: data.reason as PartsReturnReason,
    items: (data.items || []) as PartsReturnItem[],
    totalCreditValue: data.total_credit_value as number,
    notes: data.notes as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapStockLevelFromDB(data: Record<string, unknown>): StockLevel {
  return {
    id: data.id as string,
    materialId: data.material_id as string,
    materialNumber: data.material_number as string,
    materialName: data.material_name as string,
    materialSku: data.material_sku as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    inventoryDepartment: data.inventory_department as number,
    category: data.category as string,
    onHand: data.on_hand as number,
    minLevel: data.min_level as number,
    maxLevel: data.max_level as number,
    reorderPoint: data.reorder_point as number,
    reorderQty: data.reorder_qty as number,
    unitCost: data.unit_cost as number,
    totalValue: data.total_value as number,
    location: data.location as string | undefined,
    bin: data.bin as string | undefined,
    lastReceived: data.last_received as string | undefined,
    lastIssued: data.last_issued as string | undefined,
    avgDailyUsage: data.avg_daily_usage as number,
    avgMonthlyUsage: data.avg_monthly_usage as number,
    daysOfSupply: data.days_of_supply as number,
    status: data.status as 'ok' | 'low' | 'critical' | 'overstock' | 'out_of_stock',
    lastCountedAt: data.last_counted_at as string | undefined,
    updatedAt: data.updated_at as string,
  };
}

function mapReorderPointFromDB(data: Record<string, unknown>): ReorderPoint {
  return {
    id: data.id as string,
    materialId: data.material_id as string,
    materialNumber: data.material_number as string,
    materialName: data.material_name as string,
    materialSku: data.material_sku as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    currentOnHand: data.current_on_hand as number,
    reorderPoint: data.reorder_point as number,
    reorderQty: data.reorder_qty as number,
    minLevel: data.min_level as number,
    maxLevel: data.max_level as number,
    leadTimeDays: data.lead_time_days as number,
    avgDailyUsage: data.avg_daily_usage as number,
    safetyStockDays: data.safety_stock_days as number,
    calculatedReorderPoint: data.calculated_reorder_point as number,
    calculatedReorderQty: data.calculated_reorder_qty as number,
    lastOrderDate: data.last_order_date as string | undefined,
    lastOrderQty: data.last_order_qty as number | undefined,
    pendingOrderQty: data.pending_order_qty as number,
    preferredVendorId: data.preferred_vendor_id as string | undefined,
    preferredVendorName: data.preferred_vendor_name as string | undefined,
    unitCost: data.unit_cost as number,
    isAutoReorder: data.is_auto_reorder as boolean,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
