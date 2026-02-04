import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables, QueryOptions, fetchAll, fetchById, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';

type WorkflowTemplate = Tables['workflow_templates'];
type WorkflowStep = Tables['workflow_steps'];
type DelegationRule = Tables['delegation_rules'];
type WorkflowInstance = Tables['workflow_instances'];
type WorkflowStepHistory = Tables['workflow_step_history'];

export type WorkflowCategory = 'purchase' | 'time_off' | 'permit' | 'expense' | 'contract' | 'custom';
export type WorkflowStepType = 'approval' | 'review' | 'notification' | 'condition' | 'parallel';
export type WorkflowInstanceStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'escalated';
export type WorkflowHistoryAction = 'approved' | 'rejected' | 'skipped' | 'escalated' | 'delegated' | 'reassigned' | 'resubmitted' | 'cancelled' | 'returned';

export interface WorkflowTemplateWithSteps extends WorkflowTemplate {
  steps?: WorkflowStep[];
}

export interface WorkflowInstanceWithHistory extends WorkflowInstance {
  step_history?: WorkflowStepHistory[];
  current_step?: WorkflowStep;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  pendingInstances: number;
  avgCompletionTimeHours: number;
  approvalRate: number;
  escalationRate: number;
  byCategory: {
    category: WorkflowCategory;
    count: number;
    pending: number;
  }[];
}

