import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  MOCK_NEW_HIRE_ONBOARDINGS,
  MOCK_ONBOARDING_TEMPLATES,
  WORKFLOW_STAGES,
  DEFAULT_MILESTONES,
  DOCUMENT_TYPES,
  DEPARTMENTS,
  FACILITIES,
  SUPERVISORS,
  BUDDIES,
  type NewHireOnboarding,
  type OnboardingTemplate,
  type OnboardingTask,
  type OnboardingDocument,
  type OnboardingNote,
  type OnboardingStatus,
  type WorkflowMilestone,
  type MilestoneStatus,
  type DocumentStatus,
  type WorkflowStage,
} from '@/mocks/onboardingData';

export interface SupabaseOnboarding {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_phone: string | null;
  position: string;
  department: string;
  facility_id: string;
  facility_name: string;
  hire_date: string;
  start_date: string;
  template_id: string;
  template_name: string;
  status: OnboardingStatus;
  progress: number;
  current_stage: WorkflowStage;
  supervisor_id: string | null;
  supervisor_name: string | null;
  buddy_id: string | null;
  buddy_name: string | null;
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'intern';
  work_location: string | null;
  salary: number | null;
  salary_type: 'hourly' | 'annual' | null;
  on_hold_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tasks: OnboardingTask[];
  documents: OnboardingDocument[];
  milestones: WorkflowMilestone[];
  notes: OnboardingNote[];
  status_history: Array<{
    id: string;
    onboardingId: string;
    fromStatus: OnboardingStatus;
    toStatus: OnboardingStatus;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
}

export interface CreateOnboardingInput {
  employee_name: string;
  employee_email: string;
  employee_phone?: string;
  position: string;
  department: string;
  facility_id: string;
  start_date: string;
  template_id: string;
  supervisor_id?: string;
  buddy_id?: string;
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'intern';
  work_location?: string;
  salary?: number;
  salary_type?: 'hourly' | 'annual';
}

export interface UpdateOnboardingInput {
  position?: string;
  department?: string;
  facility_id?: string;
  supervisor_id?: string;
  buddy_id?: string;
  work_location?: string;
  status?: OnboardingStatus;
  on_hold_reason?: string;
  progress?: number;
  current_stage?: WorkflowStage;
}

const mapToNewHireOnboarding = (data: SupabaseOnboarding): NewHireOnboarding => ({
  id: data.id,
  employeeId: data.employee_id,
  employeeName: data.employee_name,
  employeeEmail: data.employee_email,
  employeePhone: data.employee_phone || undefined,
  position: data.position,
  department: data.department,
  facilityId: data.facility_id,
  facilityName: data.facility_name,
  hireDate: data.hire_date,
  startDate: data.start_date,
  templateId: data.template_id,
  templateName: data.template_name,
  status: data.status,
  progress: data.progress,
  currentStage: data.current_stage,
  supervisorId: data.supervisor_id || undefined,
  supervisorName: data.supervisor_name || undefined,
  buddyId: data.buddy_id || undefined,
  buddyName: data.buddy_name || undefined,
  employmentType: data.employment_type,
  workLocation: data.work_location || undefined,
  salary: data.salary || undefined,
  salaryType: data.salary_type || undefined,
  onHoldReason: data.on_hold_reason || undefined,
  completedAt: data.completed_at || undefined,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  tasks: data.tasks || [],
  documents: data.documents || [],
  milestones: data.milestones || [],
  notes: data.notes || [],
  statusHistory: data.status_history || [],
});

export function useOnboardings(options?: { status?: OnboardingStatus; stage?: WorkflowStage }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['onboardings', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useOnboardings] No organization ID, using mock data');
        let filtered = [...MOCK_NEW_HIRE_ONBOARDINGS];
        
        if (options?.status) {
          filtered = filtered.filter(o => o.status === options.status);
        }
        if (options?.stage) {
          filtered = filtered.filter(o => o.currentStage === options.stage);
        }
        
        return filtered;
      }

      console.log('[useOnboardings] Fetching from Supabase for org:', organizationId);
      
      let query = supabase
        .from('onboardings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: true });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.stage) {
        query = query.eq('current_stage', options.stage);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useOnboardings] Error fetching from Supabase:', error);
        console.log('[useOnboardings] Falling back to mock data');
        let filtered = [...MOCK_NEW_HIRE_ONBOARDINGS];
        
        if (options?.status) {
          filtered = filtered.filter(o => o.status === options.status);
        }
        if (options?.stage) {
          filtered = filtered.filter(o => o.currentStage === options.stage);
        }
        
