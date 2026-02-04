import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export interface PartUsageRecord {
  id: string;
  organization_id: string;
  equipment_id: string;
  equipment_name?: string;
  equipment_tag?: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  work_order_id?: string;
  work_order_number?: string;
  used_date: string;
  used_by: string;
  used_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartUsageFilters {
  equipmentId?: string;
  materialId?: string;
  workOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  usedBy?: string;
}

export interface PartUsageStats {
  totalRecords: number;
  totalQuantityUsed: number;
  totalCost: number;
  avgCostPerRecord: number;
  uniqueMaterials: number;
  uniqueEquipment: number;
}

export function usePartsUsageQuery(filters?: PartUsageFilters & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['parts_usage', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('parts_usage')
        .select('*')
        .eq('organization_id', organizationId)
        .order('used_date', { ascending: false });
      
      if (filters?.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }
      
      if (filters?.materialId) {
        query = query.eq('material_id', filters.materialId);
      }
      
      if (filters?.workOrderId) {
        query = query.eq('work_order_id', filters.workOrderId);
      }
      
      if (filters?.usedBy) {
        query = query.eq('used_by', filters.usedBy);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('used_date', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('used_date', filters.dateTo);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[usePartsUsageQuery] Fetched:', data?.length || 0, 'records');
      return (data || []) as PartUsageRecord[];
    },
    enabled: !!organizationId && (filters?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentPartsUsageQuery(equipmentId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['parts_usage', 'equipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      
      const { data, error } = await supabase
        .from('parts_usage')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .order('used_date', { ascending: false })
        .limit(100);
      
      if (error) throw new Error(error.message);
      
      console.log('[useEquipmentPartsUsageQuery] Fetched:', data?.length || 0, 'records for equipment:', equipmentId);
      return (data || []) as PartUsageRecord[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkOrderPartsUsageQuery(workOrderId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['parts_usage', 'work_order', workOrderId, organizationId],
    queryFn: async () => {
      if (!organizationId || !workOrderId) return [];
      
      const { data, error } = await supabase
        .from('parts_usage')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('used_date', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useWorkOrderPartsUsageQuery] Fetched:', data?.length || 0, 'records for WO:', workOrderId);
      return (data || []) as PartUsageRecord[];
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1000 * 60,
  });
}

export function useMaterialUsageHistoryQuery(materialId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['parts_usage', 'material', materialId, organizationId],
    queryFn: async () => {
      if (!organizationId || !materialId) return [];
      
      const { data, error } = await supabase
        .from('parts_usage')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('material_id', materialId)
        .order('used_date', { ascending: false })
        .limit(100);
      
      if (error) throw new Error(error.message);
      
      console.log('[useMaterialUsageHistoryQuery] Fetched:', data?.length || 0, 'records for material:', materialId);
      return (data || []) as PartUsageRecord[];
    },
    enabled: !!organizationId && !!materialId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePartsUsageStatsQuery(filters?: { equipmentId?: string; dateFrom?: string; dateTo?: string }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['parts_usage', 'stats', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalRecords: 0,
          totalQuantityUsed: 0,
          totalCost: 0,
          avgCostPerRecord: 0,
          uniqueMaterials: 0,
          uniqueEquipment: 0,
        } as PartUsageStats;
      }
      
      let query = supabase
        .from('parts_usage')
        .select('quantity_used, total_cost, material_id, equipment_id')
        .eq('organization_id', organizationId);
      
      if (filters?.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('used_date', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('used_date', filters.dateTo);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      const records = data || [];
      const totalQuantity = records.reduce((sum, r) => sum + (r.quantity_used || 0), 0);
      const totalCost = records.reduce((sum, r) => sum + (r.total_cost || 0), 0);
      const uniqueMaterials = new Set(records.map(r => r.material_id)).size;
      const uniqueEquipment = new Set(records.map(r => r.equipment_id)).size;
      
      const stats: PartUsageStats = {
        totalRecords: records.length,
        totalQuantityUsed: totalQuantity,
        totalCost,
        avgCostPerRecord: records.length > 0 ? totalCost / records.length : 0,
        uniqueMaterials,
        uniqueEquipment,
      };
      
      console.log('[usePartsUsageStatsQuery] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePartUsage(options?: {
  onSuccess?: (data: PartUsageRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: {
      equipmentId: string;
      equipmentName?: string;
      equipmentTag?: string;
      materialId: string;
      materialName: string;
      materialSku: string;
      quantityUsed: number;
      unitCost: number;
      workOrderId?: string;
      workOrderNumber?: string;
      usedBy: string;
      usedByName?: string;
      usedDate?: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const totalCost = record.quantityUsed * record.unitCost;
      const usedDate = record.usedDate || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('parts_usage')
        .insert({
          organization_id: organizationId,
          equipment_id: record.equipmentId,
          equipment_name: record.equipmentName || null,
          equipment_tag: record.equipmentTag || null,
          material_id: record.materialId,
          material_name: record.materialName,
          material_sku: record.materialSku,
          quantity_used: record.quantityUsed,
          unit_cost: record.unitCost,
          total_cost: totalCost,
          work_order_id: record.workOrderId || null,
          work_order_number: record.workOrderNumber || null,
          used_by: record.usedBy,
          used_by_name: record.usedByName || null,
          used_date: usedDate,
          notes: record.notes || null,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useCreatePartUsage] Created record:', data.id);
      return data as PartUsageRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parts_usage'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePartUsage] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePartUsage(options?: {
  onSuccess?: (data: PartUsageRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<{
        quantityUsed: number;
        unitCost: number;
        notes: string;
        usedDate: string;
      }>;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const updateData: Record<string, unknown> = {};
      
      if (params.updates.quantityUsed !== undefined) {
        updateData.quantity_used = params.updates.quantityUsed;
      }
      if (params.updates.unitCost !== undefined) {
        updateData.unit_cost = params.updates.unitCost;
      }
      if (params.updates.notes !== undefined) {
        updateData.notes = params.updates.notes;
      }
      if (params.updates.usedDate !== undefined) {
        updateData.used_date = params.updates.usedDate;
      }
      
      if (params.updates.quantityUsed !== undefined || params.updates.unitCost !== undefined) {
        const { data: existing } = await supabase
          .from('parts_usage')
          .select('quantity_used, unit_cost')
          .eq('id', params.id)
          .single();
        
        if (existing) {
          const qty = params.updates.quantityUsed ?? existing.quantity_used;
          const cost = params.updates.unitCost ?? existing.unit_cost;
          updateData.total_cost = qty * cost;
        }
      }
      
      const { data, error } = await supabase
        .from('parts_usage')
        .update(updateData)
        .eq('organization_id', organizationId)
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useUpdatePartUsage] Updated record:', params.id);
      return data as PartUsageRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parts_usage'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePartUsage] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeletePartUsage(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('parts_usage')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', recordId);
      
      if (error) throw new Error(error.message);
      
      console.log('[useDeletePartUsage] Deleted record:', recordId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts_usage'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeletePartUsage] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}
