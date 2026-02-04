import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  DepartmentType,
  DepartmentWorkflow,
  CompletedDocumentationSection,
  DEPARTMENTS,
  DOCUMENTATION_TEMPLATES,
  getTemplatesByDepartment,
  getDepartmentById,
} from '@/mocks/workOrderData';

export { DEPARTMENTS, DOCUMENTATION_TEMPLATES, getTemplatesByDepartment, getDepartmentById };
export type { DepartmentType, DepartmentWorkflow, CompletedDocumentationSection };

export interface AddDocumentationInput {
  workOrderId: string;
  section: CompletedDocumentationSection;
  currentWorkflow?: DepartmentWorkflow;
}

export interface SendToDepartmentInput {
  workOrderId: string;
  targetDepartment: DepartmentType;
  sentBy: string;
  notes?: string;
  currentWorkflow?: DepartmentWorkflow;
}

export interface UpdateWorkflowInput {
  workOrderId: string;
  updates: Partial<DepartmentWorkflow>;
  currentWorkflow?: DepartmentWorkflow;
}

function generateWorkflowId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useAddDocumentation(options?: {
  onSuccess?: (workflow: DepartmentWorkflow) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, section, currentWorkflow }: AddDocumentationInput) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useAddDocumentation] Adding documentation to work order:', workOrderId);

      const existingWorkflow = currentWorkflow || {
        id: generateWorkflowId(),
        workOrderId,
        currentDepartment: section.department,
        departmentQueue: [],
        completedDepartments: [],
        routingHistory: [],
        documentationSections: [],
      };

      const updatedSections = [...(existingWorkflow.documentationSections || []), section];

      const updatedWorkflow: DepartmentWorkflow = {
        ...existingWorkflow,
        documentationSections: updatedSections,
      };

      const { data, error } = await supabase
        .from('work_orders')
        .update({
          workflow: updatedWorkflow,
          current_department: updatedWorkflow.currentDepartment,
        })
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select('workflow')
        .single();

      if (error) {
        console.error('[useAddDocumentation] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useAddDocumentation] Documentation added successfully');
      return (data?.workflow as DepartmentWorkflow) || updatedWorkflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.(workflow);
    },
    onError: (error) => {
      console.error('[useAddDocumentation] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSendToDepartment(options?: {
  onSuccess?: (workflow: DepartmentWorkflow) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      targetDepartment, 
      sentBy, 
      notes, 
      currentWorkflow 
    }: SendToDepartmentInput) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useSendToDepartment] Sending work order to department:', targetDepartment);

      const existingWorkflow = currentWorkflow || {
        id: generateWorkflowId(),
        workOrderId,
        currentDepartment: targetDepartment,
        departmentQueue: [],
        completedDepartments: [],
        routingHistory: [],
        documentationSections: [],
      };

      const previousDepartment = existingWorkflow.currentDepartment;
      const completedDepts = existingWorkflow.completedDepartments || [];
      
      const updatedCompletedDepartments = previousDepartment && 
        !completedDepts.includes(previousDepartment)
        ? [...completedDepts, previousDepartment]
        : completedDepts;

      const routingEntry = {
        department: targetDepartment,
        sentBy,
        sentAt: new Date().toISOString(),
        notes,
      };

      const updatedWorkflow: DepartmentWorkflow = {
        ...existingWorkflow,
        currentDepartment: targetDepartment,
        completedDepartments: updatedCompletedDepartments,
        routingHistory: [...(existingWorkflow.routingHistory || []), routingEntry],
      };

      const { data, error } = await supabase
        .from('work_orders')
        .update({
          workflow: updatedWorkflow,
          current_department: targetDepartment,
        })
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select('workflow')
        .single();

      if (error) {
        console.error('[useSendToDepartment] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useSendToDepartment] Work order sent to department:', targetDepartment);
      return (data?.workflow as DepartmentWorkflow) || updatedWorkflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.(workflow);
    },
    onError: (error) => {
      console.error('[useSendToDepartment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateDepartmentWorkflow(options?: {
  onSuccess?: (workflow: DepartmentWorkflow) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, updates, currentWorkflow }: UpdateWorkflowInput) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useUpdateDepartmentWorkflow] Updating workflow for:', workOrderId);

      const existingWorkflow = currentWorkflow || {
        id: generateWorkflowId(),
        workOrderId,
        currentDepartment: 'maintenance' as DepartmentType,
        departmentQueue: [],
        completedDepartments: [],
        routingHistory: [],
        documentationSections: [],
      };

      const updatedWorkflow: DepartmentWorkflow = {
        ...existingWorkflow,
        ...updates,
      };

      const { data, error } = await supabase
        .from('work_orders')
        .update({
          workflow: updatedWorkflow,
          current_department: updatedWorkflow.currentDepartment,
        })
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select('workflow')
        .single();

      if (error) {
        console.error('[useUpdateDepartmentWorkflow] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateDepartmentWorkflow] Workflow updated successfully');
      return (data?.workflow as DepartmentWorkflow) || updatedWorkflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.(workflow);
    },
    onError: (error) => {
      console.error('[useUpdateDepartmentWorkflow] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCompleteDepartmentWorkflow(options?: {
  onSuccess?: (workflow: DepartmentWorkflow) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      department,
      currentWorkflow 
    }: { 
      workOrderId: string; 
      department: DepartmentType;
      currentWorkflow?: DepartmentWorkflow;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useCompleteDepartmentWorkflow] Completing department:', department);

      const existingWorkflow = currentWorkflow || {
        id: generateWorkflowId(),
        workOrderId,
        currentDepartment: department,
        departmentQueue: [],
        completedDepartments: [],
        routingHistory: [],
        documentationSections: [],
      };

      const completedDepts = existingWorkflow.completedDepartments || [];
      const updatedCompletedDepartments = !completedDepts.includes(department)
        ? [...completedDepts, department]
        : completedDepts;

      const updatedWorkflow: DepartmentWorkflow = {
        ...existingWorkflow,
        completedDepartments: updatedCompletedDepartments,
      };

      const { data, error } = await supabase
        .from('work_orders')
        .update({
          workflow: updatedWorkflow,
        })
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select('workflow')
        .single();

      if (error) {
        console.error('[useCompleteDepartmentWorkflow] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCompleteDepartmentWorkflow] Department completed:', department);
      return (data?.workflow as DepartmentWorkflow) || updatedWorkflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.(workflow);
    },
    onError: (error) => {
      console.error('[useCompleteDepartmentWorkflow] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function getDepartmentProgress(workflow?: DepartmentWorkflow): {
  completed: number;
  total: number;
  percentage: number;
  departments: { id: DepartmentType; name: string; completed: boolean }[];
} {
  const allDepartments = DEPARTMENTS;
  const completedDepts = workflow?.completedDepartments || [];
  
  const departments = allDepartments.map(d => ({
    id: d.id,
    name: d.name,
    completed: completedDepts.includes(d.id),
  }));

  const completed = completedDepts.length;
  const total = allDepartments.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage, departments };
}

export function getDocumentationStats(workflow?: DepartmentWorkflow): {
  total: number;
  byDepartment: Record<DepartmentType, number>;
  recentDocumentation: CompletedDocumentationSection[];
} {
  const sections = workflow?.documentationSections || [];
  
  const byDepartment = sections.reduce((acc, section) => {
    acc[section.department] = (acc[section.department] || 0) + 1;
    return acc;
  }, {} as Record<DepartmentType, number>);

  const recentDocumentation = [...sections]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  return {
    total: sections.length,
    byDepartment,
    recentDocumentation,
  };
}
