import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, QueryOptions } from '@/lib/supabase';

export type FailureCodeSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type FailureCodeCategory = 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'instrumentation' | 'structural' | 'process' | 'operator' | 'external' | 'software' | 'operator_error' | 'environmental' | 'material' | 'other';
export type RootCauseCategory = 'equipment' | 'process' | 'people' | 'materials' | 'environment' | 'management';

export interface FailureCodeCategoryInfo {
  id: FailureCodeCategory;
  name: string;
  description: string;
  color: string;
}

export interface FailureCode {
  id: string;
  code: string;
  name: string;
  description: string;
  category: FailureCodeCategory;
  severity: FailureCodeSeverity;
  commonCauses: string[];
  suggestedActions: string[];
  mttrHours?: number;
  isActive: boolean;
}

export interface RootCause {
  id: string;
  code: string;
  name: string;
  description: string;
  category: RootCauseCategory;
}

export interface ActionTaken {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface FailureRecord {
  id: string;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId: string;
  equipmentName: string;
  failureCodeId: string;
  failureCode: string;
  rootCauseId?: string;
  rootCauseCode?: string;
  actionTakenId?: string;
  actionTakenCode?: string;
  failureDate: string;
  reportedBy: string;
  reportedByName: string;
  description: string;
  downtimeHours: number;
  repairHours: number;
  partsCost: number;
  laborCost: number;
  fiveWhys?: string[];
  correctiveActions?: string[];
  preventiveActions?: string[];
  isRecurring: boolean;
  previousFailureId?: string;
}

export interface EquipmentReliabilityMetrics {
  equipmentId: string;
  equipmentName: string;
  failureCount: number;
  totalDowntimeHours: number;
  totalRepairHours: number;
  totalCost: number;
  mtbfHours: number;
  mtbfDays: number;
  mttrHours: number;
  availability: number;
  totalOperatingHours: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ReliabilityTrendData {
  month: string;
  mtbf: number;
  mttr: number;
  availability: number;
  failureCount: number;
}

export interface OverallReliabilityStats {
  totalEquipment: number;
  totalFailures: number;
  avgMTBF: number;
  avgMTTR: number;
  avgAvailability: number;
  topPerformers: { equipmentId: string; equipmentName: string; availability: number }[];
  needsAttention: { equipmentId: string; equipmentName: string; availability: number }[];
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
}

export interface FailureStatsByCode {
  failureCodeId: string;
  failureCode: string;
  failureName: string;
  count: number;
  totalDowntime: number;
  totalCost: number;
}

export interface FailureStatsByEquipment {
  equipmentId: string;
  equipmentName: string;
  failureCount: number;
  totalDowntime: number;
  totalCost: number;
  topFailureCode: string;
}

export interface FailureCodeDB {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string;
  category: FailureCodeCategory;
  severity: FailureCodeSeverity;
  common_causes: string[];
  suggested_actions: string[];
  mttr_hours?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FailureRecordDB {
  id: string;
  organization_id: string;
  work_order_id?: string;
  work_order_number?: string;
  equipment_id: string;
  equipment_name: string;
  failure_code_id: string;
  failure_code: string;
  root_cause_id?: string;
  root_cause_code?: string;
  action_taken_id?: string;
  action_taken_code?: string;
  failure_date: string;
  reported_by: string;
  reported_by_name: string;
  description: string;
  downtime_hours: number;
  repair_hours: number;
  parts_cost: number;
  labor_cost: number;
  five_whys?: string[];
  corrective_actions?: string[];
  preventive_actions?: string[];
  is_recurring: boolean;
  previous_failure_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RootCauseAnalysisDB {
  id: string;
  organization_id: string;
  failure_record_id: string;
  equipment_id: string;
  equipment_name: string;
  analysis_date: string;
  performed_by: string;
  performed_by_name: string;
  problem_statement: string;
  root_cause_category: string;
  root_cause_id?: string;
  five_whys: string[];
  contributing_factors: string[];
  corrective_actions: {
    action: string;
    responsible: string;
    due_date: string;
    status: 'pending' | 'in_progress' | 'completed';
    completed_date?: string;
  }[];
  preventive_actions: {
    action: string;
    responsible: string;
    due_date: string;
    status: 'pending' | 'in_progress' | 'completed';
    completed_date?: string;
  }[];
  verification_required: boolean;
  verification_date?: string;
  verified_by?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'verified';
  attachments?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

const FAILURE_CODE_CATEGORIES: FailureCodeCategoryInfo[] = [
  { id: 'mechanical', name: 'Mechanical', description: 'Mechanical failures', color: '#3B82F6' },
  { id: 'electrical', name: 'Electrical', description: 'Electrical failures', color: '#F59E0B' },
  { id: 'hydraulic', name: 'Hydraulic', description: 'Hydraulic system failures', color: '#10B981' },
  { id: 'pneumatic', name: 'Pneumatic', description: 'Pneumatic system failures', color: '#8B5CF6' },
  { id: 'software', name: 'Software', description: 'Software/PLC failures', color: '#EC4899' },
  { id: 'operator_error', name: 'Operator Error', description: 'Human error', color: '#EF4444' },
  { id: 'environmental', name: 'Environmental', description: 'Environmental factors', color: '#06B6D4' },
  { id: 'material', name: 'Material', description: 'Material defects', color: '#84CC16' },
  { id: 'other', name: 'Other', description: 'Other failures', color: '#6B7280' },
];

const ROOT_CAUSE_CATEGORIES: { id: RootCauseCategory; name: string; description: string }[] = [
  { id: 'equipment', name: 'Equipment', description: 'Equipment-related causes' },
  { id: 'process', name: 'Process', description: 'Process-related causes' },
  { id: 'people', name: 'People', description: 'People-related causes' },
  { id: 'materials', name: 'Materials', description: 'Material-related causes' },
  { id: 'environment', name: 'Environment', description: 'Environmental causes' },
  { id: 'management', name: 'Management', description: 'Management-related causes' },
];

export function useFailureCodesQuery(options?: QueryOptions<FailureCodeDB> & {
  enabled?: boolean;
  category?: FailureCodeCategory;
  severity?: FailureCodeSeverity;
  isActive?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: [
      'failure_codes',
      organizationId,
      options?.category,
      options?.severity,
      options?.isActive,
    ],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        let query = supabase
          .from('failure_codes')
          .select('*')
          .eq('organization_id', organizationId);

        if (options?.category) {
          query = query.eq('category', options.category);
        }

        if (options?.severity) {
          query = query.eq('severity', options.severity);
        }

        if (options?.isActive !== undefined) {
          query = query.eq('is_active', options.isActive);
        }

        query = query.order('code', { ascending: true });

        const { data, error } = await query;

        if (error) {
          if (error.message.includes('schema cache') || error.message.includes('does not exist') || error.code === '42P01') {
            console.warn('[useFailureCodesQuery] Table does not exist, returning empty array');
            return [];
          }
          console.error('[useFailureCodesQuery] Error:', error.message);
          return [];
        }

        console.log('[useFailureCodesQuery] Fetched:', data?.length || 0, 'failure codes');
        return (data || []) as FailureCodeDB[];
      } catch (err) {
        console.warn('[useFailureCodesQuery] Exception caught, returning empty array:', err);
        return [];
      }
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 10,
  });
}

export function useFailureCodeById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['failure_codes', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      try {
        const { data, error } = await supabase
          .from('failure_codes')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          if (error.message.includes('schema cache') || error.message.includes('does not exist') || error.code === '42P01') {
            console.warn('[useFailureCodeById] Table does not exist, returning null');
            return null;
          }
          console.error('[useFailureCodeById] Error:', error.message);
          return null;
        }

        console.log('[useFailureCodeById] Fetched failure code:', id);
        return data as FailureCodeDB;
      } catch (err) {
        console.warn('[useFailureCodeById] Exception caught, returning null:', err);
        return null;
      }
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFailureCodeByCode(code: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['failure_codes', 'byCode', code, organizationId],
    queryFn: async () => {
      if (!organizationId || !code) return null;

      try {
        const { data, error } = await supabase
          .from('failure_codes')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('code', code)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          if (error.message.includes('schema cache') || error.message.includes('does not exist') || error.code === '42P01') {
            console.warn('[useFailureCodeByCode] Table does not exist, returning null');
            return null;
          }
          console.error('[useFailureCodeByCode] Error:', error.message);
          return null;
        }

        console.log('[useFailureCodeByCode] Fetched failure code:', code);
        return data as FailureCodeDB;
      } catch (err) {
        console.warn('[useFailureCodeByCode] Exception caught, returning null:', err);
        return null;
      }
    },
    enabled: !!organizationId && !!code,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFailureCodeCategories() {
  return useQuery({
    queryKey: ['failure_code_categories'],
    queryFn: async () => {
      return FAILURE_CODE_CATEGORIES;
    },
    staleTime: Infinity,
  });
}

export function useRootCauses(options?: { category?: string }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['root_causes', organizationId, options?.category],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        let query = supabase
          .from('root_causes')
          .select('*')
          .eq('organization_id', organizationId);

        if (options?.category) {
          query = query.eq('category', options.category);
        }

        query = query.order('code', { ascending: true });

        const { data, error } = await query;

        if (error) {
          if (error.message.includes('schema cache') || error.message.includes('does not exist') || error.code === '42P01') {
            console.warn('[useRootCauses] Table does not exist, returning empty array');
            return [];
          }
          console.error('[useRootCauses] Error:', error.message);
          return [];
        }

        console.log('[useRootCauses] Fetched:', data?.length || 0, 'root causes');
        return (data || []).map(rc => ({
          id: rc.id,
          code: rc.code,
          name: rc.name,
          description: rc.description || '',
          category: rc.category as RootCauseCategory,
        })) as RootCause[];
      } catch (err) {
        console.warn('[useRootCauses] Exception caught, returning empty array:', err);
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useRootCauseCategories() {
  return useQuery({
    queryKey: ['root_cause_categories'],
    queryFn: async () => {
      return ROOT_CAUSE_CATEGORIES;
    },
    staleTime: Infinity,
  });
}

export function useActionsTaken() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['actions_taken', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const { data, error } = await supabase
          .from('actions_taken')
          .select('*')
          .eq('organization_id', organizationId)
          .order('code', { ascending: true });

        if (error) {
          if (error.message.includes('schema cache') || error.message.includes('does not exist') || error.code === '42P01') {
            console.warn('[useActionsTaken] Table does not exist, returning empty array');
            return [];
          }
          console.error('[useActionsTaken] Error:', error.message);
          return [];
        }

        console.log('[useActionsTaken] Fetched:', data?.length || 0, 'actions');
        return (data || []).map(at => ({
          id: at.id,
          code: at.code,
          name: at.name,
          description: at.description || '',
          category: at.category || 'general',
        })) as ActionTaken[];
      } catch (err) {
        console.warn('[useActionsTaken] Exception caught, returning empty array:', err);
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useFailureRecordsQuery(options?: QueryOptions<FailureRecordDB> & {
  enabled?: boolean;
  equipmentId?: string;
  failureCodeId?: string;
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: [
      'failure_records',
      organizationId,
      options?.equipmentId,
      options?.failureCodeId,
      options?.startDate,
      options?.endDate,
      options?.isRecurring,
    ],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('failure_records')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }

      if (options?.failureCodeId) {
        query = query.eq('failure_code_id', options.failureCodeId);
      }

      if (options?.startDate) {
        query = query.gte('failure_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('failure_date', options.endDate);
      }

      if (options?.isRecurring !== undefined) {
        query = query.eq('is_recurring', options.isRecurring);
      }

      query = query.order('failure_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[useFailureRecordsQuery] Error:', error.message);
        throw new Error(error.message);
      }

      console.log('[useFailureRecordsQuery] Fetched:', data?.length || 0, 'failure records');
      return (data || []) as FailureRecordDB[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useFailureRecordById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['failure_records', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('failure_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[useFailureRecordById] Error:', error.message);
        throw new Error(error.message);
      }

      console.log('[useFailureRecordById] Fetched failure record:', id);
      return data as FailureRecordDB;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFailuresByEquipment(equipmentId: string | undefined | null) {
  return useFailureRecordsQuery({ equipmentId: equipmentId || undefined, enabled: !!equipmentId });
}

export function useRecurringFailures() {
  return useFailureRecordsQuery({ isRecurring: true });
}

export function useCreateFailureCode(options?: {
  onSuccess?: (data: FailureCodeDB) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (failureCode: Omit<FailureCodeDB, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('failure_codes')
        .insert({
          organization_id: organizationId,
          code: failureCode.code,
          name: failureCode.name,
          description: failureCode.description,
          category: failureCode.category,
          severity: failureCode.severity,
          common_causes: failureCode.common_causes || [],
          suggested_actions: failureCode.suggested_actions || [],
          mttr_hours: failureCode.mttr_hours || null,
          is_active: failureCode.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateFailureCode] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateFailureCode] Created failure code:', data?.id);
      return data as FailureCodeDB;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['failure_codes'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateFailureCode] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateFailureCode(options?: {
  onSuccess?: (data: FailureCodeDB) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FailureCodeDB> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('failure_codes')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateFailureCode] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateFailureCode] Updated failure code:', id);
      return data as FailureCodeDB;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['failure_codes'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateFailureCode] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteFailureCode(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');

      const { error } = await supabase
        .from('failure_codes')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteFailureCode] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteFailureCode] Deleted failure code:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure_codes'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteFailureCode] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCreateFailureRecord(options?: {
  onSuccess?: (data: FailureRecordDB) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: Omit<FailureRecordDB, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('failure_records')
        .insert({
          organization_id: organizationId,
          work_order_id: record.work_order_id || null,
          work_order_number: record.work_order_number || null,
          equipment_id: record.equipment_id,
          equipment_name: record.equipment_name,
          failure_code_id: record.failure_code_id,
          failure_code: record.failure_code,
          root_cause_id: record.root_cause_id || null,
          root_cause_code: record.root_cause_code || null,
          action_taken_id: record.action_taken_id || null,
          action_taken_code: record.action_taken_code || null,
          failure_date: record.failure_date,
          reported_by: record.reported_by,
          reported_by_name: record.reported_by_name,
          description: record.description,
          downtime_hours: record.downtime_hours,
          repair_hours: record.repair_hours,
          parts_cost: record.parts_cost,
          labor_cost: record.labor_cost,
          five_whys: record.five_whys || [],
          corrective_actions: record.corrective_actions || [],
          preventive_actions: record.preventive_actions || [],
          is_recurring: record.is_recurring || false,
          previous_failure_id: record.previous_failure_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateFailureRecord] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateFailureRecord] Created failure record:', data?.id);
      return data as FailureRecordDB;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['failure_records'] });
      queryClient.invalidateQueries({ queryKey: ['equipment_reliability'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateFailureRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateFailureRecord(options?: {
  onSuccess?: (data: FailureRecordDB) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FailureRecordDB> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('failure_records')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateFailureRecord] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateFailureRecord] Updated failure record:', id);
      return data as FailureRecordDB;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['failure_records'] });
      queryClient.invalidateQueries({ queryKey: ['equipment_reliability'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateFailureRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteFailureRecord(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');

      const { error } = await supabase
        .from('failure_records')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteFailureRecord] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteFailureRecord] Deleted failure record:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failure_records'] });
      queryClient.invalidateQueries({ queryKey: ['equipment_reliability'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteFailureRecord] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useEquipmentReliability(equipmentId: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['equipment_reliability', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return null;

      const { data: records, error } = await supabase
        .from('failure_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .order('failure_date', { ascending: false });

      if (error) {
        console.error('[useEquipmentReliability] Error:', error.message);
        throw new Error(error.message);
      }

      if (!records || records.length === 0) return null;

      const totalDowntime = records.reduce((sum, r) => sum + (r.downtime_hours || 0), 0);
      const totalRepair = records.reduce((sum, r) => sum + (r.repair_hours || 0), 0);
      const totalCost = records.reduce((sum, r) => sum + (r.parts_cost || 0) + (r.labor_cost || 0), 0);
      const operatingHours = 8760;
      const mtbf = records.length > 0 ? operatingHours / records.length : operatingHours;
      const mttr = records.length > 0 ? totalRepair / records.length : 0;
      const availability = operatingHours > 0 ? ((operatingHours - totalDowntime) / operatingHours) * 100 : 100;

      return {
        equipmentId,
        equipmentName: records[0]?.equipment_name || 'Unknown',
        failureCount: records.length,
        totalDowntimeHours: totalDowntime,
        totalRepairHours: totalRepair,
        totalCost,
        mtbfHours: Math.round(mtbf),
        mtbfDays: Math.round(mtbf / 24),
        mttrHours: Math.round(mttr * 10) / 10,
        availability: Math.round(availability * 10) / 10,
        totalOperatingHours: operatingHours,
        trend: 'stable' as const,
      } as EquipmentReliabilityMetrics;
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllEquipmentReliability() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['equipment_reliability', 'all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: records, error } = await supabase
        .from('failure_records')
        .select('equipment_id, equipment_name, downtime_hours, repair_hours, parts_cost, labor_cost')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useAllEquipmentReliability] Error:', error.message);
        throw new Error(error.message);
      }

      if (!records || records.length === 0) return [];

      const equipmentMap = new Map<string, {
        equipmentName: string;
        failures: number;
        downtime: number;
        repair: number;
        cost: number;
      }>();

      records.forEach(r => {
        const existing = equipmentMap.get(r.equipment_id) || {
          equipmentName: r.equipment_name || 'Unknown',
          failures: 0,
          downtime: 0,
          repair: 0,
          cost: 0,
        };
        existing.failures += 1;
        existing.downtime += r.downtime_hours || 0;
        existing.repair += r.repair_hours || 0;
        existing.cost += (r.parts_cost || 0) + (r.labor_cost || 0);
        equipmentMap.set(r.equipment_id, existing);
      });

      const operatingHours = 8760;
      return Array.from(equipmentMap.entries()).map(([equipmentId, data]) => {
        const mtbf = data.failures > 0 ? operatingHours / data.failures : operatingHours;
        const mttr = data.failures > 0 ? data.repair / data.failures : 0;
        const availability = ((operatingHours - data.downtime) / operatingHours) * 100;

        return {
          equipmentId,
          equipmentName: data.equipmentName,
          failureCount: data.failures,
          totalDowntimeHours: data.downtime,
          totalRepairHours: data.repair,
          totalCost: data.cost,
          mtbfHours: Math.round(mtbf),
          mtbfDays: Math.round(mtbf / 24),
          mttrHours: Math.round(mttr * 10) / 10,
          availability: Math.round(availability * 10) / 10,
          totalOperatingHours: operatingHours,
          trend: 'stable' as const,
        } as EquipmentReliabilityMetrics;
      });
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useOverallReliabilityStats() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['reliability_stats', 'overall', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalEquipment: 0,
          totalFailures: 0,
          avgMTBF: 0,
          avgMTTR: 0,
          avgAvailability: 100,
          topPerformers: [],
          needsAttention: [],
          totalDowntimeHours: 0,
          totalMaintenanceCost: 0,
        } as OverallReliabilityStats;
      }

      const [recordsResult, equipmentResult] = await Promise.all([
        supabase
          .from('failure_records')
          .select('equipment_id, equipment_name, downtime_hours, repair_hours, parts_cost, labor_cost')
          .eq('organization_id', organizationId),
        supabase
          .from('equipment')
          .select('id')
          .eq('organization_id', organizationId),
      ]);

      if (recordsResult.error) throw new Error(recordsResult.error.message);

      const records = recordsResult.data || [];
      const totalEquipment = equipmentResult.data?.length || 0;
      const totalFailures = records.length;
      const totalDowntime = records.reduce((sum, r) => sum + (r.downtime_hours || 0), 0);
      const totalRepair = records.reduce((sum, r) => sum + (r.repair_hours || 0), 0);
      const totalCost = records.reduce((sum, r) => sum + (r.parts_cost || 0) + (r.labor_cost || 0), 0);

      const operatingHours = 8760;
      const avgMTBF = totalFailures > 0 ? operatingHours / (totalFailures / Math.max(totalEquipment, 1)) : operatingHours;
      const avgMTTR = totalFailures > 0 ? totalRepair / totalFailures : 0;
      const avgAvailability = totalEquipment > 0 ? ((operatingHours - (totalDowntime / totalEquipment)) / operatingHours) * 100 : 100;

      return {
        totalEquipment,
        totalFailures,
        avgMTBF: Math.round(avgMTBF),
        avgMTTR: Math.round(avgMTTR * 10) / 10,
        avgAvailability: Math.round(avgAvailability * 10) / 10,
        topPerformers: [],
        needsAttention: [],
        totalDowntimeHours: totalDowntime,
        totalMaintenanceCost: totalCost,
      } as OverallReliabilityStats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useReliabilityTrends() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['reliability_trends', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: records, error } = await supabase
        .from('failure_records')
        .select('failure_date, downtime_hours, repair_hours')
        .eq('organization_id', organizationId)
        .gte('failure_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('failure_date', { ascending: true });

      if (error) {
        console.error('[useReliabilityTrends] Error:', error.message);
        throw new Error(error.message);
      }

      const monthlyData = new Map<string, { failures: number; downtime: number; repair: number }>();

      (records || []).forEach(r => {
        const month = r.failure_date.substring(0, 7);
        const existing = monthlyData.get(month) || { failures: 0, downtime: 0, repair: 0 };
        existing.failures += 1;
        existing.downtime += r.downtime_hours || 0;
        existing.repair += r.repair_hours || 0;
        monthlyData.set(month, existing);
      });

      const operatingHours = 730;
      return Array.from(monthlyData.entries()).map(([month, data]) => {
        const mtbf = data.failures > 0 ? operatingHours / data.failures : operatingHours;
        const mttr = data.failures > 0 ? data.repair / data.failures : 0;
        const availability = ((operatingHours - data.downtime) / operatingHours) * 100;

        return {
          month,
          mtbf: Math.round(mtbf),
          mttr: Math.round(mttr * 10) / 10,
          availability: Math.round(availability * 10) / 10,
          failureCount: data.failures,
        } as ReliabilityTrendData;
      });
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFailureStatsByFailureCode() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['failure_stats', 'byCode', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: records, error } = await supabase
        .from('failure_records')
        .select('failure_code_id, failure_code, downtime_hours, parts_cost, labor_cost')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useFailureStatsByFailureCode] Error:', error.message);
        throw new Error(error.message);
      }

      const codeMap = new Map<string, { code: string; count: number; downtime: number; cost: number }>();

      (records || []).forEach(r => {
        const existing = codeMap.get(r.failure_code_id) || {
          code: r.failure_code || 'Unknown',
          count: 0,
          downtime: 0,
          cost: 0,
        };
        existing.count += 1;
        existing.downtime += r.downtime_hours || 0;
        existing.cost += (r.parts_cost || 0) + (r.labor_cost || 0);
        codeMap.set(r.failure_code_id, existing);
      });

      return Array.from(codeMap.entries()).map(([failureCodeId, data]) => ({
        failureCodeId,
        failureCode: data.code,
        failureName: data.code,
        count: data.count,
        totalDowntime: data.downtime,
        totalCost: data.cost,
      })) as FailureStatsByCode[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFailureStatsByEquipmentQuery() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['failure_stats', 'byEquipment', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: records, error } = await supabase
        .from('failure_records')
        .select('equipment_id, equipment_name, failure_code, downtime_hours, parts_cost, labor_cost')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useFailureStatsByEquipmentQuery] Error:', error.message);
        throw new Error(error.message);
      }

      const equipMap = new Map<string, {
        name: string;
        count: number;
        downtime: number;
        cost: number;
        codes: Map<string, number>;
      }>();

      (records || []).forEach(r => {
        const existing = equipMap.get(r.equipment_id) || {
          name: r.equipment_name || 'Unknown',
          count: 0,
          downtime: 0,
          cost: 0,
          codes: new Map(),
        };
        existing.count += 1;
        existing.downtime += r.downtime_hours || 0;
        existing.cost += (r.parts_cost || 0) + (r.labor_cost || 0);
        existing.codes.set(r.failure_code || 'Unknown', (existing.codes.get(r.failure_code || 'Unknown') || 0) + 1);
        equipMap.set(r.equipment_id, existing);
      });

      return Array.from(equipMap.entries()).map(([equipmentId, data]) => {
        let topCode = 'N/A';
        let maxCount = 0;
        data.codes.forEach((count, code) => {
          if (count > maxCount) {
            maxCount = count;
            topCode = code;
          }
        });

        return {
          equipmentId,
          equipmentName: data.name,
          failureCount: data.count,
          totalDowntime: data.downtime,
          totalCost: data.cost,
          topFailureCode: topCode,
        };
      }) as FailureStatsByEquipment[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMTBFAnalysis(equipmentId?: string) {
  const { organizationId } = useOrganization();
  const { data: singleEquip } = useEquipmentReliability(equipmentId);
  const { data: allEquip } = useAllEquipmentReliability();

  return useQuery({
    queryKey: ['mtbf_analysis', equipmentId, organizationId, singleEquip, allEquip],
    queryFn: async () => {
      if (!organizationId) return null;

      if (equipmentId && singleEquip) {
        return {
          equipmentId,
          equipmentName: singleEquip.equipmentName,
          mtbfHours: singleEquip.mtbfHours,
          mtbfDays: singleEquip.mtbfDays,
          failureCount: singleEquip.failureCount,
          totalOperatingHours: singleEquip.totalOperatingHours,
          trend: singleEquip.trend,
        };
      }

      if (!equipmentId && allEquip) {
        return allEquip.map(m => ({
          equipmentId: m.equipmentId,
          equipmentName: m.equipmentName,
          mtbfHours: m.mtbfHours,
          mtbfDays: m.mtbfDays,
          failureCount: m.failureCount,
          totalOperatingHours: m.totalOperatingHours,
          trend: m.trend,
        }));
      }

      return null;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMTTRAnalysis(equipmentId?: string) {
  const { organizationId } = useOrganization();
  const { data: singleEquip } = useEquipmentReliability(equipmentId);
  const { data: allEquip } = useAllEquipmentReliability();

  return useQuery({
    queryKey: ['mttr_analysis', equipmentId, organizationId, singleEquip, allEquip],
    queryFn: async () => {
      if (!organizationId) return null;

      if (equipmentId && singleEquip) {
        return {
          equipmentId,
          equipmentName: singleEquip.equipmentName,
          mttrHours: singleEquip.mttrHours,
          failureCount: singleEquip.failureCount,
          totalRepairHours: singleEquip.totalRepairHours,
          avgCostPerRepair: singleEquip.failureCount > 0 ? singleEquip.totalCost / singleEquip.failureCount : 0,
        };
      }

      if (!equipmentId && allEquip) {
        return allEquip.map(m => ({
          equipmentId: m.equipmentId,
          equipmentName: m.equipmentName,
          mttrHours: m.mttrHours,
          failureCount: m.failureCount,
          totalRepairHours: m.totalRepairHours,
          avgCostPerRepair: m.failureCount > 0 ? m.totalCost / m.failureCount : 0,
        }));
      }

      return null;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFailureMetrics() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['failure_metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalFailures: 0,
          totalDowntimeHours: 0,
          totalRepairCost: 0,
          avgMTBF: 0,
          avgMTTR: 0,
          recurringFailures: 0,
          failuresByCategory: [] as { category: string; count: number }[],
          failuresBySeverity: [] as { severity: string; count: number }[],
        };
      }

      const [recordsResult, codesResult] = await Promise.all([
        supabase
          .from('failure_records')
          .select('failure_code_id, downtime_hours, repair_hours, parts_cost, labor_cost, is_recurring')
          .eq('organization_id', organizationId),
        supabase
          .from('failure_codes')
          .select('id, category, severity')
          .eq('organization_id', organizationId),
      ]);

      if (recordsResult.error) throw new Error(recordsResult.error.message);

      const records = recordsResult.data || [];
      const codes = codesResult.data || [];
      const codeMap = new Map(codes.map(c => [c.id, { category: c.category, severity: c.severity }]));

      const totalDowntimeHours = records.reduce((sum, r) => sum + (r.downtime_hours || 0), 0);
      const totalRepairHours = records.reduce((sum, r) => sum + (r.repair_hours || 0), 0);
      const totalRepairCost = records.reduce((sum, r) => sum + (r.parts_cost || 0) + (r.labor_cost || 0), 0);
      const recurringFailures = records.filter(r => r.is_recurring).length;

      const operatingHours = 8760;
      const avgMTBF = records.length > 0 ? operatingHours / records.length : operatingHours;
      const avgMTTR = records.length > 0 ? totalRepairHours / records.length : 0;

      const categoryMap = new Map<string, number>();
      const severityMap = new Map<string, number>();

      records.forEach(r => {
        const codeInfo = codeMap.get(r.failure_code_id);
        if (codeInfo) {
          categoryMap.set(codeInfo.category, (categoryMap.get(codeInfo.category) || 0) + 1);
          severityMap.set(codeInfo.severity, (severityMap.get(codeInfo.severity) || 0) + 1);
        }
      });

      return {
        totalFailures: records.length,
        totalDowntimeHours,
        totalRepairCost,
        avgMTBF: Math.round(avgMTBF),
        avgMTTR: Math.round(avgMTTR * 10) / 10,
        recurringFailures,
        failuresByCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count,
        })).sort((a, b) => b.count - a.count),
        failuresBySeverity: Array.from(severityMap.entries()).map(([severity, count]) => ({
          severity,
          count,
        })).sort((a, b) => b.count - a.count),
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}
