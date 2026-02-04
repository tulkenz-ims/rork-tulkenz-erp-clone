export type PositionStatus = 'active' | 'inactive' | 'frozen' | 'archived';
export type JobLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'executive';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
export type FLSAStatus = 'exempt' | 'non_exempt';
export type SuccessionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Competency {
  name: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  required: boolean;
}

export interface Position {
  id: string;
  organization_id: string;
  position_code: string;
  title: string;
  short_title: string | null;
  description: string | null;
  job_family: string | null;
  job_level: JobLevel | null;
  employment_type: EmploymentType;
  flsa_status: FLSAStatus;
  department_code: string | null;
  department_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  pay_grade: string | null;
  pay_band: string | null;
  min_salary: number | null;
  mid_salary: number | null;
  max_salary: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  is_bonus_eligible: boolean;
  bonus_target_percent: number | null;
  budgeted_headcount: number;
  filled_headcount: number;
  open_positions: number;
  education_required: string | null;
  experience_years_min: number;
  experience_years_preferred: number | null;
  certifications_required: string[];
  licenses_required: string[];
  skills_required: string[];
  skills_preferred: string[];
  competencies: Competency[];
  responsibilities: string[];
  key_duties: string | null;
  physical_requirements: string | null;
  work_environment: string | null;
  travel_required: boolean;
  travel_percent: number;
  is_remote_eligible: boolean;
  reports_to_position_id: string | null;
  reports_to_position_title: string | null;
  supervisory_role: boolean;
  direct_reports_typical: number;
  is_critical_role: boolean;
  succession_priority: SuccessionPriority | null;
  status: PositionStatus;
  effective_date: string | null;
  end_date: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  color: string;
  sort_order: number;
  notes: string | null;
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionWithRelations extends Position {
  facility?: {
    id: string;
    name: string;
    facility_code: string;
  } | null;
  reports_to_position?: {
    id: string;
    title: string;
    position_code: string;
  } | null;
  assignments_count?: number;
}

export interface PositionCreateInput {
  organization_id?: string;
  position_code: string;
  title: string;
  short_title?: string;
  description?: string;
  job_family?: string;
  job_level?: JobLevel;
  employment_type?: EmploymentType;
  flsa_status?: FLSAStatus;
  department_code?: string;
  department_name?: string;
  facility_id?: string;
  facility_name?: string;
  pay_grade?: string;
  pay_band?: string;
  min_salary?: number;
  mid_salary?: number;
  max_salary?: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  is_bonus_eligible?: boolean;
  bonus_target_percent?: number;
  budgeted_headcount?: number;
  education_required?: string;
  experience_years_min?: number;
  experience_years_preferred?: number;
  certifications_required?: string[];
  licenses_required?: string[];
  skills_required?: string[];
  skills_preferred?: string[];
  competencies?: Competency[];
  responsibilities?: string[];
  key_duties?: string;
  physical_requirements?: string;
  work_environment?: string;
  travel_required?: boolean;
  travel_percent?: number;
  is_remote_eligible?: boolean;
  reports_to_position_id?: string;
  reports_to_position_title?: string;
  supervisory_role?: boolean;
  direct_reports_typical?: number;
  is_critical_role?: boolean;
  succession_priority?: SuccessionPriority;
  status?: PositionStatus;
  effective_date?: string;
  color?: string;
  notes?: string;
  created_by?: string;
  created_by_id?: string;
}

export interface PositionUpdateInput extends Partial<PositionCreateInput> {
  id: string;
}

export interface PositionAssignment {
  id: string;
  organization_id: string;
  position_id: string;
  employee_id: string;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  fte_percent: number;
  status: 'active' | 'on_leave' | 'ended';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionAssignmentWithEmployee extends PositionAssignment {
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
  } | null;
}

export const JOB_LEVEL_LABELS: Record<JobLevel, string> = {
  entry: 'Entry Level',
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director',
  executive: 'Executive',
};

export const JOB_LEVEL_COLORS: Record<JobLevel, string> = {
  entry: '#6B7280',
  junior: '#10B981',
  mid: '#3B82F6',
  senior: '#8B5CF6',
  lead: '#F59E0B',
  manager: '#EF4444',
  director: '#EC4899',
  executive: '#DC2626',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  temporary: 'Temporary',
  intern: 'Intern',
};

export const FLSA_STATUS_LABELS: Record<FLSAStatus, string> = {
  exempt: 'Exempt',
  non_exempt: 'Non-Exempt',
};

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  frozen: 'Frozen',
  archived: 'Archived',
};

export const POSITION_STATUS_COLORS: Record<PositionStatus, string> = {
  active: '#10B981',
  inactive: '#6B7280',
  frozen: '#3B82F6',
  archived: '#9CA3AF',
};
