import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';

type PlannerTask = Tables['planner_tasks'];
type PlannerProject = Tables['planner_projects'];

export type TaskStatus = 'pending' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'task' | 'milestone' | 'meeting' | 'reminder' | 'event' | 'deadline';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type ExtendedPlannerTask = PlannerTask;
export type ExtendedPlannerProject = PlannerProject;

// ============== PLANNER TASKS QUERIES ==============

export function usePlannerTasksQuery(options?: QueryOptions<PlannerTask> & { 
  enabled?: boolean;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  taskType?: TaskType | TaskType[];
  category?: string;
  projectId?: string;
  assignedTo?: string;
  facilityId?: string;
  departmentCode?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  isRecurring?: boolean;
  isBlocked?: boolean;
  excludeCompleted?: boolean;
}) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'planner_tasks', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.status,
      options?.priority,
      options?.taskType,
      options?.category,
      options?.projectId,
      options?.assignedTo,
      options?.facilityId,
      options?.departmentCode,
      options?.dueDateFrom,
      options?.dueDateTo,
      options?.isRecurring,
      options?.isBlocked,
      options?.excludeCompleted,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('planner_tasks')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.priority) {
        if (Array.isArray(options.priority)) {
          query = query.in('priority', options.priority);
        } else {
          query = query.eq('priority', options.priority);
        }
      }
      
      if (options?.taskType) {
        if (Array.isArray(options.taskType)) {
          query = query.in('task_type', options.taskType);
        } else {
          query = query.eq('task_type', options.taskType);
        }
      }
      
      if (options?.category) {
        query = query.eq('category', options.category);
      }
      
      if (options?.projectId) {
        query = query.eq('project_id', options.projectId);
      }
      
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
      }
      
      if (options?.dueDateFrom) {
        query = query.gte('due_date', options.dueDateFrom);
      }
      
      if (options?.dueDateTo) {
        query = query.lte('due_date', options.dueDateTo);
      }
      
      if (options?.isRecurring !== undefined) {
        query = query.eq('is_recurring', options.isRecurring);
      }
      
      if (options?.isBlocked !== undefined) {
        query = query.eq('is_blocked', options.isBlocked);
      }
      
      if (options?.excludeCompleted) {
        query = query.neq('status', 'completed');
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
        query = query.order('due_date', { ascending: true }).order('priority', { ascending: false });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[usePlannerTasksQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[usePlannerTasksQuery] Fetched:', data?.length || 0, 'tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePlannerTaskById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('planner_tasks', id, organizationId);
      if (result.error) throw result.error;
      console.log('[usePlannerTaskById] Fetched task:', id);
      return result.data as ExtendedPlannerTask | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTasksByAssignee(assigneeId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'byAssignee', assigneeId, organizationId],
    queryFn: async () => {
      if (!organizationId || !assigneeId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('assigned_to', assigneeId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useTasksByAssignee] Fetched:', data?.length || 0, 'tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId && !!assigneeId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTasksByProject(projectId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'byProject', projectId, organizationId],
    queryFn: async () => {
      if (!organizationId || !projectId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useTasksByProject] Fetched:', data?.length || 0, 'tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId && !!projectId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePendingTasks() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'scheduled'])
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[usePendingTasks] Fetched:', data?.length || 0, 'pending tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useInProgressTasks() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'in_progress', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'in_progress')
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useInProgressTasks] Fetched:', data?.length || 0, 'in-progress tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useOverdueTasks() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['planner_tasks', 'overdue', organizationId, today],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'scheduled', 'in_progress'])
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useOverdueTasks] Fetched:', data?.length || 0, 'overdue tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useUpcomingTasks(days: number = 7) {
  const { organizationId } = useOrganization();
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  const startDate = today.toISOString().split('T')[0];
  const endDate = futureDate.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['planner_tasks', 'upcoming', organizationId, days, startDate, endDate],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'scheduled', 'in_progress'])
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useUpcomingTasks] Fetched:', data?.length || 0, 'upcoming tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTasksByCategory(category: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'byCategory', category, organizationId],
    queryFn: async () => {
      if (!organizationId || !category) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useTasksByCategory] Fetched:', data?.length || 0, 'tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId && !!category,
    staleTime: 1000 * 60 * 2,
  });
}

