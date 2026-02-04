export type ButtonType = 'add_task' | 'report_issue' | 'request_purchase';

export type TaskFeedPostStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'requires_followup';

export type DepartmentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type FormFieldType = 'dropdown' | 'text_input' | 'text_area' | 'radio' | 'checkbox' | 'number' | 'date';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: FormFieldOption[];
  placeholder?: string;
  defaultValue?: string | string[] | number | boolean;
}

export interface WorkflowRules {
  all_must_complete: boolean;
  conditional_alerts?: {
    field_id: string;
    value: string;
    alert_users?: string[];
    action?: 'alert' | 'create_work_order' | 'escalate';
  }[];
  auto_create_work_order?: boolean;
  auto_work_order_department?: string;
}

export interface TaskFeedTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  button_type: ButtonType;
  triggering_department: string;
  assigned_departments: string[];
  form_fields: FormField[];
  photo_required: boolean;
  workflow_rules: WorkflowRules;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskFeedPost {
  id: string;
  organization_id: string;
  facility_id?: string;
  post_number: string;
  template_id?: string;
  template_name: string;
  template_snapshot?: TaskFeedTemplate;
  button_type: ButtonType;
  created_by: string;
  created_by_name: string;
  department: string;
  location_id?: string;
  location_name?: string;
  form_data: Record<string, unknown>;
  photo_url: string;
  photo_urls?: string[];
  notes?: string;
  status: TaskFeedPostStatus;
  assigned_departments: string[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
  department_tasks?: TaskFeedDepartmentTask[];
}

export interface TaskFeedDepartmentTask {
  id: string;
  organization_id: string;
  post_id: string;
  post_number: string;
  department_code: string;
  department_name: string;
  status: DepartmentTaskStatus;
  completed_by?: string;
  completed_by_name?: string;
  completed_at?: string;
  completion_notes?: string;
  completion_photo_url?: string;
  module_reference_type?: string;
  module_reference_id?: string;
  notified_at?: string;
  created_at: string;
  updated_at: string;
  post?: TaskFeedPost;
}

export interface CreateTaskFeedPostInput {
  template_id: string;
  facility_id?: string;
  location_id?: string;
  location_name?: string;
  form_data: Record<string, unknown>;
  photo_url: string;
  photo_urls?: string[];
  notes?: string;
}

export interface CompleteDepartmentTaskInput {
  task_id: string;
  completion_notes?: string;
  completion_photo_url?: string;
  module_reference_type?: string;
  module_reference_id?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  button_type: ButtonType;
  triggering_department: string;
  assigned_departments: string[];
  form_fields: FormField[];
  photo_required?: boolean;
  workflow_rules?: WorkflowRules;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  is_active?: boolean;
}

export const BUTTON_TYPE_LABELS: Record<ButtonType, string> = {
  add_task: 'Add Task',
  report_issue: 'Report Issue',
  request_purchase: 'Request Purchase',
};

export const BUTTON_TYPE_COLORS: Record<ButtonType, string> = {
  add_task: '#3B82F6',
  report_issue: '#EF4444',
  request_purchase: '#8B5CF6',
};

export const POST_STATUS_LABELS: Record<TaskFeedPostStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  requires_followup: 'Requires Follow-up',
};

export const POST_STATUS_COLORS: Record<TaskFeedPostStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  requires_followup: { bg: '#FEE2E2', text: '#991B1B' },
};

export const DEPT_TASK_STATUS_COLORS: Record<DepartmentTaskStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEE2E2', text: '#991B1B' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  skipped: { bg: '#F3F4F6', text: '#6B7280' },
};

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  dropdown: 'Dropdown',
  text_input: 'Text Input',
  text_area: 'Text Area',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  number: 'Number',
  date: 'Date',
};
