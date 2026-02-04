import type { 
  OccurrenceType, 
  OccurrenceStatus, 
  EmployeeAttendanceStatus, 
  AttendanceAlertSeverity,
  AttendancePolicy,
  AttendanceAlert,
  EmployeeAttendanceSummary,
  DepartmentAttendanceSummary,
} from '@/types/attendance';

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  id: 'default-policy',
  name: 'Standard Attendance Policy',
  pointsPerTardy: 0.5,
  pointsPerAbsent: 1,
  pointsPerEarlyOut: 0.5,
  pointsPerNoCallNoShow: 3,
  pointsPerUnexcusedAbsence: 2,
  warningThreshold: 4,
  probationThreshold: 6,
  finalWarningThreshold: 8,
  terminationThreshold: 10,
  pointExpirationDays: 365,
  tardyGracePeriodMinutes: 7,
  isActive: true,
};

export const getOccurrenceTypeLabel = (type: OccurrenceType): string => {
  const labels: Record<OccurrenceType, string> = {
    tardy: 'Tardy',
    absent: 'Absent',
    early_out: 'Early Out',
    no_call_no_show: 'No Call/No Show',
    unexcused_absence: 'Unexcused Absence',
  };
  return labels[type] || type;
};

export const getOccurrenceTypeColor = (type: OccurrenceType): string => {
  const colors: Record<OccurrenceType, string> = {
    tardy: '#F59E0B',
    absent: '#EF4444',
    early_out: '#8B5CF6',
    no_call_no_show: '#DC2626',
    unexcused_absence: '#F97316',
  };
  return colors[type] || '#6B7280';
};

export const getOccurrenceStatusColor = (status: OccurrenceStatus): string => {
  const colors: Record<OccurrenceStatus, string> = {
    pending: '#F59E0B',
    approved: '#3B82F6',
    excused: '#10B981',
    disputed: '#8B5CF6',
    expired: '#6B7280',
  };
  return colors[status] || '#6B7280';
};

export const getStatusColor = (status: EmployeeAttendanceStatus): string => {
  const colors: Record<EmployeeAttendanceStatus, string> = {
    good: '#10B981',
    warning: '#F59E0B',
    probation: '#F97316',
    final_warning: '#EF4444',
    termination_eligible: '#DC2626',
  };
  return colors[status] || '#6B7280';
};

export const getStatusLabel = (status: EmployeeAttendanceStatus): string => {
  const labels: Record<EmployeeAttendanceStatus, string> = {
    good: 'Good Standing',
    warning: 'Warning',
    probation: 'Probation',
    final_warning: 'Final Warning',
    termination_eligible: 'Term Eligible',
  };
  return labels[status] || status;
};

export const getAlertSeverityColor = (severity: AttendanceAlertSeverity): string => {
  const colors: Record<AttendanceAlertSeverity, string> = {
    low: '#3B82F6',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444',
  };
  return colors[severity] || '#6B7280';
};

export const EMPTY_ATTENDANCE_ALERTS: AttendanceAlert[] = [];
export const EMPTY_EMPLOYEE_SUMMARIES: EmployeeAttendanceSummary[] = [];
export const EMPTY_DEPARTMENT_SUMMARIES: DepartmentAttendanceSummary[] = [];
