import type { DepartmentWorkflow, DepartmentType } from '@/types/departmentWorkflow';
import type { LOTOLevel } from '@/constants/lotoProgram';

export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' | 'overdue';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderType = 'corrective' | 'preventive' | 'emergency' | 'request';
export type WorkOrderSource = 'manual' | 'request' | 'pm_schedule' | 'task_feed';

export interface LOTOStep {
  id: string;
  order: number;
  description: string;
  lockColor?: string;
  energySource?: string;
  location?: string;
}

export interface WorkOrderSafety {
  lotoRequired: boolean;
  lotoLevel?: LOTOLevel;
  lotoSteps: LOTOStep[];
  lotoVerifiedBy?: string;
  lotoVerifiedAt?: string;
  lotoPermitNumber?: string;
  permits: string[];
  permitsRequired: boolean;
  permitNumbers: Record<string, string>;
  permitExpiry: Record<string, string>;
  ppeRequired: string[];
  additionalPPE?: string[];
}

export interface WorkOrderTask {
  id: string;
  order: number;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface WorkOrderAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
  size?: number;
}

/**
 * Base WorkOrder interface - minimum required fields
 * Compatible with task feed and basic ERPContext operations
 */
export interface BaseWorkOrder {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assigned_to?: string;
  facility_id: string;
  created_at: string;
  due_date: string;
  equipment?: string;
}

/**
 * Unified WorkOrder interface - extends BaseWorkOrder with all detailed fields
 * Used by CMMS module for full work order management
 * All extended fields are optional for backward compatibility
 */
export interface UnifiedWorkOrder extends BaseWorkOrder {
  workOrderNumber?: string;
  type?: WorkOrderType;
  source?: WorkOrderSource;
  sourceId?: string;
  equipmentId?: string;
  location?: string;
  requestedBy?: string;
  requestedAt?: string;
  assignedName?: string;
  started_at?: string;
  completed_at?: string;
  estimatedHours?: number;
  actualHours?: number;
  safety?: WorkOrderSafety;
  tasks?: WorkOrderTask[];
  attachments?: WorkOrderAttachment[];
  notes?: string;
  completionNotes?: string;
  updated_at?: string;
  workflow?: DepartmentWorkflow;
  currentDepartment?: DepartmentType;
  requiredDepartments?: DepartmentType[];
}

/**
 * Input type for creating a new work order
 * Omits auto-generated fields
 */
export type CreateWorkOrderInput = Omit<BaseWorkOrder, 'id' | 'created_at'> & {
  workOrderNumber?: string;
  type?: WorkOrderType;
  source?: WorkOrderSource;
  sourceId?: string;
  equipmentId?: string;
  location?: string;
  requestedBy?: string;
  requestedAt?: string;
  assignedName?: string;
  estimatedHours?: number;
  safety?: WorkOrderSafety;
  tasks?: WorkOrderTask[];
  notes?: string;
  requiredDepartments?: DepartmentType[];
};

/**
 * Input type for updating a work order
 */
export type UpdateWorkOrderInput = Partial<Omit<UnifiedWorkOrder, 'id' | 'created_at'>>;

/**
 * Helper to check if a work order has detailed data
 */
export function isDetailedWorkOrder(wo: BaseWorkOrder | UnifiedWorkOrder): wo is UnifiedWorkOrder {
  return 'workOrderNumber' in wo && wo.workOrderNumber !== undefined;
}

/**
 * Helper to convert basic WorkOrder to UnifiedWorkOrder
 */
export function toUnifiedWorkOrder(wo: BaseWorkOrder, defaults?: Partial<UnifiedWorkOrder>): UnifiedWorkOrder {
  return {
    ...wo,
    workOrderNumber: defaults?.workOrderNumber || `WO-${wo.id.slice(-6).toUpperCase()}`,
    type: defaults?.type || 'corrective',
    source: defaults?.source || 'manual',
    location: defaults?.location || '',
    safety: defaults?.safety || {
      lotoRequired: false,
      lotoLevel: undefined,
      lotoSteps: [],
      lotoPermitNumber: undefined,
      permits: [],
      permitsRequired: false,
      permitNumbers: {},
      permitExpiry: {},
      ppeRequired: [],
      additionalPPE: [],
    },
    tasks: defaults?.tasks || [],
    attachments: defaults?.attachments || [],
    notes: defaults?.notes || wo.description,
    updated_at: defaults?.updated_at || wo.created_at,
    ...defaults,
  };
}

/**
 * Helper to extract base work order from unified
 * Useful for task feed compatibility
 */
export function toBaseWorkOrder(wo: UnifiedWorkOrder): BaseWorkOrder {
  return {
    id: wo.id,
    title: wo.title,
    description: wo.description,
    status: wo.status,
    priority: wo.priority,
    assigned_to: wo.assigned_to,
    facility_id: wo.facility_id,
    created_at: wo.created_at,
    due_date: wo.due_date,
    equipment: wo.equipment,
  };
}

