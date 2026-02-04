-- TulKenz ERP Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (Multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'enterprise_plus')),
  is_platform_org BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  facility_code TEXT NOT NULL,
  facility_number INTEGER NOT NULL CHECK (facility_number >= 1),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_code),
  UNIQUE(organization_id, facility_number)
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  employee_code TEXT NOT NULL,
  pin TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'default',
  "position" TEXT,
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  hourly_rate DECIMAL(10,2),
  pto_balance DECIMAL(10,2) DEFAULT 0,
  department_code TEXT,
  cost_center TEXT,
  gl_account TEXT,
  manager_id UUID REFERENCES employees(id),
  is_platform_admin BOOLEAN DEFAULT FALSE,
  profile JSONB DEFAULT '{}',
  availability JSONB DEFAULT '{}',
  time_off_balances JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_code),
  UNIQUE(organization_id, email)
);

-- Materials / Inventory Items
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  inventory_department INTEGER NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  on_hand DECIMAL(10,2) DEFAULT 0,
  min_level DECIMAL(10,2) DEFAULT 0,
  max_level DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(10,2) DEFAULT 0,
  unit_of_measure TEXT NOT NULL DEFAULT 'units',
  facility_id UUID REFERENCES facilities(id),
  location TEXT,
  barcode TEXT,
  qr_code TEXT,
  vendor TEXT,
  vendor_part_number TEXT,
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  lead_time_days INTEGER,
  classification TEXT DEFAULT 'stock' CHECK (classification IN ('stock', 'consumable', 'chargeable', 'shared')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued', 'pending_approval')),
  department_code TEXT,
  cost_center TEXT,
  gl_account TEXT,
  labels TEXT[] DEFAULT '{}',
  department_fields JSONB DEFAULT '{}',
  last_counted DATE,
  last_adjusted DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, material_number),
  UNIQUE(organization_id, sku)
);

-- Inventory Labels
CREATE TABLE inventory_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Inventory History
CREATE TABLE inventory_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('adjustment', 'count', 'receive', 'issue', 'transfer', 'create', 'delete')),
  quantity_before DECIMAL(10,2) NOT NULL,
  quantity_after DECIMAL(10,2) NOT NULL,
  quantity_change DECIMAL(10,2) NOT NULL,
  reason TEXT,
  performed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  name TEXT NOT NULL,
  asset_tag TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  location TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  assigned_to UUID REFERENCES employees(id),
  barcode TEXT,
  qr_code TEXT,
  department_code TEXT,
  cost_center TEXT,
  gl_account TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, asset_tag)
);

-- Equipment
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id),
  name TEXT NOT NULL,
  equipment_tag TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'down', 'needs_maintenance', 'retired')),
  location TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  warranty_expiry DATE,
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  last_pm_date DATE,
  next_pm_date DATE,
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, equipment_tag)
);

-- Work Orders
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'overdue', 'on_hold', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  type TEXT DEFAULT 'corrective' CHECK (type IN ('corrective', 'preventive', 'emergency', 'request')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'request', 'pm_schedule')),
  source_id UUID,
  assigned_to UUID REFERENCES employees(id),
  assigned_name TEXT,
  facility_id UUID REFERENCES facilities(id),
  equipment_id UUID REFERENCES equipment(id),
  equipment TEXT,
  location TEXT,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  notes TEXT,
  completion_notes TEXT,
  safety JSONB DEFAULT '{}',
  tasks JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_type TEXT DEFAULT 'parts' CHECK (order_type IN ('parts', 'service')),
  vendor TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  service_items JSONB DEFAULT '[]',
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ordered', 'received', 'completed')),
  requested_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  department_code TEXT,
  cost_center TEXT,
  facility_code TEXT,
  gl_account TEXT,
  requisition_number TEXT,
  po_number TEXT,
  migo_number TEXT,
  vendor_quote_number TEXT,
  vendor_contact TEXT,
  vendor_phone TEXT,
  vendor_email TEXT,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  service_date DATE,
  service_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'time_off', 'overtime', 'schedule_change', 'permit')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'partially_approved', 'expired')),
  requested_by TEXT NOT NULL,
  requester_id UUID REFERENCES employees(id),
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  amount DECIMAL(12,2),
  tier_required INTEGER,
  approval_chain JSONB DEFAULT '[]',
  form_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'supplier' CHECK (type IN ('supplier', 'service', 'contractor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'suspended')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  payment_terms TEXT,
  tax_id TEXT,
  website TEXT,
  departments TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  insurance JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{"onTimeDeliveryRate": 0, "qualityScore": 0, "responseTime": 0, "totalOrders": 0}',
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, vendor_code)
);

-- PM Schedules
CREATE TABLE pm_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name TEXT,
  equipment_tag TEXT,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_hours DECIMAL(5,2) DEFAULT 1,
  assigned_to UUID REFERENCES employees(id),
  assigned_name TEXT,
  last_completed DATE,
  next_due DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  tasks JSONB DEFAULT '[]',
  parts_required JSONB DEFAULT '[]',
  facility_id UUID REFERENCES facilities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PM Work Orders
CREATE TABLE pm_work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pm_schedule_id UUID NOT NULL REFERENCES pm_schedules(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scheduled_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES employees(id),
  assigned_name TEXT,
  labor_hours DECIMAL(5,2),
  completion_notes TEXT,
  tasks JSONB DEFAULT '[]',
  parts_used JSONB DEFAULT '[]',
  facility_id UUID REFERENCES facilities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downtime Events
CREATE TABLE downtime_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_tag TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  reason TEXT NOT NULL CHECK (reason IN ('breakdown', 'planned_maintenance', 'changeover', 'no_operator', 'material_shortage', 'quality_issue', 'utility_failure', 'safety_stop', 'calibration', 'other')),
  reason_detail TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('production', 'quality', 'safety', 'minor')),
  notes TEXT,
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  reported_by UUID NOT NULL REFERENCES employees(id),
  reported_by_name TEXT NOT NULL,
  resolved_by UUID REFERENCES employees(id),
  resolved_by_name TEXT,
  room_line TEXT,
  room_line_name TEXT,
  stopped_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
  production_stopped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  "position" TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'missed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending_approval', 'approved')),
  shift_id UUID REFERENCES shifts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Punches
CREATE TABLE time_punches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Off Requests
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  manager_id UUID REFERENCES employees(id),
  manager_name TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  assigned_to UUID REFERENCES employees(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Verifications (Task Feed)
CREATE TABLE task_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  facility_code TEXT,
  location_id TEXT,
  location_name TEXT,
  category_id TEXT,
  category_name TEXT,
  action TEXT NOT NULL,
  notes TEXT,
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'verified', 'flagged')),
  source_type TEXT,
  source_id TEXT,
  source_number TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection Templates
CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  frequency TEXT,
  active BOOLEAN DEFAULT TRUE,
  fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection Records
CREATE TABLE inspection_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES inspection_templates(id),
  template_name TEXT NOT NULL,
  tracked_item_id UUID,
  inspector_id UUID REFERENCES employees(id),
  inspector_name TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'needs_attention', 'n/a')),
  location TEXT,
  notes TEXT,
  field_values JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulletin Posts
CREATE TABLE bulletin_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES employees(id),
  created_by_name TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  expires_at TIMESTAMPTZ,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Part Requests (for Work Orders)
CREATE TABLE part_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'partially_issued', 'issued', 'completed', 'cancelled')),
  requested_by UUID REFERENCES employees(id),
  requested_by_name TEXT NOT NULL,
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  lines JSONB DEFAULT '[]',
  total_estimated_cost DECIMAL(12,2) DEFAULT 0,
  total_actual_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, request_number)
);

-- Low Stock Alerts
CREATE TABLE low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  category TEXT,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  current_stock DECIMAL(10,2) NOT NULL,
  min_level DECIMAL(10,2) NOT NULL,
  safety_stock DECIMAL(10,2),
  percent_of_min INTEGER,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('stockout', 'below_min', 'approaching_min', 'below_safety_stock', 'high_consumption')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'snoozed', 'resolved', 'auto_resolved')),
  acknowledged_by UUID REFERENCES employees(id),
  acknowledged_by_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  resolved_by_name TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_reason TEXT,
  pending_po_id UUID,
  pending_po_number TEXT,
  pending_po_qty DECIMAL(10,2),
  pending_po_expected_date DATE,
  actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Count Sessions (Inventory Counts)
CREATE TABLE count_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  category TEXT,
  created_by TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  total_items INTEGER DEFAULT 0,
  counted_items INTEGER DEFAULT 0,
  variance_count INTEGER DEFAULT 0,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Procurement Vendors (Extended vendor info for procurement)
CREATE TABLE procurement_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  payment_terms TEXT DEFAULT 'net_30' CHECK (payment_terms IN ('net_10', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'cod', 'prepaid', 'direct_pay')),
  active BOOLEAN DEFAULT TRUE,
  vendor_type TEXT DEFAULT 'supplier' CHECK (vendor_type IN ('supplier', 'service', 'contractor', 'distributor')),
  tax_id TEXT,
  website TEXT,
  categories TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  insurance JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{"onTimeDeliveryRate": 0, "qualityScore": 0, "responseTime": 0, "totalOrders": 0}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, vendor_code)
);

-- Purchase Requests (Initial requests from employees)
CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  requester_id UUID REFERENCES employees(id),
  requester_name TEXT NOT NULL,
  department_id TEXT,
  department_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  needed_by_date DATE,
  approved_date TIMESTAMPTZ,
  approved_by TEXT,
  requisition_id UUID,
  requisition_number TEXT,
  total_estimated DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, request_number)
);

-- Purchase Requisitions (Procurement-created from requests or direct)
CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requisition_number TEXT NOT NULL,
  source_request_id UUID REFERENCES purchase_requests(id),
  source_request_number TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_by_name TEXT NOT NULL,
  department_id TEXT,
  department_name TEXT,
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'converted_to_po', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  requisition_type TEXT DEFAULT 'material' CHECK (requisition_type IN ('material', 'service', 'capex')),
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  needed_by_date DATE,
  approved_date TIMESTAMPTZ,
  approved_by TEXT,
  rejected_date TIMESTAMPTZ,
  rejected_by TEXT,
  rejection_reason TEXT,
  po_id UUID,
  po_number TEXT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  shipping DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  justification TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, requisition_number)
);

-- Extended Purchase Orders (Full PO with line items)
CREATE TABLE procurement_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  po_type TEXT DEFAULT 'material' CHECK (po_type IN ('material', 'service', 'capex')),
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT NOT NULL,
  department_id TEXT,
  department_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'submitted', 'ordered', 'partial_received', 'received', 'closed', 'cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  shipping DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  submitted_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  approved_by TEXT,
  expected_delivery DATE,
  received_date TIMESTAMPTZ,
  source_requisition_id UUID REFERENCES purchase_requisitions(id),
  source_requisition_number TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, po_number)
);

-- PO Approvals (Multi-tier approval tracking)
CREATE TABLE po_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID REFERENCES procurement_purchase_orders(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('requisition', 'purchase_order')),
  tier INTEGER NOT NULL DEFAULT 1,
  tier_name TEXT,
  approver_id UUID REFERENCES employees(id),
  approver_name TEXT NOT NULL,
  approver_role TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  amount_threshold DECIMAL(12,2),
  decision_date TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Swaps
CREATE TABLE shift_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  target_employee_id UUID REFERENCES employees(id),
  target_employee_name TEXT,
  target_shift_id UUID REFERENCES shifts(id),
  swap_type TEXT NOT NULL CHECK (swap_type IN ('swap', 'giveaway', 'pickup')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'manager_pending', 'manager_approved', 'manager_rejected', 'completed')),
  reason TEXT,
  requester_date DATE NOT NULL,
  requester_start_time TIME NOT NULL,
  requester_end_time TIME NOT NULL,
  target_date DATE,
  target_start_time TIME,
  target_end_time TIME,
  responded_at TIMESTAMPTZ,
  manager_id UUID REFERENCES employees(id),
  manager_name TEXT,
  manager_approved_at TIMESTAMPTZ,
  manager_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material Receipts (Receiving against POs)
CREATE TABLE material_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  po_id UUID REFERENCES procurement_purchase_orders(id),
  po_number TEXT,
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT,
  receipt_date TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID REFERENCES employees(id),
  received_by_name TEXT NOT NULL,
  total_lines INTEGER DEFAULT 0,
  notes TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, receipt_number)
);

-- Indexes for better query performance
CREATE INDEX idx_materials_org ON materials(organization_id);
CREATE INDEX idx_materials_sku ON materials(organization_id, sku);
CREATE INDEX idx_materials_category ON materials(organization_id, category);
CREATE INDEX idx_materials_status ON materials(organization_id, status);

CREATE INDEX idx_work_orders_org ON work_orders(organization_id);
CREATE INDEX idx_work_orders_status ON work_orders(organization_id, status);
CREATE INDEX idx_work_orders_assigned ON work_orders(organization_id, assigned_to);
CREATE INDEX idx_work_orders_facility ON work_orders(organization_id, facility_id);

CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_facility ON employees(organization_id, facility_id);
CREATE INDEX idx_employees_status ON employees(organization_id, status);

CREATE INDEX idx_equipment_org ON equipment(organization_id);
CREATE INDEX idx_equipment_facility ON equipment(organization_id, facility_id);
CREATE INDEX idx_equipment_status ON equipment(organization_id, status);

CREATE INDEX idx_inventory_history_material ON inventory_history(material_id);
CREATE INDEX idx_inventory_history_org ON inventory_history(organization_id);

CREATE INDEX idx_approvals_org ON approvals(organization_id);
CREATE INDEX idx_approvals_status ON approvals(organization_id, status);
CREATE INDEX idx_approvals_requester ON approvals(organization_id, requester_id);

CREATE INDEX idx_pm_schedules_equipment ON pm_schedules(equipment_id);
CREATE INDEX idx_pm_schedules_next_due ON pm_schedules(organization_id, next_due);

CREATE INDEX idx_downtime_events_org ON downtime_events(organization_id);
CREATE INDEX idx_downtime_events_equipment ON downtime_events(organization_id, equipment_id);
CREATE INDEX idx_downtime_events_status ON downtime_events(organization_id, status);
CREATE INDEX idx_downtime_events_start ON downtime_events(organization_id, start_time);
CREATE INDEX idx_downtime_events_reason ON downtime_events(organization_id, reason);
CREATE INDEX idx_downtime_events_work_order ON downtime_events(work_order_id);

CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(organization_id, date);

CREATE INDEX idx_task_verifications_dept ON task_verifications(organization_id, department_code);
CREATE INDEX idx_task_verifications_employee ON task_verifications(organization_id, employee_id);

CREATE INDEX idx_procurement_vendors_org ON procurement_vendors(organization_id);
CREATE INDEX idx_procurement_vendors_active ON procurement_vendors(organization_id, active);

