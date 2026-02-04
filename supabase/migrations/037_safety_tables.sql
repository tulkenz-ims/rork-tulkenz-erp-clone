-- Safety Module Tables Migration
-- Run this in Supabase SQL Editor to create all safety-related tables

-- Safety Incidents
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_number TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('injury', 'illness', 'near_miss', 'property_damage', 'environmental', 'vehicle', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'critical', 'fatality')),
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'under_investigation', 'pending_review', 'closed', 'reopened')),
  facility_id UUID REFERENCES facilities(id),
  location TEXT,
  department_code TEXT,
  department_name TEXT,
  incident_date DATE NOT NULL,
  incident_time TIME,
  reported_date DATE NOT NULL,
  reported_by TEXT NOT NULL,
  reported_by_id UUID REFERENCES employees(id),
  description TEXT NOT NULL,
  immediate_actions TEXT,
  injured_employee_id UUID REFERENCES employees(id),
  injured_employee_name TEXT,
  injury_type TEXT CHECK (injury_type IN ('cut', 'burn', 'fracture', 'sprain', 'strain', 'contusion', 'amputation', 'chemical_exposure', 'other')),
  body_part TEXT CHECK (body_part IN ('head', 'neck', 'back', 'chest', 'abdomen', 'arm', 'hand', 'leg', 'foot', 'multiple', 'other')),
  medical_treatment TEXT,
  days_away INTEGER DEFAULT 0,
  restricted_days INTEGER DEFAULT 0,
  witnesses TEXT[] DEFAULT '{}',
  root_cause TEXT,
  contributing_factors TEXT[] DEFAULT '{}',
  corrective_actions TEXT,
  preventive_actions TEXT,
  osha_recordable BOOLEAN DEFAULT FALSE,
  osha_form_completed BOOLEAN DEFAULT FALSE,
  investigation_lead TEXT,
  investigation_lead_id UUID REFERENCES employees(id),
  investigation_date DATE,
  investigation_notes TEXT,
  closed_date DATE,
  closed_by TEXT,
  closed_by_id UUID REFERENCES employees(id),
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, incident_number)
);

-- Safety Permits
CREATE TABLE IF NOT EXISTS safety_permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permit_number TEXT NOT NULL,
  permit_type TEXT NOT NULL CHECK (permit_type IN ('loto', 'confined_space', 'hot_work', 'fall_protection', 'electrical', 'line_break', 'excavation', 'roof_access', 'chemical_handling', 'temporary_equipment')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'cancelled', 'expired')),
  facility_id UUID REFERENCES facilities(id),
  location TEXT,
  department_code TEXT,
  work_description TEXT NOT NULL,
  hazards_identified TEXT[] DEFAULT '{}',
  precautions_required TEXT[] DEFAULT '{}',
  ppe_required TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE NOT NULL,
  end_time TIME,
  requested_by TEXT NOT NULL,
  requested_by_id UUID REFERENCES employees(id),
  requested_date DATE NOT NULL,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_date DATE,
  contractor_name TEXT,
  contractor_company TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  equipment_isolated TEXT[] DEFAULT '{}',
  energy_sources TEXT[] DEFAULT '{}',
  lockout_points TEXT[] DEFAULT '{}',
  verification_steps TEXT[] DEFAULT '{}',
  completed_by TEXT,
  completed_by_id UUID REFERENCES employees(id),
  completed_date DATE,
  cancellation_reason TEXT,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, permit_number)
);

-- Safety Inspections
CREATE TABLE IF NOT EXISTS safety_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_number TEXT NOT NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('daily_walk', 'monthly', 'equipment', 'fire_safety', 'ppe', 'forklift', 'ladder', 'electrical', 'emergency', 'eyewash', 'first_aid', 'aed', 'fire_extinguisher', 'fall_protection', 'compressed_gas', 'electrical_panel', 'ammonia', 'other')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  result TEXT CHECK (result IN ('pass', 'fail', 'conditional', 'needs_attention')),
  facility_id UUID REFERENCES facilities(id),
  location TEXT,
  area_inspected TEXT,
  scheduled_date DATE,
  inspection_date DATE,
  inspector_name TEXT,
  inspector_id UUID REFERENCES employees(id),
  checklist_items JSONB DEFAULT '[]',
  findings JSONB DEFAULT '[]',
  deficiencies_found INTEGER DEFAULT 0,
  corrective_actions_required BOOLEAN DEFAULT FALSE,
  corrective_actions TEXT,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  score DECIMAL(5,2),
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, inspection_number)
);