export function useWorkflowTemplatesQuery(options?: QueryOptions<WorkflowTemplate> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['workflow_templates', organizationId, filters, orderBy, limit, offset, select],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('workflow_templates', organizationId, { 
        filters, 
        orderBy: orderBy || { column: 'name', ascending: true }, 
        limit, 
        offset, 
        select 
      });
      if (result.error) throw result.error;
      console.log('[useWorkflowTemplatesQuery] Fetched templates:', result.data?.length || 0);
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkflowTemplateById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_templates', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('workflow_templates', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useWorkflowTemplateById] Fetched template:', result.data?.id);
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkflowTemplateWithSteps(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_templates', 'withSteps', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', id)
        .single();
      
      if (templateError) throw new Error(templateError.message);
      if (!template) return null;
      
      const { data: steps, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', id)
        .order('step_order', { ascending: true });
      
      if (stepsError) throw new Error(stepsError.message);
      
      console.log('[useWorkflowTemplateWithSteps] Fetched template with', steps?.length || 0, 'steps');
      return { ...template, steps: steps || [] } as WorkflowTemplateWithSteps;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkflowTemplatesByCategory(category: WorkflowCategory | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_templates', 'byCategory', category, organizationId],
    queryFn: async () => {
      if (!organizationId || !category) return [];
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useWorkflowTemplatesByCategory] Fetched:', data?.length || 0, 'for category:', category);
      return (data || []) as WorkflowTemplate[];
    },
    enabled: !!organizationId && !!category,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveWorkflowTemplates() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_templates', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useActiveWorkflowTemplates] Fetched:', data?.length || 0);
      return (data || []) as WorkflowTemplate[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDefaultWorkflowTemplate(category: WorkflowCategory | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_templates', 'default', category, organizationId],
    queryFn: async () => {
      if (!organizationId || !category) return null;
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      console.log('[useDefaultWorkflowTemplate] Fetched default for:', category, data?.id);
      return data as WorkflowTemplate | null;
    },
    enabled: !!organizationId && !!category,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkflowStepsQuery(templateId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_steps', templateId, organizationId],
    queryFn: async () => {
      if (!organizationId || !templateId) return [];
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', templateId)
        .order('step_order', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useWorkflowStepsQuery] Fetched:', data?.length || 0, 'steps for template:', templateId);
      return (data || []) as WorkflowStep[];
    },
    enabled: !!organizationId && !!templateId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDelegationRulesQuery(options?: QueryOptions<DelegationRule> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['delegation_rules', organizationId, filters, orderBy, limit],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('delegation_rules', organizationId, { 
        filters, 
        orderBy: orderBy || { column: 'start_date', ascending: false }, 
        limit 
      });
      if (result.error) throw result.error;
      console.log('[useDelegationRulesQuery] Fetched delegations:', result.data?.length || 0);
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveDelegationRules() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['delegation_rules', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('delegation_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useActiveDelegationRules] Fetched:', data?.length || 0);
      return (data || []) as DelegationRule[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDelegationsByUser(userId: string | undefined | null, direction: 'from' | 'to' = 'from') {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['delegation_rules', 'byUser', userId, direction, organizationId],
    queryFn: async () => {
      if (!organizationId || !userId) return [];
      const column = direction === 'from' ? 'from_user_id' : 'to_user_id';
      const { data, error } = await supabase
        .from('delegation_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq(column, userId)
        .order('start_date', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useDelegationsByUser] Fetched:', data?.length || 0, 'for user:', userId, direction);
      return (data || []) as DelegationRule[];
    },
    enabled: !!organizationId && !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkflowInstancesQuery(options?: QueryOptions<WorkflowInstance> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['workflow_instances', organizationId, filters, orderBy, limit, offset],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('workflow_instances', organizationId, { 
        filters, 
        orderBy: orderBy || { column: 'created_at', ascending: false }, 
        limit, 
        offset 
      });
      if (result.error) throw result.error;
      console.log('[useWorkflowInstancesQuery] Fetched instances:', result.data?.length || 0);
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkflowInstanceById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('workflow_instances', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useWorkflowInstanceById] Fetched instance:', result.data?.id);
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkflowInstanceWithHistory(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'withHistory', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      
      const { data: instance, error: instanceError } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', id)
        .single();
      
      if (instanceError) throw new Error(instanceError.message);
      if (!instance) return null;
      
      const { data: history, error: historyError } = await supabase
        .from('workflow_step_history')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('instance_id', id)
        .order('created_at', { ascending: true });
      
      if (historyError) throw new Error(historyError.message);
      
      let currentStep: WorkflowStep | undefined;
      if (instance.current_step_id) {
        const { data: step } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('id', instance.current_step_id)
          .single();
        currentStep = step as WorkflowStep;
      }
      
      console.log('[useWorkflowInstanceWithHistory] Fetched instance with', history?.length || 0, 'history entries');
      return { ...instance, step_history: history || [], current_step: currentStep } as WorkflowInstanceWithHistory;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePendingWorkflowInstances() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'in_progress', 'escalated'])
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[usePendingWorkflowInstances] Fetched:', data?.length || 0);
      return (data || []) as WorkflowInstance[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkflowInstancesByReference(referenceType: string, referenceId: string) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'byReference', referenceType, referenceId, organizationId],
    queryFn: async () => {
      if (!organizationId || !referenceType || !referenceId) return [];
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useWorkflowInstancesByReference] Fetched:', data?.length || 0, 'for', referenceType, referenceId);
      return (data || []) as WorkflowInstance[];
    },
    enabled: !!organizationId && !!referenceType && !!referenceId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkflowStepHistoryQuery(instanceId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_step_history', instanceId, organizationId],
    queryFn: async () => {
      if (!organizationId || !instanceId) return [];
      const { data, error } = await supabase
        .from('workflow_step_history')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useWorkflowStepHistoryQuery] Fetched:', data?.length || 0, 'history for instance:', instanceId);
      return (data || []) as WorkflowStepHistory[];
    },
    enabled: !!organizationId && !!instanceId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkflowStats() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_stats', organizationId],
    queryFn: async (): Promise<WorkflowStats> => {
      if (!organizationId) {
        return {
          totalWorkflows: 0,
          activeWorkflows: 0,
          pendingInstances: 0,
          avgCompletionTimeHours: 0,
          approvalRate: 0,
          escalationRate: 0,
          byCategory: [],
        };
      }
      
      const { data: templates, error: templatesError } = await supabase
        .from('workflow_templates')
        .select('id, is_active, category')
        .eq('organization_id', organizationId);
      
      if (templatesError) throw new Error(templatesError.message);
      
      const { data: instances, error: instancesError } = await supabase
        .from('workflow_instances')
        .select('id, status, category, created_at, completed_at')
        .eq('organization_id', organizationId);
      
      if (instancesError) throw new Error(instancesError.message);
      
      const totalWorkflows = templates?.length || 0;
      const activeWorkflows = templates?.filter(t => t.is_active).length || 0;
      const pendingInstances = instances?.filter(i => ['pending', 'in_progress', 'escalated'].includes(i.status)).length || 0;
      
      const completedInstances = instances?.filter(i => i.status === 'approved' && i.completed_at) || [];
      let avgCompletionTimeHours = 0;
      if (completedInstances.length > 0) {
        const totalHours = completedInstances.reduce((sum, i) => {
          const start = new Date(i.created_at).getTime();
          const end = new Date(i.completed_at!).getTime();
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0);
        avgCompletionTimeHours = totalHours / completedInstances.length;
      }
      
      const approvedCount = instances?.filter(i => i.status === 'approved').length || 0;
      const rejectedCount = instances?.filter(i => i.status === 'rejected').length || 0;
      const escalatedCount = instances?.filter(i => i.status === 'escalated').length || 0;
      const totalDecided = approvedCount + rejectedCount;
      const approvalRate = totalDecided > 0 ? (approvedCount / totalDecided) * 100 : 0;
      const escalationRate = instances?.length ? (escalatedCount / instances.length) * 100 : 0;
      
      const categories: WorkflowCategory[] = ['purchase', 'time_off', 'permit', 'expense', 'contract', 'custom'];
      const byCategory = categories.map(category => ({
        category,
        count: templates?.filter(t => t.category === category).length || 0,
        pending: instances?.filter(i => i.category === category && ['pending', 'in_progress'].includes(i.status)).length || 0,
      }));
      
      console.log('[useWorkflowStats] Computed stats:', { totalWorkflows, activeWorkflows, pendingInstances });
      
      return {
        totalWorkflows,
        activeWorkflows,
        pendingInstances,
        avgCompletionTimeHours: Math.round(avgCompletionTimeHours * 10) / 10,
        approvalRate: Math.round(approvalRate * 10) / 10,
        escalationRate: Math.round(escalationRate * 10) / 10,
        byCategory,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (template: Omit<WorkflowTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await insertRecord('workflow_templates', { ...template, organization_id: organizationId });
      if (result.error) throw result.error;
      console.log('[useCreateWorkflowTemplate] Created template:', result.data?.id);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export function useUpdateWorkflowTemplate() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowTemplate> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await updateRecord('workflow_templates', id, updates, organizationId);
      if (result.error) throw result.error;
      console.log('[useUpdateWorkflowTemplate] Updated template:', id);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_templates', 'byId', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_templates', 'withSteps', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export function useDeleteWorkflowTemplate() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord('workflow_templates', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteWorkflowTemplate] Deleted template:', id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export function useCreateWorkflowStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (step: Omit<WorkflowStep, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await insertRecord('workflow_steps', { ...step, organization_id: organizationId });
      if (result.error) throw result.error;
      console.log('[useCreateWorkflowStep] Created step:', result.data?.id);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_steps', variables.template_id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_templates', 'withSteps', variables.template_id] });
    },
  });
}

export function useUpdateWorkflowStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowStep> & { id: string; template_id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await updateRecord('workflow_steps', id, updates, organizationId);
      if (result.error) throw result.error;
      console.log('[useUpdateWorkflowStep] Updated step:', id);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_steps', variables.template_id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_templates', 'withSteps', variables.template_id] });
    },
  });
}

