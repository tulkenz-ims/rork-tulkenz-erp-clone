-- Safety OSHA Tables Migration
-- Tables: accident_investigations, first_aid_log, osha_300_log, osha_301_forms

-- Accident Investigations Table
CREATE TABLE IF NOT EXISTS accident_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_number TEXT NOT NULL UNIQUE,
  incident_date DATE NOT NULL,
  incident_time TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT NOT NULL,
  specific_location TEXT,
  department TEXT NOT NULL,
  injured_employee TEXT NOT NULL,
  employee_id TEXT,
  job_title TEXT,
  supervisor TEXT,
  accident_type TEXT NOT NULL CHECK (accident_type IN ('slip_trip_fall', 'struck_by', 'caught_in', 'contact_with', 'overexertion', 'exposure', 'vehicle', 'equipment', 'ergonomic', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'severe', 'fatal')),
  description TEXT NOT NULL,
  immediate_cause TEXT NOT NULL,
  contributing_factors JSONB NOT NULL DEFAULT '[]',
  root_cause_analysis TEXT NOT NULL,
  witnesses JSONB DEFAULT '[]',
  witness_statements TEXT,
  evidence_collected JSONB DEFAULT '[]',
  photos_attached BOOLEAN DEFAULT FALSE,
  diagrams_attached BOOLEAN DEFAULT FALSE,
  equipment_involved TEXT,
  ppe_worn TEXT,
  ppe_adequate BOOLEAN DEFAULT TRUE,
  training_adequate BOOLEAN DEFAULT TRUE,
  procedures_followed BOOLEAN DEFAULT TRUE,
  corrective_actions TEXT NOT NULL,
  preventive_measures TEXT,
  responsible_party TEXT,
  target_completion_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'closed')),
  investigated_by TEXT NOT NULL,
  investigated_by_id UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- First Aid Log Table
CREATE TABLE IF NOT EXISTS first_aid_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  injury_type TEXT NOT NULL CHECK (injury_type IN ('cut', 'scrape', 'burn', 'bruise', 'sprain', 'strain', 'eye_injury', 'insect_bite', 'splinter', 'headache', 'nausea', 'other')),
  injury_description TEXT NOT NULL,
  body_part TEXT NOT NULL,
  treatment_provided JSONB NOT NULL DEFAULT '[]',
  treatment_details TEXT NOT NULL,
  administered_by TEXT NOT NULL,
  administered_by_id UUID REFERENCES auth.users(id),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  returned_to_work BOOLEAN DEFAULT TRUE,
  sent_for_medical BOOLEAN DEFAULT FALSE,
  medical_facility TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OSHA 300 Log Table
CREATE TABLE IF NOT EXISTS osha_300_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  date_of_injury DATE NOT NULL,
  where_occurred TEXT NOT NULL,
  description TEXT NOT NULL,
  classify_case TEXT NOT NULL CHECK (classify_case IN ('injury', 'skin_disorder', 'respiratory', 'poisoning', 'hearing_loss', 'other_illness')),
  outcome TEXT NOT NULL CHECK (outcome IN ('death', 'days_away', 'job_transfer', 'other_recordable')),
  death BOOLEAN DEFAULT FALSE,
  days_away_from_work INTEGER DEFAULT 0,
  days_job_transfer INTEGER DEFAULT 0,
  injury BOOLEAN DEFAULT FALSE,
  skin_disorder BOOLEAN DEFAULT FALSE,
  respiratory BOOLEAN DEFAULT FALSE,
  poisoning BOOLEAN DEFAULT FALSE,
  hearing_loss BOOLEAN DEFAULT FALSE,
  other_illness BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  entered_by TEXT NOT NULL,
  entered_by_id UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_number, year)
);

