import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

const MRO_INVENTORY_DEPARTMENT = 1;

export type StockStatus = 'in_stock' | 'low_stock' | 'critical' | 'out_of_stock' | 'overstocked';
export type PartCategory = 'Bearings' | 'Belts & Chains' | 'Belts & Pulleys' | 'Electrical' | 'Filters' | 'Fluids & Lubricants' | 'Fasteners' | 'Gaskets & Seals' | 'Hardware' | 'Hydraulic' | 'Lubricants' | 'Motors' | 'Pumps' | 'Safety Equipment' | 'Pneumatic' | 'Safety' | 'Tools' | 'Valves' | 'HVAC' | 'Sensors' | 'Conveyor Parts' | 'General MRO';

export interface EquipmentAssociation {
  equipmentId: string;
  equipmentName: string;
  equipmentTag?: string;
  usageRate?: number;
  isRecommended?: boolean;
  area?: string;
  line?: string;
  quantityPerPM?: number;
}

export interface VendorInfo {
  vendorId: string;
  vendorName: string;
  vendorPartNumber?: string;
  unitPrice: number;
  leadTimeDays: number;
  minOrderQty: number;
  isPrimary: boolean;
}

export interface MROPart {
  id: string;
  partId: number;
  partNumber: string;
  name: string;
  description?: string;
  category: PartCategory;
  subcategory?: string;
  onHand: number;
  minLevel: number;
  maxLevel: number;
  reorderPoint: number;
  reorderQty: number;
  safetyStock: number;
  warehouseId: string;
  warehouseName: string;
  binLocation: string;
  zone?: string;
  unitCost: number;
  totalValue: number;
  lastCost?: number;
  avgCost?: number;
  uom: string;
  packSize?: number;
  barcode?: string;
  manufacturerPartNumber?: string;
  manufacturer?: string;
  status: 'active' | 'inactive' | 'obsolete';
  stockStatus: StockStatus;
  equipmentAssociations: EquipmentAssociation[];
  vendors: VendorInfo[];
  preferredVendorId?: string;
  avgDailyUsage: number;
  avgMonthlyUsage: number;
  lastUsedDate?: string;
  lastReceivedDate?: string;
  turnoverRate?: number;
  daysOfStock?: number;
  criticality: 'critical' | 'essential' | 'standard';
  abcClass: 'A' | 'B' | 'C';
  lotTracked: boolean;
  serialTracked: boolean;
  expirationTracked: boolean;
  substitutePartIds?: string[];
  createdAt: string;
  updatedAt: string;
  lastCountedAt?: string;
  lastAdjustedAt?: string;
  totalWorkOrdersUsed: number;
  openWorkOrderQty: number;
  reservedQty: number;
}

