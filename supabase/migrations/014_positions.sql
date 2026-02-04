-- ===========================================
-- POSITIONS (Job Positions / Classification)
-- ===========================================

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Position Identification
  position_code TEXT NOT NULL,
  title TEXT NOT NULL,
  short_title TEXT,
  description TEXT,
  
  -- Classification
  job_family TEXT,
  job_level TEXT CHECK (job_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive')),
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
  flsa_status TEXT DEFAULT 'non_exempt' CHECK (flsa_status IN ('exempt', 'non_exempt')),
  
  -- Department/Facility Association
  department_code TEXT,
  department_name TEXT,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  
  -- Compensation
  pay_grade TEXT,
  pay_band TEXT,
  min_salary DECIMAL(12,2),
  mid_salary DECIMAL(12,2),
  max_salary DECIMAL(12,2),
  hourly_rate_min DECIMAL(10,2),
  hourly_rate_max DECIMAL(10,2),
  is_bonus_eligible BOOLEAN DEFAULT FALSE,
  bonus_target_percent DECIMAL(5,2),
  
  -- Headcount/Budgeting
  budgeted_headcount INTEGER DEFAULT 1,
  filled_headcount INTEGER DEFAULT 0,
  open_positions INTEGER GENERATED ALWAYS AS (GREATEST(budgeted_headcount - filled_headcount, 0)) STORED,
  
  -- Requirements
  education_required TEXT,
  experience_years_min INTEGER DEFAULT 0,
  experience_years_preferred INTEGER,
  certifications_required TEXT[] DEFAULT '{}',
  licenses_required TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',
  skills_preferred TEXT[] DEFAULT '{}',
  competencies JSONB DEFAULT '[]',
  
  -- Responsibilities
  responsibilities TEXT[] DEFAULT '{}',
  key_duties TEXT,
  
  -- Physical Requirements
  physical_requirements TEXT,
  work_environment TEXT,
  travel_required BOOLEAN DEFAULT FALSE,
  travel_percent INTEGER DEFAULT 0,
  is_remote_eligible BOOLEAN DEFAULT FALSE,
  
  -- Reporting Structure
  reports_to_position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  reports_to_position_title TEXT,
  supervisory_role BOOLEAN DEFAULT FALSE,
  direct_reports_typical INTEGER DEFAULT 0,
  
  -- Succession Planning
  is_critical_role BOOLEAN DEFAULT FALSE,
  succession_priority TEXT CHECK (succession_priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'archived')),
  effective_date DATE,
  end_date DATE,
  
  -- Approval
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, position_code)
);

-- Position History (track changes over time)
CREATE TABLE position_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'status_change', 'headcount_change', 'compensation_change', 'requirements_change')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  changed_by_id UUID REFERENCES employees(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Position Assignments (link employees to positions)
CREATE TABLE position_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE,
  fte_percent DECIMAL(5,2) DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'ended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(position_id, employee_id, start_date)
);

-- Indexes
CREATE INDEX idx_positions_org ON positions(organization_id);
CREATE INDEX idx_positions_code ON positions(organization_id, position_code);
CREATE INDEX idx_positions_title ON positions(organization_id, title);
CREATE INDEX idx_positions_department ON positions(organization_id, department_code);
CREATE INDEX idx_positions_facility ON positions(organization_id, facility_id);
CREATE INDEX idx_positions_status ON positions(organization_id, status);
CREATE INDEX idx_positions_job_family ON positions(organization_id, job_family);
CREATE INDEX idx_positions_job_level ON positions(organization_id, job_level);
CREATE INDEX idx_positions_pay_grade ON positions(organization_id, pay_grade);
CREATE INDEX idx_positions_critical ON positions(organization_id, is_critical_role) WHERE is_critical_role = TRUE;
CREATE INDEX idx_positions_supervisory ON positions(organization_id, supervisory_role) WHERE supervisory_role = TRUE;
CREATE INDEX idx_positions_open ON positions(organization_id) WHERE (budgeted_headcount - filled_headcount) > 0;

CREATE INDEX idx_position_history_org ON position_history(organization_id);
CREATE INDEX idx_position_history_position ON position_history(position_id);
CREATE INDEX idx_position_history_date ON position_history(organization_id, changed_at);

CREATE INDEX idx_position_assignments_org ON position_assignments(organization_id);
CREATE INDEX idx_position_assignments_position ON position_assignments(position_id);
CREATE INDEX idx_position_assignments_employee ON position_assignments(employee_id);
CREATE INDEX idx_position_assignments_active ON position_assignments(organization_id, status) WHERE status = 'active';

-- RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_assignments ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_position_assignments_updated_at BEFORE UPDATE ON position_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