-- OSHA 301 Forms Table
CREATE TABLE IF NOT EXISTS osha_301_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number TEXT NOT NULL UNIQUE,
  case_number TEXT,
  establishment_name TEXT,
  establishment_address TEXT,
  employee_name TEXT NOT NULL,
  employee_address TEXT,
  employee_dob DATE,
  employee_gender TEXT CHECK (employee_gender IN ('male', 'female', 'other')),
  employee_hire_date DATE,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  date_of_injury DATE NOT NULL,
  time_of_injury TEXT,
  time_began_work TEXT,
  incident_location TEXT NOT NULL,
  what_happened TEXT NOT NULL,
  object_substance TEXT NOT NULL,
  injury_illness_type TEXT NOT NULL CHECK (injury_illness_type IN ('injury', 'skin_disorder', 'respiratory', 'poisoning', 'hearing_loss', 'other_illness')),
  body_parts_affected TEXT NOT NULL,
  treatment_received TEXT NOT NULL CHECK (treatment_received IN ('first_aid', 'medical_treatment', 'hospitalization', 'emergency_room', 'none')),
  treatment_facility TEXT,
  treatment_facility_address TEXT,
  hospitalized_overnight BOOLEAN DEFAULT FALSE,
  emergency_room BOOLEAN DEFAULT FALSE,
  days_away_from_work INTEGER DEFAULT 0,
  days_job_transfer INTEGER DEFAULT 0,
  physician_name TEXT,
  physician_phone TEXT,
  completed_by TEXT NOT NULL,
  completed_by_title TEXT,
  completed_by_phone TEXT,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  entered_by TEXT NOT NULL,
  entered_by_id UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accident_investigations_incident_date ON accident_investigations(incident_date);
CREATE INDEX IF NOT EXISTS idx_accident_investigations_status ON accident_investigations(status);
CREATE INDEX IF NOT EXISTS idx_accident_investigations_department ON accident_investigations(department);

CREATE INDEX IF NOT EXISTS idx_first_aid_log_date ON first_aid_log(date);
CREATE INDEX IF NOT EXISTS idx_first_aid_log_status ON first_aid_log(status);
CREATE INDEX IF NOT EXISTS idx_first_aid_log_department ON first_aid_log(department);

CREATE INDEX IF NOT EXISTS idx_osha_300_log_year ON osha_300_log(year);
CREATE INDEX IF NOT EXISTS idx_osha_300_log_date_of_injury ON osha_300_log(date_of_injury);
CREATE INDEX IF NOT EXISTS idx_osha_300_log_status ON osha_300_log(status);

CREATE INDEX IF NOT EXISTS idx_osha_301_forms_date_of_injury ON osha_301_forms(date_of_injury);
CREATE INDEX IF NOT EXISTS idx_osha_301_forms_status ON osha_301_forms(status);
CREATE INDEX IF NOT EXISTS idx_osha_301_forms_department ON osha_301_forms(department);

-- Enable Row Level Security
ALTER TABLE accident_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_aid_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_300_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE osha_301_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accident_investigations
CREATE POLICY "Users can view accident investigations" ON accident_investigations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert accident investigations" ON accident_investigations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own accident investigations" ON accident_investigations
  FOR UPDATE USING (auth.uid() = investigated_by_id OR auth.role() = 'authenticated');

-- RLS Policies for first_aid_log
CREATE POLICY "Users can view first aid entries" ON first_aid_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert first aid entries" ON first_aid_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own first aid entries" ON first_aid_log
  FOR UPDATE USING (auth.uid() = administered_by_id OR auth.role() = 'authenticated');

-- RLS Policies for osha_300_log
CREATE POLICY "Users can view OSHA 300 entries" ON osha_300_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert OSHA 300 entries" ON osha_300_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own OSHA 300 entries" ON osha_300_log
  FOR UPDATE USING (auth.uid() = entered_by_id OR auth.role() = 'authenticated');

-- RLS Policies for osha_301_forms
CREATE POLICY "Users can view OSHA 301 forms" ON osha_301_forms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert OSHA 301 forms" ON osha_301_forms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own OSHA 301 forms" ON osha_301_forms
  FOR UPDATE USING (auth.uid() = entered_by_id OR auth.role() = 'authenticated');
