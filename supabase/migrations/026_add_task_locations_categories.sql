-- Create task_locations table for Task Feed
CREATE TABLE IF NOT EXISTS task_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  department_code TEXT,
  facility_code TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Create task_categories table for Task Feed
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department_code TEXT,
  locations TEXT[] DEFAULT '{}',
  actions TEXT[] DEFAULT '{}',
  requires_photo BOOLEAN DEFAULT FALSE,
  requires_notes BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add linked_work_order_id column to task_verifications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_verifications' AND column_name = 'linked_work_order_id'
  ) THEN
    ALTER TABLE task_verifications ADD COLUMN linked_work_order_id UUID;
  END IF;
END $$;

-- Add photo_uri column to task_verifications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_verifications' AND column_name = 'photo_uri'
  ) THEN
    ALTER TABLE task_verifications ADD COLUMN photo_uri TEXT;
  END IF;
END $$;

-- Indexes for task_locations
CREATE INDEX IF NOT EXISTS idx_task_locations_org ON task_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_locations_dept ON task_locations(organization_id, department_code);
CREATE INDEX IF NOT EXISTS idx_task_locations_active ON task_locations(organization_id, active);

-- Indexes for task_categories
CREATE INDEX IF NOT EXISTS idx_task_categories_org ON task_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_dept ON task_categories(organization_id, department_code);
CREATE INDEX IF NOT EXISTS idx_task_categories_active ON task_categories(organization_id, active);

-- Enable RLS
ALTER TABLE task_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_locations
DROP POLICY IF EXISTS "task_locations_select" ON task_locations;
CREATE POLICY "task_locations_select" ON task_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "task_locations_insert" ON task_locations;
CREATE POLICY "task_locations_insert" ON task_locations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "task_locations_update" ON task_locations;
CREATE POLICY "task_locations_update" ON task_locations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "task_locations_delete" ON task_locations;
CREATE POLICY "task_locations_delete" ON task_locations FOR DELETE USING (true);

-- RLS Policies for task_categories
DROP POLICY IF EXISTS "task_categories_select" ON task_categories;
CREATE POLICY "task_categories_select" ON task_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "task_categories_insert" ON task_categories;
CREATE POLICY "task_categories_insert" ON task_categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "task_categories_update" ON task_categories;
CREATE POLICY "task_categories_update" ON task_categories FOR UPDATE USING (true);

DROP POLICY IF EXISTS "task_categories_delete" ON task_categories;
CREATE POLICY "task_categories_delete" ON task_categories FOR DELETE USING (true);

-- Updated at triggers
DROP TRIGGER IF EXISTS update_task_locations_updated_at ON task_locations;
CREATE TRIGGER update_task_locations_updated_at 
  BEFORE UPDATE ON task_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_categories_updated_at ON task_categories;
CREATE TRIGGER update_task_categories_updated_at 
  BEFORE UPDATE ON task_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default task locations (Production Facility)
-- These can be customized per organization
INSERT INTO task_locations (organization_id, code, name, department_code, facility_code, active)
SELECT 
  o.id as organization_id,
  loc.code,
  loc.name,
  loc.department_code,
  'FAC-001' as facility_code,
  true as active
FROM organizations o
CROSS JOIN (VALUES
  ('LOC-PROD-001', 'Production Line 1', '2000'),
  ('LOC-PROD-002', 'Production Line 2', '2000'),
  ('LOC-PROD-003', 'Production Line 3', '2000'),
  ('LOC-PKG-001', 'Packaging Line 1', '2000'),
  ('LOC-PKG-002', 'Packaging Line 2', '2000'),
  ('LOC-COOLER', 'Cooler Area', '2000'),
  ('LOC-FREEZER', 'Freezer Area', '2000'),
  ('LOC-WAREHOUSE', 'Warehouse', '6000'),
  ('LOC-DOCK', 'Loading Dock', '6000'),
  ('LOC-QA-LAB', 'QA Laboratory', '4000'),
  ('LOC-MAINT-SHOP', 'Maintenance Shop', '3000'),
  ('LOC-SANITATION', 'Sanitation Area', '5000'),
  ('LOC-BREAK-ROOM', 'Break Room', '1000'),
  ('LOC-OFFICE', 'Office Area', '1000'),
  ('LOC-RECEIVING', 'Receiving Area', '6000'),
  ('LOC-SHIPPING', 'Shipping Area', '6000'),
  ('LOC-RAW-MAT', 'Raw Materials Storage', '6000'),
  ('LOC-FINISHED', 'Finished Goods Storage', '6000'),
  ('LOC-CHEM-STOR', 'Chemical Storage', '5000'),
  ('LOC-EQUIP-001', 'Equipment Room 1', '3000'),
  ('LOC-EQUIP-002', 'Equipment Room 2', '3000'),
  ('LOC-UTIL', 'Utility Room', '3000')
) AS loc(code, name, department_code)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Insert default task categories
INSERT INTO task_categories (organization_id, name, department_code, actions, requires_photo, requires_notes, active)
SELECT 
  o.id as organization_id,
  cat.name,
  cat.department_code,
  cat.actions,
  cat.requires_photo,
  cat.requires_notes,
  true as active
FROM organizations o
CROSS JOIN (VALUES
  ('Equipment Check', '3000', ARRAY['Inspected', 'Cleaned', 'Lubricated', 'Adjusted', 'Repaired'], true, false),
  ('Sanitation Task', '5000', ARRAY['Cleaned', 'Sanitized', 'Disinfected', 'Verified Clean'], true, false),
  ('Quality Check', '4000', ARRAY['Passed Inspection', 'Failed Inspection', 'Needs Review', 'Documented'], true, true),
  ('Safety Inspection', '7000', ARRAY['Passed', 'Failed', 'Corrected', 'Reported'], true, true),
  ('Production Task', '2000', ARRAY['Started', 'Completed', 'Paused', 'Verified'], true, false),
  ('Inventory Task', '6000', ARRAY['Received', 'Stored', 'Picked', 'Shipped', 'Counted'], false, true),
  ('Issue Reported', NULL, ARRAY['Equipment Down', 'Safety Hazard', 'Spill', 'Maintenance Needed', 'Other'], true, true),
  ('Work Order Complete', '3000', ARRAY['Completed as Planned', 'Completed with Modifications', 'Parts Replaced', 'Calibrated'], true, true),
  ('Temperature Log', '4000', ARRAY['Within Range', 'Out of Range - Corrected', 'Out of Range - Reported'], false, true),
  ('Cleaning Verification', '5000', ARRAY['Pre-Op Verified', 'Mid-Shift Verified', 'Post-Op Verified'], true, false)
) AS cat(name, department_code, actions, requires_photo, requires_notes)
ON CONFLICT DO NOTHING;
