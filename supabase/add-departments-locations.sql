-- ===========================================
-- ADD DEPARTMENTS AND LOCATIONS TABLES
-- Run this in Supabase SQL Editor
-- ===========================================

-- DEPARTMENTS (G/L Account Departments)
-- Hierarchy: Organization -> Facility -> Department -> Location -> Equipment
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  department_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- G/L Account Information
  gl_account TEXT,
  cost_center TEXT,
  profit_center TEXT,
  budget_code TEXT,
  
  -- Hierarchy
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  
  -- Management
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  manager_name TEXT,
  supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  supervisor_name TEXT,
  
  -- Contact Information
  phone TEXT,
  email TEXT,
  
  -- Operational
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  is_production BOOLEAN DEFAULT FALSE,
  is_support BOOLEAN DEFAULT FALSE,
  shift_required BOOLEAN DEFAULT FALSE,
  
  -- Budget/Financial
  annual_budget DECIMAL(14,2),
  ytd_spend DECIMAL(14,2) DEFAULT 0,
  labor_budget DECIMAL(14,2),
  materials_budget DECIMAL(14,2),
  
  -- Headcount
  budgeted_headcount INTEGER,
  actual_headcount INTEGER DEFAULT 0,
  
  -- Metadata
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, department_code)
);

-- LOCATIONS (Physical Locations within Facility)
-- Hierarchy: Organization -> Facility -> Department -> Location -> Equipment
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  location_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Location Type
  location_type TEXT NOT NULL CHECK (location_type IN (
    'building',
    'floor',
    'wing',
    'room',
    'area',
    'zone',
    'line',
    'cell',
    'workstation',
    'storage',
    'dock',
    'yard',
    'other'
  )),
  
  -- Hierarchy
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  path TEXT,
  
  -- Physical Details
  building TEXT,
  floor_number TEXT,
  room_number TEXT,
  area_name TEXT,
  square_footage DECIMAL(10,2),
  
  -- Coordinates/Address
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  address TEXT,
  
  -- Operational
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_construction', 'maintenance', 'restricted', 'archived')),
  is_storage BOOLEAN DEFAULT FALSE,
  is_production BOOLEAN DEFAULT FALSE,
  is_hazardous BOOLEAN DEFAULT FALSE,
  is_climate_controlled BOOLEAN DEFAULT FALSE,
  is_restricted BOOLEAN DEFAULT FALSE,
  
  -- Capacity
  max_occupancy INTEGER,
  current_occupancy INTEGER DEFAULT 0,
  
  -- Temperature/Environment
  temperature_monitored BOOLEAN DEFAULT FALSE,
  min_temperature DECIMAL(6,2),
  max_temperature DECIMAL(6,2),
  humidity_controlled BOOLEAN DEFAULT FALSE,
  
  -- Safety
  fire_zone TEXT,
  emergency_assembly_point TEXT,
  safety_requirements TEXT[] DEFAULT '{}',
  ppe_required TEXT[] DEFAULT '{}',
  
  -- Inventory
  inventory_zone TEXT,
  bin_location TEXT,
  default_gl_account TEXT,
  default_cost_center TEXT,
  
  -- Equipment count (denormalized for performance)
  equipment_count INTEGER DEFAULT 0,
  
  -- Metadata
  barcode TEXT,
  qr_code TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  
  notes TEXT,
  created_by TEXT,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facility_id, location_code)
);

-- Indexes for Departments
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_facility ON departments(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(organization_id, department_code);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_gl_account ON departments(organization_id, gl_account);
CREATE INDEX IF NOT EXISTS idx_departments_cost_center ON departments(organization_id, cost_center);

-- Indexes for Locations
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_facility ON locations(organization_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_locations_department ON locations(department_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(organization_id, facility_id, location_code);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(organization_id, location_type);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_barcode ON locations(organization_id, barcode);

-- RLS for Departments and Locations
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Departments
CREATE POLICY "Allow all operations for authenticated users on departments"
  ON departments FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for Locations
CREATE POLICY "Allow all operations for authenticated users on locations"
  ON locations FOR ALL
  USING (true)
  WITH CHECK (true);

-- Triggers for Departments and Locations
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON locations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add department_id column to employees if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' AND column_name = 'department_id') THEN
    ALTER TABLE employees ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    CREATE INDEX idx_employees_department_id ON employees(department_id);
  END IF;
END $$;

-- Add location_id column to equipment if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'equipment' AND column_name = 'location_id') THEN
    ALTER TABLE equipment ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    CREATE INDEX idx_equipment_location_id ON equipment(location_id);
  END IF;
END $$;

-- Add location_id column to materials if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'materials' AND column_name = 'location_id') THEN
    ALTER TABLE materials ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    CREATE INDEX idx_materials_location_id ON materials(location_id);
  END IF;
END $$;

-- Add location_id column to assets if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'assets' AND column_name = 'location_id') THEN
    ALTER TABLE assets ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
    CREATE INDEX idx_assets_location_id ON assets(location_id);
  END IF;
END $$;
