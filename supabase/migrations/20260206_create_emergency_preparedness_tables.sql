-- Create emergency preparedness tables that were missing from migration 038

-- Emergency Action Plan Entries
CREATE TABLE IF NOT EXISTS emergency_action_plan_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  department TEXT,
  plan_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  evacuation_routes JSONB DEFAULT '[]',
  assembly_points TEXT[] DEFAULT '{}',
  emergency_contacts JSONB DEFAULT '[]',
  responsibilities TEXT,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'under_review')),
  effective_date DATE,
  review_date DATE,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fire Drill Entries
CREATE TABLE IF NOT EXISTS fire_drill_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  drill_date DATE NOT NULL,
  drill_time TIME,
  drill_type TEXT DEFAULT 'drill' CHECK (drill_type IN ('drill', 'actual_event')),
  shift TEXT,
  total_participants INTEGER DEFAULT 0,
  evacuation_time TEXT,
  alarm_activation_time TIME,
  building_clear_time TIME,
  all_clear_time TIME,
  all_accounted BOOLEAN DEFAULT FALSE,
  missing_persons TEXT,
  fire_department_notified BOOLEAN DEFAULT FALSE,
  fire_department_response_time TEXT,
  alarm_system_worked BOOLEAN DEFAULT FALSE,
  sprinkler_system_checked BOOLEAN DEFAULT FALSE,
  exits_clear BOOLEAN DEFAULT FALSE,
  issues_identified TEXT[] DEFAULT '{}',
  corrective_actions TEXT,
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'issues_found', 'corrective_pending')),
  next_drill_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evacuation Drill Entries
