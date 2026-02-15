export type ButtonType = 'add_task' | 'report_issue' | 'request_purchase' | 'request_service';

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
  /** Per-department form suggestions: { "QUAL": [{ formId, formType, formRoute, required }], ... } */
  departmentFormSuggestions?: Record<string, SuggestedForm[]>;
  /** If true, this template triggers a production hold when posted */
  isProductionHold?: boolean;
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
  // Multi-department routing
  originatingDepartmentCode?: string;
  originatingDepartmentName?: string;
  requiresAllSignoff?: boolean;
  finalSignoffById?: string;
  finalSignoffByName?: string;
  finalSignoffAt?: string;
  finalSignoffNotes?: string;
  isProductionHold?: boolean;
  holdStatus?: 'none' | 'active' | 'cleared' | 'reinstated';
  holdClearedAt?: string;
  holdClearedById?: string;
  holdClearedByName?: string;
  holdClearedDepartment?: string;
  holdClearedNotes?: string;
  productionLine?: string;
  reportingDepartment?: string;
  reportingDepartmentName?: string;
  rootCauseDepartment?: string;
  rootCauseDepartmentName?: string;
  roomId?: string;
  roomName?: string;
  createdAt: string;
  updatedAt: string;
  departmentTasks?: TaskFeedDepartmentTask[];
}

export interface FormCompletion {
  formId: string;
  formType: string;
  formRoute: string;
  formResponse: Record<string, any>;
  formPhotos?: string[];
  completedAt: string;
  completedByName: string;
}

export interface SuggestedForm {
  formId: string;
  formType: string;
  formRoute: string;
  required: boolean;
}

export interface TaskFeedDepartmentTask {
  id: string;
  organizationId: string;
  postId: string;
  postNumber: string;
  departmentCode: string;
  departmentName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'signed_off';
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  completionNotes?: string;
  moduleHistoryType?: string;
  moduleHistoryId?: string;
  // Form response (legacy single form)
  formType?: string;
  formRoute?: string;
  formResponse?: Record<string, any>;
  formPhotos?: string[];
  // Multi-form completions
  formCompletions?: FormCompletion[];
  suggestedForms?: SuggestedForm[];
  formsCompleted?: number;
  formsSuggested?: number;
  // Escalation
  isOriginal?: boolean;
  escalatedFromDepartment?: string;
  escalatedFromTaskId?: string;
  escalationReason?: string;
  escalatedAt?: string;
  // Sign-off
  requiresSignoff?: boolean;
  signoffDepartmentCode?: string;
  signoffById?: string;
  signoffByName?: string;
  signoffAt?: string;
  signoffNotes?: string;
  // Priority
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  // Started
  startedAt?: string;
  startedById?: string;
  startedByName?: string;
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
  departmentFormSuggestions?: Record<string, SuggestedForm[]>;
  isProductionHold?: boolean;
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
  productionStopped?: boolean;
  roomLine?: string;
  reportingDepartment?: string;
}

export interface CompleteTaskInput {
  taskId: string;
  completionNotes?: string;
}

export const BUTTON_TYPE_LABELS: Record<ButtonType, string> = {
  add_task: 'Add Task',
  report_issue: 'Report Issue',
  request_purchase: 'Request Purchase',
  request_service: 'Request Service',
};

export const BUTTON_TYPE_COLORS: Record<ButtonType, string> = {
  add_task: '#3B82F6',
  report_issue: '#EF4444',
  request_purchase: '#8B5CF6',
  request_service: '#F97316',
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