CREATE INDEX idx_purchase_requests_org ON purchase_requests(organization_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests(organization_id, status);
CREATE INDEX idx_purchase_requests_requester ON purchase_requests(organization_id, requester_id);

CREATE INDEX idx_purchase_requisitions_org ON purchase_requisitions(organization_id);
CREATE INDEX idx_purchase_requisitions_status ON purchase_requisitions(organization_id, status);
CREATE INDEX idx_purchase_requisitions_vendor ON purchase_requisitions(organization_id, vendor_id);

CREATE INDEX idx_procurement_po_org ON procurement_purchase_orders(organization_id);
CREATE INDEX idx_procurement_po_status ON procurement_purchase_orders(organization_id, status);
CREATE INDEX idx_procurement_po_vendor ON procurement_purchase_orders(organization_id, vendor_id);

CREATE INDEX idx_po_approvals_org ON po_approvals(organization_id);
CREATE INDEX idx_po_approvals_po ON po_approvals(po_id);
CREATE INDEX idx_po_approvals_requisition ON po_approvals(requisition_id);
CREATE INDEX idx_po_approvals_status ON po_approvals(organization_id, status);

CREATE INDEX idx_material_receipts_org ON material_receipts(organization_id);
CREATE INDEX idx_material_receipts_po ON material_receipts(po_id);

CREATE INDEX idx_shifts_org ON shifts(organization_id);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_date ON shifts(organization_id, date);
CREATE INDEX idx_shifts_status ON shifts(organization_id, status);

CREATE INDEX idx_time_punches_employee ON time_punches(employee_id);
CREATE INDEX idx_time_punches_timestamp ON time_punches(organization_id, timestamp);

CREATE INDEX idx_time_off_requests_org ON time_off_requests(organization_id);
CREATE INDEX idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_requests_status ON time_off_requests(organization_id, status);

CREATE INDEX idx_shift_swaps_org ON shift_swaps(organization_id);
CREATE INDEX idx_shift_swaps_requester ON shift_swaps(requester_id);
CREATE INDEX idx_shift_swaps_target ON shift_swaps(target_employee_id);
CREATE INDEX idx_shift_swaps_status ON shift_swaps(organization_id, status);

CREATE INDEX idx_bulletin_posts_org ON bulletin_posts(organization_id);
CREATE INDEX idx_bulletin_posts_priority ON bulletin_posts(organization_id, priority);
CREATE INDEX idx_bulletin_posts_pinned ON bulletin_posts(organization_id, pinned);
CREATE INDEX idx_bulletin_posts_expires ON bulletin_posts(organization_id, expires_at);

CREATE INDEX idx_part_requests_org ON part_requests(organization_id);
CREATE INDEX idx_part_requests_status ON part_requests(organization_id, status);
CREATE INDEX idx_part_requests_work_order ON part_requests(work_order_id);
CREATE INDEX idx_part_requests_requester ON part_requests(requested_by);

CREATE INDEX idx_assets_org ON assets(organization_id);
CREATE INDEX idx_assets_facility ON assets(organization_id, facility_id);
CREATE INDEX idx_assets_status ON assets(organization_id, status);
CREATE INDEX idx_assets_category ON assets(organization_id, category);
CREATE INDEX idx_assets_assigned ON assets(organization_id, assigned_to);
CREATE INDEX idx_assets_tag ON assets(organization_id, asset_tag);

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE downtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps ENABLE ROW LEVEL SECURITY;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_schedules_updated_at BEFORE UPDATE ON pm_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_work_orders_updated_at BEFORE UPDATE ON pm_work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_downtime_events_updated_at BEFORE UPDATE ON downtime_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_off_requests_updated_at BEFORE UPDATE ON time_off_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspection_templates_updated_at BEFORE UPDATE ON inspection_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulletin_posts_updated_at BEFORE UPDATE ON bulletin_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_part_requests_updated_at BEFORE UPDATE ON part_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_low_stock_alerts_updated_at BEFORE UPDATE ON low_stock_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_count_sessions_updated_at BEFORE UPDATE ON count_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_procurement_vendors_updated_at BEFORE UPDATE ON procurement_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requisitions_updated_at BEFORE UPDATE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_procurement_purchase_orders_updated_at BEFORE UPDATE ON procurement_purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_po_approvals_updated_at BEFORE UPDATE ON po_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_swaps_updated_at BEFORE UPDATE ON shift_swaps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recycling Records (Bulbs)
CREATE TABLE recycling_bulbs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date_shipped DATE NOT NULL,
  bulb_size TEXT NOT NULL,
  bulb_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  tracking_number TEXT,
  certificate_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Records (Batteries)
CREATE TABLE recycling_batteries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  battery_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  weight DECIMAL(10,2),
  pickup_delivery TEXT NOT NULL CHECK (pickup_delivery IN ('pickup', 'delivery')),
  vendor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Records (Metal)
CREATE TABLE recycling_metal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metal_type TEXT NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  receipt_number TEXT,
  amount_received DECIMAL(10,2) DEFAULT 0,
  vendor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Records (Cardboard)
CREATE TABLE recycling_cardboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date_picked_up DATE NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  receipt_number TEXT,
  vendor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Records (Paper)
CREATE TABLE recycling_paper (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date_picked_up DATE NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  company_name TEXT,
  certificate_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Records (Toner)
CREATE TABLE recycling_toner (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date_shipped DATE NOT NULL,
  cartridge_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  tracking_number TEXT,
  certificate_number TEXT,
  vendor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling Files
CREATE TABLE recycling_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('bulb', 'battery', 'metal', 'cardboard', 'paper', 'toner')),
  record_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Requisitions (Recruiting)
CREATE TABLE job_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requisition_number TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT,
  job_type TEXT NOT NULL CHECK (job_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
  employment_type TEXT NOT NULL CHECK (employment_type IN ('exempt', 'non_exempt')),
  open_positions INTEGER NOT NULL DEFAULT 1,
  filled_positions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'on_hold', 'filled', 'cancelled')),
  hiring_manager TEXT,
  hiring_manager_id UUID REFERENCES employees(id),
  recruiter TEXT,
  recruiter_id UUID REFERENCES employees(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  salary_min DECIMAL(12,2),
  salary_max DECIMAL(12,2),
  job_description TEXT,
  requirements TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  posted_date DATE,
  target_start_date DATE,
  closing_date DATE,
  is_remote BOOLEAN DEFAULT FALSE,
  experience_years INTEGER,
  education_required TEXT,
  skills_required TEXT[] DEFAULT '{}',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, requisition_number)
);

-- Candidates
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  current_title TEXT,
  current_company TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  cover_letter_url TEXT,
  years_of_experience INTEGER DEFAULT 0,
  education JSONB DEFAULT '[]',
  skills TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'direct' CHECK (source IN ('job_board', 'referral', 'career_site', 'linkedin', 'agency', 'direct', 'other')),
  referred_by TEXT,
  desired_salary DECIMAL(12,2),
  available_start_date DATE,
  is_willing_to_relocate BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  rating DECIMAL(3,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_requisition_id UUID NOT NULL REFERENCES job_requisitions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'screening', 'phone_screen', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  applied_date TIMESTAMPTZ DEFAULT NOW(),
  current_stage TEXT,
  overall_score DECIMAL(3,1),
  screening_score DECIMAL(3,1),
  interview_score DECIMAL(3,1),
  technical_score DECIMAL(3,1),
  culture_fit_score DECIMAL(3,1),
  assigned_recruiter TEXT,
  assigned_recruiter_id UUID REFERENCES employees(id),
  last_activity_date TIMESTAMPTZ DEFAULT NOW(),
  disqualification_reason TEXT,
  withdrawal_reason TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  rejection_email_sent BOOLEAN DEFAULT FALSE,
  source_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_requisition_id UUID NOT NULL REFERENCES job_requisitions(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('phone', 'video', 'in_person', 'panel', 'technical')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 30,
  location TEXT,
  meeting_link TEXT,
  interviewers TEXT[] DEFAULT '{}',
  panel_members TEXT[] DEFAULT '{}',
  scheduled_by TEXT NOT NULL,
  scheduled_by_id UUID REFERENCES employees(id),
  round INTEGER DEFAULT 1,
  notes TEXT,
  feedback JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Offers
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_requisition_id UUID NOT NULL REFERENCES job_requisitions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  start_date DATE NOT NULL,
  salary DECIMAL(12,2) NOT NULL,
  bonus DECIMAL(12,2),
  equity TEXT,
  benefits TEXT[] DEFAULT '{}',
  offer_letter_url TEXT,
  sent_date TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  accepted_date TIMESTAMPTZ,
  declined_date TIMESTAMPTZ,
  decline_reason TEXT,
  signed_offer_url TEXT,
  prepared_by TEXT NOT NULL,
  prepared_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate Notes
CREATE TABLE candidate_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  is_private BOOLEAN DEFAULT FALSE,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'interview', 'screening', 'reference', 'background_check')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Reviews
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES employees(id),
  review_cycle TEXT NOT NULL CHECK (review_cycle IN ('annual', 'semi-annual', 'quarterly', 'probationary')),
  review_period TEXT NOT NULL,
  status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'pending-review', 'completed', 'overdue')),
  due_date DATE NOT NULL,
  completed_date DATE,
  overall_rating DECIMAL(3,1),
  competencies JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  strengths TEXT[] DEFAULT '{}',
  areas_for_improvement TEXT[] DEFAULT '{}',
  development_plan TEXT[] DEFAULT '{}',
  comments TEXT,
  manager_comments TEXT,
  employee_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Goals
CREATE TABLE employee_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'on-track', 'at-risk', 'completed', 'cancelled')),
  progress INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  completed_date DATE,
  milestones JSONB DEFAULT '[]',
  aligned_to TEXT,
  metrics TEXT[] DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 360 Feedback
CREATE TABLE feedback_360 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_cycle TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_by_id UUID REFERENCES employees(id),
  requested_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  responses JSONB DEFAULT '[]',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Succession Plans
CREATE TABLE succession_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position_id TEXT NOT NULL,
  position_title TEXT NOT NULL,
  department TEXT NOT NULL,
  incumbent_id UUID REFERENCES employees(id),
  critical_role BOOLEAN DEFAULT FALSE,
  retirement_risk BOOLEAN DEFAULT FALSE,
  successors JSONB DEFAULT '[]',
  competencies TEXT[] DEFAULT '{}',
  development_actions TEXT[] DEFAULT '{}',
  last_reviewed DATE,
  next_review DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Talent Profiles
CREATE TABLE talent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'solid-performer' CHECK (category IN ('high-performer', 'solid-performer', 'needs-improvement', 'critical-talent')),
  potential_rating DECIMAL(3,1),
  performance_rating DECIMAL(3,1),
  flight_risk TEXT DEFAULT 'low' CHECK (flight_risk IN ('low', 'medium', 'high')),
  key_strengths TEXT[] DEFAULT '{}',
  development_areas TEXT[] DEFAULT '{}',
  career_aspirations TEXT[] DEFAULT '{}',
  ready_for_promotion BOOLEAN DEFAULT FALSE,
  successor_for TEXT[] DEFAULT '{}',
  last_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_id)
);

-- Indexes for new tables
CREATE INDEX idx_recycling_bulbs_org ON recycling_bulbs(organization_id);
CREATE INDEX idx_recycling_batteries_org ON recycling_batteries(organization_id);
CREATE INDEX idx_recycling_metal_org ON recycling_metal(organization_id);
CREATE INDEX idx_recycling_cardboard_org ON recycling_cardboard(organization_id);
CREATE INDEX idx_recycling_paper_org ON recycling_paper(organization_id);
CREATE INDEX idx_recycling_toner_org ON recycling_toner(organization_id);
CREATE INDEX idx_recycling_files_org ON recycling_files(organization_id);
CREATE INDEX idx_recycling_files_record ON recycling_files(record_type, record_id);

CREATE INDEX idx_job_requisitions_org ON job_requisitions(organization_id);
CREATE INDEX idx_job_requisitions_status ON job_requisitions(organization_id, status);
CREATE INDEX idx_candidates_org ON candidates(organization_id);
CREATE INDEX idx_candidates_email ON candidates(organization_id, email);
CREATE INDEX idx_applications_org ON applications(organization_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_job ON applications(job_requisition_id);
CREATE INDEX idx_applications_status ON applications(organization_id, status);
CREATE INDEX idx_interviews_org ON interviews(organization_id);
CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_job_offers_org ON job_offers(organization_id);
CREATE INDEX idx_job_offers_application ON job_offers(application_id);
CREATE INDEX idx_candidate_notes_candidate ON candidate_notes(candidate_id);

CREATE INDEX idx_performance_reviews_org ON performance_reviews(organization_id);
CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_status ON performance_reviews(organization_id, status);
CREATE INDEX idx_employee_goals_org ON employee_goals(organization_id);
CREATE INDEX idx_employee_goals_employee ON employee_goals(employee_id);
CREATE INDEX idx_employee_goals_status ON employee_goals(organization_id, status);
CREATE INDEX idx_feedback_360_org ON feedback_360(organization_id);
CREATE INDEX idx_feedback_360_employee ON feedback_360(employee_id);
CREATE INDEX idx_succession_plans_org ON succession_plans(organization_id);
CREATE INDEX idx_talent_profiles_org ON talent_profiles(organization_id);
CREATE INDEX idx_talent_profiles_employee ON talent_profiles(employee_id);

-- RLS for new tables
ALTER TABLE recycling_bulbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_metal ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_cardboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_paper ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_toner ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE succession_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;

-- Triggers for new tables
CREATE TRIGGER update_job_requisitions_updated_at BEFORE UPDATE ON job_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_offers_updated_at BEFORE UPDATE ON job_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_goals_updated_at BEFORE UPDATE ON employee_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feedback_360_updated_at BEFORE UPDATE ON feedback_360 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_succession_plans_updated_at BEFORE UPDATE ON succession_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_talent_profiles_updated_at BEFORE UPDATE ON talent_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Documents & SDS Module
-- =====================================================

-- Document Categories
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES document_categories(id),
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Documents (SOPs, Policies, Specs, Manuals, etc.)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('sop', 'policy', 'specification', 'manual', 'procedure', 'form', 'template', 'training', 'certificate', 'other')),
  category_id UUID REFERENCES document_categories(id),
  category_name TEXT,
  department_code TEXT,
  department_name TEXT,
  facility_id UUID REFERENCES facilities(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'pending_approval', 'approved', 'active', 'revision', 'obsolete', 'archived')),
  version TEXT NOT NULL DEFAULT '1.0',
  revision_number INTEGER DEFAULT 1,
  effective_date DATE,
  expiration_date DATE,
  review_date DATE,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  author TEXT NOT NULL,
  author_id UUID REFERENCES employees(id),
  owner TEXT,
  owner_id UUID REFERENCES employees(id),
  reviewer TEXT,
  reviewer_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  approver TEXT,
  approver_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  is_controlled BOOLEAN DEFAULT TRUE,
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  access_level TEXT DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted')),
  related_documents UUID[] DEFAULT '{}',
  supersedes_id UUID REFERENCES documents(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, document_number, version)
);

