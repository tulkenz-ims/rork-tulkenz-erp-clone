import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';

type Equipment = Tables['equipment'];

export type EquipmentStatus = 'operational' | 'down' | 'needs_maintenance' | 'retired';
export type EquipmentCriticality = 'critical' | 'high' | 'medium' | 'low';

export interface EquipmentLocation {
  id: string;
  name: string;
  location_code: string;
  location_type: string;
  building?: string | null;
  floor_number?: string | null;
  room_number?: string | null;
}

export interface EquipmentFacility {
  id: string;
  name: string;
  facility_code: string;
}

export interface ExtendedEquipment extends Equipment {
  facility_name?: string;
  open_work_orders?: number;
  total_downtime_hours?: number;
  location_id?: string | null;
  location_data?: EquipmentLocation | null;
  facility_data?: EquipmentFacility | null;
}

export function useEquipmentQuery(options?: QueryOptions<Equipment> & { 
  enabled?: boolean;
  status?: EquipmentStatus | EquipmentStatus[];
  criticality?: EquipmentCriticality | EquipmentCriticality[];
  facilityId?: string;
  category?: string;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'equipment', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.status,
      options?.criticality,
      options?.facilityId,
      options?.category,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const defaultSelect = '*';
      
      let query = supabase
        .from('equipment')
        .select(select || defaultSelect)
        .eq('organization_id', organizationId);
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.criticality) {
        if (Array.isArray(options.criticality)) {
          query = query.in('criticality', options.criticality);
        } else {
          query = query.eq('criticality', options.criticality);
        }
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.category) {
        query = query.eq('category', options.category);
      }
      
      if (filters) {
        for (const filter of filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'gt': query = query.gt(col, filter.value); break;
            case 'gte': query = query.gte(col, filter.value); break;
            case 'lt': query = query.lt(col, filter.value); break;
            case 'lte': query = query.lte(col, filter.value); break;
            case 'like': query = query.like(col, filter.value as string); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
            case 'is': query = query.is(col, filter.value); break;
          }
        }
      }
      
      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('name', { ascending: true });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useEquipmentQuery] Error:', JSON.stringify(error, null, 2));
        console.error('[useEquipmentQuery] Error code:', error.code);
        console.error('[useEquipmentQuery] Error message:', error.message);
        console.error('[useEquipmentQuery] Error details:', error.details);
        console.error('[useEquipmentQuery] Error hint:', error.hint);
        throw new Error(`Equipment query failed: ${error.message || 'Unknown error'} (code: ${error.code || 'none'})`);
      }
      
      console.log('[useEquipmentQuery] Fetched:', data?.length || 0, 'equipment');
      
      // Fetch facility names separately if needed
      const equipmentData = (data || []) as ExtendedEquipment[];
      if (equipmentData.length > 0) {
        const facilityIds = [...new Set(equipmentData.map(e => e.facility_id).filter(Boolean))];
        const locationIds = [...new Set(equipmentData.map(e => e.location_id).filter(Boolean))];
        
        const [facilitiesRes, locationsRes] = await Promise.all([
          facilityIds.length > 0 
            ? supabase.from('facilities').select('id, name, facility_code').in('id', facilityIds)
            : Promise.resolve({ data: [] }),
          locationIds.length > 0
            ? supabase.from('locations').select('id, name, location_code, location_type, building, floor_number, room_number').in('id', locationIds)
            : Promise.resolve({ data: [] }),
        ]);
        
        const facilitiesMap = new Map((facilitiesRes.data || []).map(f => [f.id, f]));
        const locationsMap = new Map((locationsRes.data || []).map(l => [l.id, l]));
        
        return equipmentData.map(eq => ({
          ...eq,
          facility_data: eq.facility_id ? facilitiesMap.get(eq.facility_id) || null : null,
          location_data: eq.location_id ? locationsMap.get(eq.location_id) || null : null,
        }));
      }
      
      return equipmentData;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('[useEquipmentById] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useEquipmentById] Fetched equipment:', id);
      
      // Fetch related data separately
      let facilityData = null;
      let locationData = null;
      
      if (data?.facility_id) {
        const { data: fac } = await supabase
          .from('facilities')
          .select('id, name, facility_code')
          .eq('id', data.facility_id)
          .single();
        facilityData = fac;
      }
      
      if (data?.location_id) {
        const { data: loc } = await supabase
          .from('locations')
          .select('id, name, location_code, location_type, building, floor_number, room_number')
          .eq('id', data.location_id)
          .single();
        locationData = loc;
      }
      
      return {
        ...data,
        facility_data: facilityData,
        location_data: locationData,
      } as ExtendedEquipment | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentByFacility(facilityId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'byFacility', facilityId, organizationId],
    queryFn: async () => {
      if (!organizationId || !facilityId) return [];
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('facility_id', facilityId)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      
      const equipmentData = data || [];
      if (equipmentData.length > 0) {
        const locationIds = [...new Set(equipmentData.map(e => e.location_id).filter(Boolean))];
        
        const [facilityRes, locationsRes] = await Promise.all([
          supabase.from('facilities').select('id, name, facility_code').eq('id', facilityId).single(),
          locationIds.length > 0
            ? supabase.from('locations').select('id, name, location_code, location_type, building, floor_number, room_number').in('id', locationIds)
            : Promise.resolve({ data: [] }),
        ]);
        
        const facilityData = facilityRes.data;
        const locationsMap = new Map((locationsRes.data || []).map(l => [l.id, l]));
        
        console.log('[useEquipmentByFacility] Fetched:', equipmentData.length, 'equipment');
        return equipmentData.map(eq => ({
          ...eq,
          facility_data: facilityData || null,
          location_data: eq.location_id ? locationsMap.get(eq.location_id) || null : null,
        })) as ExtendedEquipment[];
      }
      
      console.log('[useEquipmentByFacility] Fetched:', 0, 'equipment');
      return [] as ExtendedEquipment[];
    },
    enabled: !!organizationId && !!facilityId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentByLocation(locationId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'byLocation', locationId, organizationId],
    queryFn: async () => {
      if (!organizationId || !locationId) return [];
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('location_id', locationId)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      
      const equipmentData = data || [];
      if (equipmentData.length > 0) {
        const facilityIds = [...new Set(equipmentData.map(e => e.facility_id).filter(Boolean))];
        
        const [facilitiesRes, locationRes] = await Promise.all([
          facilityIds.length > 0
            ? supabase.from('facilities').select('id, name, facility_code').in('id', facilityIds)
            : Promise.resolve({ data: [] }),
          supabase.from('locations').select('id, name, location_code, location_type, building, floor_number, room_number').eq('id', locationId).single(),
        ]);
        
        const facilitiesMap = new Map((facilitiesRes.data || []).map(f => [f.id, f]));
        const locationData = locationRes.data;
        
        console.log('[useEquipmentByLocation] Fetched:', equipmentData.length, 'equipment');
        return equipmentData.map(eq => ({
          ...eq,
          facility_data: eq.facility_id ? facilitiesMap.get(eq.facility_id) || null : null,
          location_data: locationData || null,
        })) as ExtendedEquipment[];
      }
      
      console.log('[useEquipmentByLocation] Fetched:', 0, 'equipment');
      return [] as ExtendedEquipment[];
    },
    enabled: !!organizationId && !!locationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentByStatus(status: EquipmentStatus | EquipmentStatus[]) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'byStatus', status, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useEquipmentByStatus] Fetched:', data?.length || 0, 'equipment');
      return (data || []) as ExtendedEquipment[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'count', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const { count, error } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDownEquipmentCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'downCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const { count, error } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'down');
      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentNeedingMaintenance() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'needsMaintenance', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`status.eq.needs_maintenance,next_pm_date.lte.${today}`)
        .order('next_pm_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useEquipmentNeedingMaintenance] Fetched:', data?.length || 0, 'equipment');
      return (data || []) as ExtendedEquipment[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEquipmentCategories() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('equipment')
        .select('category')
        .eq('organization_id', organizationId);
      if (error) throw new Error(error.message);
      const categories = [...new Set((data || []).map(e => e.category).filter(Boolean))];
      console.log('[useEquipmentCategories] Found:', categories.length, 'categories');
      return categories;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateEquipment(options?: {
  onSuccess?: (data: ExtendedEquipment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (equipment: Omit<ExtendedEquipment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const equipmentTag = equipment.equipment_tag || generateEquipmentTag();
      
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          organization_id: organizationId,
          facility_id: equipment.facility_id,
          location_id: equipment.location_id || null,
          name: equipment.name,
          equipment_tag: equipmentTag,
          category: equipment.category,
          status: equipment.status || 'operational',
          location: equipment.location,
          manufacturer: equipment.manufacturer || null,
          model: equipment.model || null,
          serial_number: equipment.serial_number || null,
          install_date: equipment.install_date || null,
          warranty_expiry: equipment.warranty_expiry || null,
          criticality: equipment.criticality || 'medium',
          last_pm_date: equipment.last_pm_date || null,
          next_pm_date: equipment.next_pm_date || null,
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('[useCreateEquipment] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateEquipment] Created equipment:', data?.id);
      return data as ExtendedEquipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateEquipment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateEquipment(options?: {
  onSuccess?: (data: ExtendedEquipment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtendedEquipment> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('equipment')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateEquipment] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateEquipment] Updated equipment:', id);
      return data as ExtendedEquipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateEquipment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateEquipmentStatus(options?: {
  onSuccess?: (data: ExtendedEquipment) => void;
  onError?: (error: Error) => void;
}) {
  const updateEquipment = useUpdateEquipment(options);
  
  return useMutation({
    mutationFn: async ({ equipmentId, status }: { equipmentId: string; status: EquipmentStatus }) => {
      return updateEquipment.mutateAsync({
        id: equipmentId,
        updates: { status },
      });
    },
  });
}

export function useMarkEquipmentDown(options?: {
  onSuccess?: (data: ExtendedEquipment) => void;
  onError?: (error: Error) => void;
}) {
  const updateEquipment = useUpdateEquipment(options);
  
  return useMutation({
    mutationFn: async (equipmentId: string) => {
      return updateEquipment.mutateAsync({
        id: equipmentId,
        updates: { status: 'down' },
      });
    },
  });
}

export function useMarkEquipmentOperational(options?: {
  onSuccess?: (data: ExtendedEquipment) => void;
  onError?: (error: Error) => void;
}) {
  const updateEquipment = useUpdateEquipment(options);
  
  return useMutation({
    mutationFn: async (equipmentId: string) => {
      return updateEquipment.mutateAsync({
        id: equipmentId,
        updates: { status: 'operational' },
      });
    },
  });
}

export function useUpdateEquipmentPMDates(options?: {
  onSuccess?: (data: ExtendedEquipment) => void;
  onError?: (error: Error) => void;
}) {
  const updateEquipment = useUpdateEquipment(options);
  
  return useMutation({
    mutationFn: async ({ 
      equipmentId, 
      lastPmDate, 
      nextPmDate 
    }: { 
      equipmentId: string; 
      lastPmDate?: string;
      nextPmDate?: string;
    }) => {
      const updates: Partial<ExtendedEquipment> = {};
      if (lastPmDate !== undefined) updates.last_pm_date = lastPmDate;
      if (nextPmDate !== undefined) updates.next_pm_date = nextPmDate;
      
      return updateEquipment.mutateAsync({
        id: equipmentId,
        updates,
      });
    },
  });
}

export function useDeleteEquipment(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('equipment', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteEquipment] Deleted equipment:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteEquipment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useEquipmentMetrics() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          total: 0,
          operational: 0,
          down: 0,
          needsMaintenance: 0,
          retired: 0,
          critical: 0,
          pmOverdue: 0,
          warrantyExpiring: 0,
        };
      }
      
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      const [allResult, pmOverdueResult, warrantyResult] = await Promise.all([
        supabase
          .from('equipment')
          .select('status, criticality')
          .eq('organization_id', organizationId),
        supabase
          .from('equipment')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .neq('status', 'retired')
          .lt('next_pm_date', today),
        supabase
          .from('equipment')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .neq('status', 'retired')
          .lte('warranty_expiry', thirtyDaysStr)
          .gte('warranty_expiry', today),
      ]);
      
      const equipment = allResult.data || [];
      const pmOverdueCount = pmOverdueResult.count || 0;
      const warrantyExpiringCount = warrantyResult.count || 0;
      
      const statusCounts = equipment.reduce((acc, eq) => {
        acc[eq.status] = (acc[eq.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const criticalCount = equipment.filter(eq => eq.criticality === 'critical').length;
      
      return {
        total: equipment.length,
        operational: statusCounts['operational'] || 0,
        down: statusCounts['down'] || 0,
        needsMaintenance: statusCounts['needs_maintenance'] || 0,
        retired: statusCounts['retired'] || 0,
        critical: criticalCount,
        pmOverdue: pmOverdueCount,
        warrantyExpiring: warrantyExpiringCount,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEquipmentSearch(searchTerm: string) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  
  return useQuery({
    queryKey: ['equipment', 'search', searchTerm, organizationId],
    queryFn: async () => {
      if (!organizationId || !searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,equipment_tag.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(50);
      
      if (error) throw new Error(error.message);
      console.log('[useEquipmentSearch] Found:', data?.length || 0, 'equipment');
      return (data || []) as ExtendedEquipment[];
    },
    enabled: !!organizationId && !!searchTerm && searchTerm.length >= 2,
    staleTime: 1000 * 60 * 1,
  });
}

function generateEquipmentTag(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EQ-${timestamp}${random}`;
}