export function useDeleteWorkflowStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord('workflow_steps', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteWorkflowStep] Deleted step:', id);
      return { id, templateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_steps', data.templateId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_templates', 'withSteps', data.templateId] });
    },
  });
}

export function useCreateDelegationRule() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (rule: Omit<DelegationRule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await insertRecord('delegation_rules', { ...rule, organization_id: organizationId });
      if (result.error) throw result.error;
      console.log('[useCreateDelegationRule] Created delegation:', result.data?.id);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation_rules'] });
    },
  });
}

export function useUpdateDelegationRule() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DelegationRule> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await updateRecord('delegation_rules', id, updates, organizationId);
      if (result.error) throw result.error;
      console.log('[useUpdateDelegationRule] Updated delegation:', id);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation_rules'] });
    },
  });
}

export function useDeleteDelegationRule() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord('delegation_rules', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteDelegationRule] Deleted delegation:', id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation_rules'] });
    },
  });
}

export function useCreateWorkflowInstance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (instance: Omit<WorkflowInstance, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await insertRecord('workflow_instances', { ...instance, organization_id: organizationId });
      if (result.error) throw result.error;
      
      await supabase
        .from('workflow_templates')
        .update({ usage_count: supabase.rpc('increment', { x: 1 }) })
        .eq('id', instance.template_id);
      
      console.log('[useCreateWorkflowInstance] Created instance:', result.data?.id);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export function useUpdateWorkflowInstance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowInstance> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await updateRecord('workflow_instances', id, updates, organizationId);
      if (result.error) throw result.error;
      console.log('[useUpdateWorkflowInstance] Updated instance:', id);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export function useAddWorkflowStepHistory() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (history: Omit<WorkflowStepHistory, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await insertRecord('workflow_step_history', { ...history, organization_id: organizationId });
      if (result.error) throw result.error;
      console.log('[useAddWorkflowStepHistory] Added history entry:', result.data?.id);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_step_history', variables.instance_id] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', variables.instance_id] });
    },
  });
}

