-- ===========================================
-- CMMS Extended Features Migration
-- Parts Extras, Cost Tracking, Safety & Compliance, Vendors
-- ===========================================

-- ===========================================
-- PARTS MANAGEMENT
-- ===========================================

-- Parts Issues (issuing parts from inventory to work orders/maintenance)
CREATE TABLE parts_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issue_number TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'issued', 'partially_issued', 'cancelled', 'returned')),
  
  -- Work Order Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  pm_work_order_id UUID REFERENCES pm_work_orders(id),
  
  -- Equipment Reference
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Facility/Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  
  -- Requestor
  requested_by UUID NOT NULL REFERENCES employees(id),
  requested_by_name TEXT NOT NULL,
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Approval
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Issue Details
  issued_by UUID REFERENCES employees(id),
  issued_by_name TEXT,
  issued_at TIMESTAMPTZ,
  
  -- Totals
  total_items INTEGER DEFAULT 0,
  total_quantity DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(14,2) DEFAULT 0,
  
  -- Line Items (JSONB array of parts)
  -- Each item: { material_id, material_number, name, sku, quantity_requested, quantity_issued, unit_cost, total_cost, location, notes }
  line_items JSONB DEFAULT '[]',
  
  -- Charging
  charge_to_work_order BOOLEAN DEFAULT TRUE,
  charge_to_department BOOLEAN DEFAULT FALSE,
  charge_department_code TEXT,
  gl_account TEXT,
  cost_center TEXT,
  
  -- Urgency
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical', 'emergency')),
  needed_by TIMESTAMPTZ,
  
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, issue_number)
);

-- Parts Returns (returning parts back to inventory)
CREATE TABLE parts_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  return_number TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'inspected', 'accepted', 'partial_accept', 'rejected', 'restocked', 'cancelled')),
  
  -- Original Issue Reference
  parts_issue_id UUID REFERENCES parts_issues(id),
  parts_issue_number TEXT,
  
  -- Work Order Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  
  -- Equipment Reference
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Facility/Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  
  -- Requestor
  returned_by UUID NOT NULL REFERENCES employees(id),
  returned_by_name TEXT NOT NULL,
  return_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Return Reason
  return_reason TEXT NOT NULL CHECK (return_reason IN (
    'unused',
    'wrong_part',
    'defective',
    'excess',
    'job_cancelled',
    'wrong_quantity',
    'warranty_replacement',
    'other'
  )),
  return_reason_detail TEXT,
  
  -- Inspection
  inspected_by UUID REFERENCES employees(id),
  inspected_by_name TEXT,
  inspected_at TIMESTAMPTZ,
  inspection_notes TEXT,
  
  -- Acceptance
  accepted_by UUID REFERENCES employees(id),
  accepted_by_name TEXT,
  accepted_at TIMESTAMPTZ,
  
  -- Restocking
  restocked_by UUID REFERENCES employees(id),
  restocked_by_name TEXT,
  restocked_at TIMESTAMPTZ,
  restock_location TEXT,
  
  -- Totals
  total_items INTEGER DEFAULT 0,
  total_quantity_returned DECIMAL(12,2) DEFAULT 0,
  total_quantity_accepted DECIMAL(12,2) DEFAULT 0,
  total_quantity_rejected DECIMAL(12,2) DEFAULT 0,
  total_credit DECIMAL(14,2) DEFAULT 0,
  
  -- Line Items (JSONB array of parts)
  -- Each item: { material_id, material_number, name, sku, quantity_returned, quantity_accepted, quantity_rejected, condition, unit_cost, credit_amount, restock_location, notes }
  line_items JSONB DEFAULT '[]',
  
  -- Condition Assessment
  overall_condition TEXT DEFAULT 'good' CHECK (overall_condition IN ('new', 'good', 'fair', 'damaged', 'unusable')),
  
  -- Credit Processing
  credit_processed BOOLEAN DEFAULT FALSE,
  credit_processed_at TIMESTAMPTZ,
  credit_processed_by TEXT,
  
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, return_number)
);

-- Stock Levels Configuration (per material per location)
CREATE TABLE stock_level_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  
  -- Stock Levels
  min_level DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_level DECIMAL(12,2),
  reorder_point DECIMAL(12,2) NOT NULL DEFAULT 0,
  safety_stock DECIMAL(12,2) DEFAULT 0,
  economic_order_qty DECIMAL(12,2),
  
  -- Lead Time
  lead_time_days INTEGER DEFAULT 0,
  lead_time_variance_days INTEGER DEFAULT 0,
  
  -- Consumption
  avg_daily_usage DECIMAL(10,4) DEFAULT 0,
  avg_weekly_usage DECIMAL(10,4) DEFAULT 0,
  avg_monthly_usage DECIMAL(10,4) DEFAULT 0,
  usage_variance_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Seasonal Adjustments
  seasonal_adjustments JSONB DEFAULT '{}',
  
  -- Criticality
  criticality TEXT DEFAULT 'normal' CHECK (criticality IN ('low', 'normal', 'high', 'critical')),
  is_critical_spare BOOLEAN DEFAULT FALSE,
  
  -- Review
  last_reviewed DATE,
  reviewed_by TEXT,
  next_review_date DATE,
  review_frequency TEXT DEFAULT 'quarterly' CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  
  -- Auto-reorder settings
  auto_reorder_enabled BOOLEAN DEFAULT FALSE,
  auto_reorder_vendor_id UUID REFERENCES procurement_vendors(id),
  auto_reorder_qty DECIMAL(12,2),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, material_id, facility_id)
);

-- Reorder Points (active reorder tracking)
CREATE TABLE reorder_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  
  -- Material Info (denormalized for performance)
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  category TEXT,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Stock Levels
  current_stock DECIMAL(12,2) NOT NULL,
  reorder_point DECIMAL(12,2) NOT NULL,
  min_level DECIMAL(12,2) NOT NULL,
  max_level DECIMAL(12,2),
  safety_stock DECIMAL(12,2) DEFAULT 0,
  
  -- Trigger Info
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('below_reorder', 'below_min', 'below_safety', 'stockout', 'manual')),
  
  -- Reorder Details
  suggested_order_qty DECIMAL(12,2),
  economic_order_qty DECIMAL(12,2),
  
  -- Vendor Info
  preferred_vendor_id UUID REFERENCES procurement_vendors(id),
  preferred_vendor_name TEXT,
  unit_cost DECIMAL(12,2),
  estimated_total_cost DECIMAL(14,2),
  lead_time_days INTEGER,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'po_created', 'ordered', 'partial_received', 'received', 'cancelled', 'snoozed')),
  
  -- Action Tracking
  acknowledged_by UUID REFERENCES employees(id),
  acknowledged_by_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  
  -- PO Reference
  purchase_order_id UUID REFERENCES procurement_purchase_orders(id),
  po_number TEXT,
  po_created_at TIMESTAMPTZ,
  
  -- Expected Delivery
  expected_delivery_date DATE,
  
  -- Snooze
  snoozed_until TIMESTAMPTZ,
  snoozed_by UUID REFERENCES employees(id),
  snooze_reason TEXT,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  resolved_by_name TEXT,
  resolution_notes TEXT,
  
  -- Urgency
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  days_until_stockout INTEGER,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- COST TRACKING
-- ===========================================

