-- ===========================================
-- INVENTORY REPLENISHMENT & ADJUSTMENTS MODULE
-- ===========================================

-- Reorder Point Settings (Material-level replenishment config)
CREATE TABLE IF NOT EXISTS reorder_point_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  
  -- Reorder Point
  reorder_point DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Safety Stock
  safety_stock DECIMAL(12,2) DEFAULT 0,
  safety_stock_days INTEGER DEFAULT 0,
  
  -- Lead Times
  lead_time_days INTEGER DEFAULT 0,
  vendor_lead_time_days INTEGER,
  
  -- EOQ Settings
  eoq_enabled BOOLEAN DEFAULT FALSE,
  annual_demand DECIMAL(14,2),
  ordering_cost DECIMAL(10,2),
  holding_cost_percent DECIMAL(5,2),
  calculated_eoq DECIMAL(12,2),
  
  -- Min/Max
  min_level DECIMAL(12,2) DEFAULT 0,
  max_level DECIMAL(12,2) DEFAULT 0,
  
  -- Auto Replenishment
  auto_replenish_enabled BOOLEAN DEFAULT FALSE,
  auto_replenish_trigger TEXT DEFAULT 'reorder_point' CHECK (auto_replenish_trigger IN ('reorder_point', 'safety_stock', 'min_level', 'schedule')),
  auto_replenish_vendor_id UUID REFERENCES procurement_vendors(id),
  auto_replenish_vendor_name TEXT,
  
  -- Calculation Method
  calculation_method TEXT DEFAULT 'manual' CHECK (calculation_method IN ('manual', 'historical', 'forecast', 'eoq')),
  review_period_days INTEGER DEFAULT 30,
  service_level_percent DECIMAL(5,2) DEFAULT 95,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'review_needed')),
  last_calculated_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  
  notes TEXT,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, material_id, facility_id)
);

-- Replenishment Suggestions (Generated suggestions for reordering)
CREATE TABLE IF NOT EXISTS replenishment_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  suggestion_number TEXT NOT NULL,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Current State
  current_on_hand DECIMAL(12,2) NOT NULL,
  current_on_order DECIMAL(12,2) DEFAULT 0,
  current_allocated DECIMAL(12,2) DEFAULT 0,
  available_quantity DECIMAL(12,2) NOT NULL,
  
  -- Thresholds
  reorder_point DECIMAL(12,2) NOT NULL,
  safety_stock DECIMAL(12,2) DEFAULT 0,
  min_level DECIMAL(12,2) DEFAULT 0,
  max_level DECIMAL(12,2) DEFAULT 0,
  
  -- Suggestion
  suggested_quantity DECIMAL(12,2) NOT NULL,
  suggested_order_date DATE NOT NULL,
  expected_delivery_date DATE,
  trigger_reason TEXT NOT NULL CHECK (trigger_reason IN ('below_reorder_point', 'below_safety_stock', 'below_min', 'stockout', 'forecast', 'schedule', 'manual')),
  
  -- Vendor
  suggested_vendor_id UUID REFERENCES procurement_vendors(id),
  suggested_vendor_name TEXT,
  estimated_unit_cost DECIMAL(10,2),
  estimated_total_cost DECIMAL(12,2),
  
  -- Priority & Status
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted', 'expired', 'cancelled')),
  
  -- Actions
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_by_id UUID REFERENCES employees(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Conversion
  converted_to_po BOOLEAN DEFAULT FALSE,
  po_id UUID,
  po_number TEXT,
  converted_at TIMESTAMPTZ,
  converted_by TEXT,
  converted_by_id UUID REFERENCES employees(id),
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, suggestion_number)
);

-- Weekly Replenishment Plans
CREATE TABLE IF NOT EXISTS weekly_replenishment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_number TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Period
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
  
  -- Totals
  total_items INTEGER DEFAULT 0,
  total_quantity DECIMAL(14,2) DEFAULT 0,
  total_estimated_cost DECIMAL(14,2) DEFAULT 0,
  
  -- Items
  line_items JSONB DEFAULT '[]',
  
  -- Approval
  submitted_by TEXT,
  submitted_by_id UUID REFERENCES employees(id),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  notes TEXT,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, plan_number)
);

