export interface Department {
  id: string;
  organization_id: string;
  facility_id: string | null;
  department_code: string;
  name: string;
  description: string | null;
  
  // G/L Account Information
  gl_account: string | null;
  cost_center: string | null;
  profit_center: string | null;
  budget_code: string | null;
  
  // Hierarchy
  parent_department_id: string | null;
  level: number;
  
  // Management
  manager_id: string | null;
  manager_name: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  
  // Contact Information
  phone: string | null;
  email: string | null;
  
  // Operational
  status: 'active' | 'inactive' | 'archived';
  is_production: boolean;
  is_support: boolean;
  shift_required: boolean;
  
  // Budget/Financial
  annual_budget: number | null;
  ytd_spend: number | null;
  labor_budget: number | null;
  materials_budget: number | null;
  
  // Headcount
  budgeted_headcount: number | null;
  actual_headcount: number;
  
  // Metadata
  color: string;
  icon: string | null;
  sort_order: number;
  notes: string | null;
  
  // Scalable numbering fields
  base_department_code: number | null;
  facility_number: number | null;
  inventory_department_code: number | null;
  gl_code_prefix: string | null;
  
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentFormData {
  name: string;
  department_code: string;
  description?: string;
  facility_id?: string | null;
  gl_account?: string;
  cost_center?: string;
  profit_center?: string;
  budget_code?: string;
  parent_department_id?: string | null;
  manager_id?: string | null;
  manager_name?: string;
  supervisor_id?: string | null;
  supervisor_name?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'archived';
  is_production?: boolean;
  is_support?: boolean;
  shift_required?: boolean;
  annual_budget?: number | null;
  labor_budget?: number | null;
  materials_budget?: number | null;
  budgeted_headcount?: number | null;
  color?: string;
  notes?: string;
  base_department_code?: number | null;
  inventory_department_code?: number | null;
  gl_code_prefix?: string;
}

export interface DepartmentCreateInput extends DepartmentFormData {
  organization_id: string;
}

export interface DepartmentUpdateInput extends Partial<DepartmentFormData> {
  id: string;
}

export interface DepartmentWithFacility extends Department {
  facility?: {
    id: string;
    name: string;
    facility_code: string;
    facility_number: number;
  } | null;
}