-- Maintenance Budgets (department/equipment budgets)
CREATE TABLE maintenance_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Budget Scope
  budget_type TEXT NOT NULL CHECK (budget_type IN ('facility', 'department', 'equipment', 'project', 'category')),
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  project_id UUID,
  project_name TEXT,
  category TEXT,
  
  -- Budget Period
  fiscal_year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  
  -- Budget Amounts
  budget_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  
  -- Breakdown by Category
  labor_budget DECIMAL(14,2) DEFAULT 0,
  parts_budget DECIMAL(14,2) DEFAULT 0,
  contractor_budget DECIMAL(14,2) DEFAULT 0,
  equipment_budget DECIMAL(14,2) DEFAULT 0,
  other_budget DECIMAL(14,2) DEFAULT 0,
  
  -- Actuals
  actual_total DECIMAL(14,2) DEFAULT 0,
  actual_labor DECIMAL(14,2) DEFAULT 0,
  actual_parts DECIMAL(14,2) DEFAULT 0,
  actual_contractor DECIMAL(14,2) DEFAULT 0,
  actual_equipment DECIMAL(14,2) DEFAULT 0,
  actual_other DECIMAL(14,2) DEFAULT 0,
  
  -- Variance
  variance_amount DECIMAL(14,2) GENERATED ALWAYS AS (budget_amount - actual_total) STORED,
  variance_percent DECIMAL(5,2),
  
  -- Committed (POs issued but not received)
  committed_amount DECIMAL(14,2) DEFAULT 0,
  
  -- Available
  available_amount DECIMAL(14,2) GENERATED ALWAYS AS (budget_amount - actual_total - committed_amount) STORED,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'frozen', 'closed', 'cancelled')),
  
  -- Approval
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  -- Thresholds for Alerts
  warning_threshold_percent INTEGER DEFAULT 80,
  critical_threshold_percent INTEGER DEFAULT 95,
  
  -- Metadata
  notes TEXT,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, budget_type, facility_id, department_code, equipment_id, fiscal_year, period_type, period_start)
);

-- Labor Costs (detailed labor tracking for maintenance)
CREATE TABLE labor_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Work Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  pm_work_order_id UUID REFERENCES pm_work_orders(id),
  service_request_id UUID REFERENCES service_requests(id),
  
  -- Equipment
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Facility/Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  
  -- Employee
  employee_id UUID NOT NULL REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  craft_type TEXT,
  skill_level TEXT CHECK (skill_level IN ('apprentice', 'journeyman', 'master', 'specialist')),
  
  -- Time Details
  work_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours_worked DECIMAL(6,2) NOT NULL,
  hours_regular DECIMAL(6,2) DEFAULT 0,
  hours_overtime DECIMAL(6,2) DEFAULT 0,
  hours_double_time DECIMAL(6,2) DEFAULT 0,
  
  -- Rates
  regular_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  double_time_rate DECIMAL(10,2),
  
  -- Costs
  regular_cost DECIMAL(12,2) DEFAULT 0,
  overtime_cost DECIMAL(12,2) DEFAULT 0,
  double_time_cost DECIMAL(12,2) DEFAULT 0,
  total_labor_cost DECIMAL(12,2) NOT NULL,
  
  -- Burden/Overhead (fringe benefits, etc.)
  burden_rate_percent DECIMAL(5,2) DEFAULT 0,
  burden_cost DECIMAL(12,2) DEFAULT 0,
  total_cost_with_burden DECIMAL(12,2),
  
  -- Work Type
  work_type TEXT NOT NULL CHECK (work_type IN ('corrective', 'preventive', 'predictive', 'emergency', 'project', 'training', 'support', 'other')),
  task_description TEXT,
  
  -- Billing
  is_billable BOOLEAN DEFAULT FALSE,
  billing_code TEXT,
  billing_rate DECIMAL(10,2),
  
  -- GL Coding
  gl_account TEXT,
  cost_center TEXT,
  
  -- Approval
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts Costs (detailed parts cost tracking)
CREATE TABLE parts_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Work Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  pm_work_order_id UUID REFERENCES pm_work_orders(id),
  parts_issue_id UUID REFERENCES parts_issues(id),
  parts_issue_number TEXT,
  
  -- Equipment
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Facility/Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  
  -- Material
  material_id UUID REFERENCES materials(id),
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT,
  category TEXT,
  
  -- Quantity and Cost
  quantity DECIMAL(12,2) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  total_cost DECIMAL(14,2) NOT NULL,
  
  -- Costing Method
  costing_method TEXT DEFAULT 'average' CHECK (costing_method IN ('fifo', 'lifo', 'average', 'specific')),
  
  -- Vendor Info (if applicable)
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT,
  
  -- Transaction Type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issue', 'return_credit', 'adjustment', 'scrap', 'warranty')),
  transaction_date DATE NOT NULL,
  
  -- GL Coding
  gl_account TEXT,
  cost_center TEXT,
  
  -- Returns Credit
  is_credit BOOLEAN DEFAULT FALSE,
  credit_amount DECIMAL(14,2),
  original_parts_cost_id UUID REFERENCES parts_costs(id),
  
  -- Warranty
  is_warranty_replacement BOOLEAN DEFAULT FALSE,
  warranty_claim_number TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Reports (aggregated cost summaries)
