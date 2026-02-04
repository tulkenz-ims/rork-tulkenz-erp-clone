-- Emergency Preparedness Module Tables
-- Migration: 038_emergency_preparedness.sql

-- ===========================================
-- EMERGENCY ACTION PLAN ACKNOWLEDGMENTS
-- ===========================================

CREATE TABLE IF NOT EXISTS emergency_action_plan_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  
  -- Employee info
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department TEXT NOT NULL,
  work_location TEXT,
  shift TEXT,
  
  -- Plan info
  acknowledgment_date DATE,
  plan_version TEXT NOT NULL DEFAULT 'EAP-2024-v1.0',
  
  -- Knowledge verification
  evacuation_routes BOOLEAN DEFAULT FALSE,
  assembly_point TEXT,
  alarm_recognition BOOLEAN DEFAULT FALSE,
  emergency_contacts BOOLEAN DEFAULT FALSE,
  fire_extinguisher BOOLEAN DEFAULT FALSE,
  first_aid_kit BOOLEAN DEFAULT FALSE,
  aed_location BOOLEAN DEFAULT FALSE,
  shelter_location BOOLEAN DEFAULT FALSE,
  
  -- Special duties
  special_duties TEXT,
  medical_considerations TEXT,
  training_completed TEXT[] DEFAULT '{}',
  
  -- Signatures
  supervisor_name TEXT,
  supervisor_id UUID REFERENCES employees(id),
  supervisor_signature BOOLEAN DEFAULT FALSE,
  employee_signature BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'needs_training', 'expired')),
  
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- FIRE DRILL LOG
-- ===========================================

CREATE TABLE IF NOT EXISTS fire_drill_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  
  -- Drill info
  drill_date DATE NOT NULL,
  drill_time TIME,
  drill_type TEXT NOT NULL CHECK (drill_type IN ('announced', 'unannounced', 'partial_evacuation', 'night_shift', 'weekend')),
  shift TEXT,
  
  -- Timing
  alarm_activation_time TIME,
  building_clear_time TIME,
  total_evacuation_time TEXT,
  
  -- Participants
  total_participants INTEGER DEFAULT 0,
  assembly_points_used TEXT[] DEFAULT '{}',
  
  -- Headcount
  headcount_completed BOOLEAN DEFAULT FALSE,
  headcount_time TIME,
  all_accounted_for BOOLEAN DEFAULT FALSE,
  missing_persons TEXT,
  
  -- Equipment checks
  fire_extinguishers_tested BOOLEAN DEFAULT FALSE,
  alarms_audible BOOLEAN DEFAULT FALSE,
  exit_signs_lit BOOLEAN DEFAULT FALSE,
  exits_unobstructed BOOLEAN DEFAULT FALSE,
  evacuation_aids_used TEXT[] DEFAULT '{}',
  
  -- Issues and actions
  issues_identified TEXT[] DEFAULT '{}',
  corrective_actions TEXT,
  
  -- Conducted by
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  observer_names TEXT,
  weather_conditions TEXT,
  announcement_made BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'issues_found', 'corrective_pending')),
  next_drill_due DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- EVACUATION DRILL REPORTS
-- ===========================================

CREATE TABLE IF NOT EXISTS evacuation_drill_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  
  -- Drill info
  drill_date DATE NOT NULL,
  drill_time TIME,
  scenario_type TEXT NOT NULL,
  scenario_description TEXT,
  shift TEXT,
  
  -- Areas
  areas_evacuated TEXT[] DEFAULT '{}',
  
  -- Timing
  alarm_initiated_time TIME,
  first_exit_time TIME,
  last_exit_time TIME,
  total_evacuation_time TEXT,
  
  -- Personnel
  total_employees INTEGER DEFAULT 0,
  employees_evacuated INTEGER DEFAULT 0,
  visitors_evacuated INTEGER DEFAULT 0,
  contractors_evacuated INTEGER DEFAULT 0,
  
  -- Exits and assembly
  exits_used TEXT[] DEFAULT '{}',
  assembly_points TEXT[] DEFAULT '{}',
  headcount_results JSONB DEFAULT '[]',
  
  -- Personnel involved
  floor_wardens TEXT[] DEFAULT '{}',
  wardens_performed BOOLEAN DEFAULT FALSE,
  
  -- System checks
  communication_effective BOOLEAN DEFAULT FALSE,
  pa_system_worked BOOLEAN DEFAULT FALSE,
  emergency_lighting BOOLEAN DEFAULT FALSE,
  
  -- Assistance
  mobility_assistance TEXT[] DEFAULT '{}',
  
  -- Issues
  bottlenecks TEXT[] DEFAULT '{}',
  exit_obstructions TEXT[] DEFAULT '{}',
  lessons_learned TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  
  -- Conducted by
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  observers TEXT,
  
  -- Rating
  overall_rating TEXT CHECK (overall_rating IN ('excellent', 'satisfactory', 'needs_improvement', 'unsatisfactory')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'review_pending', 'action_required')),
  follow_up_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- SEVERE WEATHER DRILL RECORDS
-- ===========================================