-- Document Versions (Version history)
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  file_url TEXT,
  file_name TEXT,
  change_summary TEXT,
  changed_by TEXT NOT NULL,
  changed_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Acknowledgments
CREATE TABLE document_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  version_acknowledged TEXT NOT NULL,
  UNIQUE(document_id, employee_id, version_acknowledged)
);

-- SDS Records (Safety Data Sheets)
CREATE TABLE sds_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sds_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  manufacturer_phone TEXT,
  manufacturer_address TEXT,
  emergency_phone TEXT,
  cas_number TEXT,
  un_number TEXT,
  chemical_family TEXT,
  synonyms TEXT[] DEFAULT '{}',
  physical_state TEXT CHECK (physical_state IN ('solid', 'liquid', 'gas', 'aerosol', 'paste', 'powder')),
  color TEXT,
  odor TEXT,
  ph_range TEXT,
  flash_point TEXT,
  boiling_point TEXT,
  melting_point TEXT,
  vapor_pressure TEXT,
  specific_gravity TEXT,
  solubility TEXT,
  hazard_class TEXT[] DEFAULT '{}',
  ghs_pictograms TEXT[] DEFAULT '{}',
  signal_word TEXT CHECK (signal_word IN ('danger', 'warning', 'none')),
  hazard_statements TEXT[] DEFAULT '{}',
  precautionary_statements TEXT[] DEFAULT '{}',
  health_hazards TEXT,
  fire_hazards TEXT,
  reactivity_hazards TEXT,
  environmental_hazards TEXT,
  routes_of_exposure TEXT[] DEFAULT '{}',
  symptoms_of_exposure TEXT,
  first_aid_inhalation TEXT,
  first_aid_skin TEXT,
  first_aid_eye TEXT,
  first_aid_ingestion TEXT,
  fire_extinguishing_media TEXT,
  fire_fighting_procedures TEXT,
  spill_procedures TEXT,
  handling_precautions TEXT,
  storage_requirements TEXT,
  ppe_requirements JSONB DEFAULT '{}',
  exposure_limits JSONB DEFAULT '{}',
  engineering_controls TEXT,
  disposal_methods TEXT,
  transport_info JSONB DEFAULT '{}',
  regulatory_info JSONB DEFAULT '{}',
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  revision_date DATE,
  issue_date DATE NOT NULL,
  expiration_date DATE,
  review_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'superseded', 'archived')),
  version TEXT DEFAULT '1.0',
  location_used TEXT[] DEFAULT '{}',
  department_codes TEXT[] DEFAULT '{}',
  approved_for_use BOOLEAN DEFAULT TRUE,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  supersedes_id UUID REFERENCES sds_records(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, sds_number, version)
);

-- SDS Training Records
CREATE TABLE sds_training_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sds_id UUID NOT NULL REFERENCES sds_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  training_date DATE NOT NULL,
  trainer TEXT,
  trainer_id UUID REFERENCES employees(id),
  training_type TEXT DEFAULT 'initial' CHECK (training_type IN ('initial', 'refresher', 'update')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sds_id, employee_id, training_date)
);

-- Indexes for Documents & SDS
CREATE INDEX idx_document_categories_org ON document_categories(organization_id);
CREATE INDEX idx_document_categories_parent ON document_categories(parent_id);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_type ON documents(organization_id, document_type);
CREATE INDEX idx_documents_category ON documents(organization_id, category_id);
CREATE INDEX idx_documents_status ON documents(organization_id, status);
CREATE INDEX idx_documents_department ON documents(organization_id, department_code);
CREATE INDEX idx_documents_expiration ON documents(organization_id, expiration_date);
CREATE INDEX idx_documents_review ON documents(organization_id, review_date);

CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_document_acknowledgments_doc ON document_acknowledgments(document_id);
CREATE INDEX idx_document_acknowledgments_emp ON document_acknowledgments(employee_id);

CREATE INDEX idx_sds_records_org ON sds_records(organization_id);
CREATE INDEX idx_sds_records_manufacturer ON sds_records(organization_id, manufacturer);
CREATE INDEX idx_sds_records_status ON sds_records(organization_id, status);
CREATE INDEX idx_sds_records_expiration ON sds_records(organization_id, expiration_date);
CREATE INDEX idx_sds_records_cas ON sds_records(organization_id, cas_number);

CREATE INDEX idx_sds_training_sds ON sds_training_records(sds_id);
CREATE INDEX idx_sds_training_employee ON sds_training_records(employee_id);

-- RLS for Documents & SDS
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sds_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sds_training_records ENABLE ROW LEVEL SECURITY;

-- Triggers for Documents & SDS
CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sds_records_updated_at BEFORE UPDATE ON sds_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Quality Management Module
-- =====================================================

-- NCR (Non-Conformance Reports)
CREATE TABLE ncr_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ncr_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ncr_type TEXT NOT NULL CHECK (ncr_type IN ('product', 'process', 'supplier', 'customer', 'internal', 'regulatory')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigation', 'containment', 'root_cause', 'corrective_action', 'verification', 'closed', 'rejected')),
  source TEXT CHECK (source IN ('incoming_inspection', 'in_process', 'final_inspection', 'customer_complaint', 'audit', 'supplier', 'internal', 'other')),
  facility_id UUID REFERENCES facilities(id),
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  quantity_affected DECIMAL(12,2),
  unit_of_measure TEXT,
  discovered_date DATE NOT NULL,
  discovered_by TEXT NOT NULL,
  discovered_by_id UUID REFERENCES employees(id),
  assigned_to TEXT,
  assigned_to_id UUID REFERENCES employees(id),
  root_cause TEXT,
  root_cause_category TEXT,
  containment_actions TEXT,
  containment_date DATE,
  corrective_actions TEXT,
  corrective_action_date DATE,
  preventive_actions TEXT,
  verification_method TEXT,
  verification_date DATE,
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  disposition TEXT CHECK (disposition IN ('use_as_is', 'rework', 'scrap', 'return_to_supplier', 'downgrade', 'hold', 'other')),
  disposition_notes TEXT,
  cost_impact DECIMAL(12,2),
  customer_notified BOOLEAN DEFAULT FALSE,
  customer_notification_date DATE,
  capa_required BOOLEAN DEFAULT FALSE,
  capa_id UUID,
  attachments JSONB DEFAULT '[]',
  closed_date DATE,
  closed_by TEXT,
  closed_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, ncr_number)
);

-- CAPA (Corrective and Preventive Actions)
CREATE TABLE capa_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  capa_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  capa_type TEXT NOT NULL CHECK (capa_type IN ('corrective', 'preventive', 'both')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigation', 'action_planning', 'implementation', 'verification', 'effectiveness_review', 'closed', 'cancelled')),
  source TEXT CHECK (source IN ('ncr', 'audit', 'customer_complaint', 'near_miss', 'trend_analysis', 'management_review', 'regulatory', 'other')),
  source_reference TEXT,
  source_id UUID,
  facility_id UUID REFERENCES facilities(id),
  department_code TEXT,
  department_name TEXT,
  initiated_date DATE NOT NULL,
  initiated_by TEXT NOT NULL,
  initiated_by_id UUID REFERENCES employees(id),
  owner TEXT,
  owner_id UUID REFERENCES employees(id),
  problem_statement TEXT,
  immediate_containment TEXT,
  root_cause_analysis TEXT,
  root_cause_method TEXT CHECK (root_cause_method IN ('5_whys', 'fishbone', 'fmea', 'fault_tree', 'pareto', 'other')),
  root_cause_summary TEXT,
  action_plan JSONB DEFAULT '[]',
  target_completion_date DATE,
  actual_completion_date DATE,
  verification_plan TEXT,
  verification_results TEXT,
  verification_date DATE,
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  effectiveness_criteria TEXT,
  effectiveness_review_date DATE,
  effectiveness_results TEXT,
  effectiveness_verified_by TEXT,
  effectiveness_verified_by_id UUID REFERENCES employees(id),
  is_effective BOOLEAN,
  recurrence_check_date DATE,
  recurrence_notes TEXT,
  related_ncrs UUID[] DEFAULT '{}',
  related_capas UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  closed_date DATE,
  closed_by TEXT,
  closed_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, capa_number)
);

-- Temperature Logs
CREATE TABLE temperature_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN ('cooler', 'freezer', 'hot_holding', 'receiving', 'cooking', 'cooling', 'ambient', 'storage', 'transport')),
  location_name TEXT NOT NULL,
  location_id TEXT,
  equipment_name TEXT,
  equipment_id UUID REFERENCES equipment(id),
  reading_date DATE NOT NULL,
  reading_time TIME NOT NULL,
  temperature DECIMAL(6,2) NOT NULL,
  temperature_unit TEXT DEFAULT 'F' CHECK (temperature_unit IN ('F', 'C')),
  min_limit DECIMAL(6,2),
  max_limit DECIMAL(6,2),
  is_within_limits BOOLEAN,
  out_of_range BOOLEAN DEFAULT FALSE,
  corrective_action TEXT,
  corrective_action_taken_by TEXT,
  corrective_action_time TIMESTAMPTZ,
  recorded_by TEXT NOT NULL,
  recorded_by_id UUID REFERENCES employees(id),
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hold Tags
CREATE TABLE hold_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hold_tag_number TEXT NOT NULL,
  status TEXT DEFAULT 'on_hold' CHECK (status IN ('on_hold', 'released', 'scrapped', 'reworked', 'returned')),
  hold_type TEXT NOT NULL CHECK (hold_type IN ('quality', 'regulatory', 'customer', 'supplier', 'investigation', 'recall', 'other')),
  reason TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  lot_number TEXT,
  batch_number TEXT,
  quantity DECIMAL(12,2) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  location TEXT,
  facility_id UUID REFERENCES facilities(id),
  hold_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  held_by TEXT NOT NULL,
  held_by_id UUID REFERENCES employees(id),
  expected_resolution_date DATE,
  ncr_id UUID REFERENCES ncr_records(id),
  ncr_number TEXT,
  capa_id UUID REFERENCES capa_records(id),
  capa_number TEXT,
  disposition TEXT CHECK (disposition IN ('release', 'scrap', 'rework', 'return_to_supplier', 'downgrade', 'other')),
  disposition_reason TEXT,
  disposition_date TIMESTAMPTZ,
  disposition_by TEXT,
  disposition_by_id UUID REFERENCES employees(id),
  disposition_quantity DECIMAL(12,2),
  released_quantity DECIMAL(12,2),
  scrapped_quantity DECIMAL(12,2),
  reworked_quantity DECIMAL(12,2),
  returned_quantity DECIMAL(12,2),
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, hold_tag_number)
);

-- Quality Inspections (General)
CREATE TABLE quality_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_number TEXT NOT NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('incoming', 'in_process', 'final', 'pre_shipment', 'first_article', 'periodic', 'customer', 'supplier', 'audit')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  result TEXT CHECK (result IN ('pass', 'fail', 'conditional', 'pending')),
  facility_id UUID REFERENCES facilities(id),
  department_code TEXT,
  location TEXT,
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  batch_number TEXT,
  quantity_inspected DECIMAL(12,2),
  quantity_accepted DECIMAL(12,2),
  quantity_rejected DECIMAL(12,2),
  sample_size INTEGER,
  aql_level TEXT,
  scheduled_date DATE,
  inspection_date DATE,
  inspector_name TEXT,
  inspector_id UUID REFERENCES employees(id),
  template_id UUID REFERENCES inspection_templates(id),
  checklist_items JSONB DEFAULT '[]',
  measurements JSONB DEFAULT '[]',
  defects_found JSONB DEFAULT '[]',
  supplier_name TEXT,
  supplier_id UUID REFERENCES vendors(id),
  po_number TEXT,
  customer_name TEXT,
  order_number TEXT,
  ncr_required BOOLEAN DEFAULT FALSE,
  ncr_id UUID REFERENCES ncr_records(id),
  ncr_number TEXT,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, inspection_number)
);

-- Customer Complaints
CREATE TABLE customer_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  complaint_number TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigation', 'resolution', 'closed', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  complaint_type TEXT NOT NULL CHECK (complaint_type IN ('product_quality', 'foreign_material', 'allergen', 'labeling', 'packaging', 'delivery', 'service', 'safety', 'other')),
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by TEXT NOT NULL,
  received_by_id UUID REFERENCES employees(id),
  received_method TEXT CHECK (received_method IN ('phone', 'email', 'letter', 'social_media', 'in_person', 'other')),
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  purchase_date DATE,
  purchase_location TEXT,
  complaint_description TEXT NOT NULL,
  sample_available BOOLEAN DEFAULT FALSE,
  sample_received_date DATE,
  illness_reported BOOLEAN DEFAULT FALSE,
  injury_reported BOOLEAN DEFAULT FALSE,
  medical_attention_sought BOOLEAN DEFAULT FALSE,
  regulatory_notification_required BOOLEAN DEFAULT FALSE,
  regulatory_notification_date DATE,
  facility_id UUID REFERENCES facilities(id),
  assigned_to TEXT,
  assigned_to_id UUID REFERENCES employees(id),
  investigation_summary TEXT,
  root_cause TEXT,
  corrective_actions TEXT,
  customer_response TEXT,
  customer_response_date DATE,
  resolution_type TEXT CHECK (resolution_type IN ('replacement', 'refund', 'credit', 'apology', 'no_action', 'other')),
  resolution_notes TEXT,
  ncr_id UUID REFERENCES ncr_records(id),
  ncr_number TEXT,
  capa_id UUID REFERENCES capa_records(id),
  capa_number TEXT,
  attachments JSONB DEFAULT '[]',
  closed_date TIMESTAMPTZ,
  closed_by TEXT,
  closed_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, complaint_number)
);

-- Deviation Records
CREATE TABLE deviation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deviation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deviation_type TEXT NOT NULL CHECK (deviation_type IN ('planned', 'unplanned')),
  category TEXT CHECK (category IN ('process', 'equipment', 'material', 'environmental', 'documentation', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending_approval', 'approved', 'rejected', 'implemented', 'closed')),
  facility_id UUID REFERENCES facilities(id),
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  process_affected TEXT,
  product_affected TEXT,
  lot_numbers_affected TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE,
  duration_hours DECIMAL(8,2),
  requested_by TEXT NOT NULL,
  requested_by_id UUID REFERENCES employees(id),
  justification TEXT,
  risk_assessment TEXT,
  mitigation_measures TEXT,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_date TIMESTAMPTZ,
  impact_assessment TEXT,
  capa_required BOOLEAN DEFAULT FALSE,
  capa_id UUID REFERENCES capa_records(id),
  capa_number TEXT,
  attachments JSONB DEFAULT '[]',
  closed_date DATE,
  closed_by TEXT,
  closed_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, deviation_number)
);

