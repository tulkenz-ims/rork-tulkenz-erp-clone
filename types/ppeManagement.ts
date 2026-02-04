export interface RespiratorFitTest {
  id: string;
  employee_id: string | null;
  employee_name: string;
  department: string | null;
  test_date: string;
  expiration_date: string;
  respirator_type: string;
  respirator_model: string;
  respirator_size: string;
  test_method: string;
  fit_factor: number | null;
  test_result: 'pass' | 'fail' | 'incomplete';
  tester_name: string;
  tester_certification: string | null;
  medical_clearance_date: string | null;
  medical_clearance_status: 'cleared' | 'pending' | 'restricted' | 'not_cleared' | null;
  training_completed: boolean;
  training_date: string | null;
  notes: string | null;
  attachments: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RespiratorType {
  id: string;
  name: string;
  category: string;
  protection_level: string | null;
  description: string | null;
  manufacturer: string | null;
  models: string[];
  sizes: string[];
  fit_test_frequency_months: number;
  is_active: boolean;
  created_at: string;
}

export interface SafetyFootwearRecord {
  id: string;
  employee_id: string | null;
  employee_name: string;
  department: string | null;
  issue_date: string;
  footwear_type: string;
  brand: string | null;
  model: string | null;
  size: string;
  width: string | null;
  safety_features: string[];
  cost: number | null;
  allowance_used: number | null;
  allowance_remaining: number | null;
  condition: 'new' | 'good' | 'fair' | 'worn' | 'replaced';
  replacement_due_date: string | null;
  inspection_date: string | null;
  inspection_notes: string | null;
  replaced_reason: string | null;
  voucher_number: string | null;
  vendor: string | null;
  notes: string | null;
  attachments: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyFootwearAllowance {
  id: string;
  employee_id: string | null;
  employee_name: string;
  department: string | null;
  fiscal_year: number;
  total_allowance: number;
  used_amount: number;
  remaining_amount: number | null;
  reset_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FootwearType {
  id: string;
  name: string;
  category: string;
  safety_features: string[];
  required_for_areas: string[];
  description: string | null;
  typical_cost_range: { min: number; max: number } | null;
  replacement_frequency_months: number;
  is_active: boolean;
  created_at: string;
}

export interface RespiratorFitTestFormData {
  employee_id?: string;
  employee_name: string;
  department?: string;
  test_date: string;
  expiration_date: string;
  respirator_type: string;
  respirator_model: string;
  respirator_size: string;
  test_method: string;
  fit_factor?: number;
  test_result: 'pass' | 'fail' | 'incomplete';
  tester_name: string;
  tester_certification?: string;
  medical_clearance_date?: string;
  medical_clearance_status?: 'cleared' | 'pending' | 'restricted' | 'not_cleared';
  training_completed: boolean;
  training_date?: string;
  notes?: string;
}

export interface SafetyFootwearFormData {
  employee_id?: string;
  employee_name: string;
  department?: string;
  issue_date: string;
  footwear_type: string;
  brand?: string;
  model?: string;
  size: string;
  width?: string;
  safety_features: string[];
  cost?: number;
  allowance_used?: number;
  allowance_remaining?: number;
  condition: 'new' | 'good' | 'fair' | 'worn' | 'replaced';
  replacement_due_date?: string;
  voucher_number?: string;
  vendor?: string;
  notes?: string;
}
