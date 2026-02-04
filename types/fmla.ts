export type LeaveType = 'fmla' | 'medical' | 'parental' | 'military' | 'bereavement' | 'personal' | 'ada_accommodation';
export type LeaveStatus = 'pending' | 'approved' | 'denied' | 'active' | 'completed' | 'cancelled' | 'expired';
export type LeaveAlertType = 'expiring_soon' | 'hours_exhausted' | 'documentation_needed' | 'return_date' | 'recertification' | 'compliance_risk';
export type LeaveAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  totalDays: number;
  hoursRequested: number;
  hoursUsed: number;
  hoursRemaining: number;
  status: LeaveStatus;
  intermittent: boolean;
  intermittentSchedule?: string;
  medicalCertification: boolean;
  certificationDate?: string;
  recertificationDue?: string;
  approvedBy?: string;
  approvedAt?: string;
  denialReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveAlert {
  id: string;
  type: LeaveAlertType;
  severity: LeaveAlertSeverity;
  employeeId?: string;
  employeeName?: string;
  leaveRequestId?: string;
  departmentCode?: string;
  departmentName?: string;
  title: string;
  message: string;
  dueDate?: string;
  daysUntilDue?: number;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface EmployeeLeaveSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  fmlaEligible: boolean;
  fmlaHoursEntitled: number;
  fmlaHoursUsed: number;
  fmlaHoursRemaining: number;
  fmlaYearStart: string;
  fmlaYearEnd: string;
  activeLeaves: number;
  totalLeaveDays: number;
  lastLeaveDate?: string;
  hireDate: string;
  hoursWorked12Months: number;
  monthsEmployed: number;
}

export interface DepartmentLeaveSummary {
  departmentCode: string;
  departmentName: string;
  totalEmployees: number;
  employeesOnLeave: number;
  pendingRequests: number;
  fmlaEligible: number;
  totalHoursUsed: number;
  avgHoursPerEmployee: number;
  complianceScore: number;
}