-- Indexes for Quality Management
CREATE INDEX idx_ncr_records_org ON ncr_records(organization_id);
CREATE INDEX idx_ncr_records_status ON ncr_records(organization_id, status);
CREATE INDEX idx_ncr_records_type ON ncr_records(organization_id, ncr_type);
CREATE INDEX idx_ncr_records_severity ON ncr_records(organization_id, severity);
CREATE INDEX idx_ncr_records_facility ON ncr_records(organization_id, facility_id);
CREATE INDEX idx_ncr_records_assigned ON ncr_records(organization_id, assigned_to_id);
CREATE INDEX idx_ncr_records_discovered ON ncr_records(organization_id, discovered_date);

CREATE INDEX idx_capa_records_org ON capa_records(organization_id);
CREATE INDEX idx_capa_records_status ON capa_records(organization_id, status);
CREATE INDEX idx_capa_records_type ON capa_records(organization_id, capa_type);
CREATE INDEX idx_capa_records_priority ON capa_records(organization_id, priority);
CREATE INDEX idx_capa_records_owner ON capa_records(organization_id, owner_id);
CREATE INDEX idx_capa_records_target ON capa_records(organization_id, target_completion_date);

CREATE INDEX idx_temperature_logs_org ON temperature_logs(organization_id);
CREATE INDEX idx_temperature_logs_type ON temperature_logs(organization_id, log_type);
CREATE INDEX idx_temperature_logs_location ON temperature_logs(organization_id, location_name);
CREATE INDEX idx_temperature_logs_date ON temperature_logs(organization_id, reading_date);
CREATE INDEX idx_temperature_logs_out_of_range ON temperature_logs(organization_id, out_of_range);
CREATE INDEX idx_temperature_logs_equipment ON temperature_logs(equipment_id);

CREATE INDEX idx_hold_tags_org ON hold_tags(organization_id);
CREATE INDEX idx_hold_tags_status ON hold_tags(organization_id, status);
CREATE INDEX idx_hold_tags_type ON hold_tags(organization_id, hold_type);
CREATE INDEX idx_hold_tags_facility ON hold_tags(organization_id, facility_id);
CREATE INDEX idx_hold_tags_ncr ON hold_tags(ncr_id);
CREATE INDEX idx_hold_tags_lot ON hold_tags(organization_id, lot_number);

CREATE INDEX idx_quality_inspections_org ON quality_inspections(organization_id);
CREATE INDEX idx_quality_inspections_type ON quality_inspections(organization_id, inspection_type);
CREATE INDEX idx_quality_inspections_status ON quality_inspections(organization_id, status);
CREATE INDEX idx_quality_inspections_result ON quality_inspections(organization_id, result);
CREATE INDEX idx_quality_inspections_date ON quality_inspections(organization_id, inspection_date);
CREATE INDEX idx_quality_inspections_inspector ON quality_inspections(inspector_id);

CREATE INDEX idx_customer_complaints_org ON customer_complaints(organization_id);
CREATE INDEX idx_customer_complaints_status ON customer_complaints(organization_id, status);
CREATE INDEX idx_customer_complaints_type ON customer_complaints(organization_id, complaint_type);
CREATE INDEX idx_customer_complaints_priority ON customer_complaints(organization_id, priority);
CREATE INDEX idx_customer_complaints_received ON customer_complaints(organization_id, received_date);
CREATE INDEX idx_customer_complaints_assigned ON customer_complaints(assigned_to_id);

CREATE INDEX idx_deviation_records_org ON deviation_records(organization_id);
CREATE INDEX idx_deviation_records_status ON deviation_records(organization_id, status);
CREATE INDEX idx_deviation_records_type ON deviation_records(organization_id, deviation_type);
CREATE INDEX idx_deviation_records_severity ON deviation_records(organization_id, severity);
CREATE INDEX idx_deviation_records_facility ON deviation_records(organization_id, facility_id);

-- RLS for Quality Management
ALTER TABLE ncr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hold_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviation_records ENABLE ROW LEVEL SECURITY;

-- Triggers for Quality Management
CREATE TRIGGER update_ncr_records_updated_at BEFORE UPDATE ON ncr_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_capa_records_updated_at BEFORE UPDATE ON capa_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hold_tags_updated_at BEFORE UPDATE ON hold_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_inspections_updated_at BEFORE UPDATE ON quality_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_complaints_updated_at BEFORE UPDATE ON customer_complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deviation_records_updated_at BEFORE UPDATE ON deviation_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- APPROVAL WORKFLOWS
-- ===========================================

-- Workflow Templates
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('purchase', 'time_off', 'permit', 'expense', 'contract', 'custom')),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  conditions JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Steps
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approval', 'review', 'notification', 'condition', 'parallel')),
  description TEXT,
  approvers JSONB DEFAULT '[]',
  required_approvals INTEGER DEFAULT 1,
  conditions JSONB DEFAULT '[]',
  skip_conditions JSONB DEFAULT '[]',
  escalation JSONB,
  parallel_steps TEXT[] DEFAULT '{}',
  allow_delegation BOOLEAN DEFAULT TRUE,
  allow_reassign BOOLEAN DEFAULT TRUE,
  timeout_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delegation Rules
CREATE TABLE delegation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_user_name TEXT NOT NULL,
  to_user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  to_user_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  workflow_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Instances (running approvals)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workflow_templates(id),
  template_name TEXT NOT NULL,
  category TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_title TEXT NOT NULL,
  current_step_id UUID REFERENCES workflow_steps(id),
  current_step_order INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'escalated')),
  started_by TEXT NOT NULL,
  started_by_id UUID REFERENCES employees(id),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Step History
CREATE TABLE workflow_step_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES workflow_steps(id),
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'skipped', 'escalated', 'delegated', 'reassigned')),
  action_by TEXT NOT NULL,
  action_by_id UUID REFERENCES employees(id),
  comments TEXT,
  delegated_from TEXT,
  escalated_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Workflow Tables
CREATE INDEX idx_workflow_templates_org ON workflow_templates(organization_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(organization_id, category);
CREATE INDEX idx_workflow_templates_active ON workflow_templates(organization_id, is_active);
CREATE INDEX idx_workflow_templates_default ON workflow_templates(organization_id, is_default);

CREATE INDEX idx_workflow_steps_org ON workflow_steps(organization_id);
CREATE INDEX idx_workflow_steps_template ON workflow_steps(template_id);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(template_id, step_order);

CREATE INDEX idx_delegation_rules_org ON delegation_rules(organization_id);
CREATE INDEX idx_delegation_rules_from ON delegation_rules(from_user_id);
CREATE INDEX idx_delegation_rules_to ON delegation_rules(to_user_id);
CREATE INDEX idx_delegation_rules_active ON delegation_rules(organization_id, is_active);
CREATE INDEX idx_delegation_rules_dates ON delegation_rules(start_date, end_date);

CREATE INDEX idx_workflow_instances_org ON workflow_instances(organization_id);
CREATE INDEX idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(organization_id, status);
CREATE INDEX idx_workflow_instances_reference ON workflow_instances(organization_id, reference_type, reference_id);
CREATE INDEX idx_workflow_instances_category ON workflow_instances(organization_id, category);

CREATE INDEX idx_workflow_step_history_org ON workflow_step_history(organization_id);
CREATE INDEX idx_workflow_step_history_instance ON workflow_step_history(instance_id);
CREATE INDEX idx_workflow_step_history_step ON workflow_step_history(step_id);
CREATE INDEX idx_workflow_step_history_action_by ON workflow_step_history(action_by_id);

-- RLS for Workflow Tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_history ENABLE ROW LEVEL SECURITY;

-- Triggers for Workflow Tables
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delegation_rules_updated_at BEFORE UPDATE ON delegation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- APPROVAL TIERS
-- ===========================================

-- Tier Configurations (groupings of tiers by category)
CREATE TABLE tier_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('purchase', 'time_off', 'permit', 'expense', 'contract', 'custom')),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval Tiers
CREATE TABLE approval_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id UUID REFERENCES tier_configurations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  category TEXT NOT NULL CHECK (category IN ('purchase', 'time_off', 'permit', 'expense', 'contract', 'custom')),
  is_active BOOLEAN DEFAULT TRUE,
  thresholds JSONB DEFAULT '[]',
  approvers JSONB DEFAULT '[]',
  require_all_approvers BOOLEAN DEFAULT FALSE,
  auto_escalate_hours INTEGER,
  auto_approve_on_timeout BOOLEAN DEFAULT FALSE,
  notify_on_escalation BOOLEAN DEFAULT TRUE,
  max_approval_days INTEGER DEFAULT 5,
  color TEXT,
  icon TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Approval Tier Tables
CREATE INDEX idx_tier_configurations_org ON tier_configurations(organization_id);
CREATE INDEX idx_tier_configurations_category ON tier_configurations(organization_id, category);
CREATE INDEX idx_tier_configurations_default ON tier_configurations(organization_id, is_default);
CREATE INDEX idx_tier_configurations_active ON tier_configurations(organization_id, is_active);

CREATE INDEX idx_approval_tiers_org ON approval_tiers(organization_id);
CREATE INDEX idx_approval_tiers_config ON approval_tiers(configuration_id);
CREATE INDEX idx_approval_tiers_category ON approval_tiers(organization_id, category);
CREATE INDEX idx_approval_tiers_level ON approval_tiers(organization_id, level);
CREATE INDEX idx_approval_tiers_active ON approval_tiers(organization_id, is_active);
CREATE INDEX idx_approval_tiers_category_level ON approval_tiers(organization_id, category, level);

-- RLS for Approval Tier Tables
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_tiers ENABLE ROW LEVEL SECURITY;

-- Triggers for Approval Tier Tables
CREATE TRIGGER update_tier_configurations_updated_at BEFORE UPDATE ON tier_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_tiers_updated_at BEFORE UPDATE ON approval_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- APPROVAL REJECTION WORKFLOW FIELDS
-- ===========================================

-- Add rejection fields to workflow_instances
-- Note: Run these ALTER statements after initial table creation
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS returned_from_tier INTEGER CHECK (returned_from_tier BETWEEN 1 AND 5);
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS returned_by TEXT;
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS returned_by_id UUID REFERENCES employees(id);
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS returned_by_name TEXT;
-- ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS rejection_history JSONB DEFAULT '[]';
-- ALTER TABLE workflow_instances DROP CONSTRAINT IF EXISTS workflow_instances_status_check;
-- ALTER TABLE workflow_instances ADD CONSTRAINT workflow_instances_status_check CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'returned', 'cancelled', 'escalated'));

-- Add rejection fields to workflow_step_history
-- ALTER TABLE workflow_step_history ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- ALTER TABLE workflow_step_history ADD COLUMN IF NOT EXISTS returned_to_tier INTEGER CHECK (returned_to_tier BETWEEN 1 AND 5);
-- ALTER TABLE workflow_step_history ADD COLUMN IF NOT EXISTS tier_level INTEGER CHECK (tier_level BETWEEN 1 AND 5);
-- ALTER TABLE workflow_step_history DROP CONSTRAINT IF EXISTS workflow_step_history_action_check;
-- ALTER TABLE workflow_step_history ADD CONSTRAINT workflow_step_history_action_check CHECK (action IN ('approved', 'rejected', 'returned', 'skipped', 'escalated', 'delegated', 'reassigned', 'resubmitted', 'cancelled'));

-- Indexes for rejection fields
-- CREATE INDEX IF NOT EXISTS idx_workflow_instances_returned_from ON workflow_instances(organization_id, returned_from_tier);
-- CREATE INDEX IF NOT EXISTS idx_workflow_step_history_returned_to ON workflow_step_history(returned_to_tier);
-- CREATE INDEX IF NOT EXISTS idx_workflow_step_history_tier ON workflow_step_history(tier_level);

-- ===========================================
-- ATTENDANCE MODULE
-- ===========================================

-- Attendance Records (Daily attendance status per employee)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  date DATE NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  shift_id UUID REFERENCES shifts(id),
  time_entry_id UUID REFERENCES time_entries(id),
  
  -- Scheduled times
  scheduled_start TIME,
  scheduled_end TIME,
  scheduled_hours DECIMAL(5,2),
  
  -- Actual times
  actual_clock_in TIMESTAMPTZ,
  actual_clock_out TIMESTAMPTZ,
  actual_hours DECIMAL(5,2) DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  
  -- Attendance status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',      -- Shift scheduled, not yet started
    'present',        -- Clocked in and working
    'completed',      -- Shift completed normally
    'absent',         -- No show, no time off approved
    'absent_excused', -- Absent with approved time off
    'late',           -- Arrived late
    'early_departure',-- Left early
    'no_call_no_show',-- Did not show up or call
    'partial',        -- Worked partial shift
    'holiday',        -- Scheduled holiday
    'time_off',       -- Approved time off
    'suspended',      -- Employee suspended
    'terminated'      -- Employee terminated
  )),
  
  -- Exception tracking
  is_late BOOLEAN DEFAULT FALSE,
  late_minutes INTEGER DEFAULT 0,
  is_early_departure BOOLEAN DEFAULT FALSE,
  early_departure_minutes INTEGER DEFAULT 0,
  is_overtime BOOLEAN DEFAULT FALSE,
  overtime_minutes INTEGER DEFAULT 0,
  is_no_call_no_show BOOLEAN DEFAULT FALSE,
  
  -- Points/Occurrences system (for attendance tracking)
  occurrence_points DECIMAL(4,2) DEFAULT 0,
  occurrence_type TEXT CHECK (occurrence_type IN (
    'none',
    'late_minor',      -- < 15 min late
    'late_major',      -- 15-30 min late  
    'late_severe',     -- > 30 min late
    'early_minor',     -- < 30 min early
    'early_major',     -- > 30 min early
    'absent_half',     -- Half day absence
    'absent_full',     -- Full day absence
    'ncns'             -- No call no show
  )),
  
  -- Time off reference
  time_off_request_id UUID REFERENCES time_off_requests(id),
  time_off_type TEXT,
  
  -- Approval/Review
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES employees(id),
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Exception handling
  exception_reason TEXT,
  exception_approved BOOLEAN DEFAULT FALSE,
  exception_approved_by UUID REFERENCES employees(id),
  exception_approved_at TIMESTAMPTZ,
  
  -- Pay period info
  pay_period_start DATE,
  pay_period_end DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_id, date)
);