CREATE TABLE IF NOT EXISTS evacuation_drill_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  drill_date DATE NOT NULL,
  drill_time TIME,
  scenario_type TEXT NOT NULL,
  scenario_description TEXT,
  shift TEXT,
  areas_evacuated TEXT[] DEFAULT '{}',
  alarm_initiated_time TIME,
  first_exit_time TIME,
  last_exit_time TIME,
  total_evacuation_time TEXT,
  total_employees INTEGER DEFAULT 0,
  employees_evacuated INTEGER DEFAULT 0,
  visitors_evacuated INTEGER DEFAULT 0,
  contractors_evacuated INTEGER DEFAULT 0,
  exits_used TEXT[] DEFAULT '{}',
  assembly_points TEXT[] DEFAULT '{}',
  headcount_results JSONB DEFAULT '[]',
  floor_wardens TEXT[] DEFAULT '{}',
  wardens_performed BOOLEAN DEFAULT FALSE,
  communication_effective BOOLEAN DEFAULT FALSE,
  pa_system_worked BOOLEAN DEFAULT FALSE,
  emergency_lighting BOOLEAN DEFAULT FALSE,
  mobility_assistance TEXT[] DEFAULT '{}',
  bottlenecks TEXT[] DEFAULT '{}',
  exit_obstructions TEXT[] DEFAULT '{}',
  lessons_learned TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  observers TEXT,
  overall_rating TEXT CHECK (overall_rating IN ('excellent', 'satisfactory', 'needs_improvement', 'unsatisfactory')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'review_pending', 'action_required')),
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Severe Weather Drill Entries
CREATE TABLE IF NOT EXISTS severe_weather_drill_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  drill_date DATE NOT NULL,
  drill_time TIME,
  weather_type TEXT NOT NULL CHECK (weather_type IN ('tornado_warning', 'tornado_watch', 'severe_thunderstorm', 'hurricane', 'flood', 'winter_storm', 'other')),
  drill_type TEXT DEFAULT 'drill' CHECK (drill_type IN ('drill', 'actual_event')),
  shift TEXT,
  total_participants INTEGER DEFAULT 0,
  warning_issued_time TIME,
  shelter_reached_time TIME,
  response_time TEXT,
  all_clear_time TIME,
  all_accounted BOOLEAN DEFAULT FALSE,
  missing_persons TEXT,
  warning_system_worked BOOLEAN DEFAULT FALSE,
  pa_system_worked BOOLEAN DEFAULT FALSE,
  shelter_capacity_adequate BOOLEAN DEFAULT FALSE,
  shelter_areas TEXT[] DEFAULT '{}',
  issues_identified TEXT[] DEFAULT '{}',
  corrective_actions TEXT,
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'issues_found', 'corrective_pending')),
  next_drill_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  organization_name TEXT,
  primary_phone TEXT NOT NULL,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  available_hours TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  is_primary BOOLEAN DEFAULT FALSE,
  last_verified DATE,
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assembly Headcount Entries
CREATE TABLE IF NOT EXISTS assembly_headcount_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT NOT NULL,
  assembly_point TEXT NOT NULL,
  shift TEXT,
  department TEXT,
  expected_count INTEGER DEFAULT 0,
  actual_count INTEGER DEFAULT 0,
  accounted_for TEXT[] DEFAULT '{}',
  unaccounted TEXT[] DEFAULT '{}',
  found_locations TEXT,
  time_to_complete TEXT,
  all_clear BOOLEAN DEFAULT FALSE,
  all_clear_time TIME,
  conducted_by TEXT,
  conducted_by_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  supervisor_id UUID REFERENCES employees(id),
  special_needs TEXT,
  weather_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'incomplete', 'discrepancy', 'in_progress')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eap_entries_org ON emergency_action_plan_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_eap_entries_facility ON emergency_action_plan_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_eap_entries_employee ON emergency_action_plan_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_eap_entries_status ON emergency_action_plan_entries(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_eap_entries_department ON emergency_action_plan_entries(organization_id, department);

CREATE INDEX IF NOT EXISTS idx_fire_drill_org ON fire_drill_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_fire_drill_facility ON fire_drill_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_fire_drill_date ON fire_drill_entries(organization_id, drill_date);
CREATE INDEX IF NOT EXISTS idx_fire_drill_status ON fire_drill_entries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_evac_drill_org ON evacuation_drill_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_evac_drill_facility ON evacuation_drill_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_evac_drill_date ON evacuation_drill_entries(organization_id, drill_date);
CREATE INDEX IF NOT EXISTS idx_evac_drill_status ON evacuation_drill_entries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_weather_drill_org ON severe_weather_drill_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_weather_drill_facility ON severe_weather_drill_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_weather_drill_date ON severe_weather_drill_entries(organization_id, drill_date);
CREATE INDEX IF NOT EXISTS idx_weather_drill_status ON severe_weather_drill_entries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_org ON emergency_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_facility ON emergency_contacts(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_category ON emergency_contacts(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON emergency_contacts(organization_id, priority);

CREATE INDEX IF NOT EXISTS idx_assembly_headcount_org ON assembly_headcount_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_facility ON assembly_headcount_entries(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_date ON assembly_headcount_entries(organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_assembly_headcount_status ON assembly_headcount_entries(organization_id, status);

-- RLS
ALTER TABLE emergency_action_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_drill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE evacuation_drill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE severe_weather_drill_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_headcount_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_access_eap" ON emergency_action_plan_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "org_access_fire_drill" ON fire_drill_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "org_access_evac_drill" ON evacuation_drill_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "org_access_weather_drill" ON severe_weather_drill_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "org_access_emergency_contacts" ON emergency_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "org_access_assembly_headcount" ON assembly_headcount_entries FOR ALL USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_eap_entries_updated_at BEFORE UPDATE ON emergency_action_plan_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fire_drill_updated_at BEFORE UPDATE ON fire_drill_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evac_drill_updated_at BEFORE UPDATE ON evacuation_drill_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weather_drill_updated_at BEFORE UPDATE ON severe_weather_drill_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assembly_headcount_updated_at BEFORE UPDATE ON assembly_headcount_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