CREATE TABLE cost_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Report Period
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Scope
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'facility', 'department', 'equipment', 'work_order', 'project')),
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  
  -- Work Order Counts
  work_orders_completed INTEGER DEFAULT 0,
  pm_work_orders_completed INTEGER DEFAULT 0,
  emergency_work_orders INTEGER DEFAULT 0,
  
  -- Labor Summary
  total_labor_hours DECIMAL(10,2) DEFAULT 0,
  regular_hours DECIMAL(10,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  total_labor_cost DECIMAL(14,2) DEFAULT 0,
  total_labor_cost_with_burden DECIMAL(14,2) DEFAULT 0,
  
  -- Parts Summary
  total_parts_issued INTEGER DEFAULT 0,
  total_parts_returned INTEGER DEFAULT 0,
  total_parts_cost DECIMAL(14,2) DEFAULT 0,
  parts_return_credit DECIMAL(14,2) DEFAULT 0,
  net_parts_cost DECIMAL(14,2) DEFAULT 0,
  
  -- Contractor Summary
  total_contractor_cost DECIMAL(14,2) DEFAULT 0,
  contractor_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Other Costs
  equipment_rental_cost DECIMAL(14,2) DEFAULT 0,
  other_costs DECIMAL(14,2) DEFAULT 0,
  
  -- Totals
  total_maintenance_cost DECIMAL(14,2) DEFAULT 0,
  
  -- Budget Comparison
  budget_amount DECIMAL(14,2),
  budget_variance DECIMAL(14,2),
  budget_variance_percent DECIMAL(5,2),
  
  -- Cost Per Metrics
  cost_per_work_order DECIMAL(12,2),
  cost_per_equipment DECIMAL(12,2),
  cost_per_hour DECIMAL(12,2),
  
  -- Breakdowns (detailed JSONB)
  cost_by_work_type JSONB DEFAULT '{}',
  cost_by_department JSONB DEFAULT '{}',
  cost_by_equipment_category JSONB DEFAULT '{}',
  cost_by_failure_code JSONB DEFAULT '{}',
  
  -- Trends
  cost_trend JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'approved', 'published')),
  
  -- Generated Info
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  generated_by_id UUID REFERENCES employees(id),
  
  -- Approval
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, report_type, period_start, period_end, scope_type, facility_id, department_code, equipment_id)
);

-- ===========================================
-- SAFETY & COMPLIANCE
-- ===========================================

-- LOTO Procedures (Lockout/Tagout)
CREATE TABLE loto_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  procedure_number TEXT NOT NULL,
  
  -- Equipment
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  equipment_name TEXT NOT NULL,
  equipment_tag TEXT NOT NULL,
  
  -- Facility/Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  
  -- Procedure Details
  title TEXT NOT NULL,
  description TEXT,
  procedure_type TEXT NOT NULL CHECK (procedure_type IN ('lockout', 'tagout', 'lockout_tagout', 'tryout')),
  
  -- Energy Sources
  energy_sources JSONB DEFAULT '[]',
  -- Each: { type, location, isolation_device, isolation_method, verification_method, notes }
  -- Types: electrical, mechanical, hydraulic, pneumatic, thermal, chemical, gravity, stored, radiation, other
  
  -- Steps
  shutdown_steps JSONB DEFAULT '[]',
  isolation_steps JSONB DEFAULT '[]',
  lockout_steps JSONB DEFAULT '[]',
  stored_energy_steps JSONB DEFAULT '[]',
  verification_steps JSONB DEFAULT '[]',
  release_steps JSONB DEFAULT '[]',
  
  -- Required Equipment
  required_locks INTEGER DEFAULT 1,
  required_tags INTEGER DEFAULT 1,
  lock_types TEXT[] DEFAULT '{}',
  special_equipment TEXT[] DEFAULT '{}',
  
  -- PPE Required
  ppe_required TEXT[] DEFAULT '{}',
  
  -- Hazards
  hazards TEXT[] DEFAULT '{}',
  hazard_warnings TEXT,
  
  -- Authorization
  authorized_employees UUID[] DEFAULT '{}',
  requires_group_lockout BOOLEAN DEFAULT FALSE,
  group_lockout_coordinator_required BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'revision', 'archived')),
  version TEXT DEFAULT '1.0',
  revision_number INTEGER DEFAULT 1,
  
  -- Review/Approval
  effective_date DATE,
  review_date DATE,
  last_reviewed DATE,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  diagram_url TEXT,
  
  notes TEXT,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, procedure_number)
);

-- LOTO Events (active lockout sessions)
CREATE TABLE loto_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_number TEXT NOT NULL,
  
  -- Procedure Reference
  loto_procedure_id UUID REFERENCES loto_procedures(id),
  procedure_number TEXT,
  
  -- Equipment
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  equipment_name TEXT NOT NULL,
  equipment_tag TEXT NOT NULL,
  
  -- Facility/Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  location TEXT,
  
  -- Work Order Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  pm_work_order_id UUID REFERENCES pm_work_orders(id),
  
  -- Event Type
  event_type TEXT NOT NULL CHECK (event_type IN ('individual', 'group', 'complex', 'emergency')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partial_release', 'released', 'cancelled', 'emergency_removed')),
  
  -- Coordinator (for group lockout)
  coordinator_id UUID REFERENCES employees(id),
  coordinator_name TEXT,
  
  -- Timing
  lockout_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lockout_end TIMESTAMPTZ,
  estimated_duration_hours DECIMAL(6,2),
  actual_duration_hours DECIMAL(6,2),
  
  -- Reason
  reason TEXT NOT NULL,
  work_description TEXT,
  
  -- Energy Sources Isolated
  energy_sources_isolated JSONB DEFAULT '[]',
  
  -- Locks Applied
  locks_applied JSONB DEFAULT '[]',
  -- Each: { lock_number, lock_type, employee_id, employee_name, applied_at, location, removed_at, removed_by }
  
  total_locks INTEGER DEFAULT 0,
  locks_removed INTEGER DEFAULT 0,
  
  -- Verification
  isolation_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES employees(id),
  verified_by_name TEXT,
  verified_at TIMESTAMPTZ,
  zero_energy_verified BOOLEAN DEFAULT FALSE,
  
  -- Release
  released_by UUID REFERENCES employees(id),
  released_by_name TEXT,
  release_verification TEXT,
  
  -- Emergency Release
  emergency_released BOOLEAN DEFAULT FALSE,
  emergency_reason TEXT,
  emergency_authorized_by UUID REFERENCES employees(id),
  emergency_authorized_by_name TEXT,
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, event_number)
);

