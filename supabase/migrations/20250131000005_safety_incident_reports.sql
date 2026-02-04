-- Safety Incident Reports Tables
-- Property Damage, Root Cause Analysis, Vehicle Incidents, Witness Statements

-- Property Damage Reports
CREATE TABLE IF NOT EXISTS property_damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  specific_location TEXT,
  department TEXT NOT NULL,
  damage_type TEXT NOT NULL CHECK (damage_type IN ('equipment', 'facility', 'vehicle', 'machinery', 'tools', 'inventory', 'infrastructure', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  item_damaged TEXT NOT NULL,
  asset_id TEXT,
  description TEXT NOT NULL,
  cause TEXT NOT NULL CHECK (cause IN ('operator_error', 'equipment_failure', 'weather', 'collision', 'fire', 'water', 'vandalism', 'wear_tear', 'other')),
  cause_description TEXT,
  personnel_involved TEXT,
  witnesses TEXT,
  estimated_cost TEXT,
  photos_attached BOOLEAN DEFAULT FALSE,
  immediate_actions TEXT NOT NULL,
  repair_required BOOLEAN DEFAULT TRUE,
  equipment_operational BOOLEAN DEFAULT TRUE,
  reported_by TEXT NOT NULL,
  reported_by_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_damage_reports_date ON property_damage_reports(date);
CREATE INDEX idx_property_damage_reports_status ON property_damage_reports(status);
CREATE INDEX idx_property_damage_reports_department ON property_damage_reports(department);
CREATE INDEX idx_property_damage_reports_severity ON property_damage_reports(severity);

-- Root Cause Analyses
CREATE TABLE IF NOT EXISTS root_cause_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_reference TEXT NOT NULL,
  incident_date DATE NOT NULL,
  incident_type TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  analysis_method TEXT NOT NULL CHECK (analysis_method IN ('5_whys', 'fishbone', 'fault_tree', 'pareto', 'fmea', 'barrier', 'taproot', 'other')),
  analysis_team TEXT[] DEFAULT '{}',
  contributing_factors JSONB DEFAULT '[]',
  root_causes TEXT[] DEFAULT '{}',
  five_whys TEXT[] DEFAULT '{}',
  corrective_actions JSONB DEFAULT '[]',
  preventive_actions TEXT[] DEFAULT '{}',
  verification_method TEXT,
  verification_date DATE,
  lessons_learned TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'closed')),
  submitted_at TIMESTAMPTZ,
  submitted_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_root_cause_analyses_date ON root_cause_analyses(date);
CREATE INDEX idx_root_cause_analyses_status ON root_cause_analyses(status);
CREATE INDEX idx_root_cause_analyses_incident_reference ON root_cause_analyses(incident_reference);
CREATE INDEX idx_root_cause_analyses_analysis_method ON root_cause_analyses(analysis_method);

-- Vehicle Incidents
CREATE TABLE IF NOT EXISTS vehicle_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  specific_location TEXT,
  department TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('forklift', 'pallet_jack', 'order_picker', 'reach_truck', 'company_vehicle', 'delivery_truck', 'golf_cart', 'scissor_lift', 'other')),
  vehicle_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  operator_id TEXT,
  operator_certified BOOLEAN DEFAULT TRUE,
  certification_date DATE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('collision_object', 'collision_vehicle', 'collision_person', 'tip_over', 'load_drop', 'pedestrian_near_miss', 'mechanical_failure', 'operator_injury', 'property_damage', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('near_miss', 'minor', 'moderate', 'serious', 'severe')),
  description TEXT NOT NULL,
  injuries_occurred BOOLEAN DEFAULT FALSE,
  injury_details TEXT,
  property_damage BOOLEAN DEFAULT FALSE,
  damage_details TEXT,
  estimated_cost TEXT,
  witnesses TEXT,
  pre_shift_completed BOOLEAN DEFAULT TRUE,
  speed_appropriate BOOLEAN DEFAULT TRUE,
  load_secured BOOLEAN DEFAULT TRUE,
  visibility_adequate BOOLEAN DEFAULT TRUE,
  contributing_factors TEXT,
  immediate_actions TEXT NOT NULL,
  corrective_actions TEXT,
  photos_attached BOOLEAN DEFAULT FALSE,
  police_notified BOOLEAN DEFAULT FALSE,
  police_report_number TEXT,
  reported_by TEXT NOT NULL,
  reported_by_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_incidents_date ON vehicle_incidents(date);
CREATE INDEX idx_vehicle_incidents_status ON vehicle_incidents(status);
CREATE INDEX idx_vehicle_incidents_department ON vehicle_incidents(department);
CREATE INDEX idx_vehicle_incidents_vehicle_type ON vehicle_incidents(vehicle_type);
CREATE INDEX idx_vehicle_incidents_severity ON vehicle_incidents(severity);

-- Witness Statements
CREATE TABLE IF NOT EXISTS witness_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_taken TEXT NOT NULL,
  incident_reference TEXT NOT NULL,
  incident_date DATE,
  incident_time TEXT,
  incident_location TEXT,
  witness_name TEXT NOT NULL,
  witness_employee_id TEXT,
  witness_department TEXT,
  witness_job_title TEXT,
  witness_phone TEXT,
  witness_email TEXT,
  witness_relation TEXT NOT NULL CHECK (witness_relation IN ('direct_witness', 'indirect_witness', 'first_responder', 'supervisor', 'coworker', 'visitor', 'other')),
  observation_type TEXT NOT NULL CHECK (observation_type IN ('visual', 'auditory', 'both', 'aftermath_only')),
  witness_location TEXT,
  distance_from_incident TEXT,
  what_observed TEXT NOT NULL,
  sequence_of_events TEXT NOT NULL,
  people_involved TEXT,
  actions_taken TEXT,
  conditions_at_time TEXT,
  contributing_factors TEXT,
  injuries_observed TEXT,
  damage_observed TEXT,
  additional_info TEXT,
  previous_similar_incidents BOOLEAN DEFAULT FALSE,
  previous_incidents_details TEXT,
  safety_suggestions TEXT,
  willing_to_provide_more_info BOOLEAN DEFAULT TRUE,
  witness_signature_confirmed BOOLEAN DEFAULT FALSE,
  signature_date DATE,
  statement_taker TEXT NOT NULL,
  statement_taker_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'reviewed', 'archived')),
  submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_witness_statements_date ON witness_statements(date);
CREATE INDEX idx_witness_statements_status ON witness_statements(status);
CREATE INDEX idx_witness_statements_incident_reference ON witness_statements(incident_reference);
CREATE INDEX idx_witness_statements_witness_name ON witness_statements(witness_name);

-- Enable Row Level Security
ALTER TABLE property_damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE root_cause_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE witness_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Property Damage Reports
CREATE POLICY "Enable read access for authenticated users" ON property_damage_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON property_damage_reports
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON property_damage_reports
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for Root Cause Analyses
CREATE POLICY "Enable read access for authenticated users" ON root_cause_analyses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON root_cause_analyses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON root_cause_analyses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for Vehicle Incidents
CREATE POLICY "Enable read access for authenticated users" ON vehicle_incidents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON vehicle_incidents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON vehicle_incidents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for Witness Statements
CREATE POLICY "Enable read access for authenticated users" ON witness_statements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON witness_statements
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON witness_statements
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
