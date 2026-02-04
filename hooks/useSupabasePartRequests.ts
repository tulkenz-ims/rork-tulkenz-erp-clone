import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type PartRequestStatus = 'pending_approval' | 'approved' | 'rejected' | 'partially_issued' | 'issued' | 'completed' | 'cancelled';

export interface PartRequestLine {
  id: string;
  material_id: string;
  material_number: string;
  material_name: string;
  material_sku: string;
  quantity_requested: number;
  quantity_approved: number;
  quantity_issued: number;
  unit_of_measure: string;
  estimated_unit_cost: number;
  actual_unit_cost: number;
  location: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'issued' | 'partial';
}

export interface PartRequest {
  id: string;
  organization_id: string;
  request_number: string;
  work_order_id: string | null;
  work_order_number: string | null;
  status: PartRequestStatus;
  requested_by: string | null;
  requested_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  lines: PartRequestLine[];
  total_estimated_cost: number;
  total_actual_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type CreatePartRequestInput = Omit<PartRequest, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabasePartRequests() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const partRequestsQuery = useQuery({
    queryKey: ['part-requests', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePartRequests] Fetching part requests');

      const { data, error } = await supabase
        .from('part_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PartRequest[];
    },
    enabled: !!organizationId,
  });

  const pendingRequestsQuery = useQuery({
    queryKey: ['part-requests', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePartRequests] Fetching pending part requests');

      const { data, error } = await supabase
        .from('part_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PartRequest[];
    },
    enabled: !!organizationId,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (input: CreatePartRequestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePartRequests] Creating part request:', input.request_number);

      const { data, error } = await supabase
        .from('part_requests')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PartRequest> & { id: string }) => {
      console.log('[useSupabasePartRequests] Updating part request:', id);

      const { data, error } = await supabase
        .from('part_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async ({ 
      id, 
      approvedById, 
      approvedByName, 
      approvedLines 
    }: { 
      id: string; 
      approvedById: string; 
      approvedByName: string;
      approvedLines?: PartRequestLine[];
    }) => {
      console.log('[useSupabasePartRequests] Approving part request:', id);

      const updates: Partial<PartRequest> = {
        status: 'approved',
        approved_by: approvedById,
        approved_by_name: approvedByName,
        approved_at: new Date().toISOString(),
      };

      if (approvedLines) {
        updates.lines = approvedLines;
      }

      const { data, error } = await supabase
        .from('part_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ 
      id, 
      rejectedById, 
      rejectedByName,
      reason 
    }: { 
      id: string; 
      rejectedById: string; 
      rejectedByName: string;
      reason?: string;
    }) => {
      console.log('[useSupabasePartRequests] Rejecting part request:', id);

      const { data, error } = await supabase
        .from('part_requests')
        .update({
          status: 'rejected',
          approved_by: rejectedById,
          approved_by_name: rejectedByName,
          approved_at: new Date().toISOString(),
          notes: reason || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const issuePartsMutation = useMutation({
    mutationFn: async ({ 
      id, 
      issuedLines,
      issuedBy,
      issuedByName,
    }: { 
      id: string; 
      issuedLines: PartRequestLine[];
      issuedBy: string;
      issuedByName: string;
    }) => {
      console.log('[useSupabasePartRequests] Issuing parts:', id);

      const allIssued = issuedLines.every(line => line.quantity_issued >= line.quantity_approved);
      const someIssued = issuedLines.some(line => line.quantity_issued > 0);

      let newStatus: PartRequestStatus = 'approved';
      if (allIssued) {
        newStatus = 'issued';
      } else if (someIssued) {
        newStatus = 'partially_issued';
      }

      const totalActualCost = issuedLines.reduce((sum, line) => 
        sum + (line.quantity_issued * line.actual_unit_cost), 0
      );

      const { data, error } = await supabase
        .from('part_requests')
        .update({
          status: newStatus,
          lines: issuedLines,
          total_actual_cost: totalActualCost,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const completeRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePartRequests] Completing part request:', id);

      const { data, error } = await supabase
        .from('part_requests')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      console.log('[useSupabasePartRequests] Cancelling part request:', id);

      const { data, error } = await supabase
        .from('part_requests')
        .update({ 
          status: 'cancelled',
          notes: reason || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PartRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePartRequests] Deleting part request:', id);

      const { error } = await supabase
        .from('part_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
    },
  });

  const getRequestsForWorkOrder = (workOrderId: string) => {
    return partRequestsQuery.data?.filter(req => req.work_order_id === workOrderId) || [];
  };

  const getRequestsByStatus = (status: PartRequestStatus) => {
    return partRequestsQuery.data?.filter(req => req.status === status) || [];
  };

  const generateRequestNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PR-${year}${month}${day}-${random}`;
  };

  return {
    partRequests: partRequestsQuery.data || [],
    pendingRequests: pendingRequestsQuery.data || [],
    isLoading: partRequestsQuery.isLoading,

    createRequest: createRequestMutation.mutateAsync,
    updateRequest: updateRequestMutation.mutateAsync,
    approveRequest: approveRequestMutation.mutateAsync,
    rejectRequest: rejectRequestMutation.mutateAsync,
    issueParts: issuePartsMutation.mutateAsync,
    completeRequest: completeRequestMutation.mutateAsync,
    cancelRequest: cancelRequestMutation.mutateAsync,
    deleteRequest: deleteRequestMutation.mutateAsync,

    getRequestsForWorkOrder,
    getRequestsByStatus,
    generateRequestNumber,

    refetch: () => {
      partRequestsQuery.refetch();
      pendingRequestsQuery.refetch();
    },
  };
}