-- Attendance Exceptions (for tracking specific exceptions)
CREATE TABLE attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'late_arrival',
    'early_departure',
    'missed_punch',
    'overtime_unapproved',
    'schedule_deviation',
    'break_violation',
    'no_call_no_show',
    'other'
  )),
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  points_assigned DECIMAL(4,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'excused', 'denied', 'appealed')),
  reported_by TEXT,
  reported_by_id UUID REFERENCES employees(id),
  resolved_by TEXT,
  resolved_by_id UUID REFERENCES employees(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Points Balance (running total of attendance points per employee)
CREATE TABLE attendance_points_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  current_points DECIMAL(6,2) DEFAULT 0,
  points_this_period DECIMAL(6,2) DEFAULT 0,
  points_ytd DECIMAL(6,2) DEFAULT 0,
  last_occurrence_date DATE,
  next_point_expiry_date DATE,
  warning_level TEXT DEFAULT 'none' CHECK (warning_level IN ('none', 'verbal', 'written', 'final', 'termination')),
  last_warning_date DATE,
  last_warning_type TEXT,
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_id)
);

-- Attendance Points History (audit trail of point changes)
CREATE TABLE attendance_points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_record_id UUID REFERENCES attendance_records(id),
  exception_id UUID REFERENCES attendance_exceptions(id),
  action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'expire', 'reset', 'adjust')),
  points_change DECIMAL(4,2) NOT NULL,
  points_before DECIMAL(6,2) NOT NULL,
  points_after DECIMAL(6,2) NOT NULL,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  performed_by TEXT NOT NULL,
  performed_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Attendance Module
CREATE INDEX idx_attendance_records_org ON attendance_records(organization_id);
CREATE INDEX idx_attendance_records_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(organization_id, date);
CREATE INDEX idx_attendance_records_status ON attendance_records(organization_id, status);
CREATE INDEX idx_attendance_records_facility ON attendance_records(organization_id, facility_id);
CREATE INDEX idx_attendance_records_department ON attendance_records(organization_id, department_code);
CREATE INDEX idx_attendance_records_shift ON attendance_records(shift_id);
CREATE INDEX idx_attendance_records_time_entry ON attendance_records(time_entry_id);
CREATE INDEX idx_attendance_records_pay_period ON attendance_records(organization_id, pay_period_start, pay_period_end);
CREATE INDEX idx_attendance_records_employee_date ON attendance_records(organization_id, employee_id, date);
CREATE INDEX idx_attendance_records_late ON attendance_records(organization_id, is_late) WHERE is_late = TRUE;
CREATE INDEX idx_attendance_records_ncns ON attendance_records(organization_id, is_no_call_no_show) WHERE is_no_call_no_show = TRUE;

CREATE INDEX idx_attendance_exceptions_org ON attendance_exceptions(organization_id);
CREATE INDEX idx_attendance_exceptions_record ON attendance_exceptions(attendance_record_id);
CREATE INDEX idx_attendance_exceptions_employee ON attendance_exceptions(employee_id);
CREATE INDEX idx_attendance_exceptions_type ON attendance_exceptions(organization_id, exception_type);
CREATE INDEX idx_attendance_exceptions_status ON attendance_exceptions(organization_id, status);
CREATE INDEX idx_attendance_exceptions_severity ON attendance_exceptions(organization_id, severity);

CREATE INDEX idx_attendance_points_balance_org ON attendance_points_balance(organization_id);
CREATE INDEX idx_attendance_points_balance_employee ON attendance_points_balance(employee_id);
CREATE INDEX idx_attendance_points_balance_warning ON attendance_points_balance(organization_id, warning_level);

CREATE INDEX idx_attendance_points_history_org ON attendance_points_history(organization_id);
CREATE INDEX idx_attendance_points_history_employee ON attendance_points_history(employee_id);
CREATE INDEX idx_attendance_points_history_record ON attendance_points_history(attendance_record_id);
CREATE INDEX idx_attendance_points_history_date ON attendance_points_history(organization_id, effective_date);

-- RLS for Attendance Module
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_points_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_points_history ENABLE ROW LEVEL SECURITY;

-- Triggers for Attendance Module
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_exceptions_updated_at BEFORE UPDATE ON attendance_exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_points_balance_updated_at BEFORE UPDATE ON attendance_points_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- OVERTIME MODULE
-- ===========================================

-- Overtime Requests
CREATE TABLE overtime_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  
  -- Date and Hours
  date DATE NOT NULL,
  scheduled_hours DECIMAL(5,2) DEFAULT 8,
  actual_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) NOT NULL,
  
  -- Overtime Type and Reason
  overtime_type TEXT NOT NULL CHECK (overtime_type IN ('voluntary', 'mandatory', 'emergency')),
  reason TEXT NOT NULL,
  
  -- Status and Approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES employees(id),
  rejected_by_name TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Pay Information
  hourly_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
  overtime_pay DECIMAL(12,2),
  double_time_hours DECIMAL(5,2) DEFAULT 0,
  double_time_rate DECIMAL(10,2),
  double_time_pay DECIMAL(12,2) DEFAULT 0,
  total_pay DECIMAL(12,2),
  
  -- Shift Reference
  shift_id UUID REFERENCES shifts(id),
  time_entry_id UUID REFERENCES time_entries(id),
  
  -- Compliance Tracking
  consecutive_overtime_day INTEGER DEFAULT 1,
  weekly_overtime_total DECIMAL(5,2),
  monthly_overtime_total DECIMAL(5,2),
  is_compliance_exception BOOLEAN DEFAULT FALSE,
  compliance_notes TEXT,
  
  -- Work Order Reference (for maintenance/emergency overtime)
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  
  -- Manager/Supervisor
  manager_id UUID REFERENCES employees(id),
  manager_name TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Overtime Alerts
CREATE TABLE overtime_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'approaching_limit',
    'exceeded_limit',
    'consecutive_days',
    'compliance_risk',
    'budget_impact',
    'fatigue_risk'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT,
  department_code TEXT,
  department_name TEXT,
  facility_id UUID REFERENCES facilities(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric TEXT,
  threshold DECIMAL(10,2),
  current_value DECIMAL(10,2),
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  read_by UUID REFERENCES employees(id),
  read_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES employees(id),
  dismissed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Overtime Policy Configuration
CREATE TABLE overtime_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Limits
  weekly_overtime_limit DECIMAL(5,2) DEFAULT 20,
  monthly_overtime_limit DECIMAL(5,2) DEFAULT 60,
  daily_overtime_limit DECIMAL(5,2) DEFAULT 4,
  max_consecutive_days INTEGER DEFAULT 5,
  
  -- Pay Multipliers
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
  double_time_threshold DECIMAL(5,2) DEFAULT 12,
  double_time_multiplier DECIMAL(3,2) DEFAULT 2.0,
  holiday_multiplier DECIMAL(3,2) DEFAULT 2.0,
  
  -- Approval Settings
  requires_approval BOOLEAN DEFAULT TRUE,
  approval_threshold_hours DECIMAL(5,2) DEFAULT 4,
  auto_approve_under_threshold BOOLEAN DEFAULT FALSE,
  
  -- Notification Thresholds
  notify_manager_at_percent INTEGER DEFAULT 75,
  notify_hr_at_percent INTEGER DEFAULT 85,
  notify_employee_at_percent INTEGER DEFAULT 80,
  
  -- Fatigue Management
  fatigue_warning_hours DECIMAL(5,2) DEFAULT 50,
  mandatory_rest_after_hours DECIMAL(5,2) DEFAULT 55,
  
  -- Budget
  department_budget_tracking BOOLEAN DEFAULT TRUE,
  
  -- Applicable Departments (empty = all)
  applicable_departments TEXT[] DEFAULT '{}',
  
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Overtime Summary (for quick aggregation)
CREATE TABLE employee_overtime_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department_code TEXT,
  department_name TEXT,
  
  -- Current Period Totals
  weekly_overtime_hours DECIMAL(6,2) DEFAULT 0,
  monthly_overtime_hours DECIMAL(6,2) DEFAULT 0,
  year_to_date_overtime_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Limits
  weekly_limit DECIMAL(5,2) DEFAULT 20,
  monthly_limit DECIMAL(5,2) DEFAULT 60,
  
  -- Tracking
  consecutive_overtime_days INTEGER DEFAULT 0,
  last_overtime_date DATE,
  
  -- Pay Totals
  weekly_overtime_pay DECIMAL(12,2) DEFAULT 0,
  monthly_overtime_pay DECIMAL(12,2) DEFAULT 0,
  year_to_date_overtime_pay DECIMAL(14,2) DEFAULT 0,
  
  -- Averages
  average_weekly_overtime DECIMAL(5,2) DEFAULT 0,
  
  -- Compliance
  compliance_status TEXT DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'warning', 'violation')),
  last_violation_date DATE,
  violation_count INTEGER DEFAULT 0,
  
  -- Period Info
  week_start_date DATE,
  month_start_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_id)
);

-- Department Overtime Summary
CREATE TABLE department_overtime_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  
  -- Employee Counts
  total_employees INTEGER DEFAULT 0,
  employees_with_overtime INTEGER DEFAULT 0,
  
  -- Hours
  weekly_overtime_hours DECIMAL(8,2) DEFAULT 0,
  monthly_overtime_hours DECIMAL(10,2) DEFAULT 0,
  year_to_date_overtime_hours DECIMAL(12,2) DEFAULT 0,
  
  -- Budget
  budget_allocated DECIMAL(14,2) DEFAULT 0,
  budget_used DECIMAL(14,2) DEFAULT 0,
  budget_remaining DECIMAL(14,2) DEFAULT 0,
  budget_period TEXT DEFAULT 'monthly' CHECK (budget_period IN ('weekly', 'monthly', 'quarterly', 'annual')),
  
  -- Averages
  average_overtime_per_employee DECIMAL(5,2) DEFAULT 0,
  
  -- Compliance
  compliance_rate DECIMAL(5,2) DEFAULT 100,
  employees_at_risk INTEGER DEFAULT 0,
  employees_in_violation INTEGER DEFAULT 0,
  
  -- Period Info
  week_start_date DATE,
  month_start_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, department_code)
);

-- Indexes for Overtime Module
CREATE INDEX idx_overtime_requests_org ON overtime_requests(organization_id);
CREATE INDEX idx_overtime_requests_employee ON overtime_requests(employee_id);
CREATE INDEX idx_overtime_requests_date ON overtime_requests(organization_id, date);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(organization_id, status);
CREATE INDEX idx_overtime_requests_type ON overtime_requests(organization_id, overtime_type);
CREATE INDEX idx_overtime_requests_department ON overtime_requests(organization_id, department_code);
CREATE INDEX idx_overtime_requests_facility ON overtime_requests(organization_id, facility_id);
CREATE INDEX idx_overtime_requests_manager ON overtime_requests(manager_id);
CREATE INDEX idx_overtime_requests_approved_by ON overtime_requests(approved_by);
CREATE INDEX idx_overtime_requests_employee_date ON overtime_requests(organization_id, employee_id, date);
CREATE INDEX idx_overtime_requests_work_order ON overtime_requests(work_order_id);

CREATE INDEX idx_overtime_alerts_org ON overtime_alerts(organization_id);
CREATE INDEX idx_overtime_alerts_employee ON overtime_alerts(employee_id);
CREATE INDEX idx_overtime_alerts_type ON overtime_alerts(organization_id, alert_type);
CREATE INDEX idx_overtime_alerts_severity ON overtime_alerts(organization_id, severity);
CREATE INDEX idx_overtime_alerts_unread ON overtime_alerts(organization_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_overtime_alerts_department ON overtime_alerts(organization_id, department_code);

CREATE INDEX idx_overtime_policies_org ON overtime_policies(organization_id);
CREATE INDEX idx_overtime_policies_active ON overtime_policies(organization_id, is_active);
CREATE INDEX idx_overtime_policies_default ON overtime_policies(organization_id, is_default);

CREATE INDEX idx_employee_overtime_summary_org ON employee_overtime_summary(organization_id);
CREATE INDEX idx_employee_overtime_summary_employee ON employee_overtime_summary(employee_id);
CREATE INDEX idx_employee_overtime_summary_department ON employee_overtime_summary(organization_id, department_code);
CREATE INDEX idx_employee_overtime_summary_compliance ON employee_overtime_summary(organization_id, compliance_status);

CREATE INDEX idx_department_overtime_summary_org ON department_overtime_summary(organization_id);
CREATE INDEX idx_department_overtime_summary_facility ON department_overtime_summary(organization_id, facility_id);

-- RLS for Overtime Module
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_overtime_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_overtime_summary ENABLE ROW LEVEL SECURITY;

-- Triggers for Overtime Module
CREATE TRIGGER update_overtime_requests_updated_at BEFORE UPDATE ON overtime_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_overtime_policies_updated_at BEFORE UPDATE ON overtime_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_overtime_summary_updated_at BEFORE UPDATE ON employee_overtime_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_department_overtime_summary_updated_at BEFORE UPDATE ON department_overtime_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- HEADCOUNT MODULE
-- ===========================================

-- Headcount Snapshots (Point-in-time facility/department headcount)
CREATE TABLE headcount_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  snapshot_time TIME NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('scheduled', 'manual', 'emergency', 'shift_change')),
  
  -- Facility-level totals
  total_employees INTEGER NOT NULL DEFAULT 0,
  total_onsite INTEGER NOT NULL DEFAULT 0,
  total_clocked_in INTEGER NOT NULL DEFAULT 0,
  total_on_break INTEGER NOT NULL DEFAULT 0,
  total_clocked_out INTEGER NOT NULL DEFAULT 0,
  total_not_arrived INTEGER NOT NULL DEFAULT 0,
  total_absent_known INTEGER NOT NULL DEFAULT 0,
  total_absent_unknown INTEGER NOT NULL DEFAULT 0,
  total_expected_today INTEGER NOT NULL DEFAULT 0,
  
  -- Accountability
  total_accounted INTEGER NOT NULL DEFAULT 0,
  total_unaccounted INTEGER NOT NULL DEFAULT 0,
  accountability_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Compliance
  compliance_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Shift info
  shift_name TEXT,
  shift_start TIME,
  shift_end TIME,
  
  -- Emergency roll reference
  emergency_roll_id UUID,
  
  -- Metadata
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, snapshot_date, snapshot_time)
);