CREATE TABLE IF NOT EXISTS severe_weather_drill_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  
  -- Drill info
  drill_date DATE NOT NULL,
  drill_time TIME,
  weather_type TEXT NOT NULL CHECK (weather_type IN ('tornado_warning', 'tornado_watch', 'severe_thunderstorm', 'hurricane', 'flood', 'winter_storm', 'other')),
  drill_type TEXT DEFAULT 'drill' CHECK (drill_type IN ('drill', 'actual_event')),
  shift TEXT,
  
  -- Participants
  total_participants INTEGER DEFAULT 0,
  
  -- Timing
  warning_issued_time TIME,
  shelter_reached_time TIME,
  response_time TEXT,
  all_clear_time TIME,
  
  -- Accountability
  all_accounted BOOLEAN DEFAULT FALSE,
  missing_persons TEXT,
  
  -- System checks
  warning_system_worked BOOLEAN DEFAULT FALSE,
  pa_system_worked BOOLEAN DEFAULT FALSE,
  shelter_capacity_adequate BOOLEAN DEFAULT FALSE,
  
  -- Shelter areas used
  shelter_areas TEXT[] DEFAULT '{}',
  
  -- Issues
  issues_identified TEXT[] DEFAULT '{}',
  corrective_actions TEXT,
  
  -- Conducted by
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'issues_found', 'corrective_pending')),
  next_drill_due DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- EMERGENCY CONTACTS
-- ===========================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  
  -- Contact info
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  organization_name TEXT,
  
  -- Phone numbers
  primary_phone TEXT NOT NULL,
  secondary_phone TEXT,
  
  -- Other contact
  email TEXT,
  address TEXT,
  
  -- Availability
  available_hours TEXT,
  
  -- Priority
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Verification
  last_verified DATE,
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ASSEMBLY HEADCOUNT RECORDS
-- ===========================================

CREATE TABLE IF NOT EXISTS assembly_headcount_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  
  -- Event info
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT NOT NULL,
  
  -- Location
  assembly_point TEXT NOT NULL,
  shift TEXT,
  department TEXT,
  
  -- Counts
  expected_count INTEGER DEFAULT 0,
  actual_count INTEGER DEFAULT 0,
  
  -- Personnel
  accounted_for TEXT[] DEFAULT '{}',
  unaccounted TEXT[] DEFAULT '{}',
  found_locations TEXT,
  
  -- Timing
  time_to_complete TEXT,
  all_clear BOOLEAN DEFAULT FALSE,
  all_clear_time TIME,
  
  -- Conducted by
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  supervisor_id UUID REFERENCES employees(id),
  
  -- Conditions
  special_needs TEXT,
  weather_conditions TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'incomplete', 'discrepancy', 'in_progress')),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Emergency Action Plan Entries
CREATE INDEX IF NOT EXISTS idx_eap_entries_org ON emergency_action_plan_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_eap_entries_facility ON emergency_action_plan_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_eap_entries_employee ON emergency_action_plan_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_eap_entries_status ON emergency_action_plan_entries(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_eap_entries_department ON emergency_action_plan_entries(organization_id, department);

-- Fire Drill Entries
CREATE INDEX IF NOT EXISTS idx_fire_drill_org ON fire_drill_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_fire_drill_facility ON fire_drill_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_fire_drill_date ON fire_drill_entries(organization_id, drill_date);
CREATE INDEX IF NOT EXISTS idx_fire_drill_status ON fire_drill_entries(organization_id, status);

-- Evacuation Drill Entries
CREATE INDEX IF NOT EXISTS idx_evac_drill_org ON evacuation_drill_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_evac_drill_facility ON evacuation_drill_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_evac_drill_date ON evacuation_drill_entries(organization_id, drill_date);
CREATE INDEX IF NOT EXISTS idx_evac_drill_status ON evacuation_drill_entries(organization_id, status);

-- Severe Weather Drill Entries
CREATE INDEX IF NOT EXISTS idx_weather_drill_org ON severe_weather_drill_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_weather_drill_facility ON severe_weather_drill_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_weather_drill_date ON severe_weather_drill_entries(organization_id, drill_date);
CREATE INDEX IF NOT EXISTS idx_weather_drill_status ON severe_weather_drill_entries(organization_id, status);

-- Emergency Contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_org ON emergency_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_facility ON emergency_contacts(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_category ON emergency_contacts(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON emergency_contacts(organization_id, priority);

-- Assembly Headcount Entries
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_org ON assembly_headcount_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_facility ON assembly_headcount_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_date ON assembly_headcount_entries(organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_status ON assembly_headcount_entries(organization_id, status);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE emergency_action_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_drill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE evacuation_drill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE severe_weather_drill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_headcount_entries ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TRIGGERS
-- ===========================================

CREATE TRIGGER update_eap_entries_updated_at BEFORE UPDATE ON emergency_action_plan_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fire_drill_updated_at BEFORE UPDATE ON fire_drill_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evac_drill_updated_at BEFORE UPDATE ON evacuation_drill_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weather_drill_updated_at BEFORE UPDATE ON severe_weather_drill_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assembly_headcount_updated_at BEFORE UPDATE ON assembly_headcount_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