-- Safety Permits (hot work, confined space, etc.)
CREATE TABLE safety_permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permit_number TEXT NOT NULL,
  
  -- Permit Type
  permit_type TEXT NOT NULL CHECK (permit_type IN (
    'hot_work',
    'confined_space',
    'excavation',
    'electrical',
    'elevated_work',
    'crane_lift',
    'chemical_handling',
    'radiation',
    'demolition',
    'roof_access',
    'general_safety',
    'other'
  )),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'completed', 'cancelled', 'expired', 'suspended')),
  
  -- Work Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  work_to_be_performed TEXT,
  
  -- Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  location TEXT NOT NULL,
  specific_area TEXT,
  
  -- Equipment
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Work Order Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  
  -- Contractor (if external)
  contractor_name TEXT,
  contractor_company TEXT,
  contractor_contact TEXT,
  
  -- Requestor
  requested_by UUID NOT NULL REFERENCES employees(id),
  requested_by_name TEXT NOT NULL,
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Validity Period
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  shift TEXT,
  
  -- Approval Chain
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  supervisor_approved_at TIMESTAMPTZ,
  
  safety_approved BOOLEAN DEFAULT FALSE,
  safety_officer_id UUID REFERENCES employees(id),
  safety_officer_name TEXT,
  safety_approved_at TIMESTAMPTZ,
  
  manager_approved BOOLEAN DEFAULT FALSE,
  manager_id UUID REFERENCES employees(id),
  manager_name TEXT,
  manager_approved_at TIMESTAMPTZ,
  
  -- Hazards & Controls
  hazards_identified TEXT[] DEFAULT '{}',
  control_measures TEXT[] DEFAULT '{}',
  
  -- PPE Required
  ppe_required TEXT[] DEFAULT '{}',
  
  -- Safety Precautions (type-specific)
  precautions JSONB DEFAULT '{}',
  
  -- Hot Work Specific
  fire_watch_required BOOLEAN DEFAULT FALSE,
  fire_watch_duration_hours DECIMAL(4,2),
  fire_extinguisher_type TEXT,
  combustibles_removed BOOLEAN,
  sprinklers_functional BOOLEAN,
  
  -- Confined Space Specific
  atmospheric_testing_required BOOLEAN DEFAULT FALSE,
  atmospheric_readings JSONB DEFAULT '[]',
  rescue_plan_in_place BOOLEAN,
  rescue_team_notified BOOLEAN,
  entry_attendant_id UUID REFERENCES employees(id),
  entry_attendant_name TEXT,
  
  -- Elevated Work Specific
  fall_protection_type TEXT,
  scaffold_inspected BOOLEAN,
  guardrails_in_place BOOLEAN,
  
  -- LOTO Required
  loto_required BOOLEAN DEFAULT FALSE,
  loto_event_id UUID REFERENCES loto_events(id),
  
  -- Workers on Permit
  workers JSONB DEFAULT '[]',
  -- Each: { employee_id, employee_name, role, signed_in_at, signed_out_at, signature }
  
  -- Monitoring/Inspections
  inspections_required BOOLEAN DEFAULT FALSE,
  inspection_frequency TEXT,
  inspection_records JSONB DEFAULT '[]',
  
  -- Completion
  completed_by UUID REFERENCES employees(id),
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Cancellation
  cancelled_by UUID REFERENCES employees(id),
  cancelled_by_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, permit_number)
);

-- PPE Requirements (equipment/location/task specific)
CREATE TABLE ppe_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Scope
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('equipment', 'location', 'task', 'department', 'facility', 'chemical', 'general')),
  
  -- References
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  location_id UUID REFERENCES locations(id),
  location_name TEXT,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  task_type TEXT,
  chemical_name TEXT,
  sds_id UUID REFERENCES sds_records(id),
  
  -- Requirement Details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Required PPE Items
  ppe_items JSONB DEFAULT '[]',
  -- Each: { category, item_name, specification, standard, is_mandatory, notes }
  -- Categories: head, eye_face, hearing, respiratory, hand, foot, body, fall_protection, other
  
  -- Hazards Addressed
  hazards TEXT[] DEFAULT '{}',
  hazard_description TEXT,
  
  -- Applicability
  applies_to_all_employees BOOLEAN DEFAULT TRUE,
  applies_to_contractors BOOLEAN DEFAULT TRUE,
  applies_to_visitors BOOLEAN DEFAULT FALSE,
  applicable_roles TEXT[] DEFAULT '{}',
  
  -- Conditions
  condition_based BOOLEAN DEFAULT FALSE,
  conditions TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- Effective Dates
  effective_date DATE,
  review_date DATE,
  
  -- Approval
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  -- Compliance
  is_regulatory BOOLEAN DEFAULT FALSE,
  regulatory_reference TEXT,
  
  -- Signage
  signage_required BOOLEAN DEFAULT TRUE,
  sign_location TEXT,
  
  -- Training
  training_required BOOLEAN DEFAULT FALSE,
  training_course_id TEXT,
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hazard Assessments
CREATE TABLE hazard_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_number TEXT NOT NULL,
  
  -- Assessment Type
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'job_hazard_analysis',
    'risk_assessment',
    'pre_task',
    'equipment',
    'chemical',
    'ergonomic',
    'environmental',
    'fire',
    'electrical',
    'confined_space',
    'fall_hazard',
    'general'
  )),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending_review', 'approved', 'active', 'revision_required', 'archived')),
  
  -- Scope
  title TEXT NOT NULL,
  description TEXT,
  scope_description TEXT,
  
  -- Location/Equipment
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Work/Task
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  task_description TEXT,
  job_steps JSONB DEFAULT '[]',
  
  -- Assessment Date
  assessment_date DATE NOT NULL,
  
  -- Assessor
  assessed_by UUID NOT NULL REFERENCES employees(id),
  assessed_by_name TEXT NOT NULL,
  
  -- Team (for group assessments)
  assessment_team JSONB DEFAULT '[]',
  
  -- Hazards Identified
  hazards JSONB DEFAULT '[]',
  -- Each: { hazard_id, hazard_type, description, location, severity, likelihood, risk_score, risk_level, existing_controls, proposed_controls, responsible_person, target_date, status, residual_risk_score, notes }
  -- Hazard types: physical, chemical, biological, ergonomic, psychological, electrical, fire, fall, struck_by, caught_in, environmental, radiation, other
  
  -- Risk Matrix
  risk_matrix_type TEXT DEFAULT 'standard' CHECK (risk_matrix_type IN ('standard', '3x3', '4x4', '5x5', 'custom')),
  
  -- Summary Scores
  total_hazards INTEGER DEFAULT 0,
  critical_hazards INTEGER DEFAULT 0,
  high_hazards INTEGER DEFAULT 0,
  medium_hazards INTEGER DEFAULT 0,
  low_hazards INTEGER DEFAULT 0,
  initial_risk_score DECIMAL(5,2),
  residual_risk_score DECIMAL(5,2),
  overall_risk_level TEXT CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Controls Summary
  engineering_controls TEXT[] DEFAULT '{}',
  administrative_controls TEXT[] DEFAULT '{}',
  ppe_controls TEXT[] DEFAULT '{}',
  
  -- Required PPE
  ppe_required TEXT[] DEFAULT '{}',
  
  -- Required Training
  training_required TEXT[] DEFAULT '{}',
  
  -- Required Permits
  permits_required TEXT[] DEFAULT '{}',
  
  -- LOTO Required
  loto_required BOOLEAN DEFAULT FALSE,
  loto_procedure_id UUID REFERENCES loto_procedures(id),
  
  -- Review/Approval
  reviewed_by UUID REFERENCES employees(id),
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Validity
  effective_date DATE,
  expiration_date DATE,
  review_frequency TEXT DEFAULT 'annual' CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'biennial', 'as_needed')),
  next_review_date DATE,
  
  -- Acknowledgment
  requires_acknowledgment BOOLEAN DEFAULT TRUE,
  acknowledged_by JSONB DEFAULT '[]',
  
  -- Related Documents
  related_sops TEXT[] DEFAULT '{}',
  related_sds UUID[] DEFAULT '{}',
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, assessment_number)
);