-- Safety Trainings
CREATE TABLE IF NOT EXISTS safety_trainings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  training_id TEXT NOT NULL,
  training_type TEXT NOT NULL CHECK (training_type IN ('safety_orientation', 'loto', 'forklift', 'confined_space', 'first_aid', 'hazmat', 'ppe', 'emergency', 'annual_refresher', 'job_specific', 'fall_protection', 'hearing_conservation', 'new_employee', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  facility_id UUID REFERENCES facilities(id),
  scheduled_date DATE,
  completion_date DATE,
  instructor_name TEXT,
  instructor_id UUID REFERENCES employees(id),
  duration_hours DECIMAL(5,2),
  location TEXT,
  max_attendees INTEGER,
  attendees JSONB DEFAULT '[]',
  materials TEXT[] DEFAULT '{}',
  quiz_required BOOLEAN DEFAULT FALSE,
  quiz_passing_score DECIMAL(5,2),
  certification_valid_months INTEGER,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, training_id)
);

-- Safety Certifications
CREATE TABLE IF NOT EXISTS safety_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  certification_type TEXT NOT NULL CHECK (certification_type IN ('safety_orientation', 'loto', 'forklift', 'confined_space', 'first_aid', 'hazmat', 'ppe', 'emergency', 'annual_refresher', 'job_specific', 'fall_protection', 'hearing_conservation', 'new_employee', 'cpr_aed', 'other')),
  certification_name TEXT NOT NULL,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expiring_soon', 'expired', 'revoked')),
  issue_date DATE NOT NULL,
  expiration_date DATE,
  issuing_authority TEXT,
  certificate_number TEXT,
  training_id UUID REFERENCES safety_trainings(id),
  renewal_required BOOLEAN DEFAULT TRUE,
  renewal_reminder_sent BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PPE Records
CREATE TABLE IF NOT EXISTS safety_ppe_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_number TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('issue', 'inspection', 'hazard_assessment')),
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT,
  facility_id UUID REFERENCES facilities(id),
  department_code TEXT,
  department_name TEXT,
  ppe_type TEXT NOT NULL,
  ppe_items JSONB DEFAULT '[]',
  issue_date DATE,
  inspection_date DATE,
  condition TEXT CHECK (condition IN ('new', 'good', 'fair', 'poor', 'needs_replacement')),
  result TEXT CHECK (result IN ('pass', 'fail', 'needs_attention')),
  hazards_identified TEXT[] DEFAULT '{}',
  ppe_required TEXT[] DEFAULT '{}',
  job_task TEXT,
  location TEXT,
  issued_by TEXT,
  issued_by_id UUID REFERENCES employees(id),
  inspector_name TEXT,
  inspector_id UUID REFERENCES employees(id),
  employee_signature BOOLEAN DEFAULT FALSE,
  notes TEXT,
  next_inspection_date DATE,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, record_number)
);

-- Chemical Safety Records
CREATE TABLE IF NOT EXISTS safety_chemical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_number TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('inventory', 'approval', 'handling', 'exposure', 'sds_receipt', 'sds_index')),
  facility_id UUID REFERENCES facilities(id),
  location TEXT,
  department_code TEXT,
  department_name TEXT,
  chemical_name TEXT NOT NULL,
  manufacturer TEXT,
  product_code TEXT,
  cas_number TEXT,
  hazard_class TEXT[] DEFAULT '{}',
  ghs_pictograms TEXT[] DEFAULT '{}',
  signal_word TEXT CHECK (signal_word IN ('danger', 'warning', 'none')),
  quantity DECIMAL(10,2),
  unit_of_measure TEXT,
  storage_location TEXT,
  storage_requirements TEXT[] DEFAULT '{}',
  ppe_required TEXT[] DEFAULT '{}',
  handling_procedures TEXT,
  emergency_procedures TEXT,
  sds_date DATE,
  sds_received_date DATE,
  sds_location TEXT,
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected', 'restricted')),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_date DATE,
  exposure_date DATE,
  exposure_type TEXT,
  exposure_duration TEXT,
  exposure_level TEXT,
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT,
  medical_attention BOOLEAN DEFAULT FALSE,
  reported_by TEXT,
  reported_by_id UUID REFERENCES employees(id),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, record_number)
);

