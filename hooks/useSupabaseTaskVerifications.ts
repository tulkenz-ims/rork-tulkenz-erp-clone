import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables, QueryOptions } from '@/lib/supabase';

type TaskVerification = Tables['task_verifications'];
type TaskLocation = Tables['task_locations'];
type TaskCategory = Tables['task_categories'];

export type TaskVerificationStatus = 'verified' | 'flagged' | 'pending_review';
export type TaskVerificationSourceType = 'manual' | 'work_order' | 'pm_work_order' | 'inspection' | 'permit' | 'work_request' | 'issue_report';

export interface TaskVerificationFilters {
  status?: TaskVerificationStatus | TaskVerificationStatus[];
  sourceType?: TaskVerificationSourceType | TaskVerificationSourceType[];
  departmentCode?: string;
  facilityCode?: string;
  categoryId?: string;
  locationId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface TaskVerificationStats {
  total: number;
  totalToday: number;
  totalWeek: number;
  verified: number;
  flagged: number;
  pendingReview: number;
  byDepartment: Record<string, number>;
  bySourceType: Record<string, number>;
}

export function useTaskVerificationsQuery(options?: QueryOptions<TaskVerification> & {
  enabled?: boolean;
  filters?: TaskVerificationFilters;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryFilters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;

  return useQuery({
    queryKey: [
      'task_verifications',
      organizationId,
      queryFilters,
      orderBy,
      limit,
      offset,
      select,
    ],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useTaskVerificationsQuery] Fetching task verifications for org:', organizationId);

      let query = supabase
        .from('task_verifications')
        .select(select || '*')
        .eq('organization_id', organizationId);

      if (queryFilters?.status) {
        if (Array.isArray(queryFilters.status)) {
          query = query.in('status', queryFilters.status);
        } else {
          query = query.eq('status', queryFilters.status);
        }
      }

      if (queryFilters?.sourceType) {
        if (Array.isArray(queryFilters.sourceType)) {
          query = query.in('source_type', queryFilters.sourceType);
        } else {
          query = query.eq('source_type', queryFilters.sourceType);
        }
      }

      if (queryFilters?.departmentCode) {
        query = query.eq('department_code', queryFilters.departmentCode);
      }

      if (queryFilters?.facilityCode) {
        query = query.eq('facility_code', queryFilters.facilityCode);
      }

      if (queryFilters?.categoryId) {
        query = query.eq('category_id', queryFilters.categoryId);
      }

      if (queryFilters?.locationId) {
        query = query.eq('location_id', queryFilters.locationId);
      }

      if (queryFilters?.employeeId) {
        query = query.eq('employee_id', queryFilters.employeeId);
      }

      if (queryFilters?.dateFrom) {
        query = query.gte('created_at', queryFilters.dateFrom);
      }

      if (queryFilters?.dateTo) {
        const endDate = new Date(queryFilters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      if (queryFilters?.searchQuery) {
        const searchTerm = `%${queryFilters.searchQuery}%`;
        query = query.or(
          `location_name.ilike.${searchTerm},category_name.ilike.${searchTerm},action.ilike.${searchTerm},employee_name.ilike.${searchTerm},notes.ilike.${searchTerm},source_number.ilike.${searchTerm}`
        );
      }

      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTaskVerificationsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useTaskVerificationsQuery] Fetched:', data?.length || 0, 'task verifications');
      return (data || []) as unknown as TaskVerification[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTaskVerificationById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('task_verifications')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useTaskVerificationById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useTaskVerificationById] Fetched task verification:', id);
      return data as TaskVerification | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTaskVerificationStats(filters?: TaskVerificationFilters) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'stats', organizationId, filters],
    queryFn: async (): Promise<TaskVerificationStats> => {
      if (!organizationId) {
        return {
          total: 0,
          totalToday: 0,
          totalWeek: 0,
          verified: 0,
          flagged: 0,
          pendingReview: 0,
          byDepartment: {},
          bySourceType: {},
        };
      }

      console.log('[useTaskVerificationStats] Calculating stats for org:', organizationId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      const weekAgoStr = weekAgo.toISOString();

      let baseQuery = supabase
        .from('task_verifications')
        .select('status, department_code, source_type, created_at')
        .eq('organization_id', organizationId);

      if (filters?.departmentCode) {
        baseQuery = baseQuery.eq('department_code', filters.departmentCode);
      }
      if (filters?.facilityCode) {
        baseQuery = baseQuery.eq('facility_code', filters.facilityCode);
      }

      const { data, error } = await baseQuery;

      if (error) {
        console.error('[useTaskVerificationStats] Error:', error);
        throw new Error(error.message);
      }

      const verifications = data || [];

      const stats: TaskVerificationStats = {
        total: verifications.length,
        totalToday: 0,
        totalWeek: 0,
        verified: 0,
        flagged: 0,
        pendingReview: 0,
        byDepartment: {},
        bySourceType: {},
      };

      for (const v of verifications) {
        if (v.created_at >= todayStr) {
          stats.totalToday++;
        }
        if (v.created_at >= weekAgoStr) {
          stats.totalWeek++;
        }

        if (v.status === 'verified') stats.verified++;
        else if (v.status === 'flagged') stats.flagged++;
        else if (v.status === 'pending_review') stats.pendingReview++;

        if (v.department_code) {
          stats.byDepartment[v.department_code] = (stats.byDepartment[v.department_code] || 0) + 1;
        }

        const sourceType = v.source_type || 'manual';
        stats.bySourceType[sourceType] = (stats.bySourceType[sourceType] || 0) + 1;
      }

      console.log('[useTaskVerificationStats] Stats calculated:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTaskLocationsQuery(options?: { enabled?: boolean }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_locations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useTaskLocationsQuery] Fetching locations for org:', organizationId);

      try {
        // Fetch from main locations table - matching the useLocations hook pattern
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            facility:facilities(id, name, facility_code),
            department:departments(id, name, department_code)
          `)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (error) {
          console.error('[useTaskLocationsQuery] Error fetching locations:', error.message);
          return [];
        }

        // Map locations table data to TaskLocation format
        const mappedData = (data || []).map((loc: any) => ({
          id: loc.id,
          organization_id: organizationId,
          code: loc.location_code || loc.id.substring(0, 8),
          name: loc.name,
          department_code: loc.department?.department_code || '',
          facility_code: loc.facility?.id || loc.facility_id || '',
          active: loc.status === 'active',
        }));

        console.log('[useTaskLocationsQuery] Fetched:', mappedData.length, 'locations:', mappedData.map((l: any) => l.name));
        return mappedData as TaskLocation[];
      } catch (err) {
        console.error('[useTaskLocationsQuery] Fetch error:', err);
        return [];
      }
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTaskCategoriesQuery(options?: { 
  enabled?: boolean;
  departmentCode?: string;
  locationIds?: string[];
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_categories', organizationId, options?.departmentCode, options?.locationIds, options?.locationIds?.length],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useTaskCategoriesQuery] Fetching task categories for org:', organizationId);

      try {
        let query = supabase
          .from('task_categories')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('active', true);

        if (options?.departmentCode) {
          query = query.eq('department_code', options.departmentCode);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) {
          console.warn('[useTaskCategoriesQuery] Error (returning empty):', error.message);
          return [];
        }

        let categories = (data || []) as TaskCategory[];

        if (options?.locationIds && options.locationIds.length > 0) {
          categories = categories.filter(cat => {
            if (!cat.locations || cat.locations.length === 0) return true;
            return cat.locations.some(loc => options.locationIds!.includes(loc));
          });
        }

        console.log('[useTaskCategoriesQuery] Fetched:', categories.length, 'task categories');
        return categories;
      } catch (err) {
        console.warn('[useTaskCategoriesQuery] Fetch error (returning empty):', err);
        return [];
      }
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTaskVerification(options?: {
  onSuccess?: (data: TaskVerification) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (verification: Omit<TaskVerification, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useCreateTaskVerification] Creating task verification:', verification);

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: verification.department_code,
          department_name: verification.department_name,
          facility_code: verification.facility_code,
          location_id: verification.location_id,
          location_name: verification.location_name,
          category_id: verification.category_id,
          category_name: verification.category_name,
          action: verification.action,
          notes: verification.notes || null,
          photo_uri: verification.photo_uri || null,
          employee_id: verification.employee_id,
          employee_name: verification.employee_name,
          status: verification.status || 'verified',
          source_type: verification.source_type || 'manual',
          source_id: verification.source_id || null,
          source_number: verification.source_number || null,
          linked_work_order_id: verification.linked_work_order_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateTaskVerification] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateTaskVerification] Created task verification:', data?.id);
      return data as TaskVerification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateTaskVerification] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateTaskVerification(options?: {
  onSuccess?: (data: TaskVerification) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskVerification> }) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useUpdateTaskVerification] Updating task verification:', id, updates);

      const { data, error } = await supabase
        .from('task_verifications')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateTaskVerification] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateTaskVerification] Updated task verification:', id);
      return data as TaskVerification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateTaskVerification] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useReviewTaskVerification(options?: {
  onSuccess?: (data: TaskVerification) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateTaskVerification(options);

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewedBy,
      reviewNotes,
    }: {
      id: string;
      status: TaskVerificationStatus;
      reviewedBy: string;
      reviewNotes?: string;
    }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        },
      });
    },
  });
}

export function useLinkWorkOrderToVerification(options?: {
  onSuccess?: (data: TaskVerification) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateTaskVerification(options);

  return useMutation({
    mutationFn: async ({
      verificationId,
      workOrderId,
    }: {
      verificationId: string;
      workOrderId: string;
    }) => {
      return updateMutation.mutateAsync({
        id: verificationId,
        updates: {
          linked_work_order_id: workOrderId,
        },
      });
    },
  });
}

export function useDeleteTaskVerification(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useDeleteTaskVerification] Deleting task verification:', id);

      const { error } = await supabase
        .from('task_verifications')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteTaskVerification] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteTaskVerification] Deleted task verification:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteTaskVerification] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useTaskVerificationsRealtime(options?: { 
  enabled?: boolean;
  onInsert?: (payload: TaskVerification) => void;
  onUpdate?: (payload: TaskVerification) => void;
  onDelete?: (payload: { id: string }) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId || options?.enabled === false) return;

    console.log('[useTaskVerificationsRealtime] Setting up real-time subscription for org:', organizationId);

    const channel = supabase
      .channel(`task_verifications_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_verifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[useTaskVerificationsRealtime] INSERT received:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
          options?.onInsert?.(payload.new as TaskVerification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_verifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[useTaskVerificationsRealtime] UPDATE received:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
          options?.onUpdate?.(payload.new as TaskVerification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'task_verifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[useTaskVerificationsRealtime] DELETE received:', payload.old);
          queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
          options?.onDelete?.({ id: (payload.old as { id: string }).id });
        }
      )
      .subscribe((status) => {
        console.log('[useTaskVerificationsRealtime] Subscription status:', status);
      });

    return () => {
      console.log('[useTaskVerificationsRealtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [organizationId, options, queryClient]);
}

export function useTaskVerificationsByEmployee(employeeId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'byEmployee', employeeId, organizationId],
    queryFn: async () => {
      if (!organizationId || !employeeId) return [];

      const { data, error } = await supabase
        .from('task_verifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useTaskVerificationsByEmployee] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useTaskVerificationsByEmployee] Fetched:', data?.length || 0, 'verifications for employee:', employeeId);
      return (data || []) as TaskVerification[];
    },
    enabled: !!organizationId && !!employeeId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTaskVerificationsBySource(sourceType: TaskVerificationSourceType, sourceId?: string) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'bySource', sourceType, sourceId, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('task_verifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('source_type', sourceType);

      if (sourceId) {
        query = query.eq('source_id', sourceId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[useTaskVerificationsBySource] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useTaskVerificationsBySource] Fetched:', data?.length || 0, 'verifications for source:', sourceType, sourceId);
      return (data || []) as TaskVerification[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useFlaggedVerificationsCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'flaggedCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      const { count, error } = await supabase
        .from('task_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'flagged');

      if (error) {
        console.error('[useFlaggedVerificationsCount] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useFlaggedVerificationsCount] Flagged count:', count);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePendingReviewCount() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'pendingReviewCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      const { count, error } = await supabase
        .from('task_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending_review');

      if (error) {
        console.error('[usePendingReviewCount] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePendingReviewCount] Pending review count:', count);
      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTodaysVerifications(options?: { 
  departmentCode?: string;
  employeeId?: string;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_verifications', 'today', organizationId, options?.departmentCode, options?.employeeId],
    queryFn: async () => {
      if (!organizationId) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from('task_verifications')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', today.toISOString());

      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
      }

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[useTodaysVerifications] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useTodaysVerifications] Fetched:', data?.length || 0, "today's verifications");
      return (data || []) as TaskVerification[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTaskVerificationHelpers() {
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  const getSourceTypeLabel = useCallback((sourceType?: string | null) => {
    switch (sourceType) {
      case 'work_order': return 'Work Order';
      case 'pm_work_order': return 'PM';
      case 'inspection': return 'Inspection';
      case 'permit': return 'Permit';
      case 'work_request': return 'Work Request';
      case 'issue_report': return 'Issue Report';
      default: return 'Manual';
    }
  }, []);

  const getSourceTypeColor = useCallback((sourceType?: string | null) => {
    switch (sourceType) {
      case 'work_order': return '#3B82F6';
      case 'pm_work_order': return '#8B5CF6';
      case 'inspection': return '#10B981';
      case 'permit': return '#F59E0B';
      case 'work_request': return '#EF4444';
      case 'issue_report': return '#EF4444';
      default: return '#6B7280';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'flagged': return '#EF4444';
      case 'pending_review': return '#F59E0B';
      default: return '#6B7280';
    }
  }, []);

  return useMemo(() => ({
    formatTime,
    getSourceTypeLabel,
    getSourceTypeColor,
    getStatusColor,
  }), [formatTime, getSourceTypeLabel, getSourceTypeColor, getStatusColor]);
}
