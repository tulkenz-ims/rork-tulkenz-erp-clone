-- Migration: Add location_id to materials table
-- This links materials/inventory items to specific areas/locations within facilities

-- Add location_id column to materials table
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_location_id ON materials(location_id);
CREATE INDEX IF NOT EXISTS idx_materials_facility_location ON materials(facility_id, location_id);

-- Add bin/shelf/aisle columns for more granular storage location within the area
ALTER TABLE materials
ADD COLUMN IF NOT EXISTS bin TEXT,
ADD COLUMN IF NOT EXISTS aisle TEXT,
ADD COLUMN IF NOT EXISTS rack TEXT,
ADD COLUMN IF NOT EXISTS shelf TEXT;

-- Create composite index for storage location lookups
CREATE INDEX IF NOT EXISTS idx_materials_storage_location ON materials(organization_id, facility_id, location_id, bin);

-- Function to update location material count
CREATE OR REPLACE FUNCTION update_location_material_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease count on old location
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.location_id IS DISTINCT FROM NEW.location_id) THEN
    IF OLD.location_id IS NOT NULL THEN
      -- We'll track materials separately from equipment if needed
      -- For now, just log the change
      NULL;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for material location changes
DROP TRIGGER IF EXISTS material_location_change_trigger ON materials;
CREATE TRIGGER material_location_change_trigger
AFTER INSERT OR UPDATE OF location_id OR DELETE ON materials
FOR EACH ROW
EXECUTE FUNCTION update_location_material_count();

-- RLS policies for materials with location access
DROP POLICY IF EXISTS "Users can read materials in their organization" ON materials;
CREATE POLICY "Users can read materials in their organization"
ON materials FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert materials in their organization" ON materials;
CREATE POLICY "Users can insert materials in their organization"
ON materials FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update materials in their organization" ON materials;
CREATE POLICY "Users can update materials in their organization"
ON materials FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete materials in their organization" ON materials;
CREATE POLICY "Users can delete materials in their organization"
ON materials FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

-- Comment for documentation
COMMENT ON COLUMN materials.location_id IS 'Reference to the specific area/location within a facility where this material is stored';
COMMENT ON COLUMN materials.bin IS 'Specific bin location within the area';
COMMENT ON COLUMN materials.aisle IS 'Aisle identifier within the storage area';
COMMENT ON COLUMN materials.rack IS 'Rack identifier within the storage area';
COMMENT ON COLUMN materials.shelf IS 'Shelf identifier within the rack';
