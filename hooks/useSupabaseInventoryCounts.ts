import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export type CountSessionStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface CountItem {
  materialId: string;
  materialName: string;
  materialSku: string;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
  countedBy?: string;
  countedAt?: string;
  notes?: string;
}

export interface CountSession {
  id: string;
  organization_id: string;
  name: string;
  status: CountSessionStatus;
  facility_id?: string;
  facility_name?: string;
  category?: string;
  created_by: string;
  items: CountItem[];
  total_items: number;
  counted_items: number;
  variance_count: number;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CountSessionFilters {
  status?: CountSessionStatus;
  facilityId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useCountSessionsQuery(filters?: CountSessionFilters & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['count_sessions', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('count_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.facilityId) {
        query = query.eq('facility_id', filters.facilityId);
      }
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useCountSessionsQuery] Fetched:', data?.length || 0, 'sessions');
      return (data || []) as CountSession[];
    },
    enabled: !!organizationId && (filters?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCountSessionQuery(sessionId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['count_sessions', 'detail', sessionId, organizationId],
    queryFn: async () => {
      if (!organizationId || !sessionId) return null;
      
      const { data, error } = await supabase
        .from('count_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', sessionId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      
      console.log('[useCountSessionQuery] Fetched session:', sessionId);
      return data as CountSession;
    },
    enabled: !!organizationId && !!sessionId,
    staleTime: 1000 * 60,
  });
}

export function useActiveCountSessions() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['count_sessions', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('count_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['draft', 'in_progress'])
        .order('updated_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useActiveCountSessions] Fetched:', data?.length || 0, 'active sessions');
      return (data || []) as CountSession[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

export function useCountSessionStats() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['count_sessions', 'stats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { total: 0, draft: 0, inProgress: 0, completed: 0, cancelled: 0, totalVariances: 0 };
      }
      
      const { data, error } = await supabase
        .from('count_sessions')
        .select('status, variance_count')
        .eq('organization_id', organizationId);
      
      if (error) throw new Error(error.message);
      
      const stats = {
        total: data?.length || 0,
        draft: data?.filter(s => s.status === 'draft').length || 0,
        inProgress: data?.filter(s => s.status === 'in_progress').length || 0,
        completed: data?.filter(s => s.status === 'completed').length || 0,
        cancelled: data?.filter(s => s.status === 'cancelled').length || 0,
        totalVariances: data?.reduce((sum, s) => sum + (s.variance_count || 0), 0) || 0,
      };
      
      console.log('[useCountSessionStats] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCountSession(options?: {
  onSuccess?: (data: CountSession) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (session: {
      name: string;
      facilityId?: string;
      facilityName?: string;
      category?: string;
      createdBy: string;
      items?: CountItem[];
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const items = session.items || [];
      const { data, error } = await supabase
        .from('count_sessions')
        .insert({
          organization_id: organizationId,
          name: session.name,
          status: 'draft',
          facility_id: session.facilityId || null,
          facility_name: session.facilityName || null,
          category: session.category || null,
          created_by: session.createdBy,
          items: items,
          total_items: items.length,
          counted_items: 0,
          variance_count: 0,
          notes: session.notes || null,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useCreateCountSession] Created session:', data.id);
      return data as CountSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['count_sessions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateCountSession] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateCountSession(options?: {
  onSuccess?: (data: CountSession) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<{
        name: string;
        status: CountSessionStatus;
        items: CountItem[];
        notes: string;
        started_at: string;
        completed_at: string;
      }>;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const updateData: Record<string, unknown> = { ...params.updates };
      
      if (params.updates.items) {
        const items = params.updates.items;
        updateData.items = items;
        updateData.total_items = items.length;
        updateData.counted_items = items.filter(i => i.countedQty !== null).length;
        updateData.variance_count = items.filter(i => i.variance !== null && i.variance !== 0).length;
      }
      
      const { data, error } = await supabase
        .from('count_sessions')
        .update(updateData)
        .eq('organization_id', organizationId)
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useUpdateCountSession] Updated session:', params.id);
      return data as CountSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['count_sessions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateCountSession] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useRecordCount(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      materialId: string;
      countedQty: number;
      countedBy: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: session, error: fetchError } = await supabase
        .from('count_sessions')
        .select('items')
        .eq('organization_id', organizationId)
        .eq('id', params.sessionId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      const items = (session.items as CountItem[]) || [];
      const itemIndex = items.findIndex(i => i.materialId === params.materialId);
      
      if (itemIndex === -1) throw new Error('Item not found in count session');
      
      const item = items[itemIndex];
      const variance = params.countedQty - item.expectedQty;
      
      items[itemIndex] = {
        ...item,
        countedQty: params.countedQty,
        variance,
        countedBy: params.countedBy,
        countedAt: new Date().toISOString(),
        notes: params.notes,
      };
      
      const countedItems = items.filter(i => i.countedQty !== null).length;
      const varianceCount = items.filter(i => i.variance !== null && i.variance !== 0).length;
      
      const { error: updateError } = await supabase
        .from('count_sessions')
        .update({
          items,
          counted_items: countedItems,
          variance_count: varianceCount,
        })
        .eq('organization_id', organizationId)
        .eq('id', params.sessionId);
      
      if (updateError) throw new Error(updateError.message);
      
      console.log('[useRecordCount] Recorded count for:', params.materialId, 'qty:', params.countedQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count_sessions'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useRecordCount] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteCountSession(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('count_sessions')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', sessionId);
      
      if (error) throw new Error(error.message);
      
      console.log('[useDeleteCountSession] Deleted session:', sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count_sessions'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteCountSession] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function getStatusInfo(status: CountSessionStatus): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: '#6B7280', bgColor: '#6B728015' };
    case 'in_progress':
      return { label: 'In Progress', color: '#3B82F6', bgColor: '#3B82F615' };
    case 'completed':
      return { label: 'Completed', color: '#10B981', bgColor: '#10B98115' };
    case 'cancelled':
      return { label: 'Cancelled', color: '#EF4444', bgColor: '#EF444415' };
    default:
      return { label: status, color: '#6B7280', bgColor: '#6B728015' };
  }
}