-- ===========================================
-- VENDOR MANAGEMENT (CMMS Enhanced)
-- ===========================================

-- CMMS Vendors (extends procurement_vendors for maintenance specific)
CREATE TABLE cmms_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Link to procurement vendor (if exists)
  procurement_vendor_id UUID REFERENCES procurement_vendors(id),
  
  vendor_code TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Vendor Type
  vendor_type TEXT NOT NULL CHECK (vendor_type IN (
    'parts_supplier',
    'equipment_supplier',
    'service_contractor',
    'oem',
    'distributor',
    'repair_shop',
    'calibration_service',
    'rental',
    'consultant',
    'other'
  )),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('pending_approval', 'active', 'inactive', 'suspended', 'blacklisted')),
  
  -- Contact Information
  primary_contact_name TEXT,
  primary_contact_title TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  
  secondary_contact_name TEXT,
  secondary_contact_email TEXT,
  secondary_contact_phone TEXT,
  
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Business Information
  website TEXT,
  tax_id TEXT,
  duns_number TEXT,
  
  -- Capabilities
  service_categories TEXT[] DEFAULT '{}',
  equipment_types_serviced TEXT[] DEFAULT '{}',
  parts_categories TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  
  -- Service Coverage
  service_area TEXT,
  service_hours TEXT,
  emergency_service_available BOOLEAN DEFAULT FALSE,
  on_call_available BOOLEAN DEFAULT FALSE,
  
  -- Response Times
  standard_response_time_hours INTEGER,
  emergency_response_time_hours INTEGER,
  
  -- Rates
  standard_hourly_rate DECIMAL(10,2),
  overtime_hourly_rate DECIMAL(10,2),
  emergency_hourly_rate DECIMAL(10,2),
  minimum_service_charge DECIMAL(10,2),
  travel_charge DECIMAL(10,2),
  
  -- Payment
  payment_terms TEXT DEFAULT 'net_30',
  accepts_po BOOLEAN DEFAULT TRUE,
  credit_limit DECIMAL(14,2),
  
  -- Insurance & Compliance
  insurance_certificate_on_file BOOLEAN DEFAULT FALSE,
  insurance_expiration DATE,
  workers_comp_on_file BOOLEAN DEFAULT FALSE,
  workers_comp_expiration DATE,
  
  -- Safety
  safety_record_on_file BOOLEAN DEFAULT FALSE,
  osha_recordable_rate DECIMAL(5,2),
  requires_safety_orientation BOOLEAN DEFAULT TRUE,
  safety_orientation_completed BOOLEAN DEFAULT FALSE,
  
  -- Performance Metrics
  jobs_completed INTEGER DEFAULT 0,
  avg_response_time_hours DECIMAL(8,2),
  avg_completion_time_hours DECIMAL(8,2),
  quality_rating DECIMAL(3,2),
  on_time_rating DECIMAL(3,2),
  cost_rating DECIMAL(3,2),
  overall_rating DECIMAL(3,2),
  total_spend_ytd DECIMAL(14,2) DEFAULT 0,
  total_spend_lifetime DECIMAL(16,2) DEFAULT 0,
  
  -- Preferred/Approved
  is_preferred BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, vendor_code)
);

-- Vendor Contracts
CREATE TABLE vendor_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  
  -- Vendor
  vendor_id UUID NOT NULL REFERENCES cmms_vendors(id),
  vendor_name TEXT NOT NULL,
  procurement_vendor_id UUID REFERENCES procurement_vendors(id),
  
  -- Contract Type
  contract_type TEXT NOT NULL CHECK (contract_type IN (
    'service_agreement',
    'maintenance_contract',
    'parts_supply',
    'blanket_po',
    'lease',
    'rental',
    'warranty_extension',
    'master_service',
    'consulting',
    'other'
  )),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'expired', 'cancelled', 'renewed', 'suspended')),
  
  -- Contract Details
  title TEXT NOT NULL,
  description TEXT,
  scope_of_work TEXT,
  
  -- Coverage
  facility_ids UUID[] DEFAULT '{}',
  equipment_ids UUID[] DEFAULT '{}',
  equipment_categories TEXT[] DEFAULT '{}',
  service_types TEXT[] DEFAULT '{}',
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  signed_date DATE,
  effective_date DATE,
  
  -- Renewal
  auto_renew BOOLEAN DEFAULT FALSE,
  renewal_notice_days INTEGER DEFAULT 30,
  renewal_terms TEXT,
  max_renewals INTEGER,
  current_renewal_count INTEGER DEFAULT 0,
  
  -- Financial Terms
  contract_value DECIMAL(14,2),
  annual_value DECIMAL(14,2),
  monthly_value DECIMAL(12,2),
  
  -- Payment Terms
  payment_terms TEXT DEFAULT 'net_30',
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('per_service', 'weekly', 'monthly', 'quarterly', 'annual', 'upon_completion')),
  billing_method TEXT CHECK (billing_method IN ('fixed', 'time_and_materials', 'per_unit', 'hybrid')),
  
  -- Rates (if T&M)
  hourly_rate_standard DECIMAL(10,2),
  hourly_rate_overtime DECIMAL(10,2),
  hourly_rate_emergency DECIMAL(10,2),
  travel_rate DECIMAL(10,2),
  markup_percent DECIMAL(5,2),
  
  -- Service Levels (SLA)
  sla_terms JSONB DEFAULT '{}',
  response_time_hours INTEGER,
  resolution_time_hours INTEGER,
  uptime_guarantee_percent DECIMAL(5,2),
  penalty_terms TEXT,
  
  -- Spending
  spent_to_date DECIMAL(14,2) DEFAULT 0,
  remaining_value DECIMAL(14,2),
  
  -- Not-to-Exceed
  nte_amount DECIMAL(14,2),
  nte_warning_percent INTEGER DEFAULT 80,
  
  -- Insurance Requirements
  insurance_required BOOLEAN DEFAULT TRUE,
  min_general_liability DECIMAL(14,2),
  min_auto_liability DECIMAL(14,2),
  min_workers_comp DECIMAL(14,2),
  
  -- Approval
  approval_required BOOLEAN DEFAULT TRUE,
  approval_threshold DECIMAL(14,2),
  approver_id UUID REFERENCES employees(id),
  approver_name TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Signatories
  vendor_signatory TEXT,
  vendor_signed_at TIMESTAMPTZ,
  company_signatory TEXT,
  company_signatory_id UUID REFERENCES employees(id),
  company_signed_at TIMESTAMPTZ,
  
  -- Documents
  contract_document_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Termination
  termination_notice_days INTEGER DEFAULT 30,
  termination_clause TEXT,
  terminated_by TEXT,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  
  notes TEXT,
  internal_notes TEXT,
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, contract_number)
);

