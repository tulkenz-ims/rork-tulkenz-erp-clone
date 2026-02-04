-- Create cmms_stock_levels table
CREATE TABLE IF NOT EXISTS cmms_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID,
  material_number TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_sku TEXT,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  inventory_department INTEGER DEFAULT 0,
  category TEXT,
  on_hand NUMERIC(15, 4) DEFAULT 0,
  min_level NUMERIC(15, 4) DEFAULT 0,
  max_level NUMERIC(15, 4) DEFAULT 0,
  reorder_point NUMERIC(15, 4) DEFAULT 0,
  reorder_qty NUMERIC(15, 4) DEFAULT 0,
  unit_cost NUMERIC(15, 4) DEFAULT 0,
  total_value NUMERIC(15, 4) DEFAULT 0,
  location TEXT,
  bin TEXT,
  last_received TIMESTAMPTZ,
  last_issued TIMESTAMPTZ,
  avg_daily_usage NUMERIC(15, 4) DEFAULT 0,
  avg_monthly_usage NUMERIC(15, 4) DEFAULT 0,
  days_of_supply NUMERIC(15, 4) DEFAULT 0,
  status TEXT DEFAULT 'ok' CHECK (status IN ('ok', 'low', 'critical', 'overstock', 'out_of_stock')),
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cmms_stock_levels_org ON cmms_stock_levels(organization_id);
CREATE INDEX IF NOT EXISTS idx_cmms_stock_levels_facility ON cmms_stock_levels(facility_id);
CREATE INDEX IF NOT EXISTS idx_cmms_stock_levels_status ON cmms_stock_levels(status);
CREATE INDEX IF NOT EXISTS idx_cmms_stock_levels_material ON cmms_stock_levels(material_number);

-- Enable RLS
ALTER TABLE cmms_stock_levels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view stock levels in their organization"
  ON cmms_stock_levels FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert stock levels in their organization"
  ON cmms_stock_levels FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update stock levels in their organization"
  ON cmms_stock_levels FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete stock levels in their organization"
  ON cmms_stock_levels FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_cmms_stock_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cmms_stock_levels_updated_at
  BEFORE UPDATE ON cmms_stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_cmms_stock_levels_updated_at();
