import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';

type InspectionTemplate = Tables['inspection_templates'];
type TrackedItem = Tables['tracked_items'];
type InspectionRecord = Tables['inspection_records'];
type InspectionSchedule = Tables['inspection_schedules'];
type TrackedItemChange = Tables['tracked_item_changes'];

export type InspectionCategory = 'safety' | 'quality' | 'compliance' | 'equipment' | 'custom';
export type InspectionFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'as_needed';
export type InspectionResult = 'pass' | 'fail' | 'needs_attention' | 'n/a';
export type TrackedItemStatus = 'active' | 'inactive' | 'retired';

export interface InspectionField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'textarea' | 'pass_fail' | 'rating';
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  conditionalOn?: {
    fieldId: string;
    value: string | boolean;
  };
  [key: string]: unknown;
}

export type ExtendedInspectionTemplate = Omit<InspectionTemplate, 'fields'> & {
  fields: InspectionField[];
};

export type ExtendedTrackedItem = Omit<TrackedItem, 'metadata'> & {
  metadata: Record<string, string | number> | null;
};

export type ExtendedInspectionRecord = Omit<InspectionRecord, 'field_values'> & {
  field_values: Record<string, string | number | boolean | string[]>;
};

// =============================================================================
// INSPECTION TEMPLATES
// =============================================================================