-- Emergency Preparedness Records
CREATE TABLE IF NOT EXISTS safety_emergency_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_number TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('drill', 'evacuation', 'fire_drill', 'tornado_drill', 'action_plan', 'contacts', 'equipment_map', 'assembly_headcount')),
  facility_id UUID REFERENCES facilities(id),
  location TEXT,
  department_code TEXT,
  department_name TEXT,
  drill_date DATE,
  drill_time TIME,
  drill_type TEXT,
  drill_scenario TEXT,
  evacuation_time_minutes INTEGER,
  total_participants INTEGER,
  total_accounted INTEGER,
  missing_count INTEGER DEFAULT 0,
  assembly_point TEXT,
  alarm_activation_time TIME,
  all_clear_time TIME,
  weather_conditions TEXT,
  issues_identified TEXT[] DEFAULT '{}',
  corrective_actions TEXT,
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  contacts JSONB DEFAULT '[]',
  equipment_locations JSONB DEFAULT '[]',
  headcount_data JSONB DEFAULT '[]',
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, record_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safety_incidents_org ON safety_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_type ON safety_incidents(organization_id, incident_type);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_date ON safety_incidents(organization_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(organization_id, severity);

CREATE INDEX IF NOT EXISTS idx_safety_permits_org ON safety_permits(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_permits_status ON safety_permits(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_permits_type ON safety_permits(organization_id, permit_type);
CREATE INDEX IF NOT EXISTS idx_safety_permits_dates ON safety_permits(organization_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_safety_inspections_org ON safety_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_inspections_status ON safety_inspections(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_inspections_type ON safety_inspections(organization_id, inspection_type);
CREATE INDEX IF NOT EXISTS idx_safety_inspections_date ON safety_inspections(organization_id, inspection_date);

CREATE INDEX IF NOT EXISTS idx_safety_trainings_org ON safety_trainings(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_trainings_status ON safety_trainings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_trainings_type ON safety_trainings(organization_id, training_type);
CREATE INDEX IF NOT EXISTS idx_safety_trainings_date ON safety_trainings(organization_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_safety_certifications_org ON safety_certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_certifications_employee ON safety_certifications(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_safety_certifications_status ON safety_certifications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_certifications_expiry ON safety_certifications(organization_id, expiration_date);

CREATE INDEX IF NOT EXISTS idx_safety_ppe_org ON safety_ppe_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_ppe_type ON safety_ppe_records(organization_id, record_type);
CREATE INDEX IF NOT EXISTS idx_safety_ppe_employee ON safety_ppe_records(organization_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_safety_chemical_org ON safety_chemical_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_chemical_type ON safety_chemical_records(organization_id, record_type);

CREATE INDEX IF NOT EXISTS idx_safety_emergency_org ON safety_emergency_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_emergency_type ON safety_emergency_records(organization_id, record_type);

-- Enable RLS
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_ppe_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_chemical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_emergency_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for now - customize based on your auth setup)
CREATE POLICY "Allow all safety_incidents" ON safety_incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_permits" ON safety_permits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_inspections" ON safety_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_trainings" ON safety_trainings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_certifications" ON safety_certifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_ppe_records" ON safety_ppe_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_chemical_records" ON safety_chemical_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_emergency_records" ON safety_emergency_records FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON safety_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_permits_updated_at BEFORE UPDATE ON safety_permits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_inspections_updated_at BEFORE UPDATE ON safety_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_trainings_updated_at BEFORE UPDATE ON safety_trainings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_certifications_updated_at BEFORE UPDATE ON safety_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_ppe_records_updated_at BEFORE UPDATE ON safety_ppe_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_chemical_records_updated_at BEFORE UPDATE ON safety_chemical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_emergency_records_updated_at BEFORE UPDATE ON safety_emergency_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
