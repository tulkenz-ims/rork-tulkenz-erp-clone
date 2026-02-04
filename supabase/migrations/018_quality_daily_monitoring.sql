-- Quality Daily Monitoring Tables
-- CCP Monitoring, Production Line Checks, Metal Detector Logs, Pre-Op Inspections

-- ===========================================
-- CCP MONITORING LOGS (Critical Control Points)
-- ===========================================

CREATE TABLE ccp_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  
  -- CCP Details
  ccp_number TEXT NOT NULL,
  ccp_name TEXT NOT NULL,
  ccp_type TEXT NOT NULL CHECK (ccp_type IN ('cooking', 'cooling', 'hot_holding', 'cold_holding', 'receiving', 'metal_detection', 'other')),
  process_step TEXT NOT NULL,
  
  -- Monitoring Details
  monitoring_date DATE NOT NULL,
  monitoring_time TIME NOT NULL,
  monitoring_frequency TEXT CHECK (monitoring_frequency IN ('continuous', 'every_15_min', 'every_30_min', 'hourly', 'per_batch', 'per_lot')),
  
  -- Critical Limits
  critical_limit_min DECIMAL(10,2),
  critical_limit_max DECIMAL(10,2),
  critical_limit_unit TEXT,
  target_value DECIMAL(10,2),
  
  -- Actual Reading
  actual_value DECIMAL(10,2) NOT NULL,
  is_within_limits BOOLEAN NOT NULL,
  
  -- Product Info
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  batch_number TEXT,
  
  -- Equipment
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT,
  equipment_tag TEXT,
  
  -- Corrective Action (required if out of limits)
  deviation_occurred BOOLEAN DEFAULT FALSE,
  corrective_action_taken TEXT,
  corrective_action_time TIMESTAMPTZ,
  product_disposition TEXT CHECK (product_disposition IN ('released', 'held', 'reworked', 'destroyed', 'returned', 'n/a')),
  
  -- Verification
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  verification_method TEXT,
  
  -- Recorder
  recorded_by TEXT NOT NULL,
  recorded_by_id UUID REFERENCES employees(id),
  
  -- Status
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded', 'verified', 'flagged', 'corrected')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PRODUCTION LINE CHECKS
-- ===========================================

CREATE TABLE production_line_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  
  -- Line Info
  line_number TEXT NOT NULL,
  line_name TEXT NOT NULL,
  area TEXT,
  
  -- Check Details
  check_date DATE NOT NULL,
  check_time TIME NOT NULL,
  shift TEXT CHECK (shift IN ('1st', '2nd', '3rd', 'day', 'night')),
  check_type TEXT NOT NULL CHECK (check_type IN ('startup', 'hourly', 'changeover', 'shutdown', 'random')),
  
  -- Product Info
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  batch_number TEXT,
  
  -- Check Items (stored as JSONB array of check results)
  check_items JSONB DEFAULT '[]',
  
  -- Summary Results
  total_checks INTEGER DEFAULT 0,
  passed_checks INTEGER DEFAULT 0,
  failed_checks INTEGER DEFAULT 0,
  overall_result TEXT NOT NULL CHECK (overall_result IN ('pass', 'fail', 'conditional')),
  
  -- Issues Found
  issues_found JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  
  -- Personnel
  checked_by TEXT NOT NULL,
  checked_by_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  supervisor_id UUID REFERENCES employees(id),
  
  -- Verification
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'verified', 'requires_action')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- METAL DETECTOR LOGS
-- ===========================================

CREATE TABLE metal_detector_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  
  -- Detector Info
  detector_id TEXT NOT NULL,
  detector_name TEXT NOT NULL,
  detector_location TEXT,
  line_number TEXT,
  
  -- Check Details
  check_date DATE NOT NULL,
  check_time TIME NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('startup', 'hourly', 'lot_change', 'product_change', 'shutdown', 'after_reject', 'verification')),
  
  -- Product Info
  product_name TEXT,
  product_code TEXT,
  lot_number TEXT,
  
  -- Test Standards
  ferrous_standard_size DECIMAL(6,2),
  non_ferrous_standard_size DECIMAL(6,2),
  stainless_standard_size DECIMAL(6,2),
  standard_unit TEXT DEFAULT 'mm',
  
  -- Test Results
  ferrous_detected BOOLEAN,
  non_ferrous_detected BOOLEAN,
  stainless_detected BOOLEAN,
  all_standards_detected BOOLEAN NOT NULL,
  
  -- Sensitivity Settings
  sensitivity_ferrous DECIMAL(8,2),
  sensitivity_non_ferrous DECIMAL(8,2),
  sensitivity_stainless DECIMAL(8,2),
  
  -- Reject System
  reject_system_tested BOOLEAN DEFAULT FALSE,
  reject_system_functional BOOLEAN,
  reject_bin_checked BOOLEAN DEFAULT FALSE,
  reject_bin_empty BOOLEAN,
  rejects_found INTEGER DEFAULT 0,
  
  -- Failure Response
  test_failed BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  corrective_action TEXT,
  corrective_action_time TIMESTAMPTZ,
  products_held_from TEXT,
  products_held_to TEXT,
  retest_passed BOOLEAN,
  retest_time TIMESTAMPTZ,
  
  -- Personnel
  tested_by TEXT NOT NULL,
  tested_by_id UUID REFERENCES employees(id),
  
  -- Verification
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pass' CHECK (status IN ('pass', 'fail', 'corrected', 'pending_verification')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PRE-OPERATIONAL INSPECTIONS
-- ===========================================

