-- Migration: Global Materials with Facility-Specific Stock
-- 
-- KEY CONCEPT: Materials are GLOBAL, Stock is FACILITY-SPECIFIC
-- 
-- MATERIAL NUMBER (Global - Organization-wide):
-- - Format: [DepartmentPrefix 0-9][6-digit sequence] = 7 digits
-- - Example: 1000001 = First Maintenance part (Dept 1)
-- - The SAME material number is used across ALL facilities
-- - Material 1000001 "Compressor XYZ" is the same part everywhere
-- 
-- FACILITY STOCK (Facility-specific inventory levels):
-- - Format: [FacilityNumber]-[MaterialNumber]
-- - Example: 1-1000001 = Facility 1's stock of material 1000001
--            2-1000001 = Facility 2's stock of material 1000001
-- - Each facility maintains its own on_hand, min_level, max_level, location

-- =====================================================
-- STEP 1: Create Global Materials Master Table
-- =====================================================
-- This is the master catalog - same across ALL facilities

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Global Material Number: [DeptPrefix 0-9][6-digit sequence]
  material_number TEXT NOT NULL,
  inventory_department INTEGER NOT NULL CHECK (inventory_department BETWEEN 0 AND 9),
  
  -- Core Identification
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  sub_category TEXT,
  description TEXT,
  
  -- Pricing (organization-wide standard)
  unit_price DECIMAL(12,4) DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'EA',
  
  -- Vendor/Manufacturer (global for the material)
  vendor TEXT,
  vendor_part_number TEXT,
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  
  -- Barcodes (global identifiers)
  barcode TEXT,
  qr_code TEXT,
  
  -- Lead time (organization-wide default, days)
  lead_time_days INTEGER DEFAULT 0,
  
  -- GL/Cost Accounting (shared across facilities)
  gl_account TEXT,
  cost_center TEXT,
  
  -- Classification
  classification TEXT DEFAULT 'stock' CHECK (classification IN ('stock', 'consumable', 'chargeable', 'shared')),
  charge_to_gl_account TEXT,
  charge_to_gl_description TEXT,
  is_chargeable_to INTEGER[], -- Array of department codes that can be charged
  default_charge_account TEXT,
  
  -- Shared Material Linking (same OEM part across departments)
  shared_group_id TEXT,
  oem_part_number TEXT,
  
  -- Department-specific fields (JSONB for flexibility)
  department_fields JSONB DEFAULT '{}',
  
  -- Labels/Tags
  labels TEXT[],
  
  -- Status & Audit
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued', 'pending_approval')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT materials_number_format CHECK (material_number ~ '^\d{7}$'),
  CONSTRAINT materials_org_number_unique UNIQUE (organization_id, material_number)
);

-- Indexes for materials
CREATE INDEX IF NOT EXISTS idx_materials_org ON materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_materials_number ON materials(organization_id, material_number);
CREATE INDEX IF NOT EXISTS idx_materials_department ON materials(organization_id, inventory_department);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_materials_vendor ON materials(organization_id, vendor);
CREATE INDEX IF NOT EXISTS idx_materials_barcode ON materials(organization_id, barcode);
CREATE INDEX IF NOT EXISTS idx_materials_shared_group ON materials(organization_id, shared_group_id) WHERE shared_group_id IS NOT NULL;

-- =====================================================
-- STEP 2: Create Facility Stock Table
-- =====================================================
-- Each facility maintains its own stock record for global materials

