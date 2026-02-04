export type TaskVerificationStatus = 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected' | 'flagged' | 'pending_review';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategoryType = 'sanitation' | 'safety' | 'quality' | 'maintenance' | 'production' | 'compliance' | 'other';

export interface TaskLocation {
  id: string;
  code: string;
  name: string;
  facilityCode: string;
  departmentCode: string;
  description?: string;
  active: boolean;
}

export interface TaskCategory {
  id: string;
  name: string;
  description?: string;
  departmentCode?: string;
  active: boolean;
  requiresPhoto?: boolean;
  requiresNotes?: boolean;
  actions?: string[];
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
  photoUri?: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
  status: TaskVerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  sourceType?: 'work_order' | 'pm_work_order' | 'inspection' | 'permit' | 'work_request' | 'manual' | 'issue_report';
  sourceId?: string;
  sourceNumber?: string;
  permitType?: string;
  inspectionResult?: 'pass' | 'fail' | 'needs_attention';
  linkedWorkOrderId?: string;
}

export interface LegacyTaskVerification {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;
  category: TaskCategoryType;
  priority: TaskPriority;
  status: TaskVerificationStatus;
  assignedTo: string;
  assignedToId: string;
  verifiedBy?: string;
  verifiedById?: string;
  area: string;
  equipment?: string;
  dueDate: string;
  completedDate?: string;
  verifiedDate?: string;
  requiresPhoto: boolean;
  photoUrl?: string;
  notes?: string;
  checklistItems?: TaskChecklistItem[];
}

export interface TaskChecklistItem {
  id: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export const TASK_STATUS_COLORS: Record<TaskVerificationStatus, string> = {
  pending: '#6B7280',
  in_progress: '#3B82F6',
  completed: '#F59E0B',
  verified: '#10B981',
  rejected: '#EF4444',
  flagged: '#EF4444',
  pending_review: '#F59E0B',
};

export const TASK_STATUS_LABELS: Record<TaskVerificationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Awaiting Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  flagged: 'Flagged',
  pending_review: 'Pending Review',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export const TASK_CATEGORY_COLORS: Record<TaskCategoryType, string> = {
  sanitation: '#06B6D4',
  safety: '#EF4444',
  quality: '#10B981',
  maintenance: '#3B82F6',
  production: '#8B5CF6',
  compliance: '#F59E0B',
  other: '#6B7280',
};

export const TASK_CATEGORY_LABELS: Record<TaskCategoryType, string> = {
  sanitation: 'Sanitation',
  safety: 'Safety',
  quality: 'Quality',
  maintenance: 'Maintenance',
  production: 'Production',
  compliance: 'Compliance',
  other: 'Other',
};

export const MOCK_TASK_VERIFICATIONS: LegacyTaskVerification[] = [];

export const TASK_LOCATIONS: TaskLocation[] = [
  { id: 'loc-maint', code: 'MAINT', name: 'Maintenance Shop', facilityCode: 'FAC-001', departmentCode: '1001', active: true },
  { id: 'loc-prod-a', code: 'PROD-A', name: 'Production Line A', facilityCode: 'FAC-001', departmentCode: '1002', active: true },
  { id: 'loc-prod-b', code: 'PROD-B', name: 'Production Line B', facilityCode: 'FAC-001', departmentCode: '1002', active: true },
  { id: 'loc-warehouse', code: 'WH', name: 'Warehouse', facilityCode: 'FAC-001', departmentCode: '1003', active: true },
  { id: 'loc-qa-lab', code: 'QA', name: 'QA Lab', facilityCode: 'FAC-001', departmentCode: '1004', active: true },
  { id: 'loc-shipping', code: 'SHIP', name: 'Shipping Dock', facilityCode: 'FAC-001', departmentCode: '1003', active: true },
  { id: 'loc-receiving', code: 'REC', name: 'Receiving Dock', facilityCode: 'FAC-001', departmentCode: '1003', active: true },
  { id: 'loc-office', code: 'OFF', name: 'Office', facilityCode: 'FAC-001', departmentCode: '1000', active: true },
];

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'cat-wo-complete', name: 'Work Order Completed', departmentCode: '1001', active: true, actions: ['Completed Repair', 'Completed Installation', 'Completed Service'] },
  { id: 'cat-pm-complete', name: 'Preventive Maintenance Completed', departmentCode: '1001', active: true, actions: ['Lubrication', 'Filter Change', 'Calibration', 'General PM'] },
  { id: 'cat-inspection-complete', name: 'Inspection Completed', departmentCode: '1004', active: true, requiresPhoto: true, actions: ['Passed Inspection', 'Failed Inspection', 'Needs Follow-up'] },
  { id: 'cat-permit-issued', name: 'Permit Activity', departmentCode: '1005', active: true, requiresNotes: true, actions: ['Permit Issued', 'Permit Closed', 'Permit Extended'] },
  { id: 'cat-safety-check', name: 'Safety Check', departmentCode: '1005', active: true, requiresPhoto: true, actions: ['Area Cleared', 'Hazard Identified', 'Safety Equipment Verified'] },
  { id: 'cat-quality-check', name: 'Quality Check', departmentCode: '1004', active: true, actions: ['QC Passed', 'QC Failed', 'Sample Taken'] },
  { id: 'cat-inventory', name: 'Inventory Activity', departmentCode: '1003', active: true, actions: ['Stock Counted', 'Parts Received', 'Parts Issued'] },
  { id: 'cat-production', name: 'Production Activity', departmentCode: '1002', active: true, actions: ['Line Started', 'Line Stopped', 'Batch Completed'] },
  { id: 'cat-issue-report', name: 'Issue Reported', departmentCode: '1001', active: true, requiresPhoto: true, requiresNotes: true, actions: ['Equipment Down', 'Safety Hazard', 'Spill Reported', 'Other Issue'] },
];

export function getCategoriesForLocation(locationId: string): TaskCategory[] {
  return TASK_CATEGORIES.filter(cat => cat.active);
}

export function getActionsForCategory(categoryId: string): string[] {
  const category = TASK_CATEGORIES.find(cat => cat.id === categoryId);
  return category?.actions || [];
}