export function useApproveWorkflowStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  const updateInstance = useUpdateWorkflowInstance();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      stepId,
      stepName,
      stepOrder,
      actionById,
      actionByName,
      comments,
      nextStepId,
      isLastStep,
    }: {
      instanceId: string;
      stepId: string;
      stepName: string;
      stepOrder: number;
      actionById: string;
      actionByName: string;
      comments?: string;
      nextStepId?: string;
      isLastStep: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: stepId,
        step_name: stepName,
        step_order: stepOrder,
        action: 'approved',
        action_by: actionByName,
        action_by_id: actionById,
        comments: comments ?? null,
        delegated_from: null,
        escalated_from: null,
      });
      
      await updateInstance.mutateAsync({
        id: instanceId,
        status: isLastStep ? 'approved' : 'in_progress',
        current_step_id: isLastStep ? null : (nextStepId ?? null),
        current_step_order: isLastStep ? stepOrder : stepOrder + 1,
        completed_at: isLastStep ? new Date().toISOString() : null,
      });
      
      console.log('[useApproveWorkflowStep] Approved step:', stepId, 'for instance:', instanceId);
      return { instanceId, stepId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export function useRejectWorkflowStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  const updateInstance = useUpdateWorkflowInstance();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      stepId,
      stepName,
      stepOrder,
      actionById,
      actionByName,
      comments,
    }: {
      instanceId: string;
      stepId: string;
      stepName: string;
      stepOrder: number;
      actionById: string;
      actionByName: string;
      comments?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: stepId,
        step_name: stepName,
        step_order: stepOrder,
        action: 'rejected',
        action_by: actionByName,
        action_by_id: actionById,
        comments: comments ?? null,
        delegated_from: null,
        escalated_from: null,
      });
      
      await updateInstance.mutateAsync({
        id: instanceId,
        status: 'rejected',
        completed_at: new Date().toISOString() as string | null,
      });
      
      console.log('[useRejectWorkflowStep] Rejected step:', stepId, 'for instance:', instanceId);
      return { instanceId, stepId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
    },
  });
}

export interface RejectApprovalParams {
  instanceId: string;
  stepId: string;
  stepName: string;
  stepOrder: number;
  currentTierLevel: 1 | 2 | 3 | 4 | 5;
  actionById: string;
  actionByName: string;
  rejectionReason: string;
  previousStepId?: string;
  previousStepName?: string;
}

export interface TierCascadeTarget {
  targetTier: 1 | 2 | 3 | 4 | null;
  returnedToRequestor: boolean;
  canCascadeFurther: boolean;
}

export function getTierCascadeTarget(currentTierLevel: 1 | 2 | 3 | 4 | 5): TierCascadeTarget {
  if (currentTierLevel === 1) {
    return {
      targetTier: null,
      returnedToRequestor: true,
      canCascadeFurther: false,
    };
  }
  
  const targetTier = (currentTierLevel - 1) as 1 | 2 | 3 | 4;
  return {
    targetTier,
    returnedToRequestor: false,
    canCascadeFurther: targetTier > 1,
  };
}

export function canCascadeRejection(tierLevel: number): boolean {
  return tierLevel >= 1;
}

export function getRejectionCascadePath(startTier: 1 | 2 | 3 | 4 | 5): { tier: number | null; label: string }[] {
  const path: { tier: number | null; label: string }[] = [];
  
  for (let tier = startTier; tier >= 1; tier--) {
    path.push({ tier, label: `Tier ${tier}` });
  }
  
  path.push({ tier: null, label: 'Requestor' });
  
  return path;
}

export interface RejectionResult {
  instanceId: string;
  returnedToTier: number | null;
  returnedToRequestor: boolean;
  rejectionReason: string;
  cascadeInfo: TierCascadeTarget;
}

export function useRejectApproval() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      stepId,
      stepName,
      stepOrder,
      currentTierLevel,
      actionById,
      actionByName,
      rejectionReason,
      previousStepId,
      previousStepName,
    }: RejectApprovalParams): Promise<RejectionResult> => {
      if (!organizationId) throw new Error('No organization selected');
      if (!rejectionReason.trim()) throw new Error('Rejection reason is required');
      
      console.log('[useRejectApproval] Processing rejection for instance:', instanceId, 'at tier:', currentTierLevel);
      
      const returnedToRequestor = currentTierLevel === 1;
      const returnedToTier = returnedToRequestor ? null : (currentTierLevel - 1) as 1 | 2 | 3 | 4;
      
      const rejectionHistoryEntry = {
        id: `rej-${Date.now()}`,
        tierLevel: currentTierLevel,
        rejectedBy: actionByName,
        rejectedById: actionById,
        rejectedAt: new Date().toISOString(),
        reason: rejectionReason,
        returnedToTier: returnedToTier as 1 | 2 | 3 | 4 | 5 | undefined,
        returnedToRequestor,
        previousStatus: 'in_progress' as const,
        stepId,
        stepName,
      };
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: stepId,
        step_name: stepName,
        step_order: stepOrder,
        action: 'rejected',
        action_by: actionByName,
        action_by_id: actionById,
        comments: `[RETURNED FROM TIER ${currentTierLevel} TO ${returnedToRequestor ? 'REQUESTOR' : `TIER ${returnedToTier}`}] ${rejectionReason}`,
        delegated_from: null,
        escalated_from: null,
      });
      
      const { data: currentInstance, error: fetchError } = await supabase
        .from('workflow_instances')
        .select('rejection_history')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (fetchError) {
        console.error('[useRejectApproval] Failed to fetch instance:', fetchError);
        throw new Error(fetchError.message);
      }
      
      const existingHistory = (currentInstance?.rejection_history as unknown[]) || [];
      const updatedRejectionHistory = [...existingHistory, rejectionHistoryEntry];
      
      const updatePayload: Record<string, unknown> = {
        status: 'returned',
        rejection_reason: rejectionReason,
        returned_from_tier: currentTierLevel,
        returned_at: new Date().toISOString(),
        returned_by: actionByName,
        returned_by_id: actionById,
        rejection_history: updatedRejectionHistory,
        current_step_order: returnedToRequestor ? 0 : stepOrder - 1,
      };
      
      if (previousStepId && !returnedToRequestor) {
        updatePayload.current_step_id = previousStepId;
      } else if (returnedToRequestor) {
        updatePayload.current_step_id = null;
      }
      
      const { error: updateError } = await supabase
        .from('workflow_instances')
        .update(updatePayload)
        .eq('organization_id', organizationId)
        .eq('id', instanceId);
      
      if (updateError) {
        console.error('[useRejectApproval] Failed to update instance:', updateError);
        throw new Error(updateError.message);
      }
      
      const cascadeInfo = getTierCascadeTarget(currentTierLevel);
      
      console.log('[useRejectApproval] Successfully rejected instance:', instanceId, {
        returnedToTier,
        returnedToRequestor,
        cascadeInfo,
      });
      
      return {
        instanceId,
        returnedToTier,
        returnedToRequestor,
        rejectionReason,
        cascadeInfo,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
      console.log('[useRejectApproval] Invalidated queries for instance:', data.instanceId);
    },
    onError: (error) => {
      console.error('[useRejectApproval] Rejection failed:', error);
    },
  });
}

