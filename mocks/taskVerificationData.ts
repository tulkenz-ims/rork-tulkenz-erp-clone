export type TaskVerificationStatus = 'pending_review' | 'verified' | 'flagged';

export interface TaskLocation {
  id: string;
  name: string;
  facilityCode?: string;
  description?: string;
  active: boolean;
}

export interface TaskCategory {
  id: string;
  name: string;
  description?: string;
  departmentCode?: string;
  active: boolean;
}

export interface TaskVerification {
  id: string;
  departmentCode: string;
  departmentName: string;
  facilityCode: string;
  locationId: string;
  locationName: string;
  categoryId: string;
  categoryName: string;
  action: string;
  notes?: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
  status: TaskVerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  sourceType?: 'work_order' | 'pm_work_order' | 'inspection' | 'permit' | 'manual';
  sourceId?: string;
  sourceNumber?: string;
  permitType?: string;
  inspectionResult?: 'pass' | 'fail' | 'needs_attention';
}

export const TASK_LOCATIONS: TaskLocation[] = [
  { id: 'loc-maint', name: 'Maintenance Shop', facilityCode: 'FAC-001', active: true },
  { id: 'loc-prod-a', name: 'Production Line A', facilityCode: 'FAC-001', active: true },
  { id: 'loc-prod-b', name: 'Production Line B', facilityCode: 'FAC-001', active: true },
  { id: 'loc-warehouse', name: 'Warehouse', facilityCode: 'FAC-001', active: true },
  { id: 'loc-qa-lab', name: 'QA Lab', facilityCode: 'FAC-001', active: true },
  { id: 'loc-shipping', name: 'Shipping Dock', facilityCode: 'FAC-001', active: true },
  { id: 'loc-receiving', name: 'Receiving Dock', facilityCode: 'FAC-001', active: true },
  { id: 'loc-office', name: 'Office', facilityCode: 'FAC-001', active: true },
];

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'cat-wo-complete', name: 'Work Order Completed', departmentCode: '1001', active: true },
  { id: 'cat-pm-complete', name: 'Preventive Maintenance Completed', departmentCode: '1001', active: true },
  { id: 'cat-inspection-complete', name: 'Inspection Completed', departmentCode: '1004', active: true },
  { id: 'cat-permit-issued', name: 'Permit Activity', departmentCode: '1005', active: true },
  { id: 'cat-safety-check', name: 'Safety Check', departmentCode: '1005', active: true },
  { id: 'cat-quality-check', name: 'Quality Check', departmentCode: '1004', active: true },
  { id: 'cat-inventory', name: 'Inventory Activity', departmentCode: '1003', active: true },
  { id: 'cat-production', name: 'Production Activity', departmentCode: '1002', active: true },
];
