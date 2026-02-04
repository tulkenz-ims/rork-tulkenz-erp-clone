// Core Types
export * from './organization';
export * from './facility';
export * from './employee';
export * from './location';

// Department - export specific items to avoid conflicts
export type {
  Department,
  DepartmentFormData,
  DepartmentCreateInput,
  DepartmentUpdateInput,
  DepartmentWithFacility,
} from './department';

// Equipment - new DB-aligned types
export type {
  EquipmentStatus as EquipmentStatusDB,
  EquipmentCriticality,
  EquipmentSpecifications,
  Equipment as EquipmentDB,
  EquipmentFormData,
  EquipmentCreateInput,
  EquipmentUpdateInput,
  EquipmentWithFacility,
} from './equipment';
export {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
  EQUIPMENT_CRITICALITY_LABELS,
  EQUIPMENT_CRITICALITY_COLORS,
  EQUIPMENT_CATEGORIES as EQUIPMENT_CATEGORIES_DB,
} from './equipment';

// Maintenance - legacy types used by CMMS
export type {
  MaintenanceFrequency,
  MaintenancePriority,
  PMStatus,
  EquipmentHierarchyLevel,
  EquipmentStatus,
  Equipment,
  PMSafety,
  PMLoToStep,
  PMSchedule,
  PMTask,
  PMPart,
  PMWorkOrder,
  PMTaskCompletion,
  PMPartUsed,
  MaintenanceMetrics as PMMaintenanceMetrics,
} from './maintenance';
export {
  EQUIPMENT_CATEGORIES,
  FREQUENCY_LABELS,
  FREQUENCY_DAYS,
} from './maintenance';

// Work Order
export * from './workOrder';

// Service
export type {
  ServiceRequestType,
  ServiceRequestPriority,
  ServiceRequestUrgency,
  ServiceRequestStatus,
  ServiceRequest,
  MaintenanceAlertType,
  MaintenanceAlertSeverity,
  MaintenanceAlertStatus,
  MaintenanceAlertThresholdType,
  MaintenanceAlert,
  MaintenanceActivityType,
  MaintenanceActivityLog,
  DowntimeType,
  DowntimeImpactLevel,
  DowntimeStatus,
  EquipmentDowntimeLog,
  MetricPeriod,
  MaintenanceMetrics,
} from './service';
export {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_COLORS,
  MAINTENANCE_ALERT_SEVERITY_COLORS,
} from './service';

// Inventory
export * from './inventory';

// Quality
export * from './quality';

// Procurement
export * from './procurement';

// HR & People
export * from './attendance';
export * from './headcount';
export * from './overtime';
export * from './recruiting';
export * from './onboarding';
export * from './offboarding';
export * from './benefits';
export * from './fmla';
export * from './timeclock';

// Documents
export * from './documents';

// Planning & Tasks
export * from './planner';

// Portal & Notifications
export * from './portal';
export * from './notifications';

// Compliance
export * from './compliance';

// Finance
export * from './finance';

// Approval Workflows
export * from './approvalWorkflows';

// Department Workflow - export with aliases to avoid conflicts
export type {
  DepartmentType,
  Department as WorkflowDepartment,
  DocumentationSectionType,
  DocumentationFieldType,
  DocumentationField,
  DocumentationSectionTemplate,
  CompletedDocumentationSection,
  RoutingHistoryEntry,
  DepartmentWorkflow,
} from './departmentWorkflow';
export { DEPARTMENTS } from './departmentWorkflow';

// Recycling
export * from './recycling';

// Alert Preferences
export * from './alertPreferences';