export interface CascadeRejectionParams {
  instanceId: string;
  stepId: string;
  stepName: string;
  stepOrder: number;
  currentTierLevel: 1 | 2 | 3 | 4 | 5;
  actionById: string;
  actionByName: string;
  rejectionReason: string;
  originalRejectionReason?: string;
  cascadeFromTier?: number;
  previousStepId?: string;
}

export interface CascadeRejectionResult {
  instanceId: string;
  finalStatus: 'returned' | 'rejected';
  returnedToTier: number | null;
  returnedToRequestor: boolean;
  cascadeChain: {
    fromTier: number;
    toTier: number | null;
    rejectedBy: string;
    reason: string;
    timestamp: string;
  }[];
}

export function useCascadeRejection() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      stepId,
      stepName,
      stepOrder,
      currentTierLevel,
      actionById,
      actionByName,
      rejectionReason,
      originalRejectionReason,
      cascadeFromTier,
      previousStepId,
    }: CascadeRejectionParams): Promise<CascadeRejectionResult> => {
      if (!organizationId) throw new Error('No organization selected');
      if (!rejectionReason.trim()) throw new Error('Rejection reason is required');
      
      console.log('[useCascadeRejection] Processing cascade rejection for instance:', instanceId, {
        currentTierLevel,
        cascadeFromTier,
      });
      
      const cascadeTarget = getTierCascadeTarget(currentTierLevel);
      const { targetTier, returnedToRequestor } = cascadeTarget;
      
      const cascadeEntry = {
        fromTier: currentTierLevel,
        toTier: targetTier,
        rejectedBy: actionByName,
        reason: rejectionReason,
        timestamp: new Date().toISOString(),
      };
      
      const rejectionHistoryEntry = {
        id: `rej-cascade-${Date.now()}`,
        tierLevel: currentTierLevel,
        rejectedBy: actionByName,
        rejectedById: actionById,
        rejectedAt: new Date().toISOString(),
        reason: rejectionReason,
        returnedToTier: targetTier as 1 | 2 | 3 | 4 | 5 | undefined,
        returnedToRequestor,
        previousStatus: 'returned' as const,
        stepId,
        stepName,
        isCascade: true,
        cascadeFromTier: cascadeFromTier ?? currentTierLevel + 1,
        originalRejectionReason: originalRejectionReason ?? rejectionReason,
      };
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: stepId,
        step_name: stepName,
        step_order: stepOrder,
        action: 'rejected',
        action_by: actionByName,
        action_by_id: actionById,
        comments: `[CASCADE FROM TIER ${currentTierLevel} TO ${returnedToRequestor ? 'REQUESTOR' : `TIER ${targetTier}`}] ${rejectionReason}`,
        delegated_from: null,
        escalated_from: null,
      });
      
      const { data: currentInstance, error: fetchError } = await supabase
        .from('workflow_instances')
        .select('rejection_history, cascade_chain')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (fetchError) {
        console.error('[useCascadeRejection] Failed to fetch instance:', fetchError);
        throw new Error(fetchError.message);
      }
      
      const existingHistory = (currentInstance?.rejection_history as unknown[]) || [];
      const existingCascadeChain = (currentInstance?.cascade_chain as typeof cascadeEntry[]) || [];
      
      const updatedRejectionHistory = [...existingHistory, rejectionHistoryEntry];
      const updatedCascadeChain = [...existingCascadeChain, cascadeEntry];
      
      const finalStatus = returnedToRequestor ? 'returned' : 'returned';
      
      const updatePayload: Record<string, unknown> = {
        status: finalStatus,
        rejection_reason: rejectionReason,
        returned_from_tier: currentTierLevel,
        returned_at: new Date().toISOString(),
        returned_by: actionByName,
        returned_by_id: actionById,
        rejection_history: updatedRejectionHistory,
        cascade_chain: updatedCascadeChain,
        current_step_order: returnedToRequestor ? 0 : stepOrder - 1,
        can_cascade_further: !returnedToRequestor && targetTier !== null && targetTier > 1,
        awaiting_cascade_action: !returnedToRequestor,
        cascade_pending_tier: targetTier,
      };
      
      if (previousStepId && !returnedToRequestor) {
        updatePayload.current_step_id = previousStepId;
      } else if (returnedToRequestor) {
        updatePayload.current_step_id = null;
        updatePayload.awaiting_requestor_action = true;
        updatePayload.awaiting_cascade_action = false;
      }
      
      const { error: updateError } = await supabase
        .from('workflow_instances')
        .update(updatePayload)
        .eq('organization_id', organizationId)
        .eq('id', instanceId);
      
      if (updateError) {
        console.error('[useCascadeRejection] Failed to update instance:', updateError);
        throw new Error(updateError.message);
      }
      
      console.log('[useCascadeRejection] Successfully cascaded rejection:', instanceId, {
        fromTier: currentTierLevel,
        toTier: targetTier,
        returnedToRequestor,
        cascadeChainLength: updatedCascadeChain.length,
      });
      
      return {
        instanceId,
        finalStatus,
        returnedToTier: targetTier,
        returnedToRequestor,
        cascadeChain: updatedCascadeChain,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
      console.log('[useCascadeRejection] Invalidated queries for instance:', data.instanceId);
    },
    onError: (error) => {
      console.error('[useCascadeRejection] Cascade rejection failed:', error);
    },
  });
}

