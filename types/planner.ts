// Planner Project Types
export type PlannerProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type PlannerProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface PlannerProject {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: PlannerProjectStatus;
  priority: PlannerProjectPriority;
  color: string;
  icon: string | null;
  owner_id: string | null;
  owner_name: string | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  progress_percent: number;
  total_tasks: number;
  completed_tasks: number;
  budget_allocated: number | null;
  budget_used: number;
  tags: string[];
  metadata: Record<string, unknown>;
  notes: string | null;
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

// Planner Task Types
export type PlannerTaskStatus = 'pending' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'blocked';
export type PlannerTaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type PlannerTaskType = 'task' | 'milestone' | 'meeting' | 'reminder' | 'event' | 'deadline';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface PlannerTaskChecklist {
  id: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface PlannerTask {
  id: string;
  organization_id: string;
  task_number: string | null;
  title: string;
  description: string | null;
  status: PlannerTaskStatus;
  priority: PlannerTaskPriority;
  category: string | null;
  task_type: PlannerTaskType;
  project_id: string | null;
  project_name: string | null;
  parent_task_id: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_by: string | null;
  assigned_by_name: string | null;
  assigned_at: string | null;
  team_members: string[];
  facility_id: string | null;
  facility_name: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  timezone: string;
  estimated_hours: number | null;
  actual_hours: number;
  estimated_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  progress_percent: number;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_interval: number;
  recurrence_days_of_week: number[];
  recurrence_day_of_month: number | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  recurring_parent_id: string | null;
  recurrence_instance_date: string | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number[];
  reminder_sent: boolean;
  last_reminder_sent_at: string | null;
  depends_on: string[];
  blocks: string[];
  is_blocked: boolean;
  blocked_reason: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  pm_schedule_id: string | null;
  service_request_id: string | null;
  checklist: PlannerTaskChecklist[];
  checklist_completed: number;
  checklist_total: number;
  attachments: unknown[];
  notes: string | null;
  internal_notes: string | null;
  tags: string[];
  labels: string[];
  color: string | null;
  metadata: Record<string, unknown>;
  completed_by: string | null;
  completed_by_name: string | null;
  completion_notes: string | null;
  created_by: string;
  created_by_id: string | null;
  last_modified_by: string | null;
  last_modified_by_id: string | null;
  created_at: string;
  updated_at: string;
}

// Task Dependency Types
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

export interface PlannerTaskDependency {
  id: string;
  organization_id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  is_critical: boolean;
  created_at: string;
}

// Task Comment Types
export type TaskCommentType = 'comment' | 'status_change' | 'assignment' | 'update' | 'system';

export interface PlannerTaskComment {
  id: string;
  organization_id: string;
  task_id: string;
  content: string;
  comment_type: TaskCommentType;
  is_internal: boolean;
  mentioned_users: string[];
  attachments: unknown[];
  created_by: string;
  created_by_id: string | null;
  edited_at: string | null;
  created_at: string;
}

// Task Time Entry Types
export interface PlannerTaskTimeEntry {
  id: string;
  organization_id: string;
  task_id: string;
  employee_id: string;
  employee_name: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_running: boolean;
  is_billable: boolean;
  hourly_rate: number | null;
  total_cost: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Task Template Types
export interface PlannerTaskTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string | null;
  task_type: PlannerTaskType;
  priority: PlannerTaskPriority;
  default_duration_days: number | null;
  default_estimated_hours: number | null;
  default_assigned_to: string | null;
  default_checklist: PlannerTaskChecklist[];
  title_template: string;
  description_template: string | null;
  default_recurrence_pattern: RecurrencePattern | null;
  default_recurrence_interval: number;
  tags: string[];
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

// Planner View Types
export type PlannerViewType = 'calendar' | 'kanban' | 'list' | 'timeline' | 'gantt';

export interface PlannerView {
  id: string;
  organization_id: string;
  name: string;
  view_type: PlannerViewType;
  is_default: boolean;
  is_shared: boolean;
  filters: Record<string, unknown>;
  sort_by: string | null;
  sort_direction: 'asc' | 'desc';
  group_by: string | null;
  columns: unknown[];
  display_options: Record<string, unknown>;
  owner_id: string | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
}

// Labels
export const PLANNER_TASK_STATUS_LABELS: Record<PlannerTaskStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

export const PLANNER_TASK_STATUS_COLORS: Record<PlannerTaskStatus, string> = {
  pending: '#6B7280',
  scheduled: '#3B82F6',
  in_progress: '#F59E0B',
  on_hold: '#F97316',
  completed: '#10B981',
  cancelled: '#DC2626',
  blocked: '#EF4444',
};

export const PLANNER_TASK_TYPE_LABELS: Record<PlannerTaskType, string> = {
  task: 'Task',
  milestone: 'Milestone',
  meeting: 'Meeting',
  reminder: 'Reminder',
  event: 'Event',
  deadline: 'Deadline',
};

export const RECURRENCE_PATTERN_LABELS: Record<RecurrencePattern, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};