export function useInspectionTemplatesQuery(options?: QueryOptions<InspectionTemplate> & {
  enabled?: boolean;
  category?: InspectionCategory;
  active?: boolean;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_templates', organizationId, options?.category, options?.active, options?.filters, options?.select, options?.orderBy, options?.limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('inspection_templates')
        .select(options?.select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.category) {
        query = query.eq('category', options.category);
      }
      
      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }
      
      if (options?.filters) {
        for (const filter of options.filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
          }
        }
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy.column as string, { ascending: options.orderBy.ascending ?? true });
      } else {
        query = query.order('name', { ascending: true });
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useInspectionTemplatesQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useInspectionTemplatesQuery] Fetched:', data?.length || 0, 'templates');
      return (data || []) as unknown as ExtendedInspectionTemplate[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInspectionTemplateById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_templates', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('inspection_templates', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useInspectionTemplateById] Fetched template:', id);
      return result.data as ExtendedInspectionTemplate | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInspectionTemplate(options?: {
  onSuccess?: (data: ExtendedInspectionTemplate) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Omit<ExtendedInspectionTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inspection_templates')
        .insert({
          organization_id: organizationId,
          name: template.name,
          description: template.description,
          category: template.category,
          icon: template.icon,
          color: template.color,
          fields: template.fields,
          tracked_item_type: template.tracked_item_type,
          frequency_required: template.frequency_required,
          default_day_of_week: template.default_day_of_week,
          default_day_of_month: template.default_day_of_month,
          notify_before_days: template.notify_before_days,
          requires_photos: template.requires_photos ?? false,
          opl_documents: template.opl_documents,
          active: template.active ?? true,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateInspectionTemplate] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateInspectionTemplate] Created template:', data?.id);
      return data as ExtendedInspectionTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection_templates'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateInspectionTemplate] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateInspectionTemplate(options?: {
  onSuccess?: (data: ExtendedInspectionTemplate) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtendedInspectionTemplate> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inspection_templates')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateInspectionTemplate] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateInspectionTemplate] Updated template:', id);
      return data as ExtendedInspectionTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection_templates'] });
      queryClient.invalidateQueries({ queryKey: ['inspection_templates', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateInspectionTemplate] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteInspectionTemplate(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('inspection_templates', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteInspectionTemplate] Deleted template:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection_templates'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteInspectionTemplate] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// TRACKED ITEMS
// =============================================================================

export function useTrackedItemsQuery(options?: QueryOptions<TrackedItem> & {
  enabled?: boolean;
  templateId?: string;
  status?: TrackedItemStatus;
  assignedTo?: string;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['tracked_items', organizationId, options?.templateId, options?.status, options?.assignedTo, options?.filters, options?.select, options?.orderBy, options?.limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('tracked_items')
        .select(options?.select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.templateId) {
        query = query.eq('template_id', options.templateId);
      }
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      
      if (options?.filters) {
        for (const filter of options.filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
          }
        }
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy.column as string, { ascending: options.orderBy.ascending ?? true });
      } else {
        query = query.order('item_number', { ascending: true });
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useTrackedItemsQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useTrackedItemsQuery] Fetched:', data?.length || 0, 'tracked items');
      return (data || []) as unknown as ExtendedTrackedItem[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTrackedItemById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['tracked_items', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('tracked_items', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useTrackedItemById] Fetched tracked item:', id);
      return result.data as ExtendedTrackedItem | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateTrackedItem(options?: {
  onSuccess?: (data: ExtendedTrackedItem) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<ExtendedTrackedItem, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('tracked_items')
        .insert({
          organization_id: organizationId,
          template_id: item.template_id,
          item_number: item.item_number,
          name: item.name,
          location: item.location,
          assigned_to: item.assigned_to,
          item_type: item.item_type,
          status: item.status ?? 'active',
          date_assigned: item.date_assigned,
          metadata: item.metadata,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateTrackedItem] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateTrackedItem] Created tracked item:', data?.id);
      return data as ExtendedTrackedItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tracked_items'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateTrackedItem] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateTrackedItem(options?: {
  onSuccess?: (data: ExtendedTrackedItem) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtendedTrackedItem> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('tracked_items')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateTrackedItem] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateTrackedItem] Updated tracked item:', id);
      return data as ExtendedTrackedItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tracked_items'] });
      queryClient.invalidateQueries({ queryKey: ['tracked_items', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateTrackedItem] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteTrackedItem(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('tracked_items', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteTrackedItem] Deleted tracked item:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked_items'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteTrackedItem] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// TRACKED ITEM CHANGES (History)
// =============================================================================

export function useTrackedItemChangesQuery(trackedItemId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['tracked_item_changes', organizationId, trackedItemId],
    queryFn: async () => {
      if (!organizationId || !trackedItemId) return [];
      
      const { data, error } = await supabase
        .from('tracked_item_changes')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('tracked_item_id', trackedItemId)
        .order('changed_at', { ascending: false });
      
      if (error) {
        console.error('[useTrackedItemChangesQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useTrackedItemChangesQuery] Fetched:', data?.length || 0, 'changes');
      return (data || []) as TrackedItemChange[];
    },
    enabled: !!organizationId && !!trackedItemId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLogTrackedItemChange(options?: {
  onSuccess?: (data: TrackedItemChange) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (change: Omit<TrackedItemChange, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('tracked_item_changes')
        .insert({
          organization_id: organizationId,
          tracked_item_id: change.tracked_item_id,
          item_number: change.item_number,
          change_type: change.change_type,
          previous_value: change.previous_value,
          new_value: change.new_value,
          reason: change.reason,
          changed_by: change.changed_by,
          changed_at: change.changed_at || new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useLogTrackedItemChange] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useLogTrackedItemChange] Logged change:', data?.id);
      return data as TrackedItemChange;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tracked_item_changes', organizationId, data.tracked_item_id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useLogTrackedItemChange] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// INSPECTION RECORDS
// =============================================================================

export function useInspectionRecordsQuery(options?: QueryOptions<InspectionRecord> & {
  enabled?: boolean;
  templateId?: string;
  trackedItemId?: string;
  inspectorId?: string;
  result?: InspectionResult;
  followUpRequired?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: [
      'inspection_records', 
      organizationId, 
      options?.templateId, 
      options?.trackedItemId,
      options?.inspectorId,
      options?.result,
      options?.followUpRequired,
      options?.dateFrom,
      options?.dateTo,
      options?.filters,
      options?.select,
      options?.orderBy,
      options?.limit,
      options?.offset,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('inspection_records')
        .select(options?.select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.templateId) {
        query = query.eq('template_id', options.templateId);
      }
      
      if (options?.trackedItemId) {
        query = query.eq('tracked_item_id', options.trackedItemId);
      }
      
      if (options?.inspectorId) {
        query = query.eq('inspector_id', options.inspectorId);
      }
      
      if (options?.result) {
        query = query.eq('result', options.result);
      }
      
      if (options?.followUpRequired !== undefined) {
        query = query.eq('follow_up_required', options.followUpRequired);
      }
      
      if (options?.dateFrom) {
        query = query.gte('inspection_date', options.dateFrom);
      }
      
      if (options?.dateTo) {
        query = query.lte('inspection_date', options.dateTo);
      }
      
      if (options?.filters) {
        for (const filter of options.filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'gte': query = query.gte(col, filter.value); break;
            case 'lte': query = query.lte(col, filter.value); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
          }
        }
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy.column as string, { ascending: options.orderBy.ascending ?? true });
      } else {
        query = query.order('inspection_date', { ascending: false });
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useInspectionRecordsQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useInspectionRecordsQuery] Fetched:', data?.length || 0, 'records');
      return (data || []) as unknown as ExtendedInspectionRecord[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useInspectionRecordById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_records', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('inspection_records', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useInspectionRecordById] Fetched record:', id);
      return result.data as ExtendedInspectionRecord | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentInspectionForItem(trackedItemId: string | undefined | null, templateId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_records', 'recent', trackedItemId, templateId, organizationId],
    queryFn: async () => {
      if (!organizationId || !trackedItemId) return null;
      
      let query = supabase
        .from('inspection_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('tracked_item_id', trackedItemId);
      
      if (templateId) {
        query = query.eq('template_id', templateId);
      }
      
      const { data, error } = await query
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[useRecentInspectionForItem] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useRecentInspectionForItem] Found:', data ? 'yes' : 'no');
      return data as ExtendedInspectionRecord | null;
    },
    enabled: !!organizationId && !!trackedItemId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateInspectionRecord(options?: {
  onSuccess?: (data: ExtendedInspectionRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: Omit<ExtendedInspectionRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inspection_records')
        .insert({
          organization_id: organizationId,
          template_id: record.template_id,
          template_name: record.template_name,
          schedule_id: record.schedule_id,
          tracked_item_id: record.tracked_item_id,
          tracked_item_number: record.tracked_item_number,
          inspector_id: record.inspector_id,
          inspector_name: record.inspector_name,
          inspection_date: record.inspection_date,
          result: record.result,
          field_values: record.field_values,
          notes: record.notes,
          photos: record.photos,
          attachments: record.attachments,
          corrective_action: record.corrective_action,
          follow_up_required: record.follow_up_required ?? false,
          follow_up_date: record.follow_up_date,
          follow_up_completed: record.follow_up_completed,
          location: record.location,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateInspectionRecord] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateInspectionRecord] Created record:', data?.id);
      return data as ExtendedInspectionRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection_records'] });
      queryClient.invalidateQueries({ queryKey: ['inspection_schedules'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateInspectionRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateInspectionRecord(options?: {
  onSuccess?: (data: ExtendedInspectionRecord) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtendedInspectionRecord> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inspection_records')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateInspectionRecord] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateInspectionRecord] Updated record:', id);
      return data as ExtendedInspectionRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection_records'] });
      queryClient.invalidateQueries({ queryKey: ['inspection_records', 'byId', data.id] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateInspectionRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCompleteFollowUp(options?: {
  onSuccess?: (data: ExtendedInspectionRecord) => void;
  onError?: (error: Error) => void;
}) {
  const updateRecord = useUpdateInspectionRecord(options);
  
  return useMutation({
    mutationFn: async ({ recordId, notes }: { recordId: string; notes?: string }) => {
      return updateRecord.mutateAsync({
        id: recordId,
        updates: {
          follow_up_completed: true,
          notes: notes,
        },
      });
    },
  });
}

export function useDeleteInspectionRecord(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('inspection_records', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteInspectionRecord] Deleted record:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection_records'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteInspectionRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// INSPECTION SCHEDULES
// =============================================================================

export function useInspectionSchedulesQuery(options?: QueryOptions<InspectionSchedule> & {
  enabled?: boolean;
  templateId?: string;
  active?: boolean;
  facilityId?: string;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_schedules', organizationId, options?.templateId, options?.active, options?.facilityId, options?.filters, options?.select, options?.orderBy, options?.limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('inspection_schedules')
        .select(options?.select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.templateId) {
        query = query.eq('template_id', options.templateId);
      }
      
      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy.column as string, { ascending: options.orderBy.ascending ?? true });
      } else {
        query = query.order('next_due', { ascending: true });
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useInspectionSchedulesQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useInspectionSchedulesQuery] Fetched:', data?.length || 0, 'schedules');
      return (data || []) as unknown as InspectionSchedule[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDueInspectionSchedules() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_schedules', 'due', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('inspection_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .lte('next_due', today)
        .order('next_due', { ascending: true });
      
      if (error) {
        console.error('[useDueInspectionSchedules] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useDueInspectionSchedules] Fetched:', data?.length || 0, 'due schedules');
      return (data || []) as InspectionSchedule[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpcomingInspectionSchedules(daysAhead: number = 7) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_schedules', 'upcoming', daysAhead, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from('inspection_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .gt('next_due', today.toISOString().split('T')[0])
        .lte('next_due', futureDate.toISOString().split('T')[0])
        .order('next_due', { ascending: true });
      
      if (error) {
        console.error('[useUpcomingInspectionSchedules] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpcomingInspectionSchedules] Fetched:', data?.length || 0, 'upcoming schedules');
      return (data || []) as InspectionSchedule[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInspectionSchedule(options?: {
  onSuccess?: (data: InspectionSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (schedule: Omit<InspectionSchedule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inspection_schedules')
        .insert({
          organization_id: organizationId,
          template_id: schedule.template_id,
          template_name: schedule.template_name,
          name: schedule.name,
          description: schedule.description,
          frequency: schedule.frequency,
          day_of_week: schedule.day_of_week,
          day_of_month: schedule.day_of_month,
          month_of_year: schedule.month_of_year,
          next_due: schedule.next_due,
          last_completed: schedule.last_completed,
          assigned_to: schedule.assigned_to,
          assigned_name: schedule.assigned_name,
          facility_id: schedule.facility_id,
          notify_before_days: schedule.notify_before_days ?? 1,
          active: schedule.active ?? true,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateInspectionSchedule] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateInspectionSchedule] Created schedule:', data?.id);
      return data as InspectionSchedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection_schedules'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateInspectionSchedule] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateInspectionSchedule(options?: {
  onSuccess?: (data: InspectionSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InspectionSchedule> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('inspection_schedules')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateInspectionSchedule] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateInspectionSchedule] Updated schedule:', id);
      return data as InspectionSchedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection_schedules'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateInspectionSchedule] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCompleteInspectionSchedule(options?: {
  onSuccess?: (data: InspectionSchedule) => void;
  onError?: (error: Error) => void;
}) {
  const updateSchedule = useUpdateInspectionSchedule(options);
  
  return useMutation({
    mutationFn: async ({ scheduleId, completedDate }: { scheduleId: string; completedDate: string }) => {
      return updateSchedule.mutateAsync({
        id: scheduleId,
        updates: {
          last_completed: completedDate,
          next_due: calculateNextDue(completedDate),
        },
      });
    },
  });
}

export function useDeleteInspectionSchedule(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('inspection_schedules', id, organizationId);
      if (result.error) throw result.error;
      
      console.log('[useDeleteInspectionSchedule] Deleted schedule:', id);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection_schedules'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteInspectionSchedule] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// METRICS & AGGREGATIONS
// =============================================================================

export function useInspectionMetrics() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalTemplates: 0,
          activeTemplates: 0,
          totalTrackedItems: 0,
          activeTrackedItems: 0,
          totalRecords: 0,
          passRate: 0,
          failRate: 0,
          pendingFollowUps: 0,
          dueSchedules: 0,
          overdueSchedules: 0,
        };
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const [templatesResult, itemsResult, recordsResult, followUpsResult, schedulesResult] = await Promise.all([
        supabase
          .from('inspection_templates')
          .select('active')
          .eq('organization_id', organizationId),
        supabase
          .from('tracked_items')
          .select('status')
          .eq('organization_id', organizationId),
        supabase
          .from('inspection_records')
          .select('result')
          .eq('organization_id', organizationId),
        supabase
          .from('inspection_records')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('follow_up_required', true)
          .or('follow_up_completed.is.null,follow_up_completed.eq.false'),
        supabase
          .from('inspection_schedules')
          .select('next_due, active')
          .eq('organization_id', organizationId)
          .eq('active', true),
      ]);
      
      const templates = templatesResult.data || [];
      const items = itemsResult.data || [];
      const records = recordsResult.data || [];
      const schedules = schedulesResult.data || [];
      
      const passCount = records.filter(r => r.result === 'pass').length;
      const failCount = records.filter(r => r.result === 'fail').length;
      const totalWithResult = passCount + failCount;
      
      const dueSchedules = schedules.filter(s => s.next_due <= today).length;
      
      return {
        totalTemplates: templates.length,
        activeTemplates: templates.filter(t => t.active).length,
        totalTrackedItems: items.length,
        activeTrackedItems: items.filter(i => i.status === 'active').length,
        totalRecords: records.length,
        passRate: totalWithResult > 0 ? Math.round((passCount / totalWithResult) * 100) : 0,
        failRate: totalWithResult > 0 ? Math.round((failCount / totalWithResult) * 100) : 0,
        pendingFollowUps: followUpsResult.count || 0,
        dueSchedules,
        overdueSchedules: dueSchedules,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInspectionRecordsByTrackedItem(trackedItemId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['inspection_records', 'byTrackedItem', trackedItemId, organizationId],
    queryFn: async () => {
      if (!organizationId || !trackedItemId) return [];
      
      const { data, error } = await supabase
        .from('inspection_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('tracked_item_id', trackedItemId)
        .order('inspection_date', { ascending: false });
      
      if (error) {
        console.error('[useInspectionRecordsByTrackedItem] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useInspectionRecordsByTrackedItem] Fetched:', data?.length || 0, 'records');
      return (data || []) as ExtendedInspectionRecord[];
    },
    enabled: !!organizationId && !!trackedItemId,
    staleTime: 1000 * 60 * 2,
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateNextDue(completedDate: string): string {
  const date = new Date(completedDate);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}