        return filtered;
      }

      if (!data || data.length === 0) {
        console.log('[useOnboardings] No data in Supabase, using mock data');
        let filtered = [...MOCK_NEW_HIRE_ONBOARDINGS];
        
        if (options?.status) {
          filtered = filtered.filter(o => o.status === options.status);
        }
        if (options?.stage) {
          filtered = filtered.filter(o => o.currentStage === options.stage);
        }
        
        return filtered;
      }

      console.log(`[useOnboardings] Fetched ${data.length} onboardings from Supabase`);
      return data.map(mapToNewHireOnboarding);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOnboarding(onboardingId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['onboarding', onboardingId, organizationId],
    queryFn: async () => {
      if (!onboardingId) {
        return null;
      }

      if (!organizationId) {
        console.log('[useOnboarding] No organization ID, using mock data');
        const mockOnboarding = MOCK_NEW_HIRE_ONBOARDINGS.find(o => o.id === onboardingId);
        return mockOnboarding || null;
      }

      const { data, error } = await supabase
        .from('onboardings')
        .select('*')
        .eq('id', onboardingId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useOnboarding] Error:', error);
        const mockOnboarding = MOCK_NEW_HIRE_ONBOARDINGS.find(o => o.id === onboardingId);
        return mockOnboarding || null;
      }

      console.log(`[useOnboarding] Fetched onboarding: ${onboardingId}`);
      return mapToNewHireOnboarding(data);
    },
    enabled: !!onboardingId,
  });
}

export function useOnboardingTemplates() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['onboarding-templates', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useOnboardingTemplates] No organization ID, using mock data');
        return MOCK_ONBOARDING_TEMPLATES;
      }

      const { data, error } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        console.log('[useOnboardingTemplates] Using mock data');
        return MOCK_ONBOARDING_TEMPLATES;
      }

      console.log(`[useOnboardingTemplates] Fetched ${data.length} templates`);
      return data as OnboardingTemplate[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateOnboarding() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateOnboardingInput) => {
      console.log('[useCreateOnboarding] Creating onboarding:', input);

      const template = MOCK_ONBOARDING_TEMPLATES.find(t => t.id === input.template_id);
      const facility = FACILITIES.find(f => f.id === input.facility_id);
      const supervisor = SUPERVISORS.find(s => s.id === input.supervisor_id);
      const buddy = BUDDIES.find(b => b.id === input.buddy_id);

      const newId = `onb-${Date.now()}`;
      const startDate = new Date(input.start_date);

      const tasks: OnboardingTask[] = template?.tasks.map((t, idx) => {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + t.daysFromStart);
        return {
          id: `task-${newId}-${idx}`,
          onboardingId: newId,
          templateTaskId: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          status: 'pending' as const,
          assignedTo: t.assignedDepartment,
          dueDate: dueDate.toISOString().split('T')[0],
          isRequired: t.isRequired,
        };
      }) || [];

      const documents: OnboardingDocument[] = DOCUMENT_TYPES
        .filter(d => d.isRequired || input.employment_type === 'full_time')
        .map((d, idx) => {
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + 3);
          return {
            id: `doc-${newId}-${idx}`,
            onboardingId: newId,
            documentType: d.id,
            documentName: d.name,
            status: 'not_submitted' as const,
            isRequired: d.isRequired,
            dueDate: dueDate.toISOString().split('T')[0],
          };
        });

      const milestones: WorkflowMilestone[] = DEFAULT_MILESTONES.map((m, idx) => {
        const milestoneDate = new Date(startDate);
        milestoneDate.setDate(milestoneDate.getDate() + m.daysFromStart);
        return {
          id: `ms-${newId}-${idx}`,
          ...m,
          status: 'pending' as const,
        };
      });

      const newOnboarding: NewHireOnboarding = {
        id: newId,
        employeeId: `emp-${Date.now()}`,
        employeeName: input.employee_name,
        employeeEmail: input.employee_email,
        employeePhone: input.employee_phone,
        position: input.position,
        department: input.department,
        facilityId: input.facility_id,
        facilityName: facility?.name || 'Main Campus',
        hireDate: new Date().toISOString().split('T')[0],
        startDate: input.start_date,
        templateId: input.template_id,
        templateName: template?.name || 'Standard',
        status: 'not_started',
        progress: 0,
        currentStage: 'pre_boarding',
        supervisorId: input.supervisor_id,
        supervisorName: supervisor?.name,
        buddyId: input.buddy_id,
        buddyName: buddy?.name,
        employmentType: input.employment_type,
        workLocation: input.work_location,
        salary: input.salary,
        salaryType: input.salary_type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks,
        documents,
        milestones,
        notes: [{
          id: `note-${newId}-init`,
          onboardingId: newId,
          content: 'Onboarding initiated',
          createdBy: 'Current User',
          createdAt: new Date().toISOString(),
          isPrivate: false,
          noteType: 'general',
        }],
        statusHistory: [],
      };

      if (!organizationId) {
        console.log('[useCreateOnboarding] No org ID, returning mock onboarding');
        return newOnboarding;
      }

      const { data, error } = await supabase
        .from('onboardings')
        .insert({
          organization_id: organizationId,
          employee_id: newOnboarding.employeeId,
          employee_name: input.employee_name,
          employee_email: input.employee_email,
          employee_phone: input.employee_phone,
          position: input.position,
          department: input.department,
          facility_id: input.facility_id,
          facility_name: facility?.name || 'Main Campus',
          hire_date: newOnboarding.hireDate,
          start_date: input.start_date,
          template_id: input.template_id,
          template_name: template?.name || 'Standard',
          status: 'not_started',
          progress: 0,
          current_stage: 'pre_boarding',
          supervisor_id: input.supervisor_id,
          supervisor_name: supervisor?.name,
          buddy_id: input.buddy_id,
          buddy_name: buddy?.name,
          employment_type: input.employment_type,
          work_location: input.work_location,
          salary: input.salary,
          salary_type: input.salary_type,
          tasks,
          documents,
          milestones,
          notes: newOnboarding.notes,
          status_history: [],
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateOnboarding] Supabase error:', error);
        return newOnboarding;
      }

      console.log('[useCreateOnboarding] Created onboarding:', data.id);
      return mapToNewHireOnboarding(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardings'] });
    },
  });
}