-- Warranty Tracking
CREATE TABLE warranty_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warranty_number TEXT NOT NULL,
  
  -- Asset/Equipment
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  asset_id UUID REFERENCES assets(id),
  asset_tag TEXT,
  material_id UUID REFERENCES materials(id),
  material_number TEXT,
  
  -- Part/Component (for component-level warranties)
  component_name TEXT,
  component_serial TEXT,
  component_part_number TEXT,
  
  -- Manufacturer/Vendor
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  vendor_id UUID REFERENCES cmms_vendors(id),
  vendor_name TEXT,
  
  -- Warranty Type
  warranty_type TEXT NOT NULL CHECK (warranty_type IN (
    'manufacturer',
    'extended',
    'service',
    'parts_only',
    'labor_only',
    'parts_and_labor',
    'performance',
    'lifetime',
    'prorated',
    'other'
  )),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'voided', 'claimed')),
  
  -- Coverage Details
  coverage_description TEXT,
  parts_covered BOOLEAN DEFAULT TRUE,
  labor_covered BOOLEAN DEFAULT FALSE,
  travel_covered BOOLEAN DEFAULT FALSE,
  
  -- Exclusions
  exclusions TEXT[] DEFAULT '{}',
  conditions TEXT,
  
  -- Dates
  purchase_date DATE,
  install_date DATE,
  warranty_start_date DATE NOT NULL,
  warranty_end_date DATE NOT NULL,
  registration_date DATE,
  
  -- Duration
  warranty_months INTEGER,
  warranty_years DECIMAL(4,2),
  warranty_hours_limit INTEGER,
  warranty_cycles_limit INTEGER,
  
  -- Meter-based Warranty
  is_meter_based BOOLEAN DEFAULT FALSE,
  meter_type TEXT,
  start_meter_reading DECIMAL(12,2),
  warranty_meter_limit DECIMAL(12,2),
  current_meter_reading DECIMAL(12,2),
  
  -- Cost
  original_cost DECIMAL(12,2),
  warranty_cost DECIMAL(12,2),
  deductible DECIMAL(10,2),
  
  -- Registration
  registration_required BOOLEAN DEFAULT FALSE,
  registration_number TEXT,
  serial_number TEXT,
  
  -- Contact
  warranty_contact_name TEXT,
  warranty_contact_phone TEXT,
  warranty_contact_email TEXT,
  claim_phone TEXT,
  claim_website TEXT,
  
  -- Claims
  claims_made INTEGER DEFAULT 0,
  total_claimed_value DECIMAL(14,2) DEFAULT 0,
  
  -- Notifications
  notify_before_days INTEGER DEFAULT 30,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  
  -- Documents
  certificate_url TEXT,
  receipt_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  notes TEXT,
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, warranty_number)
);

-- Warranty Claims
CREATE TABLE warranty_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  
  -- Warranty Reference
  warranty_id UUID NOT NULL REFERENCES warranty_records(id),
  warranty_number TEXT NOT NULL,
  
  -- Equipment
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'denied', 'partial_approved', 'paid', 'closed', 'appealed')),
  
  -- Claim Details
  claim_date DATE NOT NULL,
  failure_date DATE NOT NULL,
  failure_description TEXT NOT NULL,
  symptoms TEXT,
  
  -- Work Order Reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  
  -- Parts Claimed
  parts_claimed JSONB DEFAULT '[]',
  -- Each: { part_number, part_name, quantity, unit_cost, total_cost, approved_qty, approved_cost }
  
  -- Labor Claimed
  labor_hours_claimed DECIMAL(6,2),
  labor_rate_claimed DECIMAL(10,2),
  labor_cost_claimed DECIMAL(12,2),
  labor_hours_approved DECIMAL(6,2),
  labor_cost_approved DECIMAL(12,2),
  
  -- Travel Claimed
  travel_cost_claimed DECIMAL(10,2),
  travel_cost_approved DECIMAL(10,2),
  
  -- Totals
  total_claimed DECIMAL(14,2) NOT NULL,
  total_approved DECIMAL(14,2),
  total_denied DECIMAL(14,2),
  amount_received DECIMAL(14,2),
  
  -- Submitted By
  submitted_by UUID NOT NULL REFERENCES employees(id),
  submitted_by_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  
  -- Manufacturer Response
  manufacturer_claim_number TEXT,
  manufacturer_response TEXT,
  manufacturer_response_date DATE,
  denial_reason TEXT,
  
  -- Resolution
  resolved_by UUID REFERENCES employees(id),
  resolved_by_name TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Payment
  payment_received_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Documentation
  proof_of_failure TEXT,
  photos JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  
  notes TEXT,
  internal_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, claim_number)
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Parts Issues
CREATE INDEX idx_parts_issues_org ON parts_issues(organization_id);
CREATE INDEX idx_parts_issues_status ON parts_issues(organization_id, status);
CREATE INDEX idx_parts_issues_work_order ON parts_issues(work_order_id);
CREATE INDEX idx_parts_issues_equipment ON parts_issues(equipment_id);
CREATE INDEX idx_parts_issues_facility ON parts_issues(organization_id, facility_id);
CREATE INDEX idx_parts_issues_requested_by ON parts_issues(requested_by);
CREATE INDEX idx_parts_issues_date ON parts_issues(organization_id, requested_date);

