-- PPE Management Tables

-- Respirator Fit Test Records
CREATE TABLE IF NOT EXISTS respirator_fit_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  department TEXT,
  test_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  respirator_type TEXT NOT NULL,
  respirator_model TEXT NOT NULL,
  respirator_size TEXT NOT NULL,
  test_method TEXT NOT NULL,
  fit_factor DECIMAL(10,2),
  test_result TEXT NOT NULL CHECK (test_result IN ('pass', 'fail', 'incomplete')),
  tester_name TEXT NOT NULL,
  tester_certification TEXT,
  medical_clearance_date DATE,
  medical_clearance_status TEXT CHECK (medical_clearance_status IN ('cleared', 'pending', 'restricted', 'not_cleared')),
  training_completed BOOLEAN DEFAULT false,
  training_date DATE,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Respirator Types Reference
CREATE TABLE IF NOT EXISTS respirator_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  protection_level TEXT,
  description TEXT,
  manufacturer TEXT,
  models JSONB DEFAULT '[]',
  sizes JSONB DEFAULT '["XS", "S", "M", "L", "XL"]',
  fit_test_frequency_months INTEGER DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Footwear Records
CREATE TABLE IF NOT EXISTS safety_footwear_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  department TEXT,
  issue_date DATE NOT NULL,
  footwear_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  size TEXT NOT NULL,
  width TEXT,
  safety_features JSONB DEFAULT '[]',
  cost DECIMAL(10,2),
  allowance_used DECIMAL(10,2),
  allowance_remaining DECIMAL(10,2),
  condition TEXT CHECK (condition IN ('new', 'good', 'fair', 'worn', 'replaced')),
  replacement_due_date DATE,
  inspection_date DATE,
  inspection_notes TEXT,
  replaced_reason TEXT,
  voucher_number TEXT,
  vendor TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Footwear Allowance Tracking
CREATE TABLE IF NOT EXISTS safety_footwear_allowances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  department TEXT,
  fiscal_year INTEGER NOT NULL,
  total_allowance DECIMAL(10,2) NOT NULL,
  used_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2),
  reset_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, fiscal_year)
);

-- Footwear Types Reference
CREATE TABLE IF NOT EXISTS footwear_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  safety_features JSONB DEFAULT '[]',
  required_for_areas JSONB DEFAULT '[]',
  description TEXT,
  typical_cost_range JSONB,
  replacement_frequency_months INTEGER DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_respirator_fit_tests_employee ON respirator_fit_tests(employee_id);
CREATE INDEX IF NOT EXISTS idx_respirator_fit_tests_date ON respirator_fit_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_respirator_fit_tests_expiration ON respirator_fit_tests(expiration_date);
CREATE INDEX IF NOT EXISTS idx_respirator_fit_tests_result ON respirator_fit_tests(test_result);

CREATE INDEX IF NOT EXISTS idx_safety_footwear_employee ON safety_footwear_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_safety_footwear_issue_date ON safety_footwear_records(issue_date);
CREATE INDEX IF NOT EXISTS idx_safety_footwear_replacement ON safety_footwear_records(replacement_due_date);

CREATE INDEX IF NOT EXISTS idx_footwear_allowances_employee ON safety_footwear_allowances(employee_id);
CREATE INDEX IF NOT EXISTS idx_footwear_allowances_year ON safety_footwear_allowances(fiscal_year);

-- Enable RLS
ALTER TABLE respirator_fit_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE respirator_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_footwear_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_footwear_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE footwear_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to respirator_fit_tests" ON respirator_fit_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to respirator_types" ON respirator_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to safety_footwear_records" ON safety_footwear_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to safety_footwear_allowances" ON safety_footwear_allowances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to footwear_types" ON footwear_types FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_respirator_fit_tests_updated_at
  BEFORE UPDATE ON respirator_fit_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_footwear_records_updated_at
  BEFORE UPDATE ON safety_footwear_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_footwear_allowances_updated_at
  BEFORE UPDATE ON safety_footwear_allowances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default respirator types
INSERT INTO respirator_types (name, category, protection_level, description, manufacturer, models, fit_test_frequency_months) VALUES
('N95 Disposable', 'Filtering Facepiece', 'Particulate', 'Disposable filtering facepiece respirator', '3M', '["8210", "8511", "9205+"]', 12),
('Half-Face APR', 'Air-Purifying', 'Particulate/Gas', 'Reusable half-face air-purifying respirator', '3M', '["6200", "6300", "7502"]', 12),
('Full-Face APR', 'Air-Purifying', 'Particulate/Gas', 'Reusable full-face air-purifying respirator', '3M', '["6800", "6900", "FF-400"]', 12),
('PAPR', 'Powered Air-Purifying', 'Particulate/Gas', 'Powered air-purifying respirator system', 'Honeywell', '["PA700", "PA800"]', 12),
('SCBA', 'Supplied Air', 'IDLH', 'Self-contained breathing apparatus', 'MSA', '["G1", "AirHawk"]', 12)
ON CONFLICT DO NOTHING;

-- Insert default footwear types
INSERT INTO footwear_types (name, category, safety_features, description, replacement_frequency_months) VALUES
('Steel Toe Work Boot', 'Safety Toe', '["Steel Toe", "Slip Resistant", "Oil Resistant"]', 'Standard steel toe work boot for general industrial use', 12),
('Composite Toe Boot', 'Safety Toe', '["Composite Toe", "EH Rated", "Slip Resistant"]', 'Lightweight composite toe boot, EH rated', 12),
('Metatarsal Guard Boot', 'Safety Toe', '["Steel Toe", "Metatarsal Guard", "Puncture Resistant"]', 'Enhanced protection for foot and metatarsal area', 12),
('Slip-On Safety Shoe', 'Safety Toe', '["Steel Toe", "Slip Resistant"]', 'Slip-on style safety shoe for food processing', 12),
('Waterproof Safety Boot', 'Safety Toe', '["Composite Toe", "Waterproof", "Insulated"]', 'Waterproof insulated boot for wet/cold environments', 12),
('Chemical Resistant Boot', 'Chemical', '["Chemical Resistant", "Slip Resistant", "Steel Toe"]', 'Boot for chemical handling areas', 18)
ON CONFLICT DO NOTHING;
