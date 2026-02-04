-- ===========================================
-- TIME AUDIT LOGS TABLE
-- ===========================================

-- Create time_audit_logs table for tracking admin changes to time entries
CREATE TABLE IF NOT EXISTS time_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  time_punch_id UUID REFERENCES time_punches(id) ON DELETE SET NULL,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject')),
  
  -- Who performed the action
  performed_by UUID REFERENCES employees(id),
  performed_by_name TEXT NOT NULL,
  
  -- Change tracking
  previous_values JSONB,
  new_values JSONB,
  
  -- Reason for change
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for time_audit_logs
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_org ON time_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_employee ON time_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_entry ON time_audit_logs(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_punch ON time_audit_logs(time_punch_id);
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_action ON time_audit_logs(organization_id, action);
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_created ON time_audit_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_audit_logs_performer ON time_audit_logs(performed_by);

-- Enable RLS
ALTER TABLE time_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_audit_logs
CREATE POLICY "Allow all operations for authenticated users on time_audit_logs"
  ON time_audit_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read on time_audit_logs"
  ON time_audit_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on time_audit_logs"
  ON time_audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on time_audit_logs"
  ON time_audit_logs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete on time_audit_logs"
  ON time_audit_logs
  FOR DELETE
  TO anon
  USING (true);