export function useBlockedTasks() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'blocked', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_blocked', true)
        .order('due_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useBlockedTasks] Fetched:', data?.length || 0, 'blocked tasks');
      return (data || []) as unknown as ExtendedPlannerTask[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============== PLANNER PROJECTS QUERIES ==============

export function usePlannerProjectsQuery(options?: QueryOptions<PlannerProject> & {
  enabled?: boolean;
  status?: ProjectStatus | ProjectStatus[];
  ownerId?: string;
  facilityId?: string;
  departmentCode?: string;
}) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'planner_projects',
      organizationId,
      filters,
      orderBy,
      limit,
      offset,
      select,
      options?.status,
      options?.ownerId,
      options?.facilityId,
      options?.departmentCode,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('planner_projects')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.ownerId) {
        query = query.eq('owner_id', options.ownerId);
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
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
        console.error('[usePlannerProjectsQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[usePlannerProjectsQuery] Fetched:', data?.length || 0, 'projects');
      return (data || []) as unknown as ExtendedPlannerProject[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePlannerProjectById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_projects', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('planner_projects', id, organizationId);
      if (result.error) throw result.error;
      console.log('[usePlannerProjectById] Fetched project:', id);
      return result.data as ExtendedPlannerProject | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveProjects() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_projects', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('planner_projects')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useActiveProjects] Fetched:', data?.length || 0, 'active projects');
      return (data || []) as unknown as ExtendedPlannerProject[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============== TASK COMMENTS QUERIES ==============

export function useTaskComments(taskId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_task_comments', taskId, organizationId],
    queryFn: async () => {
      if (!organizationId || !taskId) return [];
      const { data, error } = await supabase
        .from('planner_task_comments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useTaskComments] Fetched:', data?.length || 0, 'comments');
      return data || [];
    },
    enabled: !!organizationId && !!taskId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============== TASK TIME ENTRIES QUERIES ==============

export function useTaskTimeEntries(taskId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_task_time_entries', taskId, organizationId],
    queryFn: async () => {
      if (!organizationId || !taskId) return [];
      const { data, error } = await supabase
        .from('planner_task_time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('task_id', taskId)
        .order('start_time', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useTaskTimeEntries] Fetched:', data?.length || 0, 'time entries');
      return data || [];
    },
    enabled: !!organizationId && !!taskId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRunningTimeEntry(employeeId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_task_time_entries', 'running', employeeId, organizationId],
    queryFn: async () => {
      if (!organizationId || !employeeId) return null;
      const { data, error } = await supabase
        .from('planner_task_time_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .eq('is_running', true)
        .single();
      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      return data || null;
    },
    enabled: !!organizationId && !!employeeId,
    staleTime: 1000 * 30,
  });
}

// ============== TASK MUTATIONS ==============

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  task_type?: TaskType;
  project_id?: string;
  project_name?: string;
  parent_task_id?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  facility_id?: string;
  facility_name?: string;
  department_code?: string;
  department_name?: string;
  location?: string;
  start_date?: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  estimated_hours?: number;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_interval?: number;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
  recurrence_end_date?: string;
  recurrence_count?: number;
  reminder_enabled?: boolean;
  reminder_minutes_before?: number[];
  checklist?: unknown[];
  tags?: string[];
  labels?: string[];
  color?: string;
  notes?: string;
  created_by: string;
  created_by_id?: string;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const taskNumber = `T-${Date.now().toString(36).toUpperCase()}`;
      
      const checklistTotal = Array.isArray(input.checklist) ? input.checklist.length : 0;
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .insert({
          organization_id: organizationId,
          task_number: taskNumber,
          status: input.status || 'pending',
          priority: input.priority || 'medium',
          task_type: input.task_type || 'task',
          all_day: input.all_day ?? true,
          checklist_total: checklistTotal,
          checklist_completed: 0,
          progress_percent: 0,
          actual_hours: 0,
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateTask] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateTask] Created task:', data.id);
      return data as ExtendedPlannerTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner_stats'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlannerTask> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.checklist) {
        updateData.checklist_total = Array.isArray(updates.checklist) ? updates.checklist.length : 0;
      }
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateTask] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateTask] Updated task:', id);
      return data as ExtendedPlannerTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner_tasks', 'byId', data.id] });
      queryClient.invalidateQueries({ queryKey: ['planner_stats'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, status, completedBy, completedByName, completionNotes }: { 
      id: string; 
      status: TaskStatus;
      completedBy?: string;
      completedByName?: string;
      completionNotes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
        updateData.progress_percent = 100;
        if (completedBy) updateData.completed_by = completedBy;
        if (completedByName) updateData.completed_by_name = completedByName;
        if (completionNotes) updateData.completion_notes = completionNotes;
      }
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateTaskStatus] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateTaskStatus] Updated task status:', id, status);
      return data as ExtendedPlannerTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner_stats'] });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, assignedTo, assignedToName, assignedBy, assignedByName }: {
      id: string;
      assignedTo: string;
      assignedToName: string;
      assignedBy: string;
      assignedByName: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .update({
          assigned_to: assignedTo,
          assigned_to_name: assignedToName,
          assigned_by: assignedBy,
          assigned_by_name: assignedByName,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useAssignTask] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useAssignTask] Assigned task:', id, 'to', assignedToName);
      return data as ExtendedPlannerTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
    },
  });
}