CREATE TABLE pre_op_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  
  -- Inspection Details
  inspection_date DATE NOT NULL,
  inspection_time TIME NOT NULL,
  shift TEXT CHECK (shift IN ('1st', '2nd', '3rd', 'day', 'night')),
  
  -- Area/Line Info
  area_name TEXT NOT NULL,
  line_number TEXT,
  room_number TEXT,
  
  -- Inspection Categories (each is a JSONB array of check items)
  sanitation_checks JSONB DEFAULT '[]',
  equipment_checks JSONB DEFAULT '[]',
  safety_checks JSONB DEFAULT '[]',
  allergen_checks JSONB DEFAULT '[]',
  gmp_checks JSONB DEFAULT '[]',
  
  -- Summary Results
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  na_items INTEGER DEFAULT 0,
  overall_result TEXT NOT NULL CHECK (overall_result IN ('acceptable', 'unacceptable', 'conditional')),
  
  -- Issues and Corrective Actions
  issues_found JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  
  -- Release Decision
  line_released BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMPTZ,
  released_by TEXT,
  released_by_id UUID REFERENCES employees(id),
  hold_reason TEXT,
  
  -- Personnel
  inspector_name TEXT NOT NULL,
  inspector_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  supervisor_id UUID REFERENCES employees(id),
  
  -- Verification
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'verified', 'released', 'on_hold')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for CCP Monitoring Logs
CREATE INDEX idx_ccp_monitoring_logs_org ON ccp_monitoring_logs(organization_id);
CREATE INDEX idx_ccp_monitoring_logs_date ON ccp_monitoring_logs(organization_id, monitoring_date);
CREATE INDEX idx_ccp_monitoring_logs_ccp ON ccp_monitoring_logs(organization_id, ccp_number);
CREATE INDEX idx_ccp_monitoring_logs_type ON ccp_monitoring_logs(organization_id, ccp_type);
CREATE INDEX idx_ccp_monitoring_logs_deviation ON ccp_monitoring_logs(organization_id, deviation_occurred) WHERE deviation_occurred = TRUE;
CREATE INDEX idx_ccp_monitoring_logs_facility ON ccp_monitoring_logs(organization_id, facility_id);
CREATE INDEX idx_ccp_monitoring_logs_lot ON ccp_monitoring_logs(organization_id, lot_number);
CREATE INDEX idx_ccp_monitoring_logs_status ON ccp_monitoring_logs(organization_id, status);

-- Indexes for Production Line Checks
CREATE INDEX idx_production_line_checks_org ON production_line_checks(organization_id);
CREATE INDEX idx_production_line_checks_date ON production_line_checks(organization_id, check_date);
CREATE INDEX idx_production_line_checks_line ON production_line_checks(organization_id, line_number);
CREATE INDEX idx_production_line_checks_type ON production_line_checks(organization_id, check_type);
CREATE INDEX idx_production_line_checks_result ON production_line_checks(organization_id, overall_result);
CREATE INDEX idx_production_line_checks_facility ON production_line_checks(organization_id, facility_id);
CREATE INDEX idx_production_line_checks_lot ON production_line_checks(organization_id, lot_number);
CREATE INDEX idx_production_line_checks_status ON production_line_checks(organization_id, status);

-- Indexes for Metal Detector Logs
CREATE INDEX idx_metal_detector_logs_org ON metal_detector_logs(organization_id);
CREATE INDEX idx_metal_detector_logs_date ON metal_detector_logs(organization_id, check_date);
CREATE INDEX idx_metal_detector_logs_detector ON metal_detector_logs(organization_id, detector_id);
CREATE INDEX idx_metal_detector_logs_type ON metal_detector_logs(organization_id, check_type);
CREATE INDEX idx_metal_detector_logs_status ON metal_detector_logs(organization_id, status);
CREATE INDEX idx_metal_detector_logs_failed ON metal_detector_logs(organization_id, test_failed) WHERE test_failed = TRUE;
CREATE INDEX idx_metal_detector_logs_facility ON metal_detector_logs(organization_id, facility_id);
CREATE INDEX idx_metal_detector_logs_lot ON metal_detector_logs(organization_id, lot_number);

-- Indexes for Pre-Op Inspections
CREATE INDEX idx_pre_op_inspections_org ON pre_op_inspections(organization_id);
CREATE INDEX idx_pre_op_inspections_date ON pre_op_inspections(organization_id, inspection_date);
CREATE INDEX idx_pre_op_inspections_area ON pre_op_inspections(organization_id, area_name);
CREATE INDEX idx_pre_op_inspections_line ON pre_op_inspections(organization_id, line_number);
CREATE INDEX idx_pre_op_inspections_result ON pre_op_inspections(organization_id, overall_result);
CREATE INDEX idx_pre_op_inspections_released ON pre_op_inspections(organization_id, line_released);
CREATE INDEX idx_pre_op_inspections_facility ON pre_op_inspections(organization_id, facility_id);
CREATE INDEX idx_pre_op_inspections_status ON pre_op_inspections(organization_id, status);

-- RLS
ALTER TABLE ccp_monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_line_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE metal_detector_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_op_inspections ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_ccp_monitoring_logs_updated_at BEFORE UPDATE ON ccp_monitoring_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_line_checks_updated_at BEFORE UPDATE ON production_line_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metal_detector_logs_updated_at BEFORE UPDATE ON metal_detector_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pre_op_inspections_updated_at BEFORE UPDATE ON pre_op_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