CREATE TABLE IF NOT EXISTS facility_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stock Identifier: [FacilityNumber]-[MaterialNumber]
  stock_id TEXT NOT NULL,
  
  -- References
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL, -- Denormalized for convenience
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  facility_number INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Inventory Levels (facility-specific)
  on_hand DECIMAL(12,4) DEFAULT 0,
  min_level DECIMAL(12,4) DEFAULT 0,
  max_level DECIMAL(12,4) DEFAULT 0,
  reorder_point DECIMAL(12,4),
  reorder_qty DECIMAL(12,4),
  
  -- Location within facility
  location TEXT,
  bin TEXT,
  aisle TEXT,
  rack TEXT,
  shelf TEXT,
  
  -- Usage Statistics (facility-specific)
  avg_daily_usage DECIMAL(12,4),
  avg_monthly_usage DECIMAL(12,4),
  suggested_min DECIMAL(12,4),
  suggested_reorder_qty DECIMAL(12,4),
  
  -- Tracking
  last_counted TIMESTAMPTZ,
  last_adjusted TIMESTAMPTZ,
  last_received TIMESTAMPTZ,
  last_issued TIMESTAMPTZ,
  
  -- Associated asset in this facility
  associated_asset_id UUID,
  
  -- Consumption Tracking (facility-specific)
  consumption_tracking JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT facility_stock_id_format CHECK (stock_id ~ '^\d{1,2}-\d{7}$'),
  CONSTRAINT facility_stock_unique UNIQUE (organization_id, stock_id),
  CONSTRAINT facility_stock_material_facility_unique UNIQUE (material_id, facility_id)
);

