export type DepartmentType = 'maintenance' | 'safety' | 'quality' | 'compliance' | 'calibration';

export interface Department {
  id: DepartmentType;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export type DocumentationSectionType = 
  | 'pre_op_inspection'
  | 'post_op_inspection'
  | 'hygiene_report'
  | 'wet_clean'
  | 'dry_wipe'
  | 'safety_inspection'
  | 'hazard_assessment'
  | 'quality_check'
  | 'sqf_audit'
  | 'fda_audit'
  | 'osha_compliance'
  | 'calibration_record'
  | 'vendor_verification'
  | 'brittle_plastic_check'
  | 'glass_audit';

export type DocumentationFieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'textarea' | 'signature';

export interface DocumentationField {
  id: string;
  label: string;
  type: DocumentationFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DocumentationSectionTemplate {
  id: DocumentationSectionType;
  name: string;
  department: DepartmentType;
  color: string;
  icon: string;
  description: string;
  fields: DocumentationField[];
  requiresSignature: boolean;
  nextDepartment?: DepartmentType;
}

export interface CompletedDocumentationSection {
  id: string;
  templateId: DocumentationSectionType;
  department: DepartmentType;
  completedBy: string;
  completedByName: string;
  completedAt: string;
  values: Record<string, unknown>;
  signature?: string;
  notes?: string;
  isLocked: boolean;
}

export interface RoutingHistoryEntry {
  department: DepartmentType;
  sentBy: string;
  sentAt: string;
  notes?: string;
}

export interface DepartmentWorkflow {
  id: string;
  workOrderId: string;
  currentDepartment: DepartmentType;
  departmentQueue: DepartmentType[];
  completedDepartments: DepartmentType[];
  routingHistory: RoutingHistoryEntry[];
  documentationSections: CompletedDocumentationSection[];
}

export const DEPARTMENTS: Department[] = [
  { id: 'maintenance', name: 'Maintenance', color: '#3B82F6', icon: 'Wrench', description: 'Equipment repair and preventive maintenance' },
  { id: 'safety', name: 'Safety', color: '#EF4444', icon: 'ShieldAlert', description: 'Safety inspections, hazard assessments, OSHA compliance' },
  { id: 'quality', name: 'Quality', color: '#10B981', icon: 'CheckCircle2', description: 'Quality control, SQF audits, hygiene reports' },
  { id: 'compliance', name: 'Compliance', color: '#8B5CF6', icon: 'FileCheck', description: 'FDA audits, regulatory compliance, documentation' },
  { id: 'calibration', name: 'Calibration', color: '#F59E0B', icon: 'Gauge', description: 'Equipment calibration and verification' },
];