export function useReturnedToMeInstances(userId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'returnedToMe', userId, organizationId],
    queryFn: async () => {
      if (!organizationId || !userId) return [];
      
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'returned')
        .eq('awaiting_cascade_action', true)
        .order('returned_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useReturnedToMeInstances] Fetched returned instances:', data?.length || 0);
      return (data || []) as WorkflowInstance[];
    },
    enabled: !!organizationId && !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useInstancesAwaitingRequestorAction(requestorId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'awaitingRequestor', requestorId, organizationId],
    queryFn: async () => {
      if (!organizationId || !requestorId) return [];
      
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'returned')
        .eq('awaiting_requestor_action', true)
        .eq('started_by_id', requestorId)
        .order('returned_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useInstancesAwaitingRequestorAction] Fetched instances:', data?.length || 0);
      return (data || []) as WorkflowInstance[];
    },
    enabled: !!organizationId && !!requestorId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useInstancesByPendingTier(tierLevel: 1 | 2 | 3 | 4 | 5 | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'byPendingTier', tierLevel, organizationId],
    queryFn: async () => {
      if (!organizationId || !tierLevel) return [];
      
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'returned')
        .eq('awaiting_cascade_action', true)
        .eq('cascade_pending_tier', tierLevel)
        .order('returned_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useInstancesByPendingTier] Fetched instances for tier:', tierLevel, data?.length || 0);
      return (data || []) as WorkflowInstance[];
    },
    enabled: !!organizationId && !!tierLevel,
    staleTime: 1000 * 60 * 2,
  });
}

export type RequestorAction = 'resubmit' | 'cancel' | 'appeal';

export interface ResubmitParams {
  instanceId: string;
  actionById: string;
  actionByName: string;
  changes?: Record<string, unknown>;
  comments?: string;
}

export interface CancelRequestParams {
  instanceId: string;
  actionById: string;
  actionByName: string;
  reason?: string;
}

export interface AppealParams {
  instanceId: string;
  actionById: string;
  actionByName: string;
  appealReason: string;
}

