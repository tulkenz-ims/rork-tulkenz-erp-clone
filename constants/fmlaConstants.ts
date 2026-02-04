export type FMLAStatus = 'pending' | 'approved' | 'denied' | 'active' | 'exhausted' | 'completed' | 'cancelled';
export type FMLALeaveType = 'continuous' | 'intermittent' | 'reduced_schedule';
export type FMLAReason = 
  | 'own_serious_health'
  | 'family_serious_health'
  | 'birth_child'
  | 'adoption_foster'
  | 'military_caregiver'
  | 'qualifying_exigency';

export interface FMLACase {
  id: string;
  caseNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  reason: FMLAReason;
  leaveType: FMLALeaveType;
  status: FMLAStatus;
  requestDate: string;
  startDate: string;
  endDate?: string;
  estimatedEndDate?: string;
  totalHoursApproved: number;
  hoursUsed: number;
  hoursRemaining: number;
  certificationReceived: boolean;
  certificationDueDate?: string;
  recertificationDueDate?: string;
  notes?: string;
  medicalProvider?: string;
  familyMember?: string;
  familyRelationship?: string;
}

export const FMLA_STATUS_COLORS: Record<FMLAStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  denied: '#EF4444',
  active: '#3B82F6',
  exhausted: '#DC2626',
  completed: '#6B7280',
  cancelled: '#9CA3AF',
};

export const FMLA_STATUS_LABELS: Record<FMLAStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  active: 'Active',
  exhausted: 'Exhausted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const FMLA_REASON_LABELS: Record<FMLAReason, string> = {
  own_serious_health: 'Own Serious Health Condition',
  family_serious_health: 'Family Member Serious Health',
  birth_child: 'Birth of Child',
  adoption_foster: 'Adoption/Foster Care',
  military_caregiver: 'Military Caregiver',
  qualifying_exigency: 'Qualifying Exigency',
};

export const FMLA_LEAVE_TYPE_LABELS: Record<FMLALeaveType, string> = {
  continuous: 'Continuous',
  intermittent: 'Intermittent',
  reduced_schedule: 'Reduced Schedule',
};

export const MOCK_FMLA_CASES: FMLACase[] = [];

export type LeaveType = 'fmla' | 'ada' | 'military' | 'personal' | 'bereavement' | 'jury_duty' | 'workers_comp';
export type LeaveStatus = 'pending' | 'approved' | 'denied' | 'active' | 'completed' | 'cancelled';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  totalDays: number;
  daysUsed: number;
  daysRemaining: number;
  reason: string;
  notes?: string;
}

export interface LeaveAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  dueDate?: string;
  createdAt: string;
}

export interface EmployeeLeaveSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  fmlaHoursUsed: number;
  fmlaHoursRemaining: number;
  activeLeaves: number;
  upcomingLeaves: number;
}

export interface DepartmentLeaveSummary {
  department: string;
  activeLeaves: number;
  pendingRequests: number;
  upcomingLeaves: number;
  totalEmployees: number;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  fmla: 'FMLA',
  ada: 'ADA',
  military: 'Military',
  personal: 'Personal',
  bereavement: 'Bereavement',
  jury_duty: 'Jury Duty',
  workers_comp: 'Workers Comp',
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  fmla: '#3B82F6',
  ada: '#8B5CF6',
  military: '#059669',
  personal: '#6B7280',
  bereavement: '#374151',
  jury_duty: '#D97706',
  workers_comp: '#DC2626',
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  denied: '#EF4444',
  active: '#3B82F6',
  completed: '#6B7280',
  cancelled: '#9CA3AF',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export const getLeaveTypeLabel = (type: LeaveType): string => LEAVE_TYPE_LABELS[type] || type;
export const getLeaveTypeColor = (type: LeaveType): string => LEAVE_TYPE_COLORS[type] || '#6B7280';
export const getLeaveStatusColor = (status: LeaveStatus): string => LEAVE_STATUS_COLORS[status] || '#6B7280';
export const getAlertSeverityColor = (severity: AlertSeverity): string => ALERT_SEVERITY_COLORS[severity] || '#6B7280';

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [];
export const MOCK_LEAVE_ALERTS: LeaveAlert[] = [];
export const MOCK_EMPLOYEE_LEAVE_SUMMARIES: EmployeeLeaveSummary[] = [];
export const MOCK_DEPARTMENT_LEAVE_SUMMARIES: DepartmentLeaveSummary[] = [];