export function useUpdateOnboarding() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateOnboardingInput }) => {
      console.log('[useUpdateOnboarding] Updating onboarding:', id, updates);

      if (!organizationId) {
        console.log('[useUpdateOnboarding] No org ID, returning mock update');
        return { id, ...updates };
      }

      const { data, error } = await supabase
        .from('onboardings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateOnboarding] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateOnboarding] Updated onboarding:', id);
      return mapToNewHireOnboarding(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', variables.id] });
    },
  });
}

export function useUpdateOnboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      onboardingId, 
      taskId, 
      status 
    }: { 
      onboardingId: string; 
      taskId: string; 
      status: 'pending' | 'in_progress' | 'completed' 
    }) => {
      console.log('[useUpdateOnboardingTask] Updating task:', taskId, status);
      return { onboardingId, taskId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', variables.onboardingId] });
    },
  });
}

export function useUpdateOnboardingMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      onboardingId, 
      milestoneId, 
      status 
    }: { 
      onboardingId: string; 
      milestoneId: string; 
      status: MilestoneStatus 
    }) => {
      console.log('[useUpdateOnboardingMilestone] Updating milestone:', milestoneId, status);
      return { onboardingId, milestoneId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', variables.onboardingId] });
    },
  });
}

export function useUpdateOnboardingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      onboardingId, 
      documentId, 
      status,
      reviewedBy 
    }: { 
      onboardingId: string; 
      documentId: string; 
      status: DocumentStatus;
      reviewedBy?: string;
    }) => {
      console.log('[useUpdateOnboardingDocument] Updating document:', documentId, status);
      return { onboardingId, documentId, status, reviewedBy };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', variables.onboardingId] });
    },
  });
}

export function useAddOnboardingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      onboardingId, 
      content, 
      isPrivate,
      noteType = 'general'
    }: { 
      onboardingId: string; 
      content: string; 
      isPrivate: boolean;
      noteType?: 'general' | 'status_change' | 'task_update' | 'document_update';
    }) => {
      console.log('[useAddOnboardingNote] Adding note to:', onboardingId);
      const note: OnboardingNote = {
        id: `note-${Date.now()}`,
        onboardingId,
        content,
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        isPrivate,
        noteType,
      };
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboardings'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', variables.onboardingId] });
    },
  });
}

export function useOnboardingStats() {
  const { data: onboardings } = useOnboardings();

  return {
    activeCount: onboardings?.filter(o => o.status === 'in_progress' || o.status === 'not_started').length || 0,
    completedCount: onboardings?.filter(o => o.status === 'completed').length || 0,
    onHoldCount: onboardings?.filter(o => o.status === 'on_hold').length || 0,
    taskCompletion: (() => {
      if (!onboardings) return 0;
      const totalTasks = onboardings.reduce((sum, o) => sum + o.tasks.length, 0);
      const completedTasks = onboardings.reduce(
        (sum, o) => sum + o.tasks.filter(t => t.status === 'completed').length,
        0
      );
      return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    })(),
    pendingDocuments: onboardings?.reduce(
      (sum, o) => sum + o.documents.filter(d => d.status === 'pending_review').length,
      0
    ) || 0,
    milestoneCompletion: (() => {
      if (!onboardings) return 0;
      const totalMilestones = onboardings.reduce((sum, o) => sum + (o.milestones?.length || 0), 0);
      const completedMilestones = onboardings.reduce(
        (sum, o) => sum + (o.milestones?.filter(m => m.status === 'completed').length || 0),
        0
      );
      return totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    })(),
  };
}

export {
  MOCK_NEW_HIRE_ONBOARDINGS,
  MOCK_ONBOARDING_TEMPLATES,
  WORKFLOW_STAGES,
  DEFAULT_MILESTONES,
  DOCUMENT_TYPES,
  DEPARTMENTS,
  FACILITIES,
  SUPERVISORS,
  BUDDIES,
};