-- Adjustment Reasons (Configurable reason codes)
CREATE TABLE IF NOT EXISTS adjustment_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('increase', 'decrease', 'transfer', 'correction', 'damage', 'expiration', 'theft', 'other')),
  
  -- Configuration
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_threshold DECIMAL(12,2),
  requires_notes BOOLEAN DEFAULT FALSE,
  requires_photo BOOLEAN DEFAULT FALSE,
  
  -- GL Integration
  default_gl_account TEXT,
  affects_cost BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Inventory Adjustments
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  adjustment_number TEXT NOT NULL,
  
  -- Material
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  location TEXT,
  
  -- Adjustment Details
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'correction', 'write_off', 'transfer_in', 'transfer_out')),
  reason_id UUID REFERENCES adjustment_reasons(id),
  reason_code TEXT NOT NULL,
  reason_name TEXT NOT NULL,
  
  -- Quantities
  quantity_before DECIMAL(12,2) NOT NULL,
  quantity_change DECIMAL(12,2) NOT NULL,
  quantity_after DECIMAL(12,2) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  
  -- Cost
  unit_cost DECIMAL(10,2),
  total_cost_impact DECIMAL(12,2),
  
  -- GL
  gl_account TEXT,
  cost_center TEXT,
  
  -- Status & Approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_approval', 'approved', 'rejected', 'posted', 'reversed')),
  requires_approval BOOLEAN DEFAULT FALSE,
  
  -- Performed by
  performed_by TEXT NOT NULL,
  performed_by_id UUID REFERENCES employees(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Approval
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_by_id UUID REFERENCES employees(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Posting
  posted_at TIMESTAMPTZ,
  posted_by TEXT,
  posted_by_id UUID REFERENCES employees(id),
  journal_entry_id TEXT,
  
  -- Reversal
  reversed_at TIMESTAMPTZ,
  reversed_by TEXT,
  reversed_by_id UUID REFERENCES employees(id),
  reversal_reason TEXT,
  reversal_adjustment_id UUID REFERENCES inventory_adjustments(id),
  
  -- References
  count_session_id UUID REFERENCES count_sessions(id),
  work_order_id UUID REFERENCES work_orders(id),
  
  -- Attachments
  photo_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, adjustment_number)
);

-- Variance Records (From cycle counts and physical inventory)
CREATE TABLE IF NOT EXISTS variance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variance_number TEXT NOT NULL,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('cycle_count', 'physical_inventory', 'spot_check', 'audit')),
  count_session_id UUID REFERENCES count_sessions(id),
  
  -- Material
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  location TEXT,
  
  -- Quantities
  system_quantity DECIMAL(12,2) NOT NULL,
  counted_quantity DECIMAL(12,2) NOT NULL,
  variance_quantity DECIMAL(12,2) NOT NULL,
  variance_percent DECIMAL(8,2),
  unit_of_measure TEXT NOT NULL,
  
  -- Cost Impact
  unit_cost DECIMAL(10,2),
  variance_cost DECIMAL(12,2),
  
  -- Classification
  variance_type TEXT NOT NULL CHECK (variance_type IN ('overage', 'shortage', 'none')),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('none', 'low', 'medium', 'high', 'critical')),
  
  -- Status
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'under_investigation', 'approved', 'rejected', 'adjusted', 'written_off')),
  
  -- Counted by
  counted_by TEXT NOT NULL,
  counted_by_id UUID REFERENCES employees(id),
  counted_at TIMESTAMPTZ NOT NULL,
  
  -- Review
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Root Cause
  root_cause TEXT,
  root_cause_category TEXT CHECK (root_cause_category IN ('counting_error', 'system_error', 'theft', 'damage', 'expiration', 'receiving_error', 'issuing_error', 'unknown', 'other')),
  
  -- Resolution
  resolution TEXT CHECK (resolution IN ('adjust_system', 'recount', 'write_off', 'investigate', 'no_action')),
  adjustment_id UUID REFERENCES inventory_adjustments(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, variance_number)
);

-- Inventory Reserves (Hold/Reserve quantities)
CREATE TABLE IF NOT EXISTS inventory_reserves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reserve_number TEXT NOT NULL,
  
  -- Material
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  location TEXT,
  
  -- Reserve Details
  reserve_type TEXT NOT NULL CHECK (reserve_type IN ('quality_hold', 'customer_allocation', 'project_allocation', 'safety_reserve', 'obsolescence', 'other')),
  quantity DECIMAL(12,2) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  
  -- Cost
  unit_cost DECIMAL(10,2),
  total_value DECIMAL(12,2),
  
  -- Reference
  reference_type TEXT,
  reference_id TEXT,
  reference_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released', 'expired', 'cancelled')),
  
  -- Dates
  effective_date DATE NOT NULL,
  expiration_date DATE,
  
  -- Created by
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  
  -- Released
  released_at TIMESTAMPTZ,
  released_by TEXT,
  released_by_id UUID REFERENCES employees(id),
  release_reason TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, reserve_number)
);

