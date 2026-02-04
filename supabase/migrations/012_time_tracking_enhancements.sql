-- ===========================================
-- TIME TRACKING ENHANCEMENTS
-- ===========================================

-- 1. Add break_type and scheduled_minutes to time_punches
ALTER TABLE time_punches 
  ADD COLUMN IF NOT EXISTS break_type TEXT CHECK (break_type IN ('paid', 'unpaid')),
  ADD COLUMN IF NOT EXISTS scheduled_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL;

-- Index for time_entry_id on punches
CREATE INDEX IF NOT EXISTS idx_time_punches_entry ON time_punches(time_entry_id);

-- 2. Add employee approval columns to time_entries
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS employee_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_break_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_break_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Time Adjustment Requests table
CREATE TABLE IF NOT EXISTS time_adjustment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  time_punch_id UUID REFERENCES time_punches(id) ON DELETE SET NULL,
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'add_entry', 'delete_entry', 'modify_entry')),
  
  -- Original values (for modifications)
  original_timestamp TIMESTAMPTZ,
  original_date DATE,
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  
  -- Requested values
  requested_timestamp TIMESTAMPTZ,
  requested_date DATE,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  
  -- Reason and notes
  reason TEXT NOT NULL,
  employee_notes TEXT,
  
  -- Status and approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  
  -- Admin response
  reviewed_by UUID REFERENCES employees(id),
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  admin_response TEXT,
  admin_notes TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Break Settings table (organization-level)
CREATE TABLE IF NOT EXISTS break_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL DEFAULT 'Default Break Policy',
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Paid break settings (in minutes)
  paid_break_durations INTEGER[] DEFAULT '{5, 10, 15}',
  max_paid_breaks_per_shift INTEGER DEFAULT 2,
  paid_break_auto_deduct BOOLEAN DEFAULT FALSE,
  
  -- Unpaid break settings (in minutes)
  unpaid_break_durations INTEGER[] DEFAULT '{30, 45, 60}',
  min_unpaid_break_minutes INTEGER DEFAULT 30,
  max_unpaid_break_minutes INTEGER DEFAULT 60,
  
  -- Buffer and grace periods
  unpaid_break_buffer_minutes INTEGER DEFAULT 2,
  early_return_grace_minutes INTEGER DEFAULT 0,
  
  -- Enforcement
  enforce_minimum_break BOOLEAN DEFAULT TRUE,
  enforce_maximum_break BOOLEAN DEFAULT TRUE,
  
  -- Break too short - employee must wait until minimum is reached
  break_too_short_action TEXT DEFAULT 'block' CHECK (break_too_short_action IN ('block', 'warn', 'allow')),
  
  -- Break too long - alert HR
  break_too_long_action TEXT DEFAULT 'alert_hr' CHECK (break_too_long_action IN ('alert_hr', 'warn', 'allow')),
  break_too_long_threshold_minutes INTEGER DEFAULT 5,
  
  -- Scheduling
  required_break_after_hours DECIMAL(4,2) DEFAULT 6.0,
  auto_deduct_unpaid_break BOOLEAN DEFAULT FALSE,
  auto_deduct_duration_minutes INTEGER DEFAULT 30,
  
  -- Applicable to
  applicable_departments TEXT[] DEFAULT '{}',
  applicable_roles TEXT[] DEFAULT '{}',
  
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, name)
);

-- 5. Break Violations table (for tracking break policy violations)
CREATE TABLE IF NOT EXISTS break_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  time_punch_id UUID REFERENCES time_punches(id) ON DELETE SET NULL,
  
  -- Violation details
  violation_type TEXT NOT NULL CHECK (violation_type IN ('break_too_short', 'break_too_long', 'missed_break', 'early_return', 'late_return')),
  violation_date DATE NOT NULL,
  
  -- Break details
  break_type TEXT CHECK (break_type IN ('paid', 'unpaid')),
  scheduled_minutes INTEGER,
  actual_minutes INTEGER,
  difference_minutes INTEGER,
  
  -- Timestamps
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'excused', 'warned')),
  
  -- HR response
  reviewed_by UUID REFERENCES employees(id),
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Alert tracking
  hr_notified BOOLEAN DEFAULT FALSE,
  hr_notified_at TIMESTAMPTZ,
  manager_notified BOOLEAN DEFAULT FALSE,
  manager_notified_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Time Adjustment Requests
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_org ON time_adjustment_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_employee ON time_adjustment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_entry ON time_adjustment_requests(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_status ON time_adjustment_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_type ON time_adjustment_requests(organization_id, request_type);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_pending ON time_adjustment_requests(organization_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_created ON time_adjustment_requests(organization_id, created_at);

-- Indexes for Break Settings
CREATE INDEX IF NOT EXISTS idx_break_settings_org ON break_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_break_settings_facility ON break_settings(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_break_settings_default ON break_settings(organization_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_break_settings_active ON break_settings(organization_id, is_active) WHERE is_active = TRUE;

-- Indexes for Break Violations
CREATE INDEX IF NOT EXISTS idx_break_violations_org ON break_violations(organization_id);
CREATE INDEX IF NOT EXISTS idx_break_violations_employee ON break_violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_break_violations_entry ON break_violations(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_break_violations_type ON break_violations(organization_id, violation_type);
CREATE INDEX IF NOT EXISTS idx_break_violations_status ON break_violations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_break_violations_date ON break_violations(organization_id, violation_date);
CREATE INDEX IF NOT EXISTS idx_break_violations_pending ON break_violations(organization_id, status) WHERE status = 'pending';

-- RLS for new tables
ALTER TABLE time_adjustment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_violations ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_time_adjustment_requests_updated_at 
  BEFORE UPDATE ON time_adjustment_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_break_settings_updated_at 
  BEFORE UPDATE ON break_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_break_violations_updated_at 
  BEFORE UPDATE ON break_violations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for time_adjustment_requests
CREATE POLICY "Allow all operations for authenticated users on time_adjustment_requests"
  ON time_adjustment_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read on time_adjustment_requests"
  ON time_adjustment_requests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on time_adjustment_requests"
  ON time_adjustment_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on time_adjustment_requests"
  ON time_adjustment_requests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for break_settings
CREATE POLICY "Allow all operations for authenticated users on break_settings"
  ON break_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read on break_settings"
  ON break_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on break_settings"
  ON break_settings
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on break_settings"
  ON break_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for break_violations
CREATE POLICY "Allow all operations for authenticated users on break_violations"
  ON break_violations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read on break_violations"
  ON break_violations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on break_violations"
  ON break_violations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on break_violations"
  ON break_violations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
