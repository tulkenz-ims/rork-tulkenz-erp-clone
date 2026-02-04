import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  MOCK_EMPLOYEE_OFFBOARDINGS,
  OFFBOARDING_STAGES,
  SEPARATION_TYPE_CONFIG,
  OFFBOARDING_STATUS_CONFIG,
  TASK_CATEGORY_CONFIG,
  DEFAULT_OFFBOARDING_TASKS,
  DEFAULT_OFFBOARDING_MILESTONES,
  DEPARTMENTS,
  FACILITIES,
  HR_CONTACTS,
  type EmployeeOffboarding,
  type OffboardingStatus,
  type SeparationType,
  type OffboardingStage,
  type OffboardingTask,
  type OffboardingTaskStatus,
  type OffboardingMilestone,
  type MilestoneStatus,
  type OffboardingNote,
  type EquipmentItem,
  type ExitInterview,
} from '@/mocks/offboardingData';

export interface SupabaseOffboarding {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_phone: string | null;
  employee_code: string;
  position: string;
  department: string;
  facility_id: string;
  facility_name: string;
  hire_date: string;
  separation_date: string;
  last_working_day: string;
  notice_date: string;
  separation_type: SeparationType;
  separation_reason: string | null;
  status: OffboardingStatus;
  progress: number;
  current_stage: OffboardingStage;
  supervisor_id: string | null;
  supervisor_name: string | null;
  hr_contact_id: string | null;
  hr_contact_name: string | null;
  years_of_service: number;
  final_pay_date: string | null;
  cobra_eligible: boolean | null;
  cobra_elected: boolean | null;
  pto_balance: number | null;
  pto_payout: number | null;
  severance_package: boolean | null;
  severance_amount: number | null;
  non_compete_applies: boolean | null;
  rehire_eligible: boolean | null;
  on_hold_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tasks: OffboardingTask[];
  milestones: OffboardingMilestone[];
  notes: OffboardingNote[];
  status_history: Array<{
    id: string;
    offboardingId: string;
    fromStatus: OffboardingStatus;
    toStatus: OffboardingStatus;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
  equipment: EquipmentItem[];
  exit_interview: ExitInterview | null;
}

export interface CreateOffboardingInput {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_phone?: string;
  employee_code: string;
  position: string;
  department: string;
  facility_id: string;
  separation_date: string;
  last_working_day: string;
  notice_date: string;
  separation_type: SeparationType;
  separation_reason?: string;
  supervisor_id?: string;
  hr_contact_id?: string;
  years_of_service: number;
  cobra_eligible?: boolean;
  pto_balance?: number;
  pto_payout?: number;
  severance_package?: boolean;
  severance_amount?: number;
  non_compete_applies?: boolean;
}

export interface UpdateOffboardingInput {
  status?: OffboardingStatus;
  progress?: number;
  current_stage?: OffboardingStage;
  separation_date?: string;
  last_working_day?: string;
  separation_reason?: string;
  on_hold_reason?: string;
  final_pay_date?: string;
  cobra_elected?: boolean;
  rehire_eligible?: boolean;
}

const mapToEmployeeOffboarding = (data: SupabaseOffboarding): EmployeeOffboarding => ({
  id: data.id,
  employeeId: data.employee_id,
  employeeName: data.employee_name,
  employeeEmail: data.employee_email,
  employeePhone: data.employee_phone || undefined,
  employeeCode: data.employee_code,
  position: data.position,
  department: data.department,
  facilityId: data.facility_id,
  facilityName: data.facility_name,
  hireDate: data.hire_date,
  separationDate: data.separation_date,
  lastWorkingDay: data.last_working_day,
  noticeDate: data.notice_date,
  separationType: data.separation_type,
  separationReason: data.separation_reason || undefined,
  status: data.status,
  progress: data.progress,
  currentStage: data.current_stage,
  supervisorId: data.supervisor_id || undefined,
  supervisorName: data.supervisor_name || undefined,
  hrContactId: data.hr_contact_id || undefined,
  hrContactName: data.hr_contact_name || undefined,
  yearsOfService: data.years_of_service,
  finalPayDate: data.final_pay_date || undefined,
  cobraEligible: data.cobra_eligible || undefined,
  cobraElected: data.cobra_elected || undefined,
  ptoBalance: data.pto_balance || undefined,
  ptoPayout: data.pto_payout || undefined,
  severancePackage: data.severance_package || undefined,
  severanceAmount: data.severance_amount || undefined,
  nonCompeteApplies: data.non_compete_applies || undefined,
  rehireEligible: data.rehire_eligible || undefined,
  onHoldReason: data.on_hold_reason || undefined,
  completedAt: data.completed_at || undefined,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  tasks: data.tasks || [],
  milestones: data.milestones || [],
  notes: data.notes || [],
  statusHistory: data.status_history || [],
  equipment: data.equipment || [],
  exitInterview: data.exit_interview || undefined,
});

export function useOffboardings(options?: { status?: OffboardingStatus; stage?: OffboardingStage; separationType?: SeparationType }) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['offboardings', organizationId, options],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useOffboardings] No organization ID, using mock data');
        let filtered = [...MOCK_EMPLOYEE_OFFBOARDINGS];
        
        if (options?.status) {
          filtered = filtered.filter(o => o.status === options.status);
        }
        if (options?.stage) {
          filtered = filtered.filter(o => o.currentStage === options.stage);
        }
        if (options?.separationType) {
          filtered = filtered.filter(o => o.separationType === options.separationType);
        }
        
        return filtered;
      }

      console.log('[useOffboardings] Fetching from Supabase for org:', organizationId);
      
      let query = supabase
        .from('offboardings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('separation_date', { ascending: true });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.stage) {
        query = query.eq('current_stage', options.stage);
      }

      if (options?.separationType) {
        query = query.eq('separation_type', options.separationType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useOffboardings] Error fetching from Supabase:', error);
        console.log('[useOffboardings] Falling back to mock data');
        let filtered = [...MOCK_EMPLOYEE_OFFBOARDINGS];
        
        if (options?.status) {
          filtered = filtered.filter(o => o.status === options.status);
        }
        if (options?.stage) {
          filtered = filtered.filter(o => o.currentStage === options.stage);
        }
        if (options?.separationType) {
          filtered = filtered.filter(o => o.separationType === options.separationType);
        }
        
        return filtered;
      }

      if (!data || data.length === 0) {
        console.log('[useOffboardings] No data in Supabase, using mock data');
        let filtered = [...MOCK_EMPLOYEE_OFFBOARDINGS];
        
        if (options?.status) {
          filtered = filtered.filter(o => o.status === options.status);
        }
        if (options?.stage) {
          filtered = filtered.filter(o => o.currentStage === options.stage);
        }
        if (options?.separationType) {
          filtered = filtered.filter(o => o.separationType === options.separationType);
        }
        
        return filtered;
      }

      console.log(`[useOffboardings] Fetched ${data.length} offboardings from Supabase`);
      return data.map(mapToEmployeeOffboarding);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOffboarding(offboardingId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['offboarding', offboardingId, organizationId],
    queryFn: async () => {
      if (!offboardingId) {
        return null;
      }

      if (!organizationId) {
        console.log('[useOffboarding] No organization ID, using mock data');
        const mockOffboarding = MOCK_EMPLOYEE_OFFBOARDINGS.find(o => o.id === offboardingId);
        return mockOffboarding || null;
      }

      const { data, error } = await supabase
        .from('offboardings')
        .select('*')
        .eq('id', offboardingId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useOffboarding] Error:', error);
        const mockOffboarding = MOCK_EMPLOYEE_OFFBOARDINGS.find(o => o.id === offboardingId);
        return mockOffboarding || null;
      }

      console.log(`[useOffboarding] Fetched offboarding: ${offboardingId}`);
      return mapToEmployeeOffboarding(data);
    },
    enabled: !!offboardingId,
  });
}

