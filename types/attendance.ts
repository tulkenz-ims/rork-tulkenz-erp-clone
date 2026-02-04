export type OccurrenceType = 'tardy' | 'absent' | 'early_out' | 'no_call_no_show' | 'unexcused_absence';
export type OccurrenceStatus = 'pending' | 'approved' | 'excused' | 'disputed' | 'expired';
export type AttendanceAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AttendanceAlertType = 'threshold_warning' | 'threshold_reached' | 'points_expiring' | 'pattern_detected' | 'policy_violation';
export type EmployeeAttendanceStatus = 'good' | 'warning' | 'probation' | 'final_warning' | 'termination_eligible';

export interface AttendanceOccurrence {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  type: OccurrenceType;
  date: string;
  scheduledTime?: string;
  actualTime?: string;
  minutesLate?: number;
  minutesEarly?: number;
  points: number;
  status: OccurrenceStatus;
  reason?: string;
  notes?: string;
  supervisorId?: string;
  supervisorName?: string;
  expirationDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceAlert {
  id: string;
  type: AttendanceAlertType;
  severity: AttendanceAlertSeverity;
  employeeId?: string;
  employeeName?: string;
  departmentCode?: string;
  departmentName?: string;
  title: string;
  message: string;
  pointsTotal?: number;
  threshold?: number;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentCode: string;
  departmentName: string;
  currentPoints: number;
  maxPoints: number;
  pointsThisMonth: number;
  pointsThisQuarter: number;
  pointsThisYear: number;
  occurrencesCount: number;
  tardyCount: number;
  absentCount: number;
  earlyOutCount: number;
  noCallNoShowCount: number;
  lastOccurrenceDate?: string;
  nextExpirationDate?: string;
  nextExpirationPoints?: number;
  status: EmployeeAttendanceStatus;
  hireDate: string;
}

export interface DepartmentAttendanceSummary {
  departmentCode: string;
  departmentName: string;
  totalEmployees: number;
  employeesWithOccurrences: number;
  totalPointsIssued: number;
  avgPointsPerEmployee: number;
  tardyRate: number;
  absentRate: number;
  complianceScore: number;
  employeesAtRisk: number;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  pointsPerTardy: number;
  pointsPerAbsent: number;
  pointsPerEarlyOut: number;
  pointsPerNoCallNoShow: number;
  pointsPerUnexcusedAbsence: number;
  warningThreshold: number;
  probationThreshold: number;
  finalWarningThreshold: number;
  terminationThreshold: number;
  pointExpirationDays: number;
  tardyGracePeriodMinutes: number;
  isActive: boolean;
}