-- Inventory Audit Trail (Enhanced audit logging)
CREATE TABLE IF NOT EXISTS inventory_audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Material
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  
  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create', 'update', 'delete',
    'receive', 'issue', 'transfer_in', 'transfer_out',
    'adjustment', 'count', 'reserve', 'release',
    'cost_change', 'location_change', 'status_change',
    'reorder_point_change', 'vendor_change', 'attribute_change'
  )),
  action_category TEXT NOT NULL CHECK (action_category IN ('quantity', 'cost', 'attribute', 'status', 'location', 'reference')),
  
  -- Change Details
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  
  -- Quantity Changes
  quantity_before DECIMAL(12,2),
  quantity_after DECIMAL(12,2),
  quantity_change DECIMAL(12,2),
  
  -- Cost Changes
  cost_before DECIMAL(12,2),
  cost_after DECIMAL(12,2),
  cost_change DECIMAL(12,2),
  
  -- Reference
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  
  -- Performed by
  performed_by TEXT NOT NULL,
  performed_by_id UUID REFERENCES employees(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Source
  source_system TEXT DEFAULT 'inventory',
  ip_address TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Replenishment & Adjustments
CREATE INDEX IF NOT EXISTS idx_reorder_point_settings_org ON reorder_point_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_reorder_point_settings_material ON reorder_point_settings(material_id);
CREATE INDEX IF NOT EXISTS idx_reorder_point_settings_facility ON reorder_point_settings(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_reorder_point_settings_status ON reorder_point_settings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_reorder_point_settings_auto ON reorder_point_settings(organization_id, auto_replenish_enabled) WHERE auto_replenish_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_org ON replenishment_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_material ON replenishment_suggestions(material_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_status ON replenishment_suggestions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_priority ON replenishment_suggestions(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_facility ON replenishment_suggestions(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_pending ON replenishment_suggestions(organization_id, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_weekly_replenishment_plans_org ON weekly_replenishment_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_weekly_replenishment_plans_status ON weekly_replenishment_plans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_weekly_replenishment_plans_week ON weekly_replenishment_plans(organization_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_replenishment_plans_facility ON weekly_replenishment_plans(organization_id, facility_id);

CREATE INDEX IF NOT EXISTS idx_adjustment_reasons_org ON adjustment_reasons(organization_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_reasons_active ON adjustment_reasons(organization_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_adjustment_reasons_category ON adjustment_reasons(organization_id, category);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_org ON inventory_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_material ON inventory_adjustments(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_status ON inventory_adjustments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_type ON inventory_adjustments(organization_id, adjustment_type);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_facility ON inventory_adjustments(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date ON inventory_adjustments(organization_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_pending ON inventory_adjustments(organization_id, status) WHERE status IN ('pending', 'pending_approval');
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_reason ON inventory_adjustments(reason_id);

CREATE INDEX IF NOT EXISTS idx_variance_records_org ON variance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_variance_records_material ON variance_records(material_id);
CREATE INDEX IF NOT EXISTS idx_variance_records_status ON variance_records(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_variance_records_session ON variance_records(count_session_id);
CREATE INDEX IF NOT EXISTS idx_variance_records_type ON variance_records(organization_id, variance_type);
CREATE INDEX IF NOT EXISTS idx_variance_records_severity ON variance_records(organization_id, severity);
CREATE INDEX IF NOT EXISTS idx_variance_records_pending ON variance_records(organization_id, status) WHERE status IN ('pending_review', 'under_investigation');

CREATE INDEX IF NOT EXISTS idx_inventory_reserves_org ON inventory_reserves(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reserves_material ON inventory_reserves(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reserves_status ON inventory_reserves(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reserves_type ON inventory_reserves(organization_id, reserve_type);
CREATE INDEX IF NOT EXISTS idx_inventory_reserves_active ON inventory_reserves(organization_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reserves_facility ON inventory_reserves(organization_id, facility_id);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_org ON inventory_audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_material ON inventory_audit_trail(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_action ON inventory_audit_trail(organization_id, action_type);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_category ON inventory_audit_trail(organization_id, action_category);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_date ON inventory_audit_trail(organization_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_reference ON inventory_audit_trail(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_trail_user ON inventory_audit_trail(performed_by_id);

-- RLS
ALTER TABLE reorder_point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE replenishment_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_replenishment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE variance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_trail ENABLE ROW LEVEL SECURITY;

-- Triggers
DROP TRIGGER IF EXISTS update_reorder_point_settings_updated_at ON reorder_point_settings;
CREATE TRIGGER update_reorder_point_settings_updated_at BEFORE UPDATE ON reorder_point_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_replenishment_suggestions_updated_at ON replenishment_suggestions;
CREATE TRIGGER update_replenishment_suggestions_updated_at BEFORE UPDATE ON replenishment_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_weekly_replenishment_plans_updated_at ON weekly_replenishment_plans;
CREATE TRIGGER update_weekly_replenishment_plans_updated_at BEFORE UPDATE ON weekly_replenishment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_adjustment_reasons_updated_at ON adjustment_reasons;
CREATE TRIGGER update_adjustment_reasons_updated_at BEFORE UPDATE ON adjustment_reasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_inventory_adjustments_updated_at ON inventory_adjustments;
CREATE TRIGGER update_inventory_adjustments_updated_at BEFORE UPDATE ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_variance_records_updated_at ON variance_records;
CREATE TRIGGER update_variance_records_updated_at BEFORE UPDATE ON variance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_inventory_reserves_updated_at ON inventory_reserves;
CREATE TRIGGER update_inventory_reserves_updated_at BEFORE UPDATE ON inventory_reserves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