export interface MROPartTransaction {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  transactionType: 'receive' | 'issue' | 'transfer' | 'adjust' | 'count' | 'return';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  totalCost: number;
  reason?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId?: string;
  equipmentName?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  notes?: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface WarehouseLocation {
  id: string;
  name: string;
  code: string;
  type: 'main' | 'satellite' | 'mobile';
  address?: string;
  bins: { id: string; code: string; zone?: string }[];
}

export interface MROSummary {
  totalParts: number;
  totalValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
  partsNeedingReorder: number;
}

function calculateStockStatus(onHand: number, minLevel: number, maxLevel: number, reorderPoint: number): StockStatus {
  if (onHand <= 0) return 'out_of_stock';
  if (onHand <= minLevel * 0.5) return 'critical';
  if (onHand <= reorderPoint) return 'low_stock';
  if (onHand > maxLevel) return 'overstocked';
  return 'in_stock';
}

function calculateMROSummary(parts: MROPart[]): MROSummary {
  return {
    totalParts: parts.length,
    totalValue: parts.reduce((sum, p) => sum + p.totalValue, 0),
    lowStockCount: parts.filter(p => p.stockStatus === 'low_stock').length,
    criticalStockCount: parts.filter(p => p.stockStatus === 'critical').length,
    outOfStockCount: parts.filter(p => p.stockStatus === 'out_of_stock').length,
    overstockCount: parts.filter(p => p.stockStatus === 'overstocked').length,
    partsNeedingReorder: parts.filter(p => p.onHand <= p.reorderPoint).length,
  };
}

interface SupabaseMROPart {
  id: string;
  organization_id: string;
  material_number: string;
  inventory_department: number;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  on_hand: number;
  min_level: number;
  max_level: number;
  unit_price: number;
  unit_of_measure: string;
  facility_id: string | null;
  location: string | null;
  barcode: string | null;
  vendor: string | null;
  vendor_part_number: string | null;
  manufacturer: string | null;
  manufacturer_part_number: string | null;
  lead_time_days: number | null;
  classification: string | null;
  status: string | null;
  department_code: string | null;
  cost_center: string | null;
  gl_account: string | null;
  labels: string[] | null;
  department_fields: Record<string, unknown> | null;
  last_counted: string | null;
  last_adjusted: string | null;
  created_at: string;
  updated_at: string;
}

function transformToMROPart(material: SupabaseMROPart, index: number): MROPart {
  const onHand = Number(material.on_hand) || 0;
  const minLevel = Number(material.min_level) || 0;
  const maxLevel = Number(material.max_level) || 100;
  const unitCost = Number(material.unit_price) || 0;
  const reorderPoint = Math.ceil(minLevel * 1.5);
  
  const stockStatus = calculateStockStatus(onHand, minLevel, maxLevel, reorderPoint);
  
  const departmentFields = material.department_fields || {};
  const equipmentAssociations: EquipmentAssociation[] = (departmentFields.equipmentAssociations as EquipmentAssociation[]) || [];
  const vendors: VendorInfo[] = (departmentFields.vendors as VendorInfo[]) || [];
  
  if (vendors.length === 0 && material.vendor) {
    vendors.push({
      vendorId: `vendor-${material.id}`,
      vendorName: material.vendor,
      vendorPartNumber: material.vendor_part_number || undefined,
      unitPrice: unitCost,
      leadTimeDays: material.lead_time_days || 7,
      minOrderQty: 1,
      isPrimary: true,
    });
  }
  
  const avgDailyUsage = (departmentFields.avgDailyUsage as number) || 0.5;
  const avgMonthlyUsage = (departmentFields.avgMonthlyUsage as number) || avgDailyUsage * 30;
  const daysOfStock = avgDailyUsage > 0 ? Math.floor(onHand / avgDailyUsage) : undefined;
  
  return {
    id: material.id,
    partId: 1000000 + index,
    partNumber: material.sku,
    name: material.name,
    description: material.description || undefined,
    category: (material.category as PartCategory) || 'General MRO',
    subcategory: departmentFields.subcategory as string | undefined,
    onHand,
    minLevel,
    maxLevel,
    reorderPoint,
    reorderQty: (departmentFields.reorderQty as number) || Math.ceil((maxLevel - minLevel) / 2),
    safetyStock: (departmentFields.safetyStock as number) || Math.ceil(minLevel * 0.5),
    warehouseId: material.facility_id || 'wh-1',
    warehouseName: (departmentFields.warehouseName as string) || 'Main MRO Warehouse',
    binLocation: material.location || 'Unassigned',
    zone: departmentFields.zone as string | undefined,
    unitCost,
    totalValue: onHand * unitCost,
    lastCost: departmentFields.lastCost as number | undefined,
    avgCost: departmentFields.avgCost as number | undefined,
    uom: material.unit_of_measure || 'EA',
    packSize: departmentFields.packSize as number | undefined,
    barcode: material.barcode || undefined,
    manufacturerPartNumber: material.manufacturer_part_number || undefined,
    manufacturer: material.manufacturer || undefined,
    status: material.status === 'active' ? 'active' : 
            material.status === 'inactive' ? 'inactive' : 
            material.status === 'discontinued' ? 'obsolete' : 'active',
    stockStatus,
    equipmentAssociations,
    vendors,
    preferredVendorId: vendors.find(v => v.isPrimary)?.vendorId,
    avgDailyUsage,
    avgMonthlyUsage,
    lastUsedDate: departmentFields.lastUsedDate as string | undefined,
    lastReceivedDate: departmentFields.lastReceivedDate as string | undefined,
    turnoverRate: departmentFields.turnoverRate as number | undefined,
    daysOfStock,
    criticality: (departmentFields.criticality as MROPart['criticality']) || 'standard',
    abcClass: (departmentFields.abcClass as MROPart['abcClass']) || 'C',
    lotTracked: (departmentFields.lotTracked as boolean) || false,
    serialTracked: (departmentFields.serialTracked as boolean) || false,
    expirationTracked: (departmentFields.expirationTracked as boolean) || false,
    substitutePartIds: departmentFields.substitutePartIds as string[] | undefined,
    createdAt: material.created_at,
    updatedAt: material.updated_at,
    lastCountedAt: material.last_counted || undefined,
    lastAdjustedAt: material.last_adjusted || undefined,
    totalWorkOrdersUsed: (departmentFields.totalWorkOrdersUsed as number) || 0,
    openWorkOrderQty: (departmentFields.openWorkOrderQty as number) || 0,
    reservedQty: (departmentFields.reservedQty as number) || 0,
  };
}

export function useMROPartsQuery(options?: { 
  enabled?: boolean;
  category?: PartCategory | 'all';
  stockStatus?: StockStatus | 'all';
  warehouseId?: string;
}) {
  const { organizationId } = useOrganization();
  const enabled = options?.enabled !== false;
  
  return useQuery({
    queryKey: ['mro_parts', organizationId, options?.category, options?.stockStatus, options?.warehouseId],
    queryFn: async (): Promise<MROPart[]> => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('inventory_department', MRO_INVENTORY_DEPARTMENT)
        .order('name', { ascending: true });
      
      if (options?.category && options.category !== 'all') {
        query = query.eq('category', options.category);
      }
      
      if (options?.warehouseId && options.warehouseId !== 'all') {
        query = query.eq('facility_id', options.warehouseId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useMROPartsQuery] Error:', error.message);
        throw new Error(error.message);
      }
      
      const parts = ((data || []) as SupabaseMROPart[]).map((m, i) => transformToMROPart(m, i));
      
      if (options?.stockStatus && options.stockStatus !== 'all') {
        return parts.filter(p => p.stockStatus === options.stockStatus);
      }
      
      console.log('[useMROPartsQuery] Fetched MRO parts:', parts.length);
      return parts;
    },
    enabled: !!organizationId && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMROPartById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['mro_parts', 'byId', id, organizationId],
    queryFn: async (): Promise<MROPart | null> => {
      if (!id || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[useMROPartById] Error:', error.message);
        throw new Error(error.message);
      }
      
      console.log('[useMROPartById] Fetched MRO part:', id);
      return transformToMROPart(data as SupabaseMROPart, 0);
    },
    enabled: !!id && !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMROPartsByEquipment(equipmentId: string | undefined | null) {
  const { data: allParts, isLoading, error } = useMROPartsQuery();
  
  const data = useMemo(() => {
    if (!equipmentId || !allParts) return [];
    return allParts.filter(p => 
      p.equipmentAssociations.some(ea => ea.equipmentId === equipmentId)
    );
  }, [equipmentId, allParts]);
  
  return { data, isLoading, error };
}

export function useMROPartsNeedingReorder() {
  const { data: allParts, isLoading, error } = useMROPartsQuery();
  
  const data = useMemo(() => {
    if (!allParts) return [];
    return allParts.filter(p => p.onHand <= p.reorderPoint);
  }, [allParts]);
  
  return { data, isLoading, error };
}

export function useMROPartsSummary() {
  const { data: parts, isLoading, error } = useMROPartsQuery();
  
  const data = useMemo(() => {
    if (!parts || parts.length === 0) {
      return {
        totalParts: 0,
        totalValue: 0,
        lowStockCount: 0,
        criticalStockCount: 0,
        outOfStockCount: 0,
        overstockCount: 0,
        partsNeedingReorder: 0,
      };
    }
    return calculateMROSummary(parts);
  }, [parts]);
  
  return { data, isLoading, error };
}

export function useWarehousesQuery() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['mro_warehouses', organizationId],
    queryFn: async (): Promise<WarehouseLocation[]> => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true);
      
      if (error) {
        console.error('[useWarehousesQuery] Error:', error.message);
        throw new Error(error.message);
      }
      
      console.log('[useWarehousesQuery] Fetched:', data?.length || 0, 'warehouses');
      return (data || []).map(f => ({
        id: f.id,
        name: f.name,
        code: f.facility_code,
        type: 'main' as const,
        address: f.address || undefined,
        bins: [],
      }));
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMROTransactionsQuery(partId?: string) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['mro_transactions', organizationId, partId],
    queryFn: async (): Promise<MROPartTransaction[]> => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('inventory_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (partId) {
        query = query.eq('material_id', partId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useMROTransactionsQuery] Error:', error.message);
        throw new Error(error.message);
      }
      
      console.log('[useMROTransactionsQuery] Fetched:', data?.length || 0, 'transactions');
      return (data || []).map(h => ({
        id: h.id,
        partId: h.material_id,
        partNumber: h.material_sku,
        partName: h.material_name,
        transactionType: h.action === 'receive' ? 'receive' : 
                        h.action === 'issue' ? 'issue' :
                        h.action === 'transfer' ? 'transfer' :
                        h.action === 'count' ? 'count' :
                        h.action === 'adjustment' ? 'adjust' : 'adjust',
        quantity: Math.abs(Number(h.quantity_change) || 0),
        quantityBefore: Number(h.quantity_before) || 0,
        quantityAfter: Number(h.quantity_after) || 0,
        unitCost: 0,
        totalCost: 0,
        reason: h.reason || undefined,
        performedBy: h.performed_by,
        performedByName: h.performed_by,
        performedAt: h.created_at,
        notes: h.notes || undefined,
      })) as MROPartTransaction[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useIssueMROPart(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      partId: string;
      quantity: number;
      workOrderId?: string;
      workOrderNumber?: string;
      equipmentId?: string;
      equipmentName?: string;
      reason?: string;
      performedBy: string;
      performedByName: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: material, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', params.partId)
        .single();
      
      if (fetchError || !material) throw new Error('Part not found');
      
      const currentOnHand = Number(material.on_hand) || 0;
      const newOnHand = currentOnHand - params.quantity;
      
      if (newOnHand < 0) throw new Error('Insufficient stock');
      
      const { error: updateError } = await supabase
        .from('materials')
        .update({ on_hand: newOnHand })
        .eq('id', params.partId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw new Error(updateError.message);
      
      await supabase.from('inventory_history').insert({
        organization_id: organizationId,
        material_id: params.partId,
        material_name: material.name,
        material_sku: material.sku,
        action: 'issue',
        quantity_before: currentOnHand,
        quantity_after: newOnHand,
        quantity_change: -params.quantity,
        reason: params.reason || `Issued to WO: ${params.workOrderNumber || 'N/A'}`,
        performed_by: params.performedByName,
        notes: params.equipmentName ? `Equipment: ${params.equipmentName}` : undefined,
      });
      
      console.log('[useIssueMROPart] Issued', params.quantity, 'of', material.sku);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mro_parts'] });
      queryClient.invalidateQueries({ queryKey: ['mro_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useIssueMROPart] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useReceiveMROPart(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      partId: string;
      quantity: number;
      lotNumber?: string;
      reason?: string;
      performedBy: string;
      performedByName: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: material, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', params.partId)
        .single();
      
      if (fetchError || !material) throw new Error('Part not found');
      
      const currentOnHand = Number(material.on_hand) || 0;
      const newOnHand = currentOnHand + params.quantity;
      
      const { error: updateError } = await supabase
        .from('materials')
        .update({ on_hand: newOnHand })
        .eq('id', params.partId)
        .eq('organization_id', organizationId);
      
      if (updateError) throw new Error(updateError.message);
      
      await supabase.from('inventory_history').insert({
        organization_id: organizationId,
        material_id: params.partId,
        material_name: material.name,
        material_sku: material.sku,
        action: 'receive',
        quantity_before: currentOnHand,
        quantity_after: newOnHand,
        quantity_change: params.quantity,
        reason: params.reason || 'Stock received',
        performed_by: params.performedByName,
        notes: params.lotNumber ? `Lot: ${params.lotNumber}` : undefined,
      });
      
      console.log('[useReceiveMROPart] Received', params.quantity, 'of', material.sku);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mro_parts'] });
      queryClient.invalidateQueries({ queryKey: ['mro_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useReceiveMROPart] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export {
  calculateMROSummary,
  calculateStockStatus,
};
