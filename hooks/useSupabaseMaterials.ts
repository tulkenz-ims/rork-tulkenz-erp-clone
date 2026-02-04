import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables, QueryOptions, fetchAll, fetchById, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';

type Material = Tables['materials'];
type InventoryHistory = Tables['inventory_history'];
type InventoryLabel = Tables['inventory_labels'];
type CountSession = Tables['count_sessions'];

export interface MaterialWithLabels extends Material {
  labels?: string[];
  department_fields?: Record<string, unknown>;
  last_counted?: string | null;
  last_adjusted?: string | null;
}

export interface CountSessionItem {
  material_id: string;
  material_name: string;
  material_sku: string;
  expected_quantity: number;
  counted_quantity?: number;
  variance?: number;
  counted: boolean;
  counted_at?: string;
  counted_by?: string;
  notes?: string;
}

export function useMaterialsQuery(options?: QueryOptions<Material> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['materials', organizationId, filters, orderBy, limit, offset, select],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('materials', organizationId, { filters, orderBy, limit, offset, select });
      if (result.error) throw result.error;
      console.log('[useMaterialsQuery] Fetched materials:', result.data?.length || 0);
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('materials', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialsBySku(sku: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'bySku', sku, organizationId],
    queryFn: async () => {
      if (!organizationId || !sku) return null;
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sku', sku)
        .single();
      if (error) throw new Error(error.message);
      return data as Material;
    },
    enabled: !!organizationId && !!sku,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialsByDepartment(departmentCode: number | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'byDepartment', departmentCode, organizationId],
    queryFn: async () => {
      if (!organizationId || departmentCode === undefined || departmentCode === null) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('inventory_department', departmentCode)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useMaterialsByDepartment] Fetched:', data?.length || 0, 'for dept:', departmentCode);
      return (data || []) as Material[];
    },
    enabled: !!organizationId && departmentCode !== undefined && departmentCode !== null,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialsByFacility(facilityId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'byFacility', facilityId, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useMaterialsByFacility] Fetched:', data?.length || 0, 'for facility:', facilityId || 'all');
      return (data || []) as Material[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterialsByLocation(locationId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'byLocation', locationId, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (locationId) {
        query = query.eq('location_id', locationId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useMaterialsByLocation] Fetched:', data?.length || 0, 'for location:', locationId || 'all');
      return (data || []) as Material[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export interface MaterialWithLocation extends Material {
  location_name?: string;
  facility_name?: string;
}

export function useMaterialsWithLocations(options?: {
  facilityId?: string;
  locationId?: string;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'withLocations', organizationId, options?.facilityId, options?.locationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('materials')
        .select(`
          *,
          location:locations(id, name, location_code),
          facility:facilities(id, name, facility_code)
        `)
        .eq('organization_id', organizationId);
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.locationId) {
        query = query.eq('location_id', options.locationId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      
      const materialsWithLocations = (data || []).map((m: Record<string, unknown>) => ({
        ...m,
        location_name: (m.location as { name?: string } | null)?.name || null,
        facility_name: (m.facility as { name?: string } | null)?.name || null,
      })) as MaterialWithLocation[];
      
      console.log('[useMaterialsWithLocations] Fetched:', materialsWithLocations.length);
      return materialsWithLocations;
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLowStockMaterials() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['materials', 'lowStock', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      console.log('[useLowStockMaterials] Fetching low stock materials from Supabase');
      
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('[useLowStockMaterials] Error fetching materials:', error);
        throw new Error(error.message);
      }
      
      const lowStockItems = (data || []).filter((m: Material) => 
        m.min_level > 0 && m.on_hand <= m.min_level
      ) as Material[];
      
      console.log('[useLowStockMaterials] Found', lowStockItems.length, 'low stock items out of', data?.length || 0, 'total active materials');
      return lowStockItems;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateMaterial(options?: {
  onSuccess?: (data: Material) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (material: Omit<Material, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('materials', {
        ...material,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      
      await logInventoryHistory({
        organizationId,
        materialId: result.data!.id,
        materialName: result.data!.name,
        materialSku: result.data!.sku,
        action: 'create',
        quantityBefore: 0,
        quantityAfter: result.data!.on_hand,
        quantityChange: result.data!.on_hand,
        reason: 'Material created',
        performedBy: 'System',
      });
      
      console.log('[useCreateMaterial] Created material:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_history'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateMaterial] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateMaterial(options?: {
  onSuccess?: (data: Material) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Material> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('materials', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdateMaterial] Updated material:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateMaterial] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteMaterial(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, materialName, materialSku }: { id: string; materialName: string; materialSku: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const materialResult = await fetchById('materials', id, organizationId);
      const currentQty = materialResult.data?.on_hand || 0;
      
      const result = await deleteRecord('materials', id, organizationId);
      if (result.error) throw result.error;
      
      await logInventoryHistory({
        organizationId,
        materialId: id,
        materialName,
        materialSku,
        action: 'delete',
        quantityBefore: currentQty,
        quantityAfter: 0,
        quantityChange: -currentQty,
        reason: 'Material deleted',
        performedBy: 'System',
      });
      
      console.log('[useDeleteMaterial] Deleted material:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_history'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteMaterial] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useAdjustInventory(options?: {
  onSuccess?: (data: Material) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      materialId,
      newQuantity,
      reason,
      performedBy,
      notes,
      action = 'adjustment',
    }: {
      materialId: string;
      newQuantity: number;
      reason: string;
      performedBy: string;
      notes?: string;
      action?: 'adjustment' | 'count' | 'receive' | 'issue' | 'transfer';
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const materialResult = await fetchById('materials', materialId, organizationId);
      if (materialResult.error || !materialResult.data) {
        throw new Error('Material not found');
      }
      
      const material = materialResult.data;
      const quantityBefore = material.on_hand;
      const quantityChange = newQuantity - quantityBefore;
      
      const updateResult = await updateRecord('materials', materialId, {
        on_hand: newQuantity,
        ...(action === 'count' ? { last_counted: new Date().toISOString().split('T')[0] } : {}),
        ...(action === 'adjustment' ? { last_adjusted: new Date().toISOString().split('T')[0] } : {}),
      } as Partial<Material>, organizationId);
      
      if (updateResult.error) throw updateResult.error;
      
      await logInventoryHistory({
        organizationId,
        materialId,
        materialName: material.name,
        materialSku: material.sku,
        action,
        quantityBefore,
        quantityAfter: newQuantity,
        quantityChange,
        reason,
        performedBy,
        notes,
      });
      
      console.log('[useAdjustInventory] Adjusted:', materialId, 'from', quantityBefore, 'to', newQuantity);
      return updateResult.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials', 'byId', data.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory_history'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useAdjustInventory] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useReceiveInventory(options?: {
  onSuccess?: (data: Material) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const adjustInventory = useAdjustInventory(options);
  
  return useMutation({
    mutationFn: async ({
      materialId,
      quantityReceived,
      reason,
      performedBy,
      notes,
    }: {
      materialId: string;
      quantityReceived: number;
      reason: string;
      performedBy: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const materialResult = await fetchById('materials', materialId, organizationId);
      if (materialResult.error || !materialResult.data) {
        throw new Error('Material not found');
      }
      
      const newQuantity = materialResult.data.on_hand + quantityReceived;
      
      return adjustInventory.mutateAsync({
        materialId,
        newQuantity,
        reason,
        performedBy,
        notes,
        action: 'receive',
      });
    },
  });
}

export function useIssueInventory(options?: {
  onSuccess?: (data: Material) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const adjustInventory = useAdjustInventory(options);
  
  return useMutation({
    mutationFn: async ({
      materialId,
      quantityIssued,
      reason,
      performedBy,
      notes,
    }: {
      materialId: string;
      quantityIssued: number;
      reason: string;
      performedBy: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const materialResult = await fetchById('materials', materialId, organizationId);
      if (materialResult.error || !materialResult.data) {
        throw new Error('Material not found');
      }
      
      const newQuantity = Math.max(0, materialResult.data.on_hand - quantityIssued);
      
      return adjustInventory.mutateAsync({
        materialId,
        newQuantity,
        reason,
        performedBy,
        notes,
        action: 'issue',
      });
    },
  });
}

async function logInventoryHistory({
  organizationId,
  materialId,
  materialName,
  materialSku,
  action,
  quantityBefore,
  quantityAfter,
  quantityChange,
  reason,
  performedBy,
  notes,
}: {
  organizationId: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  action: InventoryHistory['action'];
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  performedBy: string;
  notes?: string;
}) {
  try {
    const { error } = await supabase.from('inventory_history').insert({
      organization_id: organizationId,
      material_id: materialId,
      material_name: materialName,
      material_sku: materialSku,
      action,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_change: quantityChange,
      reason,
      performed_by: performedBy,
      notes: notes || null,
    });
    
    if (error) {
      console.error('[logInventoryHistory] Error:', error);
    } else {
      console.log('[logInventoryHistory] Logged:', action, 'for material:', materialId);
    }
  } catch (err) {
    console.error('[logInventoryHistory] Exception:', err);
  }
}

export function useInventoryHistoryQuery(options?: {
  materialId?: string;
  action?: InventoryHistory['action'];
  limit?: number;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_history', organizationId, options?.materialId, options?.action, options?.limit],
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
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useInventoryHistoryQuery] Fetched:', data?.length || 0, 'records');
      return (data || []) as InventoryHistory[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useInventoryLabelsQuery(options?: { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inventory_labels', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('inventory_labels', organizationId, {
        orderBy: { column: 'name', ascending: true },
      });
      if (result.error) throw result.error;
      console.log('[useInventoryLabelsQuery] Fetched:', result.data?.length || 0, 'labels');
      return result.data || [];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateInventoryLabel(options?: {
  onSuccess?: (data: InventoryLabel) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (label: { name: string; color: string; description?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('inventory_labels', {
        ...label,
        description: label.description || null,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      console.log('[useCreateInventoryLabel] Created:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_labels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateInventoryLabel] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateInventoryLabel(options?: {
  onSuccess?: (data: InventoryLabel) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryLabel> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('inventory_labels', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdateInventoryLabel] Updated:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_labels'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateInventoryLabel] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteInventoryLabel(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('inventory_labels', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteInventoryLabel] Deleted:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_labels'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteInventoryLabel] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCountSessionsQuery(options?: {
  status?: CountSession['status'];
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['count_sessions', organizationId, options?.status],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('count_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useCountSessionsQuery] Fetched:', data?.length || 0, 'sessions');
      return (data || []) as CountSession[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCountSessionById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['count_sessions', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('count_sessions', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
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
      facility_name?: string;
      facility_id?: string;
      category?: string;
      created_by: string;
      items: CountSessionItem[];
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase.from('count_sessions').insert({
        organization_id: organizationId,
        name: session.name,
        status: 'draft' as const,
        facility_id: session.facility_id || null,
        facility_name: session.facility_name || null,
        category: session.category || null,
        created_by: session.created_by,
        items: session.items,
        total_items: session.items.length,
        counted_items: 0,
        variance_count: 0,
        notes: session.notes || null,
      }).select().single();
      
      if (error) throw new Error(error.message);
      console.log('[useCreateCountSession] Created:', data?.id);
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
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CountSession> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('count_sessions', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdateCountSession] Updated:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['count_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['count_sessions', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateCountSession] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useStartCountSession(options?: {
  onSuccess?: (data: CountSession) => void;
  onError?: (error: Error) => void;
}) {
  const updateSession = useUpdateCountSession(options);
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return updateSession.mutateAsync({
        id: sessionId,
        updates: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        },
      });
    },
  });
}

export function useRecordCount(options?: {
  onSuccess?: (data: CountSession) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const adjustInventory = useAdjustInventory();
  
  return useMutation({
    mutationFn: async ({
      sessionId,
      materialId,
      countedQuantity,
      countedBy,
      notes,
      applyToInventory = false,
    }: {
      sessionId: string;
      materialId: string;
      countedQuantity: number;
      countedBy: string;
      notes?: string;
      applyToInventory?: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const sessionResult = await fetchById('count_sessions', sessionId, organizationId);
      if (sessionResult.error || !sessionResult.data) {
        throw new Error('Count session not found');
      }
      
      const session = sessionResult.data;
      const items = (session.items || []) as unknown as CountSessionItem[];
      const itemIndex = items.findIndex(i => i.material_id === materialId);
      
      if (itemIndex === -1) {
        throw new Error('Material not found in count session');
      }
      
      const item = items[itemIndex];
      const variance = countedQuantity - item.expected_quantity;
      
      items[itemIndex] = {
        ...item,
        counted_quantity: countedQuantity,
        variance,
        counted: true,
        counted_at: new Date().toISOString(),
        counted_by: countedBy,
        notes: notes || item.notes,
      };
      
      const countedItems = items.filter(i => i.counted).length;
      const varianceCount = items.filter(i => i.counted && i.variance !== 0).length;
      
      const { data, error } = await supabase
        .from('count_sessions')
        .update({
          items,
          counted_items: countedItems,
          variance_count: varianceCount,
          ...(countedItems === items.length ? { 
            status: 'completed' as const, 
            completed_at: new Date().toISOString() 
          } : {}),
        })
        .eq('id', sessionId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      if (applyToInventory && variance !== 0) {
        await adjustInventory.mutateAsync({
          materialId,
          newQuantity: countedQuantity,
          reason: `Count session: ${session.name}`,
          performedBy: countedBy,
          notes: `Variance: ${variance > 0 ? '+' : ''}${variance}`,
          action: 'count',
        });
      }
      
      console.log('[useRecordCount] Recorded count for:', materialId, 'variance:', variance);
      return data as CountSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['count_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['count_sessions', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useRecordCount] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApplyCountToInventory(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const adjustInventory = useAdjustInventory();
  
  return useMutation({
    mutationFn: async ({
      sessionId,
      appliedBy,
    }: {
      sessionId: string;
      appliedBy: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const sessionResult = await fetchById('count_sessions', sessionId, organizationId);
      if (sessionResult.error || !sessionResult.data) {
        throw new Error('Count session not found');
      }
      
      const session = sessionResult.data;
      const items = (session.items || []) as unknown as CountSessionItem[];
      
      for (const item of items) {
        if (item.counted && item.variance !== 0 && item.counted_quantity !== undefined) {
          await adjustInventory.mutateAsync({
            materialId: item.material_id,
            newQuantity: item.counted_quantity,
            reason: `Count session: ${session.name}`,
            performedBy: appliedBy,
            notes: `Variance: ${item.variance! > 0 ? '+' : ''}${item.variance}`,
            action: 'count',
          });
        }
      }
      
      console.log('[useApplyCountToInventory] Applied count session:', sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_history'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useApplyCountToInventory] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCancelCountSession(options?: {
  onSuccess?: (data: CountSession) => void;
  onError?: (error: Error) => void;
}) {
  const updateSession = useUpdateCountSession(options);
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return updateSession.mutateAsync({
        id: sessionId,
        updates: {
          status: 'cancelled',
        },
      });
    },
  });
}

export function useAssetsQuery(options?: QueryOptions<Tables['assets']> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['assets', organizationId, filters, orderBy, limit, offset, select],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('assets', organizationId, { filters, orderBy, limit, offset, select });
      if (result.error) throw result.error;
      console.log('[useAssetsQuery] Fetched:', result.data?.length || 0, 'assets');
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAssetById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['assets', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('assets', id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAsset(options?: {
  onSuccess?: (data: Tables['assets']) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (asset: Omit<Tables['assets'], 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('assets', {
        ...asset,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      console.log('[useCreateAsset] Created:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateAsset] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateAsset(options?: {
  onSuccess?: (data: Tables['assets']) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tables['assets']> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('assets', id, updates, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useUpdateAsset] Updated:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateAsset] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteAsset(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('assets', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteAsset] Deleted:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteAsset] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}
