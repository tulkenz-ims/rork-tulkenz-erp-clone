-- Chemical Inventory Table
CREATE TABLE IF NOT EXISTS chemical_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_name TEXT NOT NULL,
  manufacturer TEXT,
  product_code TEXT,
  cas_number TEXT,
  storage_location TEXT NOT NULL,
  container_size TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'gallons',
  hazard_class TEXT[] DEFAULT '{}',
  storage_requirements TEXT[] DEFAULT '{}',
  date_received DATE,
  expiration_date DATE,
  lot_number TEXT,
  minimum_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'adequate' CHECK (status IN ('adequate', 'low', 'critical', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Equipment Table
CREATE TABLE IF NOT EXISTS emergency_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  location TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  nearest_landmark TEXT,
  grid_reference TEXT,
  accessibility TEXT,
  last_inspection DATE,
  next_inspection DATE,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('good', 'fair', 'poor', 'out_of_service')),
  signage_present BOOLEAN DEFAULT true,
  signage_condition TEXT,
  obstructions BOOLEAN DEFAULT false,
  obstruction_details TEXT,
  special_instructions TEXT,
  responsible_person TEXT,
  added_by TEXT,
  added_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hazardous Waste Table
CREATE TABLE IF NOT EXISTS haz_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_description TEXT NOT NULL,
  waste_code TEXT[] DEFAULT '{}',
  generator TEXT,
  container_type TEXT,
  container_count INTEGER DEFAULT 1,
  quantity TEXT,
  unit TEXT DEFAULT 'gallons',
  storage_location TEXT NOT NULL,
  accumulation_start_date DATE,
  manifest_number TEXT,
  transporter_name TEXT,
  tsd_facility TEXT,
  pickup_date DATE,
  status TEXT DEFAULT 'accumulating' CHECK (status IN ('accumulating', 'ready_pickup', 'manifested', 'shipped', 'disposed')),
  hazard_characteristics TEXT[] DEFAULT '{}',
  handling_instructions TEXT,
  prepared_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SDS Index Table
CREATE TABLE IF NOT EXISTS sds_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  product_code TEXT,
  sds_revision_date DATE,
  locations TEXT[] DEFAULT '{}',
  hazard_class TEXT[] DEFAULT '{}',
  ghs_pictograms TEXT[] DEFAULT '{}',
  signal_word TEXT DEFAULT 'Warning' CHECK (signal_word IN ('Danger', 'Warning', 'None')),
  status TEXT DEFAULT 'current' CHECK (status IN ('current', 'review_needed', 'expired')),
  last_reviewed DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_status ON chemical_inventory(status);
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_location ON chemical_inventory(storage_location);
CREATE INDEX IF NOT EXISTS idx_emergency_equipment_type ON emergency_equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_emergency_equipment_building ON emergency_equipment(building);
CREATE INDEX IF NOT EXISTS idx_haz_waste_status ON haz_waste(status);
CREATE INDEX IF NOT EXISTS idx_sds_index_status ON sds_index(status);

-- Enable RLS
ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE haz_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE sds_index ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chemical_inventory
CREATE POLICY "Enable read access for all users" ON chemical_inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON chemical_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON chemical_inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON chemical_inventory FOR DELETE USING (true);

-- RLS Policies for emergency_equipment
CREATE POLICY "Enable read access for all users" ON emergency_equipment FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON emergency_equipment FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON emergency_equipment FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON emergency_equipment FOR DELETE USING (true);

-- RLS Policies for haz_waste
CREATE POLICY "Enable read access for all users" ON haz_waste FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON haz_waste FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON haz_waste FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON haz_waste FOR DELETE USING (true);

-- RLS Policies for sds_index
CREATE POLICY "Enable read access for all users" ON sds_index FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON sds_index FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON sds_index FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON sds_index FOR DELETE USING (true);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chemical_inventory_updated_at BEFORE UPDATE ON chemical_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_equipment_updated_at BEFORE UPDATE ON emergency_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_haz_waste_updated_at BEFORE UPDATE ON haz_waste FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sds_index_updated_at BEFORE UPDATE ON sds_index FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