-- Parts Returns
CREATE INDEX idx_parts_returns_org ON parts_returns(organization_id);
CREATE INDEX idx_parts_returns_status ON parts_returns(organization_id, status);
CREATE INDEX idx_parts_returns_issue ON parts_returns(parts_issue_id);
CREATE INDEX idx_parts_returns_work_order ON parts_returns(work_order_id);
CREATE INDEX idx_parts_returns_returned_by ON parts_returns(returned_by);
CREATE INDEX idx_parts_returns_date ON parts_returns(organization_id, return_date);

-- Stock Level Configs
CREATE INDEX idx_stock_level_configs_org ON stock_level_configs(organization_id);
CREATE INDEX idx_stock_level_configs_material ON stock_level_configs(material_id);
CREATE INDEX idx_stock_level_configs_facility ON stock_level_configs(organization_id, facility_id);
CREATE INDEX idx_stock_level_configs_critical ON stock_level_configs(organization_id, is_critical_spare) WHERE is_critical_spare = TRUE;
CREATE INDEX idx_stock_level_configs_review ON stock_level_configs(organization_id, next_review_date);

-- Reorder Points
CREATE INDEX idx_reorder_points_org ON reorder_points(organization_id);
CREATE INDEX idx_reorder_points_material ON reorder_points(material_id);
CREATE INDEX idx_reorder_points_status ON reorder_points(organization_id, status);
CREATE INDEX idx_reorder_points_urgency ON reorder_points(organization_id, urgency);
CREATE INDEX idx_reorder_points_facility ON reorder_points(organization_id, facility_id);
CREATE INDEX idx_reorder_points_pending ON reorder_points(organization_id, status) WHERE status = 'pending';
CREATE INDEX idx_reorder_points_triggered ON reorder_points(organization_id, triggered_at);

-- Maintenance Budgets
CREATE INDEX idx_maintenance_budgets_org ON maintenance_budgets(organization_id);
CREATE INDEX idx_maintenance_budgets_facility ON maintenance_budgets(organization_id, facility_id);
CREATE INDEX idx_maintenance_budgets_department ON maintenance_budgets(organization_id, department_code);
CREATE INDEX idx_maintenance_budgets_equipment ON maintenance_budgets(equipment_id);
CREATE INDEX idx_maintenance_budgets_type ON maintenance_budgets(organization_id, budget_type);
CREATE INDEX idx_maintenance_budgets_year ON maintenance_budgets(organization_id, fiscal_year);
CREATE INDEX idx_maintenance_budgets_period ON maintenance_budgets(organization_id, period_start, period_end);
CREATE INDEX idx_maintenance_budgets_status ON maintenance_budgets(organization_id, status);

-- Labor Costs
CREATE INDEX idx_labor_costs_org ON labor_costs(organization_id);
CREATE INDEX idx_labor_costs_work_order ON labor_costs(work_order_id);
CREATE INDEX idx_labor_costs_pm_work_order ON labor_costs(pm_work_order_id);
CREATE INDEX idx_labor_costs_equipment ON labor_costs(equipment_id);
CREATE INDEX idx_labor_costs_facility ON labor_costs(organization_id, facility_id);
CREATE INDEX idx_labor_costs_employee ON labor_costs(employee_id);
CREATE INDEX idx_labor_costs_date ON labor_costs(organization_id, work_date);
CREATE INDEX idx_labor_costs_work_type ON labor_costs(organization_id, work_type);
CREATE INDEX idx_labor_costs_approved ON labor_costs(organization_id, approved);

-- Parts Costs
CREATE INDEX idx_parts_costs_org ON parts_costs(organization_id);
CREATE INDEX idx_parts_costs_work_order ON parts_costs(work_order_id);
CREATE INDEX idx_parts_costs_pm_work_order ON parts_costs(pm_work_order_id);
CREATE INDEX idx_parts_costs_parts_issue ON parts_costs(parts_issue_id);
CREATE INDEX idx_parts_costs_equipment ON parts_costs(equipment_id);
CREATE INDEX idx_parts_costs_facility ON parts_costs(organization_id, facility_id);
CREATE INDEX idx_parts_costs_material ON parts_costs(material_id);
CREATE INDEX idx_parts_costs_date ON parts_costs(organization_id, transaction_date);
CREATE INDEX idx_parts_costs_type ON parts_costs(organization_id, transaction_type);

-- Cost Reports
CREATE INDEX idx_cost_reports_org ON cost_reports(organization_id);
CREATE INDEX idx_cost_reports_type ON cost_reports(organization_id, report_type);
CREATE INDEX idx_cost_reports_scope ON cost_reports(organization_id, scope_type);
CREATE INDEX idx_cost_reports_facility ON cost_reports(organization_id, facility_id);
CREATE INDEX idx_cost_reports_period ON cost_reports(organization_id, period_start, period_end);
CREATE INDEX idx_cost_reports_status ON cost_reports(organization_id, status);

-- LOTO Procedures
CREATE INDEX idx_loto_procedures_org ON loto_procedures(organization_id);
CREATE INDEX idx_loto_procedures_equipment ON loto_procedures(equipment_id);
CREATE INDEX idx_loto_procedures_facility ON loto_procedures(organization_id, facility_id);
CREATE INDEX idx_loto_procedures_status ON loto_procedures(organization_id, status);

