export type WorkOrderStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'overdue';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'partially_approved' | 'approved' | 'rejected' | 'returned_to_requestor';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  equipment_id?: string;
  equipment_name?: string;
  facility_id?: string;
  facility_name?: string;
  assigned_to?: string;
  assigned_name?: string;
  requested_by?: string;
  requested_by_name?: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  completed_by?: string;
  labor_hours?: number;
  completion_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  total_amount: number;
  currency: string;
  requested_by: string;
  requested_by_name: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  expected_delivery?: string;
  received_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ApprovalChainEntry {
  tier: 1 | 2 | 3;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  approverId?: string;
  approverName?: string;
  approverRole: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  returnedToRequestor?: boolean;
}

export interface Approval {
  id: string;
  type: 'purchase' | 'time_off' | 'overtime' | 'schedule_change' | 'expense' | 'permit';
  status: ApprovalStatus;
  created_at: string;
}

export interface PurchaseApproval extends Approval {
  type: 'purchase';
  poId: string;
  poNumber?: string;
  migoNumber?: string;
  requisitionNumber?: string;
  title: string;
  vendorName: string;
  amount: number;
  currency: string;
  requiredTier: 1 | 2 | 3;
  approvalChain: ApprovalChainEntry[];
  requestedBy: string;
  requestedByName: string;
  requested_by: string;
  department?: string;
  description?: string;
}

export interface TimeApproval extends Approval {
  type: 'time_off' | 'overtime' | 'schedule_change';
  employeeId: string;
  employeeName: string;
  requestType: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  hoursRequested?: number;
  requested_by: string;
  managerApproval: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    managerId?: string;
    managerName?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  };
  hrApproval?: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    hrAdminId?: string;
    hrAdminName?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  };
  reason?: string;
}

export interface PermitApproval extends Approval {
  type: 'permit';
  permitTypeId: string;
  permitTypeName: string;
  permitCode?: string;
  title: string;
  workOrderId: string;
  workOrderNumber: string;
  requesterId: string;
  requested_by: string;
  location: string;
  equipment?: string;
  description: string;
  hazards: string[];
  precautions: string[];
  approverRole?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  expiresAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ApprovalSettings {
  purchaseApprovalTier: 'none' | 'single' | 'double' | 'triple';
  tierThresholds: {
    tier1Limit: number;
    tier2Limit: number;
    tier3Limit: number;
  };
  tier1ApproverRole: string;
  tier2ApproverRole: string;
  tier3ApproverRole: string;
  timeOffRequiresHR: boolean;
  timeApprovalRequiresHR: boolean;
  overtimeRequiresHR: boolean;
  emailNotificationsEnabled: boolean;
}

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  purchaseApprovalTier: 'double',
  tierThresholds: {
    tier1Limit: 1000,
    tier2Limit: 5000,
    tier3Limit: 25000,
  },
  tier1ApproverRole: 'Supervisor',
  tier2ApproverRole: 'Manager',
  tier3ApproverRole: 'Director',
  timeOffRequiresHR: false,
  timeApprovalRequiresHR: false,
  overtimeRequiresHR: true,
  emailNotificationsEnabled: true,
};

export interface TimeOffSettings {
  ptoAccrualRate: number;
  sickLeaveAccrualRate: number;
  maxPTOCarryover: number;
  maxSickLeaveCarryover: number;
  requireAdvanceNotice: boolean;
  advanceNoticeDays: number;
}

export const DEFAULT_TIME_OFF_SETTINGS: TimeOffSettings = {
  ptoAccrualRate: 1.25,
  sickLeaveAccrualRate: 0.5,
  maxPTOCarryover: 40,
  maxSickLeaveCarryover: 40,
  requireAdvanceNotice: true,
  advanceNoticeDays: 14,
};

export interface TimeOffBalances {
  pto: number;
  sickLeave: number;
  vacation: number;
  personal: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  managerId?: string;
  managerName?: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  hireDate: string;
  terminationDate?: string;
  ptoBalance?: number;
  sickLeaveBalance?: number;
  timeOffBalances?: TimeOffBalances;
  availability?: EmployeeAvailability;
  profile?: EmployeeProfile;
}

export interface EmployeeAvailability {
  monday: { available: boolean; start?: string; end?: string };
  tuesday: { available: boolean; start?: string; end?: string };
  wednesday: { available: boolean; start?: string; end?: string };
  thursday: { available: boolean; start?: string; end?: string };
  friday: { available: boolean; start?: string; end?: string };
  saturday: { available: boolean; start?: string; end?: string };
  sunday: { available: boolean; start?: string; end?: string };
}

export interface EmployeeProfile {
  bio?: string;
  skills?: string[];
  certifications?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'regular' | 'overtime' | 'on_call';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakMinutes: number;
  totalHours: number;
  status: 'active' | 'completed' | 'adjusted';
  notes?: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'pto' | 'sick' | 'vacation' | 'personal' | 'unpaid';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  managerName?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  originalShiftId: string;
  originalShiftDate: string;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  status: 'open' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface TimePunch {
  id: string;
  employeeId: string;
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
  notes?: string;
}

export interface BulletinPost {
  id: string;
  title: string;
  content: string;
  category: 'announcement' | 'policy' | 'event' | 'recognition' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  pinned: boolean;
  authorId: string;
  authorName: string;
  department?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}
