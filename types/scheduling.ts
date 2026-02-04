export type ShiftType = 'day' | 'evening' | 'night' | 'split' | 'rotating' | 'custom';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ScheduleStatus = 'draft' | 'published' | 'archived';
export type AssignmentStatus = 'scheduled' | 'confirmed' | 'swap_requested' | 'swapped' | 'called_off' | 'no_show';
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ShiftTemplate {
  id: string;
  organization_id: string;
  facility_id: string | null;
  name: string;
  code: string;
  description: string | null;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  paid_break: boolean;
  color: string;
  is_overnight: boolean;
  minimum_staff: number;
  maximum_staff: number | null;
  department_codes: string[] | null;
  position_codes: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftTemplateCreateInput {
  name: string;
  code: string;
  description?: string;
  facility_id?: string | null;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_duration_minutes?: number;
  paid_break?: boolean;
  color?: string;
  is_overnight?: boolean;
  minimum_staff?: number;
  maximum_staff?: number | null;
  department_codes?: string[] | null;
  position_codes?: string[] | null;
}

export interface Schedule {
  id: string;
  organization_id: string;
  facility_id: string | null;
  name: string;
  description: string | null;
  week_start_date: string;
  week_end_date: string;
  status: ScheduleStatus;
  department_code: string | null;
  published_at: string | null;
  published_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreateInput {
  name: string;
  description?: string;
  facility_id?: string | null;
  week_start_date: string;
  week_end_date: string;
  department_code?: string | null;
  notes?: string;
}

export interface ShiftAssignment {
  id: string;
  organization_id: string;
  schedule_id: string;
  employee_id: string;
  shift_template_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  status: AssignmentStatus;
  department_code: string | null;
  position_code: string | null;
  notes: string | null;
  is_overtime: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignmentWithDetails extends ShiftAssignment {
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    position: string | null;
    department_code: string | null;
  } | null;
  shift_template?: ShiftTemplate | null;
}

export interface ShiftAssignmentCreateInput {
  schedule_id: string;
  employee_id: string;
  shift_template_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes?: number;
  department_code?: string | null;
  position_code?: string | null;
  notes?: string;
  is_overtime?: boolean;
}

export interface ShiftSwapRequest {
  id: string;
  organization_id: string;
  original_assignment_id: string;
  requesting_employee_id: string;
  target_employee_id: string | null;
  swap_assignment_id: string | null;
  status: SwapStatus;
  request_reason: string | null;
  response_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequestWithDetails extends ShiftSwapRequest {
  original_assignment?: ShiftAssignmentWithDetails | null;
  swap_assignment?: ShiftAssignmentWithDetails | null;
  requesting_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  target_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface ShiftSwapCreateInput {
  original_assignment_id: string;
  target_employee_id?: string | null;
  swap_assignment_id?: string | null;
  request_reason?: string;
}

export interface WeekScheduleView {
  schedule: Schedule;
  assignments: ShiftAssignmentWithDetails[];
  employees: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    position: string | null;
    department_code: string | null;
  }[];
  coverage: {
    date: string;
    scheduled: number;
    required: number;
    gap: number;
  }[];
}

export interface ScheduleStats {
  total_schedules: number;
  draft_schedules: number;
  published_schedules: number;
  total_assignments: number;
  swap_requests_pending: number;
  coverage_gaps: number;
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: 'Day Shift',
  evening: 'Evening Shift',
  night: 'Night Shift',
  split: 'Split Shift',
  rotating: 'Rotating',
  custom: 'Custom',
};

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  day: '#F59E0B',
  evening: '#8B5CF6',
  night: '#3B82F6',
  split: '#10B981',
  rotating: '#EC4899',
  custom: '#6B7280',
};

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const SCHEDULE_STATUS_COLORS: Record<ScheduleStatus, string> = {
  draft: '#F59E0B',
  published: '#10B981',
  archived: '#6B7280',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  swap_requested: 'Swap Requested',
  swapped: 'Swapped',
  called_off: 'Called Off',
  no_show: 'No Show',
};

export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  scheduled: '#3B82F6',
  confirmed: '#10B981',
  swap_requested: '#F59E0B',
  swapped: '#8B5CF6',
  called_off: '#EF4444',
  no_show: '#DC2626',
};

export const SWAP_STATUS_LABELS: Record<SwapStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const SWAP_STATUS_COLORS: Record<SwapStatus, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: '#6B7280',
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
