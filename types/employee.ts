export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';

export interface EmployeeProfile {
  phone?: string;
  extension?: string;
  location?: string;
  avatar_url?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface EmployeeAvailability {
  monday?: { start: string; end: string } | null;
  tuesday?: { start: string; end: string } | null;
  wednesday?: { start: string; end: string } | null;
  thursday?: { start: string; end: string } | null;
  friday?: { start: string; end: string } | null;
  saturday?: { start: string; end: string } | null;
  sunday?: { start: string; end: string } | null;
}

export interface TimeOffBalances {
  vacation?: number;
  sick?: number;
  personal?: number;
  floating_holiday?: number;
}

export interface Employee {
  id: string;
  organization_id: string;
  facility_id: string | null;
  employee_code: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string | null;
  hire_date: string | null;
  status: EmployeeStatus;
  hourly_rate: number | null;
  pto_balance: number;
  department_code: string | null;
  cost_center: string | null;
  gl_account: string | null;
  manager_id: string | null;
  profile: EmployeeProfile;
  availability: EmployeeAvailability;
  time_off_balances: TimeOffBalances;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  employee_code: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  position?: string;
  facility_id?: string | null;
  hire_date?: string;
  status?: EmployeeStatus;
  hourly_rate?: number | null;
  pto_balance?: number;
  department_code?: string;
  cost_center?: string;
  gl_account?: string;
  manager_id?: string | null;
  profile?: EmployeeProfile;
  availability?: EmployeeAvailability;
  time_off_balances?: TimeOffBalances;
}

export interface EmployeeCreateInput extends EmployeeFormData {
  organization_id: string;
}

export interface EmployeeUpdateInput extends Partial<EmployeeFormData> {
  id: string;
}

export interface EmployeeWithDetails extends Employee {
  facility?: {
    id: string;
    name: string;
    facility_code: string;
  } | null;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  full_name: string;
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  active: '#10B981',
  inactive: '#6B7280',
  on_leave: '#F59E0B',
};
