import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Tables,
  TableName,
  QueryOptions,
  fetchAll,
  fetchById,
  insertRecord,
  insertMany,
  updateRecord,
  deleteRecord,
  countRecords,
} from '@/lib/supabase';

export function useSupabaseQuery<T extends TableName>(
  table: T,
  options?: QueryOptions<Tables[T]> & {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  const { organizationId } = useOrganization();
  
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  
  return useQuery({
    queryKey: [table, organizationId, filters, orderBy, limit, offset, select],
    queryFn: async () => {
      if (!organizationId) {
        console.log(`[useSupabaseQuery] No organizationId for ${table}`);
        return [];
      }
      const result = await fetchAll(table, organizationId, { filters, orderBy, limit, offset, select });
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
    refetchInterval: options?.refetchInterval,
  });
}

export function useSupabaseQueryById<T extends TableName>(
  table: T,
  id: string | undefined | null,
  options?: { enabled?: boolean }
) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: [table, 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById(table, id, organizationId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!organizationId && !!id && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSupabaseInsert<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (data: Tables[T]) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[][];
  }
) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: Omit<Tables[T], 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await insertRecord(table, { 
        ...record, 
        organization_id: organizationId 
      } as Omit<Tables[T], 'id' | 'created_at' | 'updated_at'> & { organization_id: string });
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options?.invalidateQueries?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.(data);
      console.log(`[useSupabaseInsert] ${table} created:`, data.id);
    },
    onError: (error) => {
      console.error(`[useSupabaseInsert] ${table} error:`, error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSupabaseInsertMany<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (data: Tables[T][]) => void;
    onError?: (error: Error) => void;
  }
) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (records: Omit<Tables[T], 'id' | 'created_at' | 'updated_at' | 'organization_id'>[]) => {
      if (!organizationId) throw new Error('No organization selected');
      const recordsWithOrg = records.map(r => ({ 
        ...r, 
        organization_id: organizationId 
      })) as (Omit<Tables[T], 'id' | 'created_at' | 'updated_at'> & { organization_id: string })[];
      const result = await insertMany(table, recordsWithOrg);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options?.onSuccess?.(data);
      console.log(`[useSupabaseInsertMany] ${table} created:`, data.length);
    },
    onError: (error) => {
      console.error(`[useSupabaseInsertMany] ${table} error:`, error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSupabaseUpdate<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (data: Tables[T]) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[][];
  }
) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tables[T]> }) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await updateRecord(table, id, updates, organizationId);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: [table, 'byId', data.id] });
      options?.invalidateQueries?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.(data);
      console.log(`[useSupabaseUpdate] ${table} updated:`, data.id);
    },
    onError: (error) => {
      console.error(`[useSupabaseUpdate] ${table} error:`, error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSupabaseDelete<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[][];
  }
) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord(table, id, organizationId);
      if (result.error) throw result.error;
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options?.invalidateQueries?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.();
      console.log(`[useSupabaseDelete] ${table} deleted`);
    },
    onError: (error) => {
      console.error(`[useSupabaseDelete] ${table} error:`, error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSupabaseCount<T extends TableName>(
  table: T,
  filters?: QueryOptions<Tables[T]>['filters'],
  options?: { enabled?: boolean }
) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: [table, 'count', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return 0;
      const result = await countRecords(table, organizationId, filters);
      if (result.error) throw result.error;
      return result.count || 0;
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMaterials(options?: QueryOptions<Tables['materials']> & { enabled?: boolean }) {
  return useSupabaseQuery('materials', options);
}

export function useMaterial(id: string | undefined | null) {
  return useSupabaseQueryById('materials', id);
}

export function useWorkOrders(options?: QueryOptions<Tables['work_orders']> & { enabled?: boolean }) {
  return useSupabaseQuery('work_orders', options);
}

export function useWorkOrder(id: string | undefined | null) {
  return useSupabaseQueryById('work_orders', id);
}

export function useEmployees(options?: QueryOptions<Tables['employees']> & { enabled?: boolean }) {
  return useSupabaseQuery('employees', options);
}

export function useEmployee(id: string | undefined | null) {
  return useSupabaseQueryById('employees', id);
}

export function useEquipment(options?: QueryOptions<Tables['equipment']> & { enabled?: boolean }) {
  return useSupabaseQuery('equipment', options);
}

export function useEquipmentItem(id: string | undefined | null) {
  return useSupabaseQueryById('equipment', id);
}

export function useVendors(options?: QueryOptions<Tables['vendors']> & { enabled?: boolean }) {
  return useSupabaseQuery('vendors', options);
}

export function useVendor(id: string | undefined | null) {
  return useSupabaseQueryById('vendors', id);
}

export function usePurchaseOrders(options?: QueryOptions<Tables['purchase_orders']> & { enabled?: boolean }) {
  return useSupabaseQuery('purchase_orders', options);
}

export function usePurchaseOrder(id: string | undefined | null) {
  return useSupabaseQueryById('purchase_orders', id);
}

export function useApprovals(options?: QueryOptions<Tables['approvals']> & { enabled?: boolean }) {
  return useSupabaseQuery('approvals', options);
}

export function useTasks(options?: QueryOptions<Tables['tasks']> & { enabled?: boolean }) {
  return useSupabaseQuery('tasks', options);
}

export function usePMSchedules(options?: QueryOptions<Tables['pm_schedules']> & { enabled?: boolean }) {
  return useSupabaseQuery('pm_schedules', options);
}

export function useInventoryHistory(options?: QueryOptions<Tables['inventory_history']> & { enabled?: boolean }) {
  return useSupabaseQuery('inventory_history', {
    ...options,
    orderBy: options?.orderBy || { column: 'created_at', ascending: false },
  });
}
