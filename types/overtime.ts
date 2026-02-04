// Overtime Request Types
export type OvertimeType = 'voluntary' | 'mandatory' | 'emergency';
export type OvertimeRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type OvertimeComplianceStatus = 'compliant' | 'warning' | 'violation';

export interface OvertimeRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  facility_id: string | null;
  facility_name: string | null;
  department_code: string | null;
  department_name: string | null;
  date: string;
  scheduled_hours: number;
  actual_hours: number | null;
  overtime_hours: number;
  overtime_type: OvertimeType;
  reason: string;
  status: OvertimeRequestStatus;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
  overtime_multiplier: number;
  overtime_pay: number | null;
  double_time_hours: number;
  double_time_rate: number | null;
  double_time_pay: number;
  total_pay: number | null;
  shift_id: string | null;
  time_entry_id: string | null;
  consecutive_overtime_day: number;
  weekly_overtime_total: number | null;
  monthly_overtime_total: number | null;
  is_compliance_exception: boolean;
  compliance_notes: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  manager_id: string | null;
  manager_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Overtime Alert Types
export type OvertimeAlertType = 
  | 'approaching_limit'
  | 'exceeded_limit'
  | 'consecutive_days'
  | 'compliance_risk'
  | 'budget_impact'
  | 'fatigue_risk';

export type OvertimeAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface OvertimeAlert {
  id: string;
  organization_id: string;
  alert_type: OvertimeAlertType;
  severity: OvertimeAlertSeverity;
  employee_id: string | null;
  employee_name: string | null;
  department_code: string | null;
  department_name: string | null;
  facility_id: string | null;
  title: string;
  message: string;
  metric: string | null;
  threshold: number | null;
  current_value: number | null;
  is_read: boolean;
  is_dismissed: boolean;
  read_by: string | null;
  read_at: string | null;
  dismissed_by: string | null;
  dismissed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Overtime Policy Types
export interface OvertimePolicy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  weekly_overtime_limit: number;
  monthly_overtime_limit: number;
  daily_overtime_limit: number;
  max_consecutive_days: number;
  overtime_multiplier: number;
  double_time_threshold: number;
  double_time_multiplier: number;
  holiday_multiplier: number;
  requires_approval: boolean;
  approval_threshold_hours: number;
  auto_approve_under_threshold: boolean;
  notify_manager_at_percent: number;
  notify_hr_at_percent: number;
  notify_employee_at_percent: number;
  fatigue_warning_hours: number;
  mandatory_rest_after_hours: number;
  department_budget_tracking: boolean;
  applicable_departments: string[];
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Employee Overtime Summary Types
export interface EmployeeOvertimeSummary {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  department_code: string | null;
  department_name: string | null;
  weekly_overtime_hours: number;
  monthly_overtime_hours: number;
  year_to_date_overtime_hours: number;
  weekly_limit: number;
  monthly_limit: number;
  consecutive_overtime_days: number;
  last_overtime_date: string | null;
  weekly_overtime_pay: number;
  monthly_overtime_pay: number;
  year_to_date_overtime_pay: number;
  average_weekly_overtime: number;
  compliance_status: OvertimeComplianceStatus;
  last_violation_date: string | null;
  violation_count: number;
  week_start_date: string | null;
  month_start_date: string | null;
  created_at: string;
  updated_at: string;
}

// Department Overtime Summary Types
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface DepartmentOvertimeSummary {
  id: string;
  organization_id: string;
  department_code: string;
  department_name: string;
  facility_id: string | null;
  total_employees: number;
  employees_with_overtime: number;
  weekly_overtime_hours: number;
  monthly_overtime_hours: number;
  year_to_date_overtime_hours: number;
  budget_allocated: number;
  budget_used: number;
  budget_remaining: number;
  budget_period: BudgetPeriod;
  average_overtime_per_employee: number;
  compliance_rate: number;
  employees_at_risk: number;
  employees_in_violation: number;
  week_start_date: string | null;
  month_start_date: string | null;
  created_at: string;
  updated_at: string;
}

// Labels
export const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  voluntary: 'Voluntary',
  mandatory: 'Mandatory',
  emergency: 'Emergency',
};

export const OVERTIME_TYPE_COLORS: Record<OvertimeType, string> = {
  voluntary: '#3B82F6',
  mandatory: '#F59E0B',
  emergency: '#EF4444',
};

export const OVERTIME_REQUEST_STATUS_LABELS: Record<OvertimeRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const OVERTIME_REQUEST_STATUS_COLORS: Record<OvertimeRequestStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  completed: '#6B7280',
  cancelled: '#DC2626',
};

export const OVERTIME_COMPLIANCE_STATUS_LABELS: Record<OvertimeComplianceStatus, string> = {
  compliant: 'Compliant',
  warning: 'Warning',
  violation: 'Violation',
};

export const OVERTIME_COMPLIANCE_STATUS_COLORS: Record<OvertimeComplianceStatus, string> = {
  compliant: '#10B981',
  warning: '#F59E0B',
  violation: '#EF4444',
};