-- Department Headcount Snapshots (Breakdown by department within a snapshot)
CREATE TABLE department_headcount_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES headcount_snapshots(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  manager_id UUID REFERENCES employees(id),
  manager_name TEXT,
  
  -- Department totals
  total_employees INTEGER NOT NULL DEFAULT 0,
  clocked_in INTEGER NOT NULL DEFAULT 0,
  on_break INTEGER NOT NULL DEFAULT 0,
  clocked_out INTEGER NOT NULL DEFAULT 0,
  not_arrived INTEGER NOT NULL DEFAULT 0,
  absent_known INTEGER NOT NULL DEFAULT 0,
  absent_unknown INTEGER NOT NULL DEFAULT 0,
  
  -- Accountability
  accounted_for INTEGER NOT NULL DEFAULT 0,
  unaccounted INTEGER NOT NULL DEFAULT 0,
  
  -- Compliance
  compliance_rate DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Headcount History (Daily aggregated history for trends)
CREATE TABLE headcount_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Daily aggregates
  scheduled_headcount INTEGER NOT NULL DEFAULT 0,
  actual_headcount INTEGER NOT NULL DEFAULT 0,
  peak_headcount INTEGER NOT NULL DEFAULT 0,
  peak_time TIME,
  low_headcount INTEGER NOT NULL DEFAULT 0,
  low_time TIME,
  average_headcount DECIMAL(8,2) DEFAULT 0,
  
  -- Attendance metrics
  total_clock_ins INTEGER NOT NULL DEFAULT 0,
  total_clock_outs INTEGER NOT NULL DEFAULT 0,
  total_late_arrivals INTEGER NOT NULL DEFAULT 0,
  total_early_departures INTEGER NOT NULL DEFAULT 0,
  total_no_shows INTEGER NOT NULL DEFAULT 0,
  total_absences_excused INTEGER NOT NULL DEFAULT 0,
  total_absences_unexcused INTEGER NOT NULL DEFAULT 0,
  
  -- Hours
  total_scheduled_hours DECIMAL(10,2) DEFAULT 0,
  total_actual_hours DECIMAL(10,2) DEFAULT 0,
  total_overtime_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Compliance
  compliance_rate DECIMAL(5,2) DEFAULT 0,
  accountability_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Emergency rolls
  emergency_roll_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, date)
);

-- Department Headcount History (Daily by department)
CREATE TABLE department_headcount_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Daily aggregates
  scheduled_headcount INTEGER NOT NULL DEFAULT 0,
  actual_headcount INTEGER NOT NULL DEFAULT 0,
  peak_headcount INTEGER NOT NULL DEFAULT 0,
  average_headcount DECIMAL(8,2) DEFAULT 0,
  
  -- Attendance
  total_clock_ins INTEGER NOT NULL DEFAULT 0,
  total_late_arrivals INTEGER NOT NULL DEFAULT 0,
  total_no_shows INTEGER NOT NULL DEFAULT 0,
  total_absences INTEGER NOT NULL DEFAULT 0,
  
  -- Hours
  total_scheduled_hours DECIMAL(10,2) DEFAULT 0,
  total_actual_hours DECIMAL(10,2) DEFAULT 0,
  total_overtime_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Compliance
  compliance_rate DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, department_code, date)
);

-- Employee Presence Log (Real-time presence tracking)
CREATE TABLE employee_presence_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  
  -- Presence status
  presence_status TEXT NOT NULL CHECK (presence_status IN ('clocked_in', 'on_break', 'clocked_out', 'not_arrived', 'missing', 'absent')),
  accountability_status TEXT NOT NULL CHECK (accountability_status IN ('accounted', 'unaccounted', 'evacuated', 'missing', 'absent_known')),
  
  -- Times
  status_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_end TIMESTAMPTZ,
  
  -- Location verification
  is_onsite BOOLEAN DEFAULT FALSE,
  last_location_latitude DECIMAL(10,7),
  last_location_longitude DECIMAL(10,7),
  location_verified BOOLEAN DEFAULT FALSE,
  
  -- Shift info
  shift_id UUID REFERENCES shifts(id),
  scheduled_start TIME,
  scheduled_end TIME,
  
  -- Absence tracking
  absence_reason TEXT CHECK (absence_reason IN ('vacation', 'sick', 'fmla', 'personal', 'bereavement', 'jury_duty', 'suspended', 'other')),
  absence_note TEXT,
  
  -- Time entry reference
  time_entry_id UUID REFERENCES time_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Roll Calls (Enhanced from mock data structure)
CREATE TABLE emergency_roll_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL,
  
  -- Emergency info
  emergency_type TEXT NOT NULL CHECK (emergency_type IN ('fire_drill', 'fire', 'tornado', 'active_shooter', 'chemical_spill', 'evacuation', 'shelter_in_place', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Initiator
  initiated_by UUID NOT NULL REFERENCES employees(id),
  initiated_by_name TEXT NOT NULL,
  
  -- Accountability totals
  total_onsite INTEGER NOT NULL DEFAULT 0,
  total_accounted INTEGER NOT NULL DEFAULT 0,
  total_unaccounted INTEGER NOT NULL DEFAULT 0,
  total_evacuated INTEGER NOT NULL DEFAULT 0,
  total_absent_known INTEGER NOT NULL DEFAULT 0,
  
  -- Accountability rate
  accountability_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Completion info
  completed_by UUID REFERENCES employees(id),
  completed_by_name TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Roll Department Status
CREATE TABLE emergency_roll_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  emergency_roll_id UUID NOT NULL REFERENCES emergency_roll_calls(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  manager_id UUID REFERENCES employees(id),
  manager_name TEXT,
  
  -- Accountability
  total_employees INTEGER NOT NULL DEFAULT 0,
  accounted INTEGER NOT NULL DEFAULT 0,
  unaccounted INTEGER NOT NULL DEFAULT 0,
  evacuated INTEGER NOT NULL DEFAULT 0,
  absent_known INTEGER NOT NULL DEFAULT 0,
  
  -- Completion
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Roll Employee Status
CREATE TABLE emergency_roll_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  emergency_roll_id UUID NOT NULL REFERENCES emergency_roll_calls(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'unaccounted' CHECK (status IN ('accounted', 'unaccounted', 'evacuated', 'missing', 'absent_known')),
  absence_reason TEXT CHECK (absence_reason IN ('vacation', 'sick', 'fmla', 'personal', 'bereavement', 'jury_duty', 'suspended', 'other')),
  
  -- Accountability
  marked_safe_at TIMESTAMPTZ,
  marked_safe_by UUID REFERENCES employees(id),
  marked_safe_by_name TEXT,
  
  -- Location at time of emergency
  last_known_location TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(emergency_roll_id, employee_id)
);

-- Indexes for Headcount Module
CREATE INDEX idx_headcount_snapshots_org ON headcount_snapshots(organization_id);
CREATE INDEX idx_headcount_snapshots_facility ON headcount_snapshots(organization_id, facility_id);
CREATE INDEX idx_headcount_snapshots_date ON headcount_snapshots(organization_id, snapshot_date);
CREATE INDEX idx_headcount_snapshots_type ON headcount_snapshots(organization_id, snapshot_type);

CREATE INDEX idx_department_headcount_snapshots_org ON department_headcount_snapshots(organization_id);
CREATE INDEX idx_department_headcount_snapshots_snapshot ON department_headcount_snapshots(snapshot_id);
CREATE INDEX idx_department_headcount_snapshots_dept ON department_headcount_snapshots(organization_id, department_code);

CREATE INDEX idx_headcount_history_org ON headcount_history(organization_id);
CREATE INDEX idx_headcount_history_facility ON headcount_history(organization_id, facility_id);
CREATE INDEX idx_headcount_history_date ON headcount_history(organization_id, date);
CREATE INDEX idx_headcount_history_facility_date ON headcount_history(organization_id, facility_id, date);

CREATE INDEX idx_department_headcount_history_org ON department_headcount_history(organization_id);
CREATE INDEX idx_department_headcount_history_facility ON department_headcount_history(organization_id, facility_id);
CREATE INDEX idx_department_headcount_history_dept ON department_headcount_history(organization_id, department_code);
CREATE INDEX idx_department_headcount_history_date ON department_headcount_history(organization_id, date);

CREATE INDEX idx_employee_presence_log_org ON employee_presence_log(organization_id);
CREATE INDEX idx_employee_presence_log_employee ON employee_presence_log(employee_id);
CREATE INDEX idx_employee_presence_log_facility ON employee_presence_log(organization_id, facility_id);
CREATE INDEX idx_employee_presence_log_dept ON employee_presence_log(organization_id, department_code);
CREATE INDEX idx_employee_presence_log_status ON employee_presence_log(organization_id, presence_status);
CREATE INDEX idx_employee_presence_log_start ON employee_presence_log(organization_id, status_start);

CREATE INDEX idx_emergency_roll_calls_org ON emergency_roll_calls(organization_id);
CREATE INDEX idx_emergency_roll_calls_facility ON emergency_roll_calls(organization_id, facility_id);
CREATE INDEX idx_emergency_roll_calls_status ON emergency_roll_calls(organization_id, status);
CREATE INDEX idx_emergency_roll_calls_type ON emergency_roll_calls(organization_id, emergency_type);
CREATE INDEX idx_emergency_roll_calls_start ON emergency_roll_calls(organization_id, start_time);

CREATE INDEX idx_emergency_roll_departments_org ON emergency_roll_departments(organization_id);
CREATE INDEX idx_emergency_roll_departments_roll ON emergency_roll_departments(emergency_roll_id);
CREATE INDEX idx_emergency_roll_departments_dept ON emergency_roll_departments(organization_id, department_code);

CREATE INDEX idx_emergency_roll_employees_org ON emergency_roll_employees(organization_id);
CREATE INDEX idx_emergency_roll_employees_roll ON emergency_roll_employees(emergency_roll_id);
CREATE INDEX idx_emergency_roll_employees_employee ON emergency_roll_employees(employee_id);
CREATE INDEX idx_emergency_roll_employees_status ON emergency_roll_employees(emergency_roll_id, status);

-- RLS for Headcount Module
ALTER TABLE headcount_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_headcount_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE headcount_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_headcount_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_presence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_roll_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_roll_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_roll_employees ENABLE ROW LEVEL SECURITY;

-- Triggers for Headcount Module
CREATE TRIGGER update_headcount_history_updated_at BEFORE UPDATE ON headcount_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_department_headcount_history_updated_at BEFORE UPDATE ON department_headcount_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_roll_calls_updated_at BEFORE UPDATE ON emergency_roll_calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_roll_departments_updated_at BEFORE UPDATE ON emergency_roll_departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_roll_employees_updated_at BEFORE UPDATE ON emergency_roll_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SERVICE MODULE
-- ===========================================

-- Service Requests (intake before becoming work orders)
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'maintenance', 'installation', 'inspection', 'modification', 'emergency', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted', 'cancelled', 'on_hold')),
  
  -- Requester info
  requester_id UUID NOT NULL REFERENCES employees(id),
  requester_name TEXT NOT NULL,
  requester_department TEXT,
  requester_phone TEXT,
  requester_email TEXT,
  
  -- Location/Equipment
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  location TEXT,
  room_area TEXT,
  
  -- Problem details
  problem_started DATE,
  is_equipment_down BOOLEAN DEFAULT FALSE,
  is_safety_concern BOOLEAN DEFAULT FALSE,
  is_production_impact BOOLEAN DEFAULT FALSE,
  production_impact_description TEXT,
  
  -- Review/Approval
  reviewed_by UUID REFERENCES employees(id),
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES employees(id),
  rejected_by_name TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Conversion to Work Order
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES employees(id),
  converted_by_name TEXT,
  
  -- Scheduling preferences
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  availability_notes TEXT,
  
  -- Cost estimate
  estimated_cost DECIMAL(12,2),
  estimated_hours DECIMAL(5,2),
  requires_parts BOOLEAN DEFAULT FALSE,
  parts_description TEXT,
  
  -- Attachments and notes
  attachments JSONB DEFAULT '[]',
  internal_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, request_number)
);

-- Maintenance Alerts
CREATE TABLE maintenance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'pm_due',
    'pm_overdue',
    'equipment_down',
    'equipment_critical',
    'meter_threshold',
    'warranty_expiring',
    'calibration_due',
    'inspection_due',
    'part_needed',
    'safety_concern',
    'compliance_deadline',
    'work_order_overdue',
    'recurring_failure',
    'high_downtime',
    'budget_threshold',
    'custom'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'snoozed', 'resolved', 'dismissed', 'expired')),
  
  -- Alert details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  
  -- Related entities
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  pm_schedule_id UUID REFERENCES pm_schedules(id),
  
  -- Thresholds/Metrics
  metric_name TEXT,
  metric_value DECIMAL(12,2),
  threshold_value DECIMAL(12,2),
  threshold_type TEXT CHECK (threshold_type IN ('above', 'below', 'equal', 'approaching')),
  
  -- Response tracking
  acknowledged_by UUID REFERENCES employees(id),
  acknowledged_by_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  snoozed_by UUID REFERENCES employees(id),
  resolved_by UUID REFERENCES employees(id),
  resolved_by_name TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  dismissed_by UUID REFERENCES employees(id),
  dismissed_at TIMESTAMPTZ,
  dismiss_reason TEXT,
  
  -- Notification tracking
  notified_users UUID[] DEFAULT '{}',
  notification_sent_at TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES employees(id),
  
  -- Auto-generated vs manual
  is_auto_generated BOOLEAN DEFAULT TRUE,
  generated_by TEXT,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_count INTEGER DEFAULT 0,
  last_occurrence TIMESTAMPTZ,
  
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Activity Log (audit trail for all maintenance activities)
CREATE TABLE maintenance_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'work_order_created',
    'work_order_started',
    'work_order_completed',
    'work_order_cancelled',
    'work_order_assigned',
    'work_order_reassigned',
    'work_order_updated',
    'pm_completed',
    'pm_skipped',
    'pm_rescheduled',
    'equipment_status_change',
    'equipment_down',
    'equipment_restored',
    'part_issued',
    'part_returned',
    'meter_reading',
    'inspection_completed',
    'safety_check',
    'calibration_completed',
    'service_request_submitted',
    'service_request_approved',
    'service_request_rejected',
    'service_request_converted',
    'alert_created',
    'alert_acknowledged',
    'alert_resolved',
    'comment_added',
    'attachment_added',
    'labor_logged',
    'cost_recorded',
    'other'
  )),
  
  -- Related entities
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  pm_schedule_id UUID REFERENCES pm_schedules(id),
  pm_work_order_id UUID REFERENCES pm_work_orders(id),
  service_request_id UUID REFERENCES service_requests(id),
  service_request_number TEXT,
  
  -- Activity details
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  previous_value TEXT,
  new_value TEXT,
  
  -- Who/When
  performed_by UUID NOT NULL REFERENCES employees(id),
  performed_by_name TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Labor tracking (for work activities)
  labor_hours DECIMAL(5,2),
  labor_cost DECIMAL(12,2),
  
  -- Parts/Materials used
  parts_used JSONB DEFAULT '[]',
  parts_cost DECIMAL(12,2),
  
  -- Location info
  location TEXT,
  
  -- Additional metadata
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Downtime Log (detailed downtime tracking)
CREATE TABLE equipment_downtime_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_tag TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  
  -- Downtime period
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Reason categorization
  downtime_type TEXT NOT NULL CHECK (downtime_type IN (
    'breakdown',
    'planned_maintenance',
    'pm_scheduled',
    'emergency_repair',
    'waiting_parts',
    'waiting_approval',
    'operator_error',
    'setup_changeover',
    'calibration',
    'inspection',
    'power_outage',
    'utility_failure',
    'safety_stop',
    'quality_issue',
    'material_shortage',
    'no_operator',
    'external_factor',
    'unknown',
    'other'
  )),
  reason TEXT NOT NULL,
  root_cause TEXT,
  
  -- Impact
  impact_level TEXT NOT NULL CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
  production_impact BOOLEAN DEFAULT FALSE,
  production_loss_units DECIMAL(12,2),
  production_loss_cost DECIMAL(14,2),
  
  -- Work order reference
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  service_request_id UUID REFERENCES service_requests(id),
  
  -- Repair details
  repair_actions TEXT,
  parts_replaced JSONB DEFAULT '[]',
  labor_hours DECIMAL(5,2),
  repair_cost DECIMAL(12,2),
  
  -- Personnel
  reported_by UUID NOT NULL REFERENCES employees(id),
  reported_by_name TEXT NOT NULL,
  repaired_by UUID REFERENCES employees(id),
  repaired_by_name TEXT,
  
  -- Failure analysis
  failure_code TEXT,
  failure_category TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  previous_failure_id UUID REFERENCES equipment_downtime_log(id),
  
  -- Status
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'resolved', 'pending_parts', 'pending_approval')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Metrics (aggregated metrics for reporting)
CREATE TABLE maintenance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  equipment_id UUID REFERENCES equipment(id),
  metric_date DATE NOT NULL,
  metric_period TEXT NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Work Order Metrics
  work_orders_created INTEGER DEFAULT 0,
  work_orders_completed INTEGER DEFAULT 0,
  work_orders_overdue INTEGER DEFAULT 0,
  avg_completion_time_hours DECIMAL(8,2),
  
  -- PM Metrics
  pms_scheduled INTEGER DEFAULT 0,
  pms_completed INTEGER DEFAULT 0,
  pms_overdue INTEGER DEFAULT 0,
  pm_compliance_rate DECIMAL(5,2),
  
  -- Equipment Metrics
  total_downtime_minutes INTEGER DEFAULT 0,
  planned_downtime_minutes INTEGER DEFAULT 0,
  unplanned_downtime_minutes INTEGER DEFAULT 0,
  availability_rate DECIMAL(5,2),
  mtbf_hours DECIMAL(10,2),
  mttr_hours DECIMAL(8,2),
  
  -- Service Request Metrics
  service_requests_submitted INTEGER DEFAULT 0,
  service_requests_approved INTEGER DEFAULT 0,
  service_requests_rejected INTEGER DEFAULT 0,
  avg_request_response_hours DECIMAL(8,2),
  
  -- Cost Metrics
  labor_cost DECIMAL(14,2) DEFAULT 0,
  parts_cost DECIMAL(14,2) DEFAULT 0,
  contractor_cost DECIMAL(14,2) DEFAULT 0,
  total_maintenance_cost DECIMAL(14,2) DEFAULT 0,
  
  -- Labor Metrics
  total_labor_hours DECIMAL(10,2) DEFAULT 0,
  reactive_labor_hours DECIMAL(10,2) DEFAULT 0,
  preventive_labor_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Alert Metrics
  alerts_generated INTEGER DEFAULT 0,
  alerts_acknowledged INTEGER DEFAULT 0,
  alerts_resolved INTEGER DEFAULT 0,
  avg_alert_response_minutes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, equipment_id, metric_date, metric_period)
);

