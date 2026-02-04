-- Migration: Add location_id to equipment table
-- This links equipment to specific areas/locations within facilities

-- Add location_id column to equipment table
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_location_id ON equipment(location_id);
CREATE INDEX IF NOT EXISTS idx_equipment_facility_location ON equipment(facility_id, location_id);

-- Add RLS policies for equipment with location access
-- Users can read equipment in their organization
DROP POLICY IF EXISTS "Users can read equipment in their organization" ON equipment;
CREATE POLICY "Users can read equipment in their organization"
ON equipment FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

-- Users can insert equipment in their organization
DROP POLICY IF EXISTS "Users can insert equipment in their organization" ON equipment;
CREATE POLICY "Users can insert equipment in their organization"
ON equipment FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

-- Users can update equipment in their organization
DROP POLICY IF EXISTS "Users can update equipment in their organization" ON equipment;
CREATE POLICY "Users can update equipment in their organization"
ON equipment FOR UPDATE
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

-- Users can delete equipment in their organization
DROP POLICY IF EXISTS "Users can delete equipment in their organization" ON equipment;
CREATE POLICY "Users can delete equipment in their organization"
ON equipment FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM employees WHERE id = auth.uid()
  )
);

-- Function to update location equipment count
CREATE OR REPLACE FUNCTION update_location_equipment_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease count on old location
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.location_id IS DISTINCT FROM NEW.location_id) THEN
    IF OLD.location_id IS NOT NULL THEN
      UPDATE locations 
      SET equipment_count = GREATEST(0, equipment_count - 1)
      WHERE id = OLD.location_id;
    END IF;
  END IF;
  
  -- Increase count on new location
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.location_id IS DISTINCT FROM NEW.location_id) THEN
    IF NEW.location_id IS NOT NULL THEN
      UPDATE locations 
      SET equipment_count = equipment_count + 1
      WHERE id = NEW.location_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for equipment count updates
DROP TRIGGER IF EXISTS equipment_location_count_trigger ON equipment;
CREATE TRIGGER equipment_location_count_trigger
AFTER INSERT OR UPDATE OF location_id OR DELETE ON equipment
FOR EACH ROW
EXECUTE FUNCTION update_location_equipment_count();

-- Comment for documentation
COMMENT ON COLUMN equipment.location_id IS 'Reference to the specific area/location within a facility where this equipment is located';