export function useCreateOffboarding() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateOffboardingInput) => {
      console.log('[useCreateOffboarding] Creating offboarding:', input);

      const facility = FACILITIES.find(f => f.id === input.facility_id);
      const hrContact = HR_CONTACTS.find(h => h.id === input.hr_contact_id);

      const newId = `off-${Date.now()}`;
      const separationDate = new Date(input.separation_date);

      const tasks: OffboardingTask[] = DEFAULT_OFFBOARDING_TASKS.map((t, idx) => {
        const dueDate = new Date(separationDate);
        dueDate.setDate(dueDate.getDate() - (DEFAULT_OFFBOARDING_TASKS.length - idx));
        return {
          id: `task-${newId}-${idx + 1}`,
          offboardingId: newId,
          name: t.name,
          description: t.description,
          category: t.category,
          status: 'pending' as OffboardingTaskStatus,
          assignedDepartment: t.assignedDepartment,
          dueDate: dueDate.toISOString().split('T')[0],
          isRequired: t.isRequired,
          order: t.order,
        };
      });

      const milestones: OffboardingMilestone[] = DEFAULT_OFFBOARDING_MILESTONES.map((m, idx) => {
        const milestoneDate = new Date(separationDate);
        milestoneDate.setDate(milestoneDate.getDate() + m.daysFromEnd);
        return {
          id: `milestone-${idx + 1}`,
          name: m.name,
          description: m.description,
          stage: m.stage,
          daysFromEnd: m.daysFromEnd,
          isRequired: m.isRequired,
          status: 'pending' as MilestoneStatus,
          order: m.order,
        };
      });

      const newOffboarding: EmployeeOffboarding = {
        id: newId,
        employeeId: input.employee_id,
        employeeName: input.employee_name,
        employeeEmail: input.employee_email,
        employeePhone: input.employee_phone,
        employeeCode: input.employee_code,
        position: input.position,
        department: input.department,
        facilityId: input.facility_id,
        facilityName: facility?.name || 'Main Campus',
        hireDate: new Date().toISOString().split('T')[0],
        separationDate: input.separation_date,
        lastWorkingDay: input.last_working_day,
        noticeDate: input.notice_date,
        separationType: input.separation_type,
        separationReason: input.separation_reason,
        status: 'pending',
        progress: 0,
        currentStage: 'notification',
        supervisorId: input.supervisor_id,
        hrContactId: input.hr_contact_id,
        hrContactName: hrContact?.name,
        yearsOfService: input.years_of_service,
        cobraEligible: input.cobra_eligible,
        ptoBalance: input.pto_balance,
        ptoPayout: input.pto_payout,
        severancePackage: input.severance_package,
        severanceAmount: input.severance_amount,
        nonCompeteApplies: input.non_compete_applies,
        rehireEligible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks,
        milestones,
        notes: [{
          id: `note-${newId}-init`,
          offboardingId: newId,
          content: 'Offboarding process initiated',
          createdBy: 'Current User',
          createdAt: new Date().toISOString(),
          isPrivate: false,
          noteType: 'general',
        }],
        statusHistory: [],
        equipment: [],
      };

      if (!organizationId) {
        console.log('[useCreateOffboarding] No org ID, returning mock offboarding');
        return newOffboarding;
      }

      const { data, error } = await supabase
        .from('offboardings')
        .insert({
          organization_id: organizationId,
          employee_id: input.employee_id,
          employee_name: input.employee_name,
          employee_email: input.employee_email,
          employee_phone: input.employee_phone,
          employee_code: input.employee_code,
          position: input.position,
          department: input.department,
          facility_id: input.facility_id,
          facility_name: facility?.name || 'Main Campus',
          hire_date: newOffboarding.hireDate,
          separation_date: input.separation_date,
          last_working_day: input.last_working_day,
          notice_date: input.notice_date,
          separation_type: input.separation_type,
          separation_reason: input.separation_reason,
          status: 'pending',
          progress: 0,
          current_stage: 'notification',
          supervisor_id: input.supervisor_id,
          hr_contact_id: input.hr_contact_id,
          hr_contact_name: hrContact?.name,
          years_of_service: input.years_of_service,
          cobra_eligible: input.cobra_eligible,
          pto_balance: input.pto_balance,
          pto_payout: input.pto_payout,
          severance_package: input.severance_package,
          severance_amount: input.severance_amount,
          non_compete_applies: input.non_compete_applies,
          tasks,
          milestones,
          notes: newOffboarding.notes,
          status_history: [],
          equipment: [],
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateOffboarding] Supabase error:', error);
        return newOffboarding;
      }

      console.log('[useCreateOffboarding] Created offboarding:', data.id);
      return mapToEmployeeOffboarding(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
    },
  });
}