export function useResubmitRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      actionById,
      actionByName,
      changes,
      comments,
    }: ResubmitParams) => {
      if (!organizationId) throw new Error('No organization selected');
      
      console.log('[useResubmitRequest] Processing resubmit for instance:', instanceId);
      
      const { data: instance, error: fetchError } = await supabase
        .from('workflow_instances')
        .select('*, template_id')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      if (!instance) throw new Error('Instance not found');
      if (instance.status !== 'returned' || !instance.awaiting_requestor_action) {
        throw new Error('This request is not awaiting requestor action');
      }
      
      const { data: firstStep, error: stepError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', instance.template_id)
        .order('step_order', { ascending: true })
        .limit(1)
        .single();
      
      if (stepError && stepError.code !== 'PGRST116') throw new Error(stepError.message);
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: firstStep?.id ?? 'resubmit',
        step_name: 'Resubmitted by Requestor',
        step_order: 0,
        action: 'approved',
        action_by: actionByName,
        action_by_id: actionById,
        comments: comments ? `[RESUBMITTED] ${comments}` : '[RESUBMITTED] Request resubmitted after rejection',
        delegated_from: null,
        escalated_from: null,
      });
      
      const resubmitRecord = {
        resubmittedAt: new Date().toISOString(),
        resubmittedBy: actionByName,
        resubmittedById: actionById,
        changes: changes ?? null,
        comments: comments ?? null,
        previousRejectionCount: ((instance.rejection_history as unknown[]) || []).length,
      };
      
      const existingResubmits = (instance.resubmit_history as unknown[]) || [];
      
      const updatePayload: Record<string, unknown> = {
        status: 'pending',
        current_step_id: firstStep?.id ?? null,
        current_step_order: 1,
        awaiting_requestor_action: false,
        awaiting_cascade_action: false,
        cascade_pending_tier: null,
        returned_from_tier: null,
        returned_at: null,
        returned_by: null,
        returned_by_id: null,
        resubmit_history: [...existingResubmits, resubmitRecord],
        resubmit_count: (instance.resubmit_count ?? 0) + 1,
        last_resubmitted_at: new Date().toISOString(),
      };
      
      if (changes) {
        updatePayload.metadata = { ...((instance.metadata as Record<string, unknown>) || {}), ...changes };
      }
      
      const { error: updateError } = await supabase
        .from('workflow_instances')
        .update(updatePayload)
        .eq('organization_id', organizationId)
        .eq('id', instanceId);
      
      if (updateError) throw new Error(updateError.message);
      
      console.log('[useResubmitRequest] Successfully resubmitted instance:', instanceId);
      
      return {
        instanceId,
        newStatus: 'pending' as const,
        resubmitCount: (instance.resubmit_count ?? 0) + 1,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
      console.log('[useResubmitRequest] Invalidated queries for instance:', data.instanceId);
    },
    onError: (error) => {
      console.error('[useResubmitRequest] Resubmit failed:', error);
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      actionById,
      actionByName,
      reason,
    }: CancelRequestParams) => {
      if (!organizationId) throw new Error('No organization selected');
      
      console.log('[useCancelRequest] Processing cancel for instance:', instanceId);
      
      const { data: instance, error: fetchError } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      if (!instance) throw new Error('Instance not found');
      
      if (instance.started_by_id !== actionById) {
        throw new Error('Only the original requestor can cancel this request');
      }
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: 'cancel',
        step_name: 'Cancelled by Requestor',
        step_order: instance.current_step_order ?? 0,
        action: 'rejected',
        action_by: actionByName,
        action_by_id: actionById,
        comments: reason ? `[CANCELLED] ${reason}` : '[CANCELLED] Request cancelled by requestor',
        delegated_from: null,
        escalated_from: null,
      });
      
      const updatePayload: Record<string, unknown> = {
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
        cancelled_by: actionByName,
        cancelled_by_id: actionById,
        cancellation_reason: reason ?? 'Cancelled by requestor',
        awaiting_requestor_action: false,
        awaiting_cascade_action: false,
      };
      
      const { error: updateError } = await supabase
        .from('workflow_instances')
        .update(updatePayload)
        .eq('organization_id', organizationId)
        .eq('id', instanceId);
      
      if (updateError) throw new Error(updateError.message);
      
      console.log('[useCancelRequest] Successfully cancelled instance:', instanceId);
      
      return {
        instanceId,
        newStatus: 'cancelled' as const,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
      console.log('[useCancelRequest] Invalidated queries for instance:', data.instanceId);
    },
    onError: (error) => {
      console.error('[useCancelRequest] Cancel failed:', error);
    },
  });
}