-- LOTO Events
CREATE INDEX idx_loto_events_org ON loto_events(organization_id);
CREATE INDEX idx_loto_events_procedure ON loto_events(loto_procedure_id);
CREATE INDEX idx_loto_events_equipment ON loto_events(equipment_id);
CREATE INDEX idx_loto_events_work_order ON loto_events(work_order_id);
CREATE INDEX idx_loto_events_status ON loto_events(organization_id, status);
CREATE INDEX idx_loto_events_active ON loto_events(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_loto_events_facility ON loto_events(organization_id, facility_id);
CREATE INDEX idx_loto_events_start ON loto_events(organization_id, lockout_start);

-- Safety Permits
CREATE INDEX idx_safety_permits_org ON safety_permits(organization_id);
CREATE INDEX idx_safety_permits_type ON safety_permits(organization_id, permit_type);
CREATE INDEX idx_safety_permits_status ON safety_permits(organization_id, status);
CREATE INDEX idx_safety_permits_facility ON safety_permits(organization_id, facility_id);
CREATE INDEX idx_safety_permits_work_order ON safety_permits(work_order_id);
CREATE INDEX idx_safety_permits_equipment ON safety_permits(equipment_id);
CREATE INDEX idx_safety_permits_valid ON safety_permits(organization_id, valid_from, valid_until);
CREATE INDEX idx_safety_permits_requested_by ON safety_permits(requested_by);
CREATE INDEX idx_safety_permits_active ON safety_permits(organization_id, status) WHERE status = 'active';

-- PPE Requirements
CREATE INDEX idx_ppe_requirements_org ON ppe_requirements(organization_id);
CREATE INDEX idx_ppe_requirements_type ON ppe_requirements(organization_id, requirement_type);
CREATE INDEX idx_ppe_requirements_equipment ON ppe_requirements(equipment_id);
CREATE INDEX idx_ppe_requirements_location ON ppe_requirements(location_id);
CREATE INDEX idx_ppe_requirements_facility ON ppe_requirements(organization_id, facility_id);
CREATE INDEX idx_ppe_requirements_status ON ppe_requirements(organization_id, status);

-- Hazard Assessments
CREATE INDEX idx_hazard_assessments_org ON hazard_assessments(organization_id);
CREATE INDEX idx_hazard_assessments_type ON hazard_assessments(organization_id, assessment_type);
CREATE INDEX idx_hazard_assessments_status ON hazard_assessments(organization_id, status);
CREATE INDEX idx_hazard_assessments_facility ON hazard_assessments(organization_id, facility_id);
CREATE INDEX idx_hazard_assessments_equipment ON hazard_assessments(equipment_id);
CREATE INDEX idx_hazard_assessments_work_order ON hazard_assessments(work_order_id);
CREATE INDEX idx_hazard_assessments_date ON hazard_assessments(organization_id, assessment_date);
CREATE INDEX idx_hazard_assessments_risk ON hazard_assessments(organization_id, overall_risk_level);
CREATE INDEX idx_hazard_assessments_active ON hazard_assessments(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_hazard_assessments_review ON hazard_assessments(organization_id, next_review_date);

-- CMMS Vendors
CREATE INDEX idx_cmms_vendors_org ON cmms_vendors(organization_id);
CREATE INDEX idx_cmms_vendors_type ON cmms_vendors(organization_id, vendor_type);
CREATE INDEX idx_cmms_vendors_status ON cmms_vendors(organization_id, status);
CREATE INDEX idx_cmms_vendors_preferred ON cmms_vendors(organization_id, is_preferred) WHERE is_preferred = TRUE;
CREATE INDEX idx_cmms_vendors_approved ON cmms_vendors(organization_id, is_approved) WHERE is_approved = TRUE;
CREATE INDEX idx_cmms_vendors_procurement ON cmms_vendors(procurement_vendor_id);

-- Vendor Contracts
CREATE INDEX idx_vendor_contracts_org ON vendor_contracts(organization_id);
CREATE INDEX idx_vendor_contracts_vendor ON vendor_contracts(vendor_id);
CREATE INDEX idx_vendor_contracts_type ON vendor_contracts(organization_id, contract_type);
CREATE INDEX idx_vendor_contracts_status ON vendor_contracts(organization_id, status);
CREATE INDEX idx_vendor_contracts_dates ON vendor_contracts(organization_id, start_date, end_date);
CREATE INDEX idx_vendor_contracts_active ON vendor_contracts(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_vendor_contracts_expiring ON vendor_contracts(organization_id, end_date);

-- Warranty Records
CREATE INDEX idx_warranty_records_org ON warranty_records(organization_id);
CREATE INDEX idx_warranty_records_equipment ON warranty_records(equipment_id);
CREATE INDEX idx_warranty_records_asset ON warranty_records(asset_id);
CREATE INDEX idx_warranty_records_material ON warranty_records(material_id);
CREATE INDEX idx_warranty_records_vendor ON warranty_records(vendor_id);
CREATE INDEX idx_warranty_records_type ON warranty_records(organization_id, warranty_type);
CREATE INDEX idx_warranty_records_status ON warranty_records(organization_id, status);
CREATE INDEX idx_warranty_records_end_date ON warranty_records(organization_id, warranty_end_date);
CREATE INDEX idx_warranty_records_active ON warranty_records(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_warranty_records_expiring ON warranty_records(organization_id, warranty_end_date, status) WHERE status = 'active';

-- Warranty Claims
CREATE INDEX idx_warranty_claims_org ON warranty_claims(organization_id);
CREATE INDEX idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_equipment ON warranty_claims(equipment_id);
CREATE INDEX idx_warranty_claims_work_order ON warranty_claims(work_order_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(organization_id, status);
CREATE INDEX idx_warranty_claims_date ON warranty_claims(organization_id, claim_date);
CREATE INDEX idx_warranty_claims_submitted_by ON warranty_claims(submitted_by);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE parts_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_level_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE loto_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE loto_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmms_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TRIGGERS
-- ===========================================

CREATE TRIGGER update_parts_issues_updated_at BEFORE UPDATE ON parts_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_returns_updated_at BEFORE UPDATE ON parts_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_level_configs_updated_at BEFORE UPDATE ON stock_level_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reorder_points_updated_at BEFORE UPDATE ON reorder_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_budgets_updated_at BEFORE UPDATE ON maintenance_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_labor_costs_updated_at BEFORE UPDATE ON labor_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_costs_updated_at BEFORE UPDATE ON parts_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_reports_updated_at BEFORE UPDATE ON cost_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loto_procedures_updated_at BEFORE UPDATE ON loto_procedures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loto_events_updated_at BEFORE UPDATE ON loto_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_permits_updated_at BEFORE UPDATE ON safety_permits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ppe_requirements_updated_at BEFORE UPDATE ON ppe_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hazard_assessments_updated_at BEFORE UPDATE ON hazard_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cmms_vendors_updated_at BEFORE UPDATE ON cmms_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_contracts_updated_at BEFORE UPDATE ON vendor_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranty_records_updated_at BEFORE UPDATE ON warranty_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warranty_claims_updated_at BEFORE UPDATE ON warranty_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
