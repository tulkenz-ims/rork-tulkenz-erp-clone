import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export type LotStatus = 'active' | 'consumed' | 'expired' | 'on_hold' | 'disposed';
export type TransactionType = 'received' | 'issued' | 'adjusted' | 'transferred' | 'disposed' | 'hold' | 'release';

export interface InventoryLot {
  id: string;
  organization_id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  internal_lot_number: string;
  vendor_lot_number: string;
  vendor_id?: string;
  vendor_name?: string;
  po_number?: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_of_measure: string;
  received_date: string;
  expiration_date?: string;
  best_by_date?: string;
  storage_location?: string;
  coa_document_id?: string;
  status: LotStatus;
  hold_reason?: string;
  hold_date?: string;
  hold_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface LotTransaction {
  id: string;
  organization_id: string;
  lot_id: string;
  lot_number: string;
  material_name: string;
  material_sku: string;
  transaction_type: TransactionType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: string;
  from_location?: string;
  to_location?: string;
  performed_by: string;
  performed_at: string;
  notes?: string;
  created_at: string;
}

export function useLotsQuery(options?: {
  materialId?: string;
  status?: LotStatus;
  expiringWithinDays?: number;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_lots', organizationId, options?.materialId, options?.status, options?.expiringWithinDays],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('inventory_lots')
        .select('*')
        .eq('organization_id', organizationId)
        .order('received_date', { ascending: false });
      
      if (options?.materialId) {
        query = query.eq('material_id', options.materialId);
      }
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
        query = query.lte('expiration_date', futureDate.toISOString().split('T')[0]);
        query = query.gte('expiration_date', new Date().toISOString().split('T')[0]);
        query = query.neq('status', 'expired');
        query = query.neq('status', 'disposed');
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useLotsQuery] Fetched:', data?.length || 0, 'lots');
      return (data || []) as InventoryLot[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLotById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_lots', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const { data, error } = await supabase
        .from('inventory_lots')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      if (error) throw new Error(error.message);
      return data as InventoryLot;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLot(options?: {
  onSuccess?: (data: InventoryLot) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lot: Omit<InventoryLot, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .insert({ ...lot, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      await logLotTransaction({
        organizationId,
        lotId: data.id,
        lotNumber: data.internal_lot_number,
        materialName: data.material_name,
        materialSku: data.material_sku,
        transactionType: 'received',
        quantity: data.quantity_received,
        quantityBefore: 0,
        quantityAfter: data.quantity_received,
        referenceType: 'receipt',
        referenceId: data.po_number,
        toLocation: data.storage_location,
        performedBy: data.created_by,
        notes: 'Initial receipt',
      });
      
      console.log('[useCreateLot] Created lot:', data.id);
      return data as InventoryLot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lot_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateLot] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useIssueLot(options?: {
  onSuccess?: (data: InventoryLot) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lotId, quantity, referenceType, referenceId, performedBy, notes }: {
      lotId: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      performedBy: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: lot, error: fetchError } = await supabase
        .from('inventory_lots')
        .select('*')
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !lot) throw new Error('Lot not found');
      if (lot.status !== 'active') throw new Error('Cannot issue from non-active lot');
      if (quantity > lot.quantity_remaining) throw new Error('Insufficient quantity');
      
      const newQty = lot.quantity_remaining - quantity;
      const newStatus = newQty === 0 ? 'consumed' : lot.status;
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .update({ quantity_remaining: newQty, status: newStatus })
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      await logLotTransaction({
        organizationId,
        lotId,
        lotNumber: lot.internal_lot_number,
        materialName: lot.material_name,
        materialSku: lot.material_sku,
        transactionType: 'issued',
        quantity,
        quantityBefore: lot.quantity_remaining,
        quantityAfter: newQty,
        referenceType,
        referenceId,
        fromLocation: lot.storage_location,
        performedBy,
        notes,
      });
      
      console.log('[useIssueLot] Issued:', quantity, 'from lot:', lotId);
      return data as InventoryLot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lot_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useIssueLot] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useHoldLot(options?: {
  onSuccess?: (data: InventoryLot) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lotId, holdReason, holdBy }: { lotId: string; holdReason: string; holdBy: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: lot, error: fetchError } = await supabase
        .from('inventory_lots')
        .select('*')
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !lot) throw new Error('Lot not found');
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .update({ status: 'on_hold', hold_reason: holdReason, hold_by: holdBy, hold_date: new Date().toISOString() })
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      await logLotTransaction({
        organizationId,
        lotId,
        lotNumber: lot.internal_lot_number,
        materialName: lot.material_name,
        materialSku: lot.material_sku,
        transactionType: 'hold',
        quantity: 0,
        quantityBefore: lot.quantity_remaining,
        quantityAfter: lot.quantity_remaining,
        performedBy: holdBy,
        notes: holdReason,
      });
      
      console.log('[useHoldLot] Held lot:', lotId);
      return data as InventoryLot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lot_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useHoldLot] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useReleaseLot(options?: {
  onSuccess?: (data: InventoryLot) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lotId, releasedBy, notes }: { lotId: string; releasedBy: string; notes?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: lot, error: fetchError } = await supabase
        .from('inventory_lots')
        .select('*')
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !lot) throw new Error('Lot not found');
      if (lot.status !== 'on_hold') throw new Error('Lot is not on hold');
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .update({ status: 'active', hold_reason: null, hold_by: null, hold_date: null })
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      await logLotTransaction({
        organizationId,
        lotId,
        lotNumber: lot.internal_lot_number,
        materialName: lot.material_name,
        materialSku: lot.material_sku,
        transactionType: 'release',
        quantity: 0,
        quantityBefore: lot.quantity_remaining,
        quantityAfter: lot.quantity_remaining,
        performedBy: releasedBy,
        notes,
      });
      
      console.log('[useReleaseLot] Released lot:', lotId);
      return data as InventoryLot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lot_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useReleaseLot] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDisposeLot(options?: {
  onSuccess?: (data: InventoryLot) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lotId, disposedBy, notes }: { lotId: string; disposedBy: string; notes?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: lot, error: fetchError } = await supabase
        .from('inventory_lots')
        .select('*')
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !lot) throw new Error('Lot not found');
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .update({ status: 'disposed' })
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      await logLotTransaction({
        organizationId,
        lotId,
        lotNumber: lot.internal_lot_number,
        materialName: lot.material_name,
        materialSku: lot.material_sku,
        transactionType: 'disposed',
        quantity: lot.quantity_remaining,
        quantityBefore: lot.quantity_remaining,
        quantityAfter: 0,
        performedBy: disposedBy,
        notes: notes || 'Lot disposed',
      });
      
      console.log('[useDisposeLot] Disposed lot:', lotId);
      return data as InventoryLot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lot_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useDisposeLot] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useMarkLotConsumed(options?: {
  onSuccess?: (data: InventoryLot) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lotId, consumedBy, notes }: { lotId: string; consumedBy: string; notes?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: lot, error: fetchError } = await supabase
        .from('inventory_lots')
        .select('*')
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError || !lot) throw new Error('Lot not found');
      
      const { data, error } = await supabase
        .from('inventory_lots')
        .update({ status: 'consumed', quantity_remaining: 0 })
        .eq('id', lotId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      await logLotTransaction({
        organizationId,
        lotId,
        lotNumber: lot.internal_lot_number,
        materialName: lot.material_name,
        materialSku: lot.material_sku,
        transactionType: 'issued',
        quantity: lot.quantity_remaining,
        quantityBefore: lot.quantity_remaining,
        quantityAfter: 0,
        performedBy: consumedBy,
        notes: notes || 'Marked as fully consumed',
      });
      
      console.log('[useMarkLotConsumed] Consumed lot:', lotId);
      return data as InventoryLot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_lots'] });
      queryClient.invalidateQueries({ queryKey: ['lot_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useMarkLotConsumed] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useLotTransactionsQuery(options?: { lotId?: string; limit?: number; enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['lot_transactions', organizationId, options?.lotId, options?.limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('lot_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('performed_at', { ascending: false });
      
      if (options?.lotId) query = query.eq('lot_id', options.lotId);
      if (options?.limit) query = query.limit(options.limit);
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useLotTransactionsQuery] Fetched:', data?.length || 0, 'transactions');
      return (data || []) as LotTransaction[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

async function logLotTransaction(params: {
  organizationId: string;
  lotId: string;
  lotNumber: string;
  materialName: string;
  materialSku: string;
  transactionType: TransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string;
  referenceId?: string;
  fromLocation?: string;
  toLocation?: string;
  performedBy: string;
  notes?: string;
}) {
  try {
    const { error } = await supabase.from('lot_transactions').insert({
      organization_id: params.organizationId,
      lot_id: params.lotId,
      lot_number: params.lotNumber,
      material_name: params.materialName,
      material_sku: params.materialSku,
      transaction_type: params.transactionType,
      quantity: params.quantity,
      quantity_before: params.quantityBefore,
      quantity_after: params.quantityAfter,
      reference_type: params.referenceType || null,
      reference_id: params.referenceId || null,
      from_location: params.fromLocation || null,
      to_location: params.toLocation || null,
      performed_by: params.performedBy,
      performed_at: new Date().toISOString(),
      notes: params.notes || null,
    });
    
    if (error) console.error('[logLotTransaction] Error:', error);
    else console.log('[logLotTransaction] Logged:', params.transactionType, 'for lot:', params.lotId);
  } catch (err) {
    console.error('[logLotTransaction] Exception:', err);
  }
}