export function useUpdateTaskProgress() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, progressPercent, checklistCompleted }: {
      id: string;
      progressPercent: number;
      checklistCompleted?: number;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const updateData: Record<string, unknown> = { 
        progress_percent: progressPercent 
      };
      
      if (checklistCompleted !== undefined) {
        updateData.checklist_completed = checklistCompleted;
      }
      
      if (progressPercent === 100) {
        updateData.status = 'completed';
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateTaskProgress] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateTaskProgress] Updated progress:', id, progressPercent);
      return data as ExtendedPlannerTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner_stats'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord('planner_tasks', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteTask] Deleted task:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner_stats'] });
    },
  });
}

// ============== PROJECT MUTATIONS ==============

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: TaskPriority;
  color?: string;
  icon?: string;
  owner_id?: string;
  owner_name?: string;
  facility_id?: string;
  department_code?: string;
  department_name?: string;
  start_date?: string;
  target_end_date?: string;
  budget_allocated?: number;
  tags?: string[];
  notes?: string;
  created_by: string;
  created_by_id?: string;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('planner_projects')
        .insert({
          organization_id: organizationId,
          status: input.status || 'active',
          priority: input.priority || 'medium',
          color: input.color || '#3B82F6',
          progress_percent: 0,
          total_tasks: 0,
          completed_tasks: 0,
          budget_used: 0,
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateProject] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateProject] Created project:', data.id);
      return data as ExtendedPlannerProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlannerProject> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('planner_projects')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateProject] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateProject] Updated project:', id);
      return data as ExtendedPlannerProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planner_projects'] });
      queryClient.invalidateQueries({ queryKey: ['planner_projects', 'byId', data.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord('planner_projects', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteProject] Deleted project:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner_projects'] });
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
    },
  });
}

// ============== COMMENT MUTATIONS ==============

export interface AddCommentInput {
  task_id: string;
  content: string;
  comment_type?: 'comment' | 'status_change' | 'assignment' | 'update' | 'system';
  is_internal?: boolean;
  mentioned_users?: string[];
  attachments?: unknown[];
  created_by: string;
  created_by_id?: string;
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: AddCommentInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('planner_task_comments')
        .insert({
          organization_id: organizationId,
          comment_type: input.comment_type || 'comment',
          is_internal: input.is_internal || false,
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useAddTaskComment] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useAddTaskComment] Added comment:', data.id);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner_task_comments', variables.task_id] });
    },
  });
}

// ============== TIME ENTRY MUTATIONS ==============

export interface StartTimeEntryInput {
  task_id: string;
  employee_id: string;
  employee_name: string;
  description?: string;
  is_billable?: boolean;
  hourly_rate?: number;
}