-- Indexes for facility_stock
CREATE INDEX IF NOT EXISTS idx_facility_stock_org ON facility_stock(organization_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_material ON facility_stock(material_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_facility ON facility_stock(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_stock_id ON facility_stock(organization_id, stock_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_low ON facility_stock(organization_id, facility_id) WHERE on_hand <= min_level;
CREATE INDEX IF NOT EXISTS idx_facility_stock_location ON facility_stock(organization_id, facility_id, location);

-- =====================================================
-- STEP 3: Create Facility Stock History Table
-- =====================================================

CREATE TABLE IF NOT EXISTS facility_stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_stock_id UUID NOT NULL REFERENCES facility_stock(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN ('adjustment', 'count', 'receive', 'issue', 'transfer_out', 'transfer_in', 'create', 'delete')),
  quantity_before DECIMAL(12,4) NOT NULL,
  quantity_after DECIMAL(12,4) NOT NULL,
  quantity_change DECIMAL(12,4) NOT NULL,
  
  -- Reference information
  reason TEXT,
  reference_type TEXT, -- 'work_order', 'purchase_order', 'transfer', etc.
  reference_id UUID,
  reference_number TEXT,
  
  -- Audit
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  -- For transfers
  from_facility_id UUID REFERENCES facilities(id),
  to_facility_id UUID REFERENCES facilities(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_history_stock ON facility_stock_history(facility_stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_material ON facility_stock_history(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_facility ON facility_stock_history(facility_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_date ON facility_stock_history(organization_id, performed_at);

-- =====================================================
-- STEP 4: Create Inter-Facility Transfer Table
-- =====================================================

CREATE TABLE IF NOT EXISTS inter_facility_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Transfer reference
  transfer_number TEXT NOT NULL,
  
  -- Material being transferred (global material)
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  
  -- From/To facilities
  from_facility_id UUID NOT NULL REFERENCES facilities(id),
  from_facility_number INTEGER NOT NULL,
  from_stock_id TEXT NOT NULL,
  to_facility_id UUID NOT NULL REFERENCES facilities(id),
  to_facility_number INTEGER NOT NULL,
  to_stock_id TEXT NOT NULL,
  
  -- Transfer details
  quantity DECIMAL(12,4) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12,4) DEFAULT 0,
  total_value DECIMAL(12,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'received', 'cancelled')),
  
  -- Workflow
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  shipped_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  
  -- Shipping info
  tracking_number TEXT,
  carrier TEXT,
  estimated_arrival TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Constraints
  CONSTRAINT transfer_different_facilities CHECK (from_facility_id != to_facility_id),
  CONSTRAINT transfer_number_unique UNIQUE (organization_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_transfers_org ON inter_facility_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_material ON inter_facility_transfers(material_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON inter_facility_transfers(from_facility_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON inter_facility_transfers(to_facility_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inter_facility_transfers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON inter_facility_transfers(organization_id, requested_at);

-- =====================================================
-- STEP 5: Create Charge Records Table
-- =====================================================

CREATE TABLE IF NOT EXISTS material_charge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Material info
  facility_stock_id UUID NOT NULL REFERENCES facility_stock(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_number TEXT NOT NULL,
  
  -- Charge details
  from_department_id UUID REFERENCES departments(id),
  from_department_code TEXT,
  to_department_id UUID REFERENCES departments(id),
  to_department_code TEXT,
  
  quantity DECIMAL(12,4) NOT NULL,
  unit_cost DECIMAL(12,4) NOT NULL,
  total_cost DECIMAL(12,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  charge_gl_account TEXT NOT NULL,
  
  -- Workflow
  issued_by UUID REFERENCES users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  
  -- Reference
  work_order_id UUID,
  work_order_number TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_charges_org ON material_charge_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_charges_facility ON material_charge_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_charges_material ON material_charge_records(material_id);
CREATE INDEX IF NOT EXISTS idx_charges_date ON material_charge_records(organization_id, issued_at);

-- =====================================================
-- STEP 6: Helper Functions
-- =====================================================

-- Function to generate global material number (department prefix + sequence)
CREATE OR REPLACE FUNCTION generate_global_material_number(
  p_department_code INTEGER,
  p_sequence INTEGER
) RETURNS TEXT AS $$
BEGIN
  IF p_department_code < 0 OR p_department_code > 9 THEN
    RAISE EXCEPTION 'Department code must be between 0 and 9';
  END IF;
  IF p_sequence < 1 OR p_sequence > 999999 THEN
    RAISE EXCEPTION 'Sequence must be between 1 and 999999';
  END IF;
  RETURN p_department_code::TEXT || LPAD(p_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse global material number
CREATE OR REPLACE FUNCTION parse_global_material_number(
  p_material_number TEXT
) RETURNS TABLE (
  department_code INTEGER,
  sequence_number INTEGER
) AS $$
BEGIN
  IF p_material_number !~ '^\d{7}$' THEN
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    LEFT(p_material_number, 1)::INTEGER,
    RIGHT(p_material_number, 6)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate facility stock ID
CREATE OR REPLACE FUNCTION generate_facility_stock_id(
  p_facility_number INTEGER,
  p_material_number TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_facility_number < 1 OR p_facility_number > 99 THEN
    RAISE EXCEPTION 'Facility number must be between 1 and 99';
  END IF;
  IF p_material_number !~ '^\d{7}$' THEN
    RAISE EXCEPTION 'Material number must be 7 digits';
  END IF;
  RETURN p_facility_number::TEXT || '-' || p_material_number;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse facility stock ID
CREATE OR REPLACE FUNCTION parse_facility_stock_id(
  p_stock_id TEXT
) RETURNS TABLE (
  facility_number INTEGER,
  material_number TEXT
) AS $$
DECLARE
  v_parts TEXT[];
BEGIN
  IF p_stock_id !~ '^\d{1,2}-\d{7}$' THEN
    RETURN;
  END IF;
  
  v_parts := string_to_array(p_stock_id, '-');
  RETURN QUERY SELECT 
    v_parts[1]::INTEGER,
    v_parts[2];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next material number for a department
CREATE OR REPLACE FUNCTION get_next_material_number(
  p_organization_id UUID,
  p_department_code INTEGER
) RETURNS TEXT AS $$
DECLARE
  v_max_sequence INTEGER;
  v_prefix TEXT;
BEGIN
  v_prefix := p_department_code::TEXT;
  
  SELECT COALESCE(MAX(RIGHT(material_number, 6)::INTEGER), 0)
  INTO v_max_sequence
  FROM materials
  WHERE organization_id = p_organization_id
    AND material_number LIKE v_prefix || '%';
  
  RETURN generate_global_material_number(p_department_code, v_max_sequence + 1);
END;
$$ LANGUAGE plpgsql;

-- Function to get next transfer number
CREATE OR REPLACE FUNCTION get_next_transfer_number(
  p_organization_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1
  INTO v_count
  FROM inter_facility_transfers
  WHERE organization_id = p_organization_id;
  
  RETURN 'IFT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Triggers
-- =====================================================

-- Trigger to auto-generate stock_id
CREATE OR REPLACE FUNCTION trigger_generate_stock_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_id IS NULL THEN
    NEW.stock_id := generate_facility_stock_id(NEW.facility_number, NEW.material_number);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_facility_stock_generate_id
  BEFORE INSERT ON facility_stock
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_stock_id();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER tr_facility_stock_updated_at
  BEFORE UPDATE ON facility_stock
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

-- Trigger to validate material number department matches
CREATE OR REPLACE FUNCTION trigger_validate_material_department()
RETURNS TRIGGER AS $$
DECLARE
  v_dept INTEGER;
BEGIN
  v_dept := LEFT(NEW.material_number, 1)::INTEGER;
  IF v_dept != NEW.inventory_department THEN
    RAISE EXCEPTION 'Material number prefix (%) does not match inventory_department (%)', 
      v_dept, NEW.inventory_department;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_materials_validate_department
  BEFORE INSERT OR UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validate_material_department();

-- =====================================================
-- STEP 8: Views for Common Queries
-- =====================================================

-- View: Material with all facility stock levels
CREATE OR REPLACE VIEW v_material_stock_summary AS
SELECT 
  m.id AS material_id,
  m.organization_id,
  m.material_number,
  m.name,
  m.sku,
  m.category,
  m.inventory_department,
  m.unit_price,
  m.unit_of_measure,
  m.classification,
  m.status,
  COALESCE(SUM(fs.on_hand), 0) AS total_on_hand,
  COALESCE(SUM(fs.on_hand * m.unit_price), 0) AS total_value,
  COUNT(fs.id) AS facility_count,
  jsonb_agg(
    jsonb_build_object(
      'facility_id', fs.facility_id,
      'facility_number', fs.facility_number,
      'on_hand', fs.on_hand,
      'min_level', fs.min_level,
      'location', fs.location
    )
  ) FILTER (WHERE fs.id IS NOT NULL) AS facility_breakdown
FROM materials m
LEFT JOIN facility_stock fs ON fs.material_id = m.id AND fs.is_active = TRUE
GROUP BY m.id;

-- View: Low stock alerts across all facilities
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT 
  fs.id AS stock_id,
  fs.organization_id,
  fs.facility_id,
  fs.facility_number,
  f.name AS facility_name,
  fs.material_id,
  fs.material_number,
  m.name AS material_name,
  m.inventory_department,
  fs.on_hand,
  fs.min_level,
  fs.max_level,
  fs.location,
  m.unit_price,
  (fs.min_level - fs.on_hand) AS shortage_qty,
  ((fs.min_level - fs.on_hand) * m.unit_price) AS shortage_value
FROM facility_stock fs
JOIN materials m ON m.id = fs.material_id
JOIN facilities f ON f.id = fs.facility_id
WHERE fs.on_hand <= fs.min_level
  AND fs.is_active = TRUE
  AND m.status = 'active';

-- View: Pending inter-facility transfers
CREATE OR REPLACE VIEW v_pending_transfers AS
SELECT 
  ift.*,
  m.name AS material_name,
  ff.name AS from_facility_name,
  tf.name AS to_facility_name,
  ru.full_name AS requested_by_name
FROM inter_facility_transfers ift
JOIN materials m ON m.id = ift.material_id
JOIN facilities ff ON ff.id = ift.from_facility_id
JOIN facilities tf ON tf.id = ift.to_facility_id
LEFT JOIN users ru ON ru.id = ift.requested_by
WHERE ift.status IN ('pending', 'approved', 'in_transit');

-- =====================================================
-- STEP 9: Comments for Documentation
-- =====================================================

COMMENT ON TABLE materials IS 'Global material master catalog - same material numbers across ALL facilities';
COMMENT ON TABLE facility_stock IS 'Facility-specific inventory levels for global materials';
COMMENT ON TABLE inter_facility_transfers IS 'Transfers of materials between facilities';
COMMENT ON TABLE material_charge_records IS 'Records of materials charged to departments';

COMMENT ON COLUMN materials.material_number IS 'Global material number: [DeptPrefix 0-9][6-digit sequence]. Same across all facilities.';
COMMENT ON COLUMN facility_stock.stock_id IS 'Facility stock identifier: [FacilityNumber]-[MaterialNumber]. Unique per facility.';

COMMENT ON FUNCTION generate_global_material_number IS 'Generates global material number from department code and sequence';
COMMENT ON FUNCTION generate_facility_stock_id IS 'Generates facility stock ID from facility number and material number';
COMMENT ON FUNCTION get_next_material_number IS 'Gets the next available material number for a department in an organization';