-- Indexes for Service Module
CREATE INDEX idx_service_requests_org ON service_requests(organization_id);
CREATE INDEX idx_service_requests_status ON service_requests(organization_id, status);
CREATE INDEX idx_service_requests_type ON service_requests(organization_id, request_type);
CREATE INDEX idx_service_requests_priority ON service_requests(organization_id, priority);
CREATE INDEX idx_service_requests_requester ON service_requests(requester_id);
CREATE INDEX idx_service_requests_facility ON service_requests(organization_id, facility_id);
CREATE INDEX idx_service_requests_equipment ON service_requests(equipment_id);
CREATE INDEX idx_service_requests_work_order ON service_requests(work_order_id);
CREATE INDEX idx_service_requests_created ON service_requests(organization_id, created_at);

CREATE INDEX idx_maintenance_alerts_org ON maintenance_alerts(organization_id);
CREATE INDEX idx_maintenance_alerts_type ON maintenance_alerts(organization_id, alert_type);
CREATE INDEX idx_maintenance_alerts_severity ON maintenance_alerts(organization_id, severity);
CREATE INDEX idx_maintenance_alerts_status ON maintenance_alerts(organization_id, status);
CREATE INDEX idx_maintenance_alerts_facility ON maintenance_alerts(organization_id, facility_id);
CREATE INDEX idx_maintenance_alerts_equipment ON maintenance_alerts(equipment_id);
CREATE INDEX idx_maintenance_alerts_work_order ON maintenance_alerts(work_order_id);
CREATE INDEX idx_maintenance_alerts_active ON maintenance_alerts(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_maintenance_alerts_created ON maintenance_alerts(organization_id, created_at);

CREATE INDEX idx_maintenance_activity_log_org ON maintenance_activity_log(organization_id);
CREATE INDEX idx_maintenance_activity_log_type ON maintenance_activity_log(organization_id, activity_type);
CREATE INDEX idx_maintenance_activity_log_facility ON maintenance_activity_log(organization_id, facility_id);
CREATE INDEX idx_maintenance_activity_log_equipment ON maintenance_activity_log(equipment_id);
CREATE INDEX idx_maintenance_activity_log_work_order ON maintenance_activity_log(work_order_id);
CREATE INDEX idx_maintenance_activity_log_performed_by ON maintenance_activity_log(performed_by);
CREATE INDEX idx_maintenance_activity_log_performed_at ON maintenance_activity_log(organization_id, performed_at);
CREATE INDEX idx_maintenance_activity_log_service_request ON maintenance_activity_log(service_request_id);

CREATE INDEX idx_equipment_downtime_log_org ON equipment_downtime_log(organization_id);
CREATE INDEX idx_equipment_downtime_log_equipment ON equipment_downtime_log(equipment_id);
CREATE INDEX idx_equipment_downtime_log_facility ON equipment_downtime_log(organization_id, facility_id);
CREATE INDEX idx_equipment_downtime_log_type ON equipment_downtime_log(organization_id, downtime_type);
CREATE INDEX idx_equipment_downtime_log_status ON equipment_downtime_log(organization_id, status);
CREATE INDEX idx_equipment_downtime_log_start ON equipment_downtime_log(organization_id, start_time);
CREATE INDEX idx_equipment_downtime_log_work_order ON equipment_downtime_log(work_order_id);
CREATE INDEX idx_equipment_downtime_log_ongoing ON equipment_downtime_log(organization_id, status) WHERE status = 'ongoing';

CREATE INDEX idx_maintenance_metrics_org ON maintenance_metrics(organization_id);
CREATE INDEX idx_maintenance_metrics_facility ON maintenance_metrics(organization_id, facility_id);
CREATE INDEX idx_maintenance_metrics_equipment ON maintenance_metrics(equipment_id);
CREATE INDEX idx_maintenance_metrics_date ON maintenance_metrics(organization_id, metric_date);
CREATE INDEX idx_maintenance_metrics_period ON maintenance_metrics(organization_id, metric_period);

-- RLS for Service Module
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_downtime_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_metrics ENABLE ROW LEVEL SECURITY;

-- Triggers for Service Module
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_alerts_updated_at BEFORE UPDATE ON maintenance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_downtime_log_updated_at BEFORE UPDATE ON equipment_downtime_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_metrics_updated_at BEFORE UPDATE ON maintenance_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PLANNER MODULE
-- ===========================================

-- Planner Projects (for grouping tasks)
CREATE TABLE planner_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  
  -- Ownership
  owner_id UUID REFERENCES employees(id),
  owner_name TEXT,
  facility_id UUID REFERENCES facilities(id),
  department_code TEXT,
  department_name TEXT,
  
  -- Dates
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  
  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  
  -- Budget (optional)
  budget_allocated DECIMAL(14,2),
  budget_used DECIMAL(14,2) DEFAULT 0,
  
  -- Tags and metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  notes TEXT,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planner Tasks (Extended task scheduling)
CREATE TABLE planner_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status and Priority
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Category and Type
  category TEXT,
  task_type TEXT DEFAULT 'task' CHECK (task_type IN ('task', 'milestone', 'meeting', 'reminder', 'event', 'deadline')),
  
  -- Project relation
  project_id UUID REFERENCES planner_projects(id) ON DELETE SET NULL,
  project_name TEXT,
  parent_task_id UUID REFERENCES planner_tasks(id) ON DELETE SET NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES employees(id),
  assigned_to_name TEXT,
  assigned_by UUID REFERENCES employees(id),
  assigned_by_name TEXT,
  assigned_at TIMESTAMPTZ,
  team_members UUID[] DEFAULT '{}',
  
  -- Location/Context
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department_code TEXT,
  department_name TEXT,
  location TEXT,
  
  -- Scheduling - Dates
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  
  -- Scheduling - Times (for time-specific tasks)
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'America/Chicago',
  
  -- Duration and Effort
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2) DEFAULT 0,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  
  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_days_of_week INTEGER[] DEFAULT '{}',
  recurrence_day_of_month INTEGER,
  recurrence_end_date DATE,
  recurrence_count INTEGER,
  recurring_parent_id UUID REFERENCES planner_tasks(id) ON DELETE SET NULL,
  recurrence_instance_date DATE,
  
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_minutes_before INTEGER[] DEFAULT '{}',
  reminder_sent BOOLEAN DEFAULT FALSE,
  last_reminder_sent_at TIMESTAMPTZ,
  
  -- Dependencies
  depends_on UUID[] DEFAULT '{}',
  blocks UUID[] DEFAULT '{}',
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  
  -- Work Order / Equipment relation (for maintenance-related tasks)
  work_order_id UUID REFERENCES work_orders(id),
  work_order_number TEXT,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  pm_schedule_id UUID REFERENCES pm_schedules(id),
  service_request_id UUID REFERENCES service_requests(id),
  
  -- Checklist items (subtasks)
  checklist JSONB DEFAULT '[]',
  checklist_completed INTEGER DEFAULT 0,
  checklist_total INTEGER DEFAULT 0,
  
  -- Attachments and Notes
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  internal_notes TEXT,
  
  -- Tags and metadata
  tags TEXT[] DEFAULT '{}',
  labels TEXT[] DEFAULT '{}',
  color TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Completion
  completed_by UUID REFERENCES employees(id),
  completed_by_name TEXT,
  completion_notes TEXT,
  
  -- Audit
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  last_modified_by TEXT,
  last_modified_by_id UUID REFERENCES employees(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Dependencies (explicit dependency tracking)
CREATE TABLE planner_task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN (
    'finish_to_start',   -- Predecessor must finish before successor can start
    'start_to_start',    -- Predecessor must start before successor can start
    'finish_to_finish',  -- Predecessor must finish before successor can finish
    'start_to_finish'    -- Predecessor must start before successor can finish
  )),
  lag_days INTEGER DEFAULT 0,
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Task Comments/Activity
CREATE TABLE planner_task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'status_change', 'assignment', 'update', 'system')),
  is_internal BOOLEAN DEFAULT FALSE,
  mentioned_users UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Time Entries (for time tracking)
CREATE TABLE planner_task_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES planner_tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  
  -- Time tracking
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_running BOOLEAN DEFAULT FALSE,
  
  -- Billing (optional)
  is_billable BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Templates (for creating recurring/common task patterns)
CREATE TABLE planner_task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  task_type TEXT DEFAULT 'task',
  priority TEXT DEFAULT 'medium',
  
  -- Default values
  default_duration_days INTEGER,
  default_estimated_hours DECIMAL(6,2),
  default_assigned_to UUID REFERENCES employees(id),
  default_checklist JSONB DEFAULT '[]',
  
  -- Template content
  title_template TEXT NOT NULL,
  description_template TEXT,
  
  -- Recurrence defaults
  default_recurrence_pattern TEXT,
  default_recurrence_interval INTEGER DEFAULT 1,
  
  -- Tags
  tags TEXT[] DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planner Views (saved calendar/kanban/list views)
CREATE TABLE planner_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('calendar', 'kanban', 'list', 'timeline', 'gantt')),
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  
  -- Filters
  filters JSONB DEFAULT '{}',
  sort_by TEXT,
  sort_direction TEXT DEFAULT 'asc',
  group_by TEXT,
  
  -- Display settings
  columns JSONB DEFAULT '[]',
  display_options JSONB DEFAULT '{}',
  
  owner_id UUID REFERENCES employees(id),
  owner_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Planner Module
CREATE INDEX idx_planner_projects_org ON planner_projects(organization_id);
CREATE INDEX idx_planner_projects_status ON planner_projects(organization_id, status);
CREATE INDEX idx_planner_projects_owner ON planner_projects(owner_id);
CREATE INDEX idx_planner_projects_facility ON planner_projects(organization_id, facility_id);
CREATE INDEX idx_planner_projects_department ON planner_projects(organization_id, department_code);