export function useStartTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: StartTimeEntryInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('planner_task_time_entries')
        .insert({
          organization_id: organizationId,
          start_time: new Date().toISOString(),
          is_running: true,
          is_billable: input.is_billable || false,
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useStartTimeEntry] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useStartTimeEntry] Started time entry:', data.id);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner_task_time_entries', variables.task_id] });
      queryClient.invalidateQueries({ queryKey: ['planner_task_time_entries', 'running', variables.employee_id] });
    },
  });
}

export function useStopTimeEntry() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, taskId, employeeId }: { id: string; taskId: string; employeeId: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: existing, error: fetchError } = await supabase
        .from('planner_task_time_entries')
        .select('start_time, hourly_rate')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      const endTime = new Date();
      const startTime = new Date(existing.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      const totalCost = existing.hourly_rate 
        ? (durationMinutes / 60) * Number(existing.hourly_rate) 
        : undefined;
      
      const { data, error } = await supabase
        .from('planner_task_time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          is_running: false,
          total_cost: totalCost,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useStopTimeEntry] Error:', error);
        throw new Error(error.message);
      }
      
      // Update task actual_hours
      const { data: taskData } = await supabase
        .from('planner_tasks')
        .select('actual_hours')
        .eq('id', taskId)
        .eq('organization_id', organizationId)
        .single();
      
      const currentActualHours = Number(taskData?.actual_hours || 0);
      const additionalHours = durationMinutes / 60;
      
      await supabase
        .from('planner_tasks')
        .update({ actual_hours: currentActualHours + additionalHours })
        .eq('id', taskId)
        .eq('organization_id', organizationId);
      
      console.log('[useStopTimeEntry] Stopped time entry:', id, 'Duration:', durationMinutes, 'min');
      return { ...data, taskId, employeeId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['planner_task_time_entries', result.taskId] });
      queryClient.invalidateQueries({ queryKey: ['planner_task_time_entries', 'running', result.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['planner_tasks'] });
    },
  });
}

// ============== STATS QUERIES ==============

export function usePlannerStats() {
  const { organizationId } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['planner_stats', organizationId, today],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('status, priority, category, due_date, is_blocked')
        .eq('organization_id', organizationId);
      
      if (error) throw new Error(error.message);
      
      const tasks = data || [];
      
      const stats = {
        total: tasks.length,
        byStatus: {
          pending: 0,
          scheduled: 0,
          in_progress: 0,
          on_hold: 0,
          completed: 0,
          cancelled: 0,
          blocked: 0,
        } as Record<string, number>,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        } as Record<string, number>,
        byCategory: {} as Record<string, number>,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        blockedTasks: 0,
        dueSoon: 0,
        completionRate: 0,
      };
      
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
      
      for (const task of tasks) {
        if (task.status) {
          stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
        }
        if (task.priority) {
          stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
        }
        if (task.category) {
          stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1;
        }
        if (task.is_blocked) {
          stats.blockedTasks++;
        }
        
        const isActive = task.status && ['pending', 'scheduled', 'in_progress'].includes(task.status);
        if (isActive && task.due_date && task.due_date < today) {
          stats.overdueTasks++;
        }
        if (isActive && task.due_date && task.due_date >= today && task.due_date <= sevenDaysStr) {
          stats.dueSoon++;
        }
      }
      
      stats.pendingTasks = stats.byStatus.pending + stats.byStatus.scheduled;
      stats.inProgressTasks = stats.byStatus.in_progress;
      stats.completedTasks = stats.byStatus.completed;
      
      const totalExcludingCancelled = stats.total - stats.byStatus.cancelled;
      stats.completionRate = totalExcludingCancelled > 0 
        ? Math.round((stats.completedTasks / totalExcludingCancelled) * 100)
        : 0;
      
      console.log('[usePlannerStats] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTaskCategories() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['planner_tasks', 'categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('category')
        .eq('organization_id', organizationId)
        .not('category', 'is', null);
      
      if (error) throw new Error(error.message);
      
      const categories = [...new Set(data?.map(t => t.category).filter(Boolean) as string[])];
      console.log('[useTaskCategories] Found categories:', categories);
      return categories;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}