export function useAppealRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const addHistory = useAddWorkflowStepHistory();
  
  return useMutation({
    mutationFn: async ({
      instanceId,
      actionById,
      actionByName,
      appealReason,
    }: AppealParams) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!appealReason.trim()) throw new Error('Appeal reason is required');
      
      console.log('[useAppealRequest] Processing appeal for instance:', instanceId);
      
      const { data: instance, error: fetchError } = await supabase
        .from('workflow_instances')
        .select('*, template_id')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      if (!instance) throw new Error('Instance not found');
      if (instance.status !== 'returned' || !instance.awaiting_requestor_action) {
        throw new Error('This request is not awaiting requestor action');
      }
      
      const { data: firstStep, error: stepError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', instance.template_id)
        .order('step_order', { ascending: true })
        .limit(1)
        .single();
      
      if (stepError && stepError.code !== 'PGRST116') throw new Error(stepError.message);
      
      await addHistory.mutateAsync({
        instance_id: instanceId,
        step_id: firstStep?.id ?? 'appeal',
        step_name: 'Appeal Submitted',
        step_order: 0,
        action: 'approved',
        action_by: actionByName,
        action_by_id: actionById,
        comments: `[APPEAL] ${appealReason}`,
        delegated_from: null,
        escalated_from: null,
      });
      
      const appealRecord = {
        appealedAt: new Date().toISOString(),
        appealedBy: actionByName,
        appealedById: actionById,
        appealReason,
        previousRejectionCount: ((instance.rejection_history as unknown[]) || []).length,
      };
      
      const existingAppeals = (instance.appeal_history as unknown[]) || [];
      
      const updatePayload: Record<string, unknown> = {
        status: 'pending',
        current_step_id: firstStep?.id ?? null,
        current_step_order: 1,
        awaiting_requestor_action: false,
        awaiting_cascade_action: false,
        cascade_pending_tier: null,
        returned_from_tier: null,
        returned_at: null,
        returned_by: null,
        returned_by_id: null,
        appeal_history: [...existingAppeals, appealRecord],
        appeal_count: (instance.appeal_count ?? 0) + 1,
        last_appealed_at: new Date().toISOString(),
        is_appeal: true,
      };
      
      const { error: updateError } = await supabase
        .from('workflow_instances')
        .update(updatePayload)
        .eq('organization_id', organizationId)
        .eq('id', instanceId);
      
      if (updateError) throw new Error(updateError.message);
      
      console.log('[useAppealRequest] Successfully appealed instance:', instanceId);
      
      return {
        instanceId,
        newStatus: 'pending' as const,
        appealCount: (instance.appeal_count ?? 0) + 1,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'byId', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances', 'withHistory', data.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['workflow_stats'] });
      console.log('[useAppealRequest] Invalidated queries for instance:', data.instanceId);
    },
    onError: (error) => {
      console.error('[useAppealRequest] Appeal failed:', error);
    },
  });
}

export function useRequestorRejectedItems(requestorId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'requestorRejected', requestorId, organizationId],
    queryFn: async () => {
      if (!organizationId || !requestorId) return [];
      
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('started_by_id', requestorId)
        .in('status', ['returned', 'rejected'])
        .order('returned_at', { ascending: false, nullsFirst: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useRequestorRejectedItems] Fetched rejected items for requestor:', requestorId, data?.length || 0);
      return (data || []) as WorkflowInstance[];
    },
    enabled: !!organizationId && !!requestorId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCanRequestorTakeAction(instanceId: string | undefined | null, requestorId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['workflow_instances', 'canRequestorAct', instanceId, requestorId, organizationId],
    queryFn: async () => {
      if (!organizationId || !instanceId || !requestorId) {
        return { canAct: false, reason: 'Missing parameters', availableActions: [] as RequestorAction[] };
      }
      
      const { data: instance, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (error) throw new Error(error.message);
      if (!instance) return { canAct: false, reason: 'Instance not found', availableActions: [] as RequestorAction[] };
      
      if (instance.started_by_id !== requestorId) {
        return { canAct: false, reason: 'Not the original requestor', availableActions: [] as RequestorAction[] };
      }
      
      if (instance.status === 'returned' && instance.awaiting_requestor_action) {
        return {
          canAct: true,
          reason: 'Awaiting requestor action',
          availableActions: ['resubmit', 'cancel', 'appeal'] as RequestorAction[],
          instance,
        };
      }
      
      if (instance.status === 'pending' || instance.status === 'in_progress') {
        return {
          canAct: true,
          reason: 'Request is active',
          availableActions: ['cancel'] as RequestorAction[],
          instance,
        };
      }
      
      return {
        canAct: false,
        reason: `Request is ${instance.status}`,
        availableActions: [] as RequestorAction[],
        instance,
      };
    },
    enabled: !!organizationId && !!instanceId && !!requestorId,
    staleTime: 1000 * 60,
  });
}

export function useRejectionHistoryForInstance(instanceId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['rejection_history', instanceId, organizationId],
    queryFn: async () => {
      if (!organizationId || !instanceId) return { rejectionHistory: [], cascadeChain: [], resubmitHistory: [], appealHistory: [] };
      
      const { data: instance, error } = await supabase
        .from('workflow_instances')
        .select('rejection_history, cascade_chain, resubmit_history, appeal_history')
        .eq('organization_id', organizationId)
        .eq('id', instanceId)
        .single();
      
      if (error) throw new Error(error.message);
      if (!instance) return { rejectionHistory: [], cascadeChain: [], resubmitHistory: [], appealHistory: [] };
      
      console.log('[useRejectionHistoryForInstance] Fetched rejection history for:', instanceId);
      
      return {
        rejectionHistory: (instance.rejection_history as unknown[]) || [],
        cascadeChain: (instance.cascade_chain as unknown[]) || [],
        resubmitHistory: (instance.resubmit_history as unknown[]) || [],
        appealHistory: (instance.appeal_history as unknown[]) || [],
      };
    },
    enabled: !!organizationId && !!instanceId,
    staleTime: 1000 * 60 * 2,
  });
}