CREATE INDEX idx_planner_tasks_org ON planner_tasks(organization_id);
CREATE INDEX idx_planner_tasks_status ON planner_tasks(organization_id, status);
CREATE INDEX idx_planner_tasks_priority ON planner_tasks(organization_id, priority);
CREATE INDEX idx_planner_tasks_category ON planner_tasks(organization_id, category);
CREATE INDEX idx_planner_tasks_project ON planner_tasks(project_id);
CREATE INDEX idx_planner_tasks_parent ON planner_tasks(parent_task_id);
CREATE INDEX idx_planner_tasks_assigned ON planner_tasks(assigned_to);
CREATE INDEX idx_planner_tasks_facility ON planner_tasks(organization_id, facility_id);
CREATE INDEX idx_planner_tasks_department ON planner_tasks(organization_id, department_code);
CREATE INDEX idx_planner_tasks_due_date ON planner_tasks(organization_id, due_date);
CREATE INDEX idx_planner_tasks_start_date ON planner_tasks(organization_id, start_date);
CREATE INDEX idx_planner_tasks_recurring ON planner_tasks(organization_id, is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_planner_tasks_recurring_parent ON planner_tasks(recurring_parent_id);
CREATE INDEX idx_planner_tasks_work_order ON planner_tasks(work_order_id);
CREATE INDEX idx_planner_tasks_equipment ON planner_tasks(equipment_id);
CREATE INDEX idx_planner_tasks_pm ON planner_tasks(pm_schedule_id);
CREATE INDEX idx_planner_tasks_service_request ON planner_tasks(service_request_id);
CREATE INDEX idx_planner_tasks_pending ON planner_tasks(organization_id, status) WHERE status IN ('pending', 'scheduled', 'in_progress');
CREATE INDEX idx_planner_tasks_blocked ON planner_tasks(organization_id, is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX idx_planner_tasks_created ON planner_tasks(organization_id, created_at);

CREATE INDEX idx_planner_task_dependencies_org ON planner_task_dependencies(organization_id);
CREATE INDEX idx_planner_task_dependencies_task ON planner_task_dependencies(task_id);
CREATE INDEX idx_planner_task_dependencies_depends_on ON planner_task_dependencies(depends_on_task_id);

CREATE INDEX idx_planner_task_comments_org ON planner_task_comments(organization_id);
CREATE INDEX idx_planner_task_comments_task ON planner_task_comments(task_id);
CREATE INDEX idx_planner_task_comments_created_by ON planner_task_comments(created_by_id);

CREATE INDEX idx_planner_task_time_entries_org ON planner_task_time_entries(organization_id);
CREATE INDEX idx_planner_task_time_entries_task ON planner_task_time_entries(task_id);
CREATE INDEX idx_planner_task_time_entries_employee ON planner_task_time_entries(employee_id);
CREATE INDEX idx_planner_task_time_entries_running ON planner_task_time_entries(organization_id, is_running) WHERE is_running = TRUE;

CREATE INDEX idx_planner_task_templates_org ON planner_task_templates(organization_id);
CREATE INDEX idx_planner_task_templates_category ON planner_task_templates(organization_id, category);
CREATE INDEX idx_planner_task_templates_active ON planner_task_templates(organization_id, is_active);

CREATE INDEX idx_planner_views_org ON planner_views(organization_id);
CREATE INDEX idx_planner_views_owner ON planner_views(owner_id);
CREATE INDEX idx_planner_views_type ON planner_views(organization_id, view_type);
CREATE INDEX idx_planner_views_shared ON planner_views(organization_id, is_shared) WHERE is_shared = TRUE;

-- RLS for Planner Module
ALTER TABLE planner_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_views ENABLE ROW LEVEL SECURITY;

-- Triggers for Planner Module
CREATE TRIGGER update_planner_projects_updated_at BEFORE UPDATE ON planner_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planner_tasks_updated_at BEFORE UPDATE ON planner_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planner_task_time_entries_updated_at BEFORE UPDATE ON planner_task_time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planner_task_templates_updated_at BEFORE UPDATE ON planner_task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planner_views_updated_at BEFORE UPDATE ON planner_views FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- PORTAL MODULE
-- ===========================================

-- Portal Announcements (Enhanced bulletin posts for portal)
CREATE TABLE portal_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  announcement_type TEXT DEFAULT 'general' CHECK (announcement_type IN ('general', 'policy', 'event', 'safety', 'hr', 'maintenance', 'it', 'celebration', 'urgent', 'other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'important', 'urgent', 'critical')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'expired')),
  
  -- Visibility/Targeting
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'departments', 'roles', 'facilities', 'custom')),
  target_departments TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  target_facilities UUID[] DEFAULT '{}',
  target_employee_ids UUID[] DEFAULT '{}',
  
  -- Scheduling
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Display options
  pinned BOOLEAN DEFAULT FALSE,
  show_on_dashboard BOOLEAN DEFAULT TRUE,
  show_on_portal BOOLEAN DEFAULT TRUE,
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  
  -- Media/Attachments
  cover_image_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Author info
  created_by UUID REFERENCES employees(id),
  created_by_name TEXT NOT NULL,
  published_by UUID REFERENCES employees(id),
  published_by_name TEXT,
  published_at TIMESTAMPTZ,
  
  -- Engagement tracking
  view_count INTEGER DEFAULT 0,
  acknowledgment_count INTEGER DEFAULT 0,
  
  -- Tags/Categories
  tags TEXT[] DEFAULT '{}',
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement Acknowledgments
CREATE TABLE portal_announcement_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES portal_announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, employee_id)
);

-- Announcement Views (for tracking who viewed)
CREATE TABLE portal_announcement_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES portal_announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, employee_id)
);

-- Employee Directory View (optimized view for directory queries)
CREATE OR REPLACE VIEW employee_directory AS
SELECT
  e.id,
  e.organization_id,
  e.facility_id,
  f.name AS facility_name,
  e.employee_code,
  e.first_name,
  e.last_name,
  CONCAT(e.first_name, ' ', e.last_name) AS full_name,
  e.email,
  e.role,
  e."position",
  e.department_code,
  e.status,
  e.hire_date,
  e.manager_id,
  CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
  COALESCE(e.profile->>'phone', '') AS phone,
  COALESCE(e.profile->>'extension', '') AS extension,
  COALESCE(e.profile->>'location', '') AS office_location,
  COALESCE(e.profile->>'avatar_url', '') AS avatar_url,
  COALESCE(e.profile->>'title', e."position") AS job_title,
  COALESCE(e.profile->>'bio', '') AS bio,
  COALESCE(e.profile->>'skills', '[]')::JSONB AS skills,
  e.created_at
FROM employees e
LEFT JOIN facilities f ON e.facility_id = f.id
LEFT JOIN employees m ON e.manager_id = m.id
WHERE e.status = 'active';

-- Employee Directory Search Function
CREATE OR REPLACE FUNCTION search_employee_directory(
  p_organization_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_department_code TEXT DEFAULT NULL,
  p_facility_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  facility_id UUID,
  facility_name TEXT,
  employee_code TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  role TEXT,
  "position" TEXT,
  department_code TEXT,
  status TEXT,
  hire_date DATE,
  manager_id UUID,
  manager_name TEXT,
  phone TEXT,
  extension TEXT,
  office_location TEXT,
  avatar_url TEXT,
  job_title TEXT,
  bio TEXT,
  skills JSONB,
  created_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT ed.*
  FROM employee_directory ed
  WHERE ed.organization_id = p_organization_id
    AND (p_search_term IS NULL OR (
      ed.full_name ILIKE '%' || p_search_term || '%'
      OR ed.email ILIKE '%' || p_search_term || '%'
      OR ed.employee_code ILIKE '%' || p_search_term || '%'
      OR ed."position" ILIKE '%' || p_search_term || '%'
      OR ed.department_code ILIKE '%' || p_search_term || '%'
    ))
    AND (p_department_code IS NULL OR ed.department_code = p_department_code)
    AND (p_facility_id IS NULL OR ed.facility_id = p_facility_id)
    AND (p_role IS NULL OR ed.role = p_role)
  ORDER BY ed.last_name, ed.first_name;
END;
$ LANGUAGE plpgsql;

-- Indexes for Portal Module
CREATE INDEX idx_portal_announcements_org ON portal_announcements(organization_id);
CREATE INDEX idx_portal_announcements_status ON portal_announcements(organization_id, status);
CREATE INDEX idx_portal_announcements_type ON portal_announcements(organization_id, announcement_type);
CREATE INDEX idx_portal_announcements_priority ON portal_announcements(organization_id, priority);
CREATE INDEX idx_portal_announcements_pinned ON portal_announcements(organization_id, pinned) WHERE pinned = TRUE;
CREATE INDEX idx_portal_announcements_published ON portal_announcements(organization_id, status, publish_at) WHERE status = 'published';
CREATE INDEX idx_portal_announcements_expires ON portal_announcements(organization_id, expires_at);
CREATE INDEX idx_portal_announcements_dashboard ON portal_announcements(organization_id, show_on_dashboard) WHERE show_on_dashboard = TRUE;
CREATE INDEX idx_portal_announcements_created ON portal_announcements(organization_id, created_at);

CREATE INDEX idx_portal_announcement_acks_org ON portal_announcement_acknowledgments(organization_id);
CREATE INDEX idx_portal_announcement_acks_announcement ON portal_announcement_acknowledgments(announcement_id);
CREATE INDEX idx_portal_announcement_acks_employee ON portal_announcement_acknowledgments(employee_id);

CREATE INDEX idx_portal_announcement_views_org ON portal_announcement_views(organization_id);
CREATE INDEX idx_portal_announcement_views_announcement ON portal_announcement_views(announcement_id);
CREATE INDEX idx_portal_announcement_views_employee ON portal_announcement_views(employee_id);

-- RLS for Portal Module
ALTER TABLE portal_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_announcement_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_announcement_views ENABLE ROW LEVEL SECURITY;

-- Triggers for Portal Module
CREATE TRIGGER update_portal_announcements_updated_at BEFORE UPDATE ON portal_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Roles and Permissions
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6B7280',
  is_system BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Employee Role Assignments
CREATE TABLE employee_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, employee_id)
);

-- Indexes for Roles
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_roles_system ON roles(organization_id, is_system);
CREATE INDEX idx_employee_roles_org ON employee_roles(organization_id);
CREATE INDEX idx_employee_roles_employee ON employee_roles(employee_id);
CREATE INDEX idx_employee_roles_role ON employee_roles(role_id);

-- RLS for Roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;

-- Triggers for Roles
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'approval_request', 'approval_approved', 'approval_rejected',
    'po_status_change', 'ses_submitted', 'receiving_complete',
    'low_stock_alert', 'work_order_assigned',
    'delegation_assigned', 'delegation_revoked', 'delegation_expiring', 'delegation_activated',
    'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Notifications
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_employee ON notifications(employee_id);
CREATE INDEX idx_notifications_status ON notifications(organization_id, employee_id, status);
CREATE INDEX idx_notifications_type ON notifications(organization_id, type);
CREATE INDEX idx_notifications_created ON notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(organization_id, employee_id, status) WHERE status = 'unread';

-- RLS for Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Triggers for Notifications
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_roles_updated_at BEFORE UPDATE ON employee_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- DEPARTMENTS (G/L Account Departments)
-- ===========================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Numbering System
  -- Department code format: [FacilityNumber][BaseCode]
  -- Facility 1: 1000-1010, Facility 2: 2000-2010, etc.
  department_code TEXT NOT NULL,
  base_department_code INTEGER NOT NULL CHECK (base_department_code BETWEEN 0 AND 999),
  facility_number INTEGER,
  
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  
  -- G/L Account Information
  -- GL codes can be facility-specific or shared
  gl_account TEXT,
  gl_code_prefix TEXT,
  cost_center TEXT,
  profit_center TEXT,
  budget_code TEXT,
  
  -- Inventory Department Code (1-9 for materials first digit)
  inventory_department_code INTEGER CHECK (inventory_department_code BETWEEN 0 AND 9),
  
  -- Hierarchy
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  
  -- Management
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  manager_name TEXT,
  supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  supervisor_name TEXT,
  
  -- Contact Information
  phone TEXT,
  email TEXT,
  
  -- Operational
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  is_production BOOLEAN DEFAULT FALSE,
  is_support BOOLEAN DEFAULT FALSE,
  shift_required BOOLEAN DEFAULT FALSE,
  
  -- Budget/Financial
  annual_budget DECIMAL(14,2),
  ytd_spend DECIMAL(14,2) DEFAULT 0,
  labor_budget DECIMAL(14,2),
  materials_budget DECIMAL(14,2),
  
  -- Headcount
  budgeted_headcount INTEGER,
  actual_headcount INTEGER DEFAULT 0,
  
  -- Metadata
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, department_code),
  UNIQUE(organization_id, facility_id, base_department_code)
);

-- ===========================================
-- LOCATIONS (Physical Locations within Facility)
-- ===========================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  location_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Location Type
  location_type TEXT NOT NULL CHECK (location_type IN (
    'building',
    'floor',
    'wing',
    'room',
    'area',
    'zone',
    'line',
    'cell',
    'workstation',
    'storage',
    'dock',
    'yard',
    'other'
  )),
  
  -- Hierarchy
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  path TEXT,
  
  -- Physical Details
  building TEXT,
  floor_number TEXT,
  room_number TEXT,
  area_name TEXT,
  square_footage DECIMAL(10,2),
  
  -- Coordinates/Address
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  address TEXT,
  
  -- Operational
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_construction', 'maintenance', 'restricted', 'archived')),
  is_storage BOOLEAN DEFAULT FALSE,
  is_production BOOLEAN DEFAULT FALSE,
  is_hazardous BOOLEAN DEFAULT FALSE,
  is_climate_controlled BOOLEAN DEFAULT FALSE,
  is_restricted BOOLEAN DEFAULT FALSE,
  
  -- Capacity
  max_occupancy INTEGER,
  current_occupancy INTEGER DEFAULT 0,
  
  -- Temperature/Environment
  temperature_monitored BOOLEAN DEFAULT FALSE,
  min_temperature DECIMAL(6,2),
  max_temperature DECIMAL(6,2),
  humidity_controlled BOOLEAN DEFAULT FALSE,
  
  -- Safety
  fire_zone TEXT,
  emergency_assembly_point TEXT,
  safety_requirements TEXT[] DEFAULT '{}',
  ppe_required TEXT[] DEFAULT '{}',
  
  -- Inventory
  inventory_zone TEXT,
  bin_location TEXT,
  default_gl_account TEXT,
  default_cost_center TEXT,
  
  -- Equipment count (denormalized for performance)
  equipment_count INTEGER DEFAULT 0,
  
  -- Metadata
  barcode TEXT,
  qr_code TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, location_code)
);

-- Indexes for Departments
CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_facility ON departments(organization_id, facility_id);
CREATE INDEX idx_departments_code ON departments(organization_id, department_code);
CREATE INDEX idx_departments_status ON departments(organization_id, status);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);
CREATE INDEX idx_departments_gl_account ON departments(organization_id, gl_account);
CREATE INDEX idx_departments_cost_center ON departments(organization_id, cost_center);

-- Indexes for Locations
CREATE INDEX idx_locations_org ON locations(organization_id);
CREATE INDEX idx_locations_facility ON locations(organization_id, facility_id);
CREATE INDEX idx_locations_department ON locations(department_id);
CREATE INDEX idx_locations_code ON locations(organization_id, facility_id, location_code);
CREATE INDEX idx_locations_type ON locations(organization_id, location_type);
CREATE INDEX idx_locations_status ON locations(organization_id, status);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);
CREATE INDEX idx_locations_barcode ON locations(organization_id, barcode);
CREATE INDEX idx_locations_storage ON locations(organization_id, is_storage) WHERE is_storage = TRUE;
CREATE INDEX idx_locations_production ON locations(organization_id, is_production) WHERE is_production = TRUE;
CREATE INDEX idx_locations_hazardous ON locations(organization_id, is_hazardous) WHERE is_hazardous = TRUE;

-- RLS for Departments and Locations
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Triggers for Departments and Locations
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
