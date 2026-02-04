// Time Clock Types

export type PunchType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
export type BreakType = 'paid' | 'unpaid';
export type TimeEntryStatus = 'active' | 'completed' | 'pending_approval' | 'approved';
export type AdjustmentRequestType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'add_entry' | 'delete_entry' | 'modify_entry';
export type AdjustmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type BreakViolationType = 'break_too_short' | 'break_too_long' | 'missed_break' | 'early_return' | 'late_return';
export type BreakViolationStatus = 'pending' | 'acknowledged' | 'excused' | 'warned';
export type BreakActionType = 'block' | 'warn' | 'allow' | 'alert_hr';

// Time Punch
export interface TimePunch {
  id: string;
  organization_id: string;
  employee_id: string;
  type: PunchType;
  timestamp: string;
  location?: string;
  notes?: string;
  break_type?: BreakType;
  scheduled_minutes?: number;
  time_entry_id?: string;
  created_at: string;
}

// Time Entry
export interface TimeEntry {
  id: string;
  organization_id: string;
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  break_minutes: number;
  total_hours: number;
  status: TimeEntryStatus;
  shift_id?: string;
  employee_approved: boolean;
  employee_approved_at?: string;
  paid_break_minutes: number;
  unpaid_break_minutes: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Time Adjustment Request
export interface TimeAdjustmentRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  time_entry_id?: string;
  time_punch_id?: string;
  request_type: AdjustmentRequestType;
  original_timestamp?: string;
  original_date?: string;
  original_clock_in?: string;
  original_clock_out?: string;
  requested_timestamp?: string;
  requested_date?: string;
  requested_clock_in?: string;
  requested_clock_out?: string;
  reason: string;
  employee_notes?: string;
  status: AdjustmentRequestStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  admin_response?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

// Break Settings
export interface BreakSettings {
  id: string;
  organization_id: string;
  facility_id?: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  paid_break_durations: number[];
  max_paid_breaks_per_shift: number;
  paid_break_auto_deduct: boolean;
  unpaid_break_durations: number[];
  min_unpaid_break_minutes: number;
  max_unpaid_break_minutes: number;
  unpaid_break_buffer_minutes: number;
  early_return_grace_minutes: number;
  enforce_minimum_break: boolean;
  enforce_maximum_break: boolean;
  break_too_short_action: 'block' | 'warn' | 'allow';
  break_too_long_action: 'alert_hr' | 'warn' | 'allow';
  break_too_long_threshold_minutes: number;
  required_break_after_hours: number;
  auto_deduct_unpaid_break: boolean;
  auto_deduct_duration_minutes: number;
  applicable_departments: string[];
  applicable_roles: string[];
  created_by?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

// Break Violation
export interface BreakViolation {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  time_entry_id?: string;
  time_punch_id?: string;
  violation_type: BreakViolationType;
  violation_date: string;
  break_type?: BreakType;
  scheduled_minutes?: number;
  actual_minutes?: number;
  difference_minutes?: number;
  break_start?: string;
  break_end?: string;
  status: BreakViolationStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  hr_notified: boolean;
  hr_notified_at?: string;
  manager_notified: boolean;
  manager_notified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Form/Input Types
export interface TimeAdjustmentRequestInput {
  organization_id: string;
  employee_id: string;
  employee_name: string;
  time_entry_id?: string;
  time_punch_id?: string;
  request_type: AdjustmentRequestType;
  original_timestamp?: string;
  original_date?: string;
  original_clock_in?: string;
  original_clock_out?: string;
  requested_timestamp?: string;
  requested_date?: string;
  requested_clock_in?: string;
  requested_clock_out?: string;
  reason: string;
  employee_notes?: string;
}

export interface BreakSettingsInput {
  organization_id: string;
  facility_id?: string;
  name: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  paid_break_durations?: number[];
  max_paid_breaks_per_shift?: number;
  paid_break_auto_deduct?: boolean;
  unpaid_break_durations?: number[];
  min_unpaid_break_minutes?: number;
  max_unpaid_break_minutes?: number;
  unpaid_break_buffer_minutes?: number;
  early_return_grace_minutes?: number;
  enforce_minimum_break?: boolean;
  enforce_maximum_break?: boolean;
  break_too_short_action?: 'block' | 'warn' | 'allow';
  break_too_long_action?: 'alert_hr' | 'warn' | 'allow';
  break_too_long_threshold_minutes?: number;
  required_break_after_hours?: number;
  auto_deduct_unpaid_break?: boolean;
  auto_deduct_duration_minutes?: number;
  applicable_departments?: string[];
  applicable_roles?: string[];
  created_by?: string;
  created_by_id?: string;
}

// UI Display helpers
export const BREAK_TYPE_LABELS: Record<BreakType, string> = {
  paid: 'Paid Break',
  unpaid: 'Unpaid Break',
};

export const ADJUSTMENT_REQUEST_STATUS_LABELS: Record<AdjustmentRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ADJUSTMENT_REQUEST_STATUS_COLORS: Record<AdjustmentRequestStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: '#6B7280',
};

export const ADJUSTMENT_REQUEST_TYPE_LABELS: Record<AdjustmentRequestType, string> = {
  clock_in: 'Clock In',
  clock_out: 'Clock Out',
  break_start: 'Break Start',
  break_end: 'Break End',
  add_entry: 'Add Entry',
  delete_entry: 'Delete Entry',
  modify_entry: 'Modify Entry',
};

export const BREAK_VIOLATION_TYPE_LABELS: Record<BreakViolationType, string> = {
  break_too_short: 'Break Too Short',
  break_too_long: 'Break Too Long',
  missed_break: 'Missed Break',
  early_return: 'Early Return',
  late_return: 'Late Return',
};

export const BREAK_VIOLATION_STATUS_LABELS: Record<BreakViolationStatus, string> = {
  pending: 'Pending Review',
  acknowledged: 'Acknowledged',
  excused: 'Excused',
  warned: 'Warning Issued',
};

export const BREAK_VIOLATION_STATUS_COLORS: Record<BreakViolationStatus, string> = {
  pending: '#F59E0B',
  acknowledged: '#3B82F6',
  excused: '#10B981',
  warned: '#EF4444',
};

// Default break settings
export const DEFAULT_PAID_BREAK_DURATIONS = [5, 10, 15];
export const DEFAULT_UNPAID_BREAK_DURATIONS = [30, 45, 60];
export const DEFAULT_MIN_UNPAID_BREAK = 30;
export const DEFAULT_MAX_UNPAID_BREAK = 60;
export const DEFAULT_UNPAID_BREAK_BUFFER = 2;