export function useUpdateOffboarding() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateOffboardingInput }) => {
      console.log('[useUpdateOffboarding] Updating offboarding:', id, updates);

      if (!organizationId) {
        console.log('[useUpdateOffboarding] No org ID, returning mock update');
        return { id, ...updates };
      }

      const { data, error } = await supabase
        .from('offboardings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateOffboarding] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateOffboarding] Updated offboarding:', id);
      return mapToEmployeeOffboarding(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['offboarding', variables.id] });
    },
  });
}

export function useUpdateOffboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      offboardingId, 
      taskId, 
      status 
    }: { 
      offboardingId: string; 
      taskId: string; 
      status: OffboardingTaskStatus;
    }) => {
      console.log('[useUpdateOffboardingTask] Updating task:', taskId, status);
      return { offboardingId, taskId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['offboarding', variables.offboardingId] });
    },
  });
}

export function useUpdateOffboardingMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      offboardingId, 
      milestoneId, 
      status 
    }: { 
      offboardingId: string; 
      milestoneId: string; 
      status: MilestoneStatus;
    }) => {
      console.log('[useUpdateOffboardingMilestone] Updating milestone:', milestoneId, status);
      return { offboardingId, milestoneId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['offboarding', variables.offboardingId] });
    },
  });
}

