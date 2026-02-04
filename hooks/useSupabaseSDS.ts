import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables, QueryOptions, fetchAll, fetchById, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';

type SDSRecord = Tables['sds_records'];
type SDSTrainingRecord = Tables['sds_training_records'];

export type SDSStatus = 'active' | 'expired' | 'superseded' | 'archived';
export type PhysicalState = 'solid' | 'liquid' | 'gas' | 'aerosol' | 'paste' | 'powder';
export type SignalWord = 'danger' | 'warning' | 'none';

export interface SDSWithTraining extends SDSRecord {
  training_count?: number;
}

export function useSDSRecordsQuery(options?: QueryOptions<SDSRecord> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['sds_records', organizationId, filters, orderBy, limit, offset, select],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('sds_records', organizationId, { 
        filters, 
        orderBy: orderBy || { column: 'product_name', ascending: true }, 
        limit, 
        offset, 
        select 
      });
      if (result.error) throw result.error;
      console.log('[useSDSRecordsQuery] Fetched SDS records:', result.data?.length || 0);
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSDSRecordById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('sds_records', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useSDSRecordById] Fetched SDS record:', result.data?.id);
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSDSByManufacturer(manufacturer: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'byManufacturer', manufacturer, organizationId],
    queryFn: async () => {
      if (!organizationId || !manufacturer) return [];
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('manufacturer', manufacturer)
        .order('product_name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useSDSByManufacturer] Fetched:', data?.length || 0, 'for manufacturer:', manufacturer);
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId && !!manufacturer,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSDSByStatus(status: SDSStatus | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'byStatus', status, organizationId],
    queryFn: async () => {
      if (!organizationId || !status) return [];
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', status)
        .order('product_name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useSDSByStatus] Fetched:', data?.length || 0, 'for status:', status);
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId && !!status,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExpiringSDS(daysAhead: number = 30) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'expiring', daysAhead, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('expiration_date', 'is', null)
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useExpiringSDS] Fetched:', data?.length || 0, 'expiring within', daysAhead, 'days');
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExpiredSDS() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'expired', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('expiration_date', 'is', null)
        .lt('expiration_date', today)
        .order('expiration_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useExpiredSDS] Fetched:', data?.length || 0, 'expired records');
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSDSNeedingReview() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'needingReview', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('review_date', 'is', null)
        .lte('review_date', today)
        .order('review_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useSDSNeedingReview] Fetched:', data?.length || 0);
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSDSByHazardClass(hazardClass: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'byHazardClass', hazardClass, organizationId],
    queryFn: async () => {
      if (!organizationId || !hazardClass) return [];
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .contains('hazard_class', [hazardClass])
        .order('product_name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useSDSByHazardClass] Fetched:', data?.length || 0, 'for hazard class:', hazardClass);
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId && !!hazardClass,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSDSByLocation(location: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'byLocation', location, organizationId],
    queryFn: async () => {
      if (!organizationId || !location) return [];
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .contains('location_used', [location])
        .order('product_name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useSDSByLocation] Fetched:', data?.length || 0, 'for location:', location);
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId && !!location,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSDSRecord(options?: {
  onSuccess?: (data: SDSRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sds: Omit<SDSRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('sds_records', {
        ...sds,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      console.log('[useCreateSDSRecord] Created SDS record:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sds_records'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateSDSRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateSDSRecord(options?: {
  onSuccess?: (data: SDSRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SDSRecord> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('sds_records', id, updates, organizationId);
      if (result.error) throw result.error;
      console.log('[useUpdateSDSRecord] Updated SDS record:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sds_records'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateSDSRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteSDSRecord(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('sds_records', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteSDSRecord] Deleted SDS record:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sds_records'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteSDSRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// SDS Training Records
export function useSDSTrainingRecords(sdsId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_training_records', sdsId, organizationId],
    queryFn: async () => {
      if (!organizationId || !sdsId) return [];
      const { data, error } = await supabase
        .from('sds_training_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sds_id', sdsId)
        .order('training_date', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useSDSTrainingRecords] Fetched:', data?.length || 0, 'for SDS:', sdsId);
      return (data || []) as SDSTrainingRecord[];
    },
    enabled: !!organizationId && !!sdsId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployeeSDSTraining(employeeId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_training_records', 'byEmployee', employeeId, organizationId],
    queryFn: async () => {
      if (!organizationId || !employeeId) return [];
      const { data, error } = await supabase
        .from('sds_training_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('training_date', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useEmployeeSDSTraining] Fetched:', data?.length || 0, 'for employee:', employeeId);
      return (data || []) as SDSTrainingRecord[];
    },
    enabled: !!organizationId && !!employeeId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSDSTrainingRecord(options?: {
  onSuccess?: (data: SDSTrainingRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (training: Omit<SDSTrainingRecord, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('sds_training_records')
        .insert({
          ...training,
          organization_id: organizationId,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      console.log('[useCreateSDSTrainingRecord] Created training record:', data?.id);
      return data as SDSTrainingRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sds_training_records'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateSDSTrainingRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Search SDS records
export function useSearchSDS(searchTerm: string, options?: { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'search', searchTerm, organizationId],
    queryFn: async () => {
      if (!organizationId || !searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`product_name.ilike.%${searchTerm}%,sds_number.ilike.%${searchTerm}%,manufacturer.ilike.%${searchTerm}%,cas_number.ilike.%${searchTerm}%`)
        .order('product_name', { ascending: true })
        .limit(50);
      
      if (error) throw new Error(error.message);
      console.log('[useSearchSDS] Found:', data?.length || 0, 'for term:', searchTerm);
      return (data || []) as SDSRecord[];
    },
    enabled: !!organizationId && !!searchTerm && searchTerm.length >= 2 && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

// Get unique manufacturers for filtering
export function useSDSManufacturers() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'manufacturers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('sds_records')
        .select('manufacturer')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('manufacturer', { ascending: true });
      
      if (error) throw new Error(error.message);
      
      const uniqueManufacturers = [...new Set((data || []).map(d => d.manufacturer).filter(Boolean))];
      console.log('[useSDSManufacturers] Found:', uniqueManufacturers.length, 'unique manufacturers');
      return uniqueManufacturers;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

// Get unique hazard classes for filtering
export function useSDSHazardClasses() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'hazardClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('sds_records')
        .select('hazard_class')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw new Error(error.message);
      
      const allClasses = (data || []).flatMap(d => d.hazard_class || []);
      const uniqueClasses = [...new Set(allClasses)].sort();
      console.log('[useSDSHazardClasses] Found:', uniqueClasses.length, 'unique hazard classes');
      return uniqueClasses;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

// SDS Statistics
export function useSDSStatistics() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['sds_records', 'statistics', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      const [totalResult, activeResult, expiredResult, expiringResult] = await Promise.all([
        supabase.from('sds_records').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('sds_records').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('sds_records').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active').not('expiration_date', 'is', null).lt('expiration_date', today),
        supabase.from('sds_records').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active').not('expiration_date', 'is', null).gte('expiration_date', today).lte('expiration_date', thirtyDaysStr),
      ]);
      
      const stats = {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        expired: expiredResult.count || 0,
        expiringSoon: expiringResult.count || 0,
      };
      
      console.log('[useSDSStatistics] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}
