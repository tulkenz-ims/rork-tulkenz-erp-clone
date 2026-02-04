export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type OvertimeType = 'scheduled' | 'unscheduled' | 'mandatory' | 'voluntary';

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  requestDate: string;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  type: OvertimeType;
  reason: string;
  status: OvertimeStatus;
  requestedBy: string;
  approvedBy?: string;
  approvalDate?: string;
  actualHours?: number;
  notes?: string;
}

export const OVERTIME_STATUS_COLORS: Record<OvertimeStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  completed: '#3B82F6',
  cancelled: '#6B7280',
};

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  scheduled: 'Scheduled',
  unscheduled: 'Unscheduled',
  mandatory: 'Mandatory',
  voluntary: 'Voluntary',
};

export const OVERTIME_TYPE_COLORS: Record<OvertimeType, string> = {
  scheduled: '#3B82F6',
  unscheduled: '#F59E0B',
  mandatory: '#EF4444',
  voluntary: '#10B981',
};

export const MOCK_OVERTIME_REQUESTS: OvertimeRequest[] = [];

export type OvertimeAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ComplianceStatus = 'compliant' | 'warning' | 'violation';

export interface OvertimeAlert {
  id: string;
  title: string;
  message: string;
  severity: OvertimeAlertSeverity;
  employeeName?: string;
  departmentName?: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface EmployeeOvertimeSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  weeklyOvertimeHours: number;
  monthlyOvertimeHours: number;
  weeklyLimit: number;
  monthlyLimit: number;
  consecutiveOvertimeDays: number;
  averageWeeklyOvertime: number;
  yearToDateOvertimeHours: number;
  totalOvertimePay: number;
  lastOvertimeDate: string;
  complianceStatus: ComplianceStatus;
}

export interface DepartmentOvertimeSummary {
  departmentCode: string;
  departmentName: string;
  totalEmployees: number;
  employeesWithOvertime: number;
  weeklyOvertimeHours: number;
  monthlyOvertimeHours: number;
  averageOvertimePerEmployee: number;
  budgetAllocated: number;
  budgetUsed: number;
  budgetRemaining: number;
  complianceRate: number;
}

export const MOCK_OVERTIME_ALERTS: OvertimeAlert[] = [];
export const MOCK_EMPLOYEE_OVERTIME_SUMMARIES: EmployeeOvertimeSummary[] = [];
export const MOCK_DEPARTMENT_OVERTIME_SUMMARIES: DepartmentOvertimeSummary[] = [];

export const getAlertSeverityColor = (severity: OvertimeAlertSeverity): string => {
  switch (severity) {
    case 'critical': return '#EF4444';
    case 'high': return '#F59E0B';
    case 'medium': return '#3B82F6';
    case 'low': return '#10B981';
    default: return '#6B7280';
  }
};

export const getComplianceStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'compliant': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'violation': return '#EF4444';
    default: return '#6B7280';
  }
};

export const getOvertimeTypeColor = (type: 'voluntary' | 'mandatory' | 'emergency'): string => {
  switch (type) {
    case 'voluntary': return '#10B981';
    case 'mandatory': return '#F59E0B';
    case 'emergency': return '#EF4444';
    default: return '#6B7280';
  }
};

export const getOvertimeStatusColor = (status: 'pending' | 'approved' | 'rejected' | 'completed'): string => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'approved': return '#10B981';
    case 'rejected': return '#EF4444';
    case 'completed': return '#3B82F6';
    default: return '#6B7280';
  }
};