export function useAddOffboardingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      offboardingId, 
      content, 
      isPrivate,
      noteType = 'general'
    }: { 
      offboardingId: string; 
      content: string; 
      isPrivate: boolean;
      noteType?: 'general' | 'status_change' | 'task_update' | 'exit_feedback';
    }) => {
      console.log('[useAddOffboardingNote] Adding note to:', offboardingId);
      const note: OffboardingNote = {
        id: `note-${Date.now()}`,
        offboardingId,
        content,
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        isPrivate,
        noteType,
      };
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['offboarding', variables.offboardingId] });
    },
  });
}

export function useUpdateEquipmentReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      offboardingId, 
      equipmentId, 
      returned,
      condition,
      notes
    }: { 
      offboardingId: string; 
      equipmentId: string; 
      returned: boolean;
      condition?: 'good' | 'fair' | 'damaged' | 'missing';
      notes?: string;
    }) => {
      console.log('[useUpdateEquipmentReturn] Updating equipment:', equipmentId);
      return { offboardingId, equipmentId, returned, condition, notes };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['offboarding', variables.offboardingId] });
    },
  });
}

export function useCompleteExitInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      offboardingId, 
      exitInterview 
    }: { 
      offboardingId: string; 
      exitInterview: Partial<ExitInterview>;
    }) => {
      console.log('[useCompleteExitInterview] Completing exit interview for:', offboardingId);
      return { offboardingId, exitInterview };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] });
      queryClient.invalidateQueries({ queryKey: ['offboarding', variables.offboardingId] });
    },
  });
}

export function useOffboardingStats() {
  const { data: offboardings } = useOffboardings();

  const stats = {
    activeCount: offboardings?.filter(o => o.status === 'in_progress' || o.status === 'pending').length || 0,
    completedCount: offboardings?.filter(o => o.status === 'completed').length || 0,
    onHoldCount: offboardings?.filter(o => o.status === 'on_hold').length || 0,
    totalCount: offboardings?.length || 0,
    taskCompletion: (() => {
      if (!offboardings) return 0;
      const totalTasks = offboardings.reduce((sum, o) => sum + o.tasks.length, 0);
      const completedTasks = offboardings.reduce(
        (sum, o) => sum + o.tasks.filter(t => t.status === 'completed').length,
        0
      );
      return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    })(),
    byType: {
      resignation: offboardings?.filter(o => o.separationType === 'resignation').length || 0,
      termination: offboardings?.filter(o => o.separationType === 'termination').length || 0,
      retirement: offboardings?.filter(o => o.separationType === 'retirement').length || 0,
      layoff: offboardings?.filter(o => o.separationType === 'layoff').length || 0,
      other: offboardings?.filter(o => 
        !['resignation', 'termination', 'retirement', 'layoff'].includes(o.separationType)
      ).length || 0,
    },
    avgYearsOfService: (() => {
      if (!offboardings || offboardings.length === 0) return '0.0';
      const total = offboardings.reduce((sum, o) => sum + o.yearsOfService, 0);
      return (total / offboardings.length).toFixed(1);
    })(),
  };

  return stats;
}

export {
  MOCK_EMPLOYEE_OFFBOARDINGS,
  OFFBOARDING_STAGES,
  SEPARATION_TYPE_CONFIG,
  OFFBOARDING_STATUS_CONFIG,
  TASK_CATEGORY_CONFIG,
  DEPARTMENTS,
  FACILITIES,
  HR_CONTACTS,
};