/**
 * Generate a work order number
 */
export function generateWorkOrderNumber(prefix: string = 'WO'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Priority sort order (lower = higher priority)
 */
export const PRIORITY_SORT_ORDER: Record<WorkOrderPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Status sort order
 */
export const STATUS_SORT_ORDER: Record<WorkOrderStatus, number> = {
  open: 0,
  in_progress: 1,
  on_hold: 2,
  overdue: 3,
  completed: 4,
  cancelled: 5,
};

/**
 * Supabase DB work order row type (snake_case)
 */
export interface WorkOrderDB {
  id: string;
  organization_id: string;
  work_order_number: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string | null;
  source: string | null;
  source_id: string | null;
  equipment: string | null;
  equipment_id: string | null;
  location: string | null;
  facility_id: string | null;
  requested_by: string | null;
  requested_at: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  safety: WorkOrderSafetyDB | null;
  tasks: WorkOrderTaskDB[] | null;
  attachments: WorkOrderAttachmentDB[] | null;
  notes: string | null;
  completion_notes: string | null;
  workflow: DepartmentWorkflowDB | null;
  current_department: string | null;
  required_departments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderSafetyDB {
  lotoRequired?: boolean;
  lotoLevel?: number;
  lotoSteps?: LOTOStep[];
  lotoVerifiedBy?: string;
  lotoVerifiedAt?: string;
  lotoPermitNumber?: string;
  permits?: string[];
  permitsRequired?: boolean;
  permitNumbers?: Record<string, string>;
  permitExpiry?: Record<string, string>;
  ppeRequired?: string[];
  additionalPPE?: string[];
}

export interface WorkOrderTaskDB {
  id: string;
  order: number;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface WorkOrderAttachmentDB {
  id: string;
  type: 'image' | 'document';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
  size?: number;
}

export interface DepartmentWorkflowDB {
  id: string;
  workOrderId: string;
  currentDepartment: string;
  departmentQueue: string[];
  completedDepartments: string[];
  routingHistory: {
    department: string;
    sentBy: string;
    sentAt: string;
    notes?: string;
  }[];
  documentationSections: CompletedDocumentationSectionDB[];
}

export interface CompletedDocumentationSectionDB {
  id: string;
  templateId: string;
  department: string;
  completedBy: string;
  completedByName: string;
  completedAt: string;
  values: Record<string, unknown>;
  signature?: string;
  notes?: string;
  isLocked: boolean;
}

/**
 * DetailedWorkOrder - full work order for WorkOrderDetail component
 * Uses camelCase for component compatibility
 */
export interface DetailedWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: Exclude<WorkOrderStatus, 'overdue'>;
  type: WorkOrderType;
  source: WorkOrderSource;
  sourceId?: string;
  equipment?: string;
  equipmentId?: string;
  location: string;
  facility_id: string;
  requestedBy?: string;
  requestedAt?: string;
  assigned_to?: string;
  assignedName?: string;
  due_date: string;
  started_at?: string;
  completed_at?: string;
  estimatedHours?: number;
  actualHours?: number;
  safety: WorkOrderSafety;
  tasks: WorkOrderTask[];
  attachments: WorkOrderAttachment[];
  notes: string;
  completionNotes?: string;
  created_at: string;
  updated_at: string;
  workflow?: DepartmentWorkflow;
  currentDepartment?: DepartmentType;
  requiredDepartments?: DepartmentType[];
}

/**
 * Default safety configuration
 */
export const DEFAULT_SAFETY: WorkOrderSafety = {
  lotoRequired: false,
  lotoLevel: undefined,
  lotoSteps: [],
  lotoPermitNumber: undefined,
  permits: [],
  permitsRequired: false,
  permitNumbers: {},
  permitExpiry: {},
  ppeRequired: [],
  additionalPPE: [],
};

/**
 * Convert Supabase DB row to DetailedWorkOrder for component use
 */
export function mapDBToDetailedWorkOrder(db: WorkOrderDB): DetailedWorkOrder {
  const safetyData = db.safety || {};
  const safety: WorkOrderSafety = {
    lotoRequired: safetyData.lotoRequired ?? false,
    lotoLevel: safetyData.lotoLevel as LOTOLevel | undefined,
    lotoSteps: safetyData.lotoSteps ?? [],
    lotoVerifiedBy: safetyData.lotoVerifiedBy,
    lotoVerifiedAt: safetyData.lotoVerifiedAt,
    lotoPermitNumber: safetyData.lotoPermitNumber,
    permits: safetyData.permits ?? [],
    permitsRequired: safetyData.permitsRequired ?? false,
    permitNumbers: safetyData.permitNumbers ?? {},
    permitExpiry: safetyData.permitExpiry ?? {},
    ppeRequired: safetyData.ppeRequired ?? [],
    additionalPPE: safetyData.additionalPPE ?? [],
  };

  const workflowData = db.workflow;
  const workflow: DepartmentWorkflow | undefined = workflowData ? {
    id: workflowData.id,
    workOrderId: workflowData.workOrderId,
    currentDepartment: workflowData.currentDepartment as DepartmentType,
    departmentQueue: workflowData.departmentQueue as DepartmentType[],
    completedDepartments: workflowData.completedDepartments as DepartmentType[],
    routingHistory: workflowData.routingHistory.map(h => ({
      ...h,
      department: h.department as DepartmentType,
    })),
    documentationSections: workflowData.documentationSections.map(s => ({
      ...s,
      department: s.department as DepartmentType,
    })) as DepartmentWorkflow['documentationSections'],
  } : undefined;

  return {
    id: db.id,
    workOrderNumber: db.work_order_number || `WO-${db.id.slice(-6).toUpperCase()}`,
    title: db.title,
    description: db.description || '',
    priority: (db.priority || 'medium') as WorkOrderPriority,
    status: (db.status || 'open') as Exclude<WorkOrderStatus, 'overdue'>,
    type: (db.type || 'corrective') as WorkOrderType,
    source: (db.source || 'manual') as WorkOrderSource,
    sourceId: db.source_id ?? undefined,
    equipment: db.equipment ?? undefined,
    equipmentId: db.equipment_id ?? undefined,
    location: db.location || '',
    facility_id: db.facility_id || '',
    requestedBy: db.requested_by ?? undefined,
    requestedAt: db.requested_at ?? undefined,
    assigned_to: db.assigned_to ?? undefined,
    assignedName: db.assigned_name ?? undefined,
    due_date: db.due_date || new Date().toISOString(),
    started_at: db.started_at ?? undefined,
    completed_at: db.completed_at ?? undefined,
    estimatedHours: db.estimated_hours ?? undefined,
    actualHours: db.actual_hours ?? undefined,
    safety,
    tasks: (db.tasks || []) as WorkOrderTask[],
    attachments: (db.attachments || []) as WorkOrderAttachment[],
    notes: db.notes || '',
    completionNotes: db.completion_notes ?? undefined,
    created_at: db.created_at,
    updated_at: db.updated_at,
    workflow,
    currentDepartment: db.current_department as DepartmentType | undefined,
    requiredDepartments: db.required_departments as DepartmentType[] | undefined,
  };
}

/**
 * Convert DetailedWorkOrder to Supabase update payload
 */
export function mapDetailedToDBUpdate(wo: Partial<DetailedWorkOrder>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  if (wo.workOrderNumber !== undefined) updates.work_order_number = wo.workOrderNumber;
  if (wo.title !== undefined) updates.title = wo.title;
  if (wo.description !== undefined) updates.description = wo.description;
  if (wo.priority !== undefined) updates.priority = wo.priority;
  if (wo.status !== undefined) updates.status = wo.status;
  if (wo.type !== undefined) updates.type = wo.type;
  if (wo.source !== undefined) updates.source = wo.source;
  if (wo.sourceId !== undefined) updates.source_id = wo.sourceId;
  if (wo.equipment !== undefined) updates.equipment = wo.equipment;
  if (wo.equipmentId !== undefined) updates.equipment_id = wo.equipmentId;
  if (wo.location !== undefined) updates.location = wo.location;
  if (wo.facility_id !== undefined) updates.facility_id = wo.facility_id;
  if (wo.requestedBy !== undefined) updates.requested_by = wo.requestedBy;
  if (wo.requestedAt !== undefined) updates.requested_at = wo.requestedAt;
  if (wo.assigned_to !== undefined) updates.assigned_to = wo.assigned_to;
  if (wo.assignedName !== undefined) updates.assigned_name = wo.assignedName;
  if (wo.due_date !== undefined) updates.due_date = wo.due_date;
  if (wo.started_at !== undefined) updates.started_at = wo.started_at;
  if (wo.completed_at !== undefined) updates.completed_at = wo.completed_at;
  if (wo.estimatedHours !== undefined) updates.estimated_hours = wo.estimatedHours;
  if (wo.actualHours !== undefined) updates.actual_hours = wo.actualHours;
  if (wo.safety !== undefined) updates.safety = wo.safety;
  if (wo.tasks !== undefined) updates.tasks = wo.tasks;
  if (wo.attachments !== undefined) updates.attachments = wo.attachments;
  if (wo.notes !== undefined) updates.notes = wo.notes;
  if (wo.completionNotes !== undefined) updates.completion_notes = wo.completionNotes;
  if (wo.workflow !== undefined) updates.workflow = wo.workflow;
  if (wo.currentDepartment !== undefined) updates.current_department = wo.currentDepartment;
  if (wo.requiredDepartments !== undefined) updates.required_departments = wo.requiredDepartments;

  return updates;
}
