import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export type TransactionAction = 'adjustment' | 'count' | 'receive' | 'issue' | 'transfer' | 'create' | 'delete';

export interface InventoryTransaction {
  id: string;
  organization_id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  action: TransactionAction;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reason?: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

export interface TransactionFilters {
  materialId?: string;
  action?: TransactionAction;
  dateFrom?: string;
  dateTo?: string;
  performedBy?: string;
  limit?: number;
}

export function useInventoryTransactionsQuery(options?: TransactionFilters & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: [
      'inventory_transactions',
      organizationId,
      options?.materialId,
      options?.action,
      options?.dateFrom,
      options?.dateTo,
      options?.performedBy,
      options?.limit,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('inventory_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (options?.materialId) {
        query = query.eq('material_id', options.materialId);
      }
      
      if (options?.action) {
        query = query.eq('action', options.action);
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }
      
      if (options?.performedBy) {
        query = query.ilike('performed_by', `%${options.performedBy}%`);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useInventoryTransactionsQuery] Fetched:', data?.length || 0, 'transactions');
      return (data || []) as InventoryTransaction[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTransactionsByMaterial(materialId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_transactions', 'byMaterial', materialId, organizationId],
    queryFn: async () => {
      if (!organizationId || !materialId) return [];
      
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('material_id', materialId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw new Error(error.message);
      
      console.log('[useTransactionsByMaterial] Fetched:', data?.length || 0, 'for material:', materialId);
      return (data || []) as InventoryTransaction[];
    },
    enabled: !!organizationId && !!materialId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentTransactions(limit: number = 20) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_transactions', 'recent', organizationId, limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw new Error(error.message);
      
      console.log('[useRecentTransactions] Fetched:', data?.length || 0, 'recent transactions');
      return (data || []) as InventoryTransaction[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

export function useTransactionStats(dateFrom?: string) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_transactions', 'stats', organizationId, dateFrom],
    queryFn: async () => {
      if (!organizationId) return { total: 0, received: 0, issued: 0, adjusted: 0, transfers: 0, counts: 0 };
      
      let query = supabase
        .from('inventory_history')
        .select('action')
        .eq('organization_id', organizationId);
      
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      const stats = {
        total: data?.length || 0,
        received: data?.filter(t => t.action === 'receive').length || 0,
        issued: data?.filter(t => t.action === 'issue').length || 0,
        adjusted: data?.filter(t => t.action === 'adjustment').length || 0,
        transfers: data?.filter(t => t.action === 'transfer').length || 0,
        counts: data?.filter(t => t.action === 'count').length || 0,
      };
      
      console.log('[useTransactionStats] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTransaction(options?: {
  onSuccess?: (data: InventoryTransaction) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Omit<InventoryTransaction, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inventory_history')
        .insert({ ...transaction, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useCreateTransaction] Created transaction:', data.id, 'action:', data.action);
      return data as InventoryTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateTransaction] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export async function logInventoryTransaction(params: {
  organizationId: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  action: TransactionAction;
  quantityBefore: number;
  quantityAfter: number;
  performedBy: string;
  reason?: string;
  notes?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from('inventory_history').insert({
      organization_id: params.organizationId,
      material_id: params.materialId,
      material_name: params.materialName,
      material_sku: params.materialSku,
      action: params.action,
      quantity_before: params.quantityBefore,
      quantity_after: params.quantityAfter,
      quantity_change: params.quantityAfter - params.quantityBefore,
      reason: params.reason || null,
      performed_by: params.performedBy,
      notes: params.notes || null,
    });
    
    if (error) {
      console.error('[logInventoryTransaction] Error:', error);
    } else {
      console.log('[logInventoryTransaction] Logged:', params.action, 'for material:', params.materialId);
    }
  } catch (err) {
    console.error('[logInventoryTransaction] Exception:', err);
  }
}

export function getActionInfo(action: TransactionAction): { label: string; color: string; bgColor: string } {
  switch (action) {
    case 'receive':
      return { label: 'Received', color: '#10B981', bgColor: '#10B98115' };
    case 'issue':
      return { label: 'Issued', color: '#3B82F6', bgColor: '#3B82F615' };
    case 'adjustment':
      return { label: 'Adjusted', color: '#F59E0B', bgColor: '#F59E0B15' };
    case 'transfer':
      return { label: 'Transferred', color: '#8B5CF6', bgColor: '#8B5CF615' };
    case 'count':
      return { label: 'Count', color: '#06B6D4', bgColor: '#06B6D415' };
    case 'create':
      return { label: 'Created', color: '#22C55E', bgColor: '#22C55E15' };
    case 'delete':
      return { label: 'Deleted', color: '#EF4444', bgColor: '#EF444415' };
    default:
      return { label: action, color: '#6B7280', bgColor: '#6B728015' };
  }
}
