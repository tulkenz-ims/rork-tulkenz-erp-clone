export type ButtonType = 'add_task' | 'report_issue' | 'request_purchase';

export type FieldType = 
  | 'dropdown'
  | 'text_input'
  | 'text_area'
  | 'radio'
  | 'checkbox'
  | 'number'
  | 'date';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options?: FormFieldOption[];
  placeholder?: string;
  defaultValue?: string | string[] | boolean;
  helpText?: string;
  sortOrder: number;
}

export interface WorkflowRule {
  condition?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: string;
  };
  action: 'notify' | 'create_work_order' | 'alert_personnel' | 'store_only';
  alertPersonnel?: string[];
  createWorkOrderPriority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskFeedTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  buttonType: ButtonType;
  triggeringDepartment: string;
  assignedDepartments: string[];
  formFields: FormField[];
  photoRequired: boolean;
  workflowRules: WorkflowRule[];
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdBy: string;
  createdById?: string;
  updatedBy?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFeedPost {
  id: string;
  organizationId: string;
  postNumber: string;
  templateId?: string;
  templateName: string;
  templateSnapshot: TaskFeedTemplate;
  createdById?: string;
  createdByName: string;
  facilityId?: string;
  facilityName?: string;
  locationId?: string;
  locationName?: string;
  formData: Record<string, any>;
  photoUrl?: string;
  additionalPhotos: string[];
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  totalDepartments: number;
  completedDepartments: number;
  completionRate: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  departmentTasks?: TaskFeedDepartmentTask[];
}

export interface TaskFeedDepartmentTask {
  id: string;
  organizationId: string;
  postId: string;
  postNumber: string;
  departmentCode: string;
  departmentName: string;
  status: 'pending' | 'completed';
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  completionNotes?: string;
  moduleHistoryType?: string;
  moduleHistoryId?: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  buttonType: ButtonType;
  triggeringDepartment: string;
  assignedDepartments: string[];
  formFields: FormField[];
  photoRequired: boolean;
  workflowRules?: WorkflowRule[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

export interface CreatePostInput {
  templateId: string;
  facilityId?: string;
  facilityName?: string;
  locationId?: string;
  locationName?: string;
  formData: Record<string, any>;
  photoUrl?: string;
  additionalPhotos?: string[];
  notes?: string;
}

export interface CompleteTaskInput {
  taskId: string;
  completionNotes?: string;
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

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  dropdown: 'Dropdown',
  text_input: 'Text Input',
  text_area: 'Text Area',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  number: 'Number',
  date: 'Date',
};

export { INITIAL_TASK_FEED_TEMPLATES as DEFAULT_TEMPLATES } from '@/constants/taskFeedTemplates';
