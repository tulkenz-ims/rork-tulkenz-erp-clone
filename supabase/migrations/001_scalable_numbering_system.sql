-- Migration: Scalable Multi-Facility Numbering System
-- 
-- NUMBERING SYSTEM:
-- - Facility Number: 1-99 (1-9 standard, 10+ for large organizations)
-- - Department Code: [FacilityNumber][BaseCode 3 digits] (e.g., F1: 1000-1010, F2: 2000-2010)
-- - Material Code: [FacilityNumber][6 digits] (e.g., F1: 1000001, F2: 2000001)
-- - GL codes are shared across facilities

-- =====================================================
-- STEP 1: Add facility_number to facilities table
-- =====================================================

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS facility_number INTEGER;

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS zip_code TEXT;

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';

-- Update existing facilities with sequential facility numbers
DO $$
DECLARE
  r RECORD;
  counter INTEGER := 1;
  current_org UUID := NULL;
BEGIN
  FOR r IN 
    SELECT id, organization_id 
    FROM facilities 
    WHERE facility_number IS NULL
    ORDER BY organization_id, created_at
  LOOP
    IF current_org IS NULL OR current_org != r.organization_id THEN
      current_org := r.organization_id;
      counter := 1;
    END IF;
    
    UPDATE facilities 
    SET facility_number = counter 
    WHERE id = r.id;
    
    counter := counter + 1;
  END LOOP;
END $$;

-- Now add NOT NULL constraint and check
ALTER TABLE facilities 
ALTER COLUMN facility_number SET NOT NULL;

ALTER TABLE facilities
ADD CONSTRAINT facilities_facility_number_check 
CHECK (facility_number >= 1);

-- Add unique constraint for facility_number per organization
ALTER TABLE facilities
DROP CONSTRAINT IF EXISTS facilities_org_facility_number_unique;

ALTER TABLE facilities
ADD CONSTRAINT facilities_org_facility_number_unique 
UNIQUE (organization_id, facility_number);

-- =====================================================
-- STEP 2: Update departments table for scalable codes
-- =====================================================

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS base_department_code INTEGER;

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS facility_number INTEGER;

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS short_name TEXT;

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS gl_code_prefix TEXT;

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS inventory_department_code INTEGER;

-- Add check constraint for base_department_code
ALTER TABLE departments
ADD CONSTRAINT departments_base_code_check 
CHECK (base_department_code BETWEEN 0 AND 999);

-- Add check constraint for inventory_department_code
ALTER TABLE departments
ADD CONSTRAINT departments_inventory_code_check 
CHECK (inventory_department_code BETWEEN 0 AND 9);

-- =====================================================
-- STEP 3: Migrate existing department codes to new format
-- =====================================================

-- Update departments with facility_number from their linked facility
UPDATE departments d
SET facility_number = f.facility_number
FROM facilities f
WHERE d.facility_id = f.id
AND d.facility_number IS NULL;

-- For departments without facility_id, default to facility 1
UPDATE departments
SET facility_number = 1
WHERE facility_number IS NULL;

-- Parse existing department codes to extract base codes
-- Assuming existing codes like '1001', '1002', etc.
UPDATE departments
SET base_department_code = 
  CASE 
    WHEN department_code ~ '^\d{4}$' THEN (department_code::INTEGER % 1000)
    WHEN department_code ~ '^\d{5}$' THEN (department_code::INTEGER % 1000)
    ELSE 0
  END
WHERE base_department_code IS NULL;

-- Update department_code to new format: [facility_number][base_code padded to 3 digits]
UPDATE departments
SET department_code = facility_number::TEXT || LPAD(base_department_code::TEXT, 3, '0')
WHERE base_department_code IS NOT NULL;

-- Set short_name based on name
UPDATE departments
SET short_name = 
  CASE 
    WHEN LOWER(name) LIKE '%maintenance%' THEN 'MAINT'
    WHEN LOWER(name) LIKE '%sanitation%' THEN 'SANI'
    WHEN LOWER(name) LIKE '%production%' THEN 'PROD'
    WHEN LOWER(name) LIKE '%quality%' THEN 'QUAL'
    WHEN LOWER(name) LIKE '%safety%' THEN 'SAFE'
    WHEN LOWER(name) LIKE '%hr%' OR LOWER(name) LIKE '%human%' THEN 'HR'
    WHEN LOWER(name) LIKE '%warehouse%' THEN 'WARE'
    WHEN LOWER(name) LIKE '%it%' OR LOWER(name) LIKE '%tech%' THEN 'IT'
    WHEN LOWER(name) LIKE '%facilities%' THEN 'FAC'
    WHEN LOWER(name) LIKE '%office%' OR LOWER(name) LIKE '%admin%' THEN 'PROJ'
    ELSE UPPER(LEFT(name, 4))
  END
WHERE short_name IS NULL;

-- Set gl_code_prefix based on existing gl_account or department type
UPDATE departments
SET gl_code_prefix = 
  CASE 
    WHEN gl_account IS NOT NULL AND LENGTH(gl_account) >= 4 THEN LEFT(gl_account, 4)
    WHEN LOWER(name) LIKE '%maintenance%' THEN '5000'
    WHEN LOWER(name) LIKE '%sanitation%' THEN '5100'
    WHEN LOWER(name) LIKE '%production%' THEN '5200'
    WHEN LOWER(name) LIKE '%quality%' THEN '5300'
    WHEN LOWER(name) LIKE '%safety%' THEN '5400'
    WHEN LOWER(name) LIKE '%hr%' OR LOWER(name) LIKE '%human%' THEN '5500'
    WHEN LOWER(name) LIKE '%warehouse%' THEN '5700'
    WHEN LOWER(name) LIKE '%office%' OR LOWER(name) LIKE '%admin%' THEN '5800'
    WHEN LOWER(name) LIKE '%it%' OR LOWER(name) LIKE '%tech%' THEN '5850'
    WHEN LOWER(name) LIKE '%facilities%' THEN '5900'
    ELSE '5999'
  END
WHERE gl_code_prefix IS NULL;

-- Set inventory_department_code based on department type
UPDATE departments
SET inventory_department_code = 
  CASE 
    WHEN LOWER(name) LIKE '%office%' OR LOWER(name) LIKE '%admin%' THEN 1
    WHEN LOWER(name) LIKE '%quality%' THEN 2
    WHEN LOWER(name) LIKE '%maintenance%' THEN 3
    WHEN LOWER(name) LIKE '%production%' THEN 4
    WHEN LOWER(name) LIKE '%safety%' THEN 5
    WHEN LOWER(name) LIKE '%sanitation%' THEN 6
    WHEN LOWER(name) LIKE '%warehouse%' THEN 7
    WHEN LOWER(name) LIKE '%it%' OR LOWER(name) LIKE '%tech%' THEN 8
    WHEN LOWER(name) LIKE '%facilities%' THEN 9
    ELSE 0
  END
WHERE inventory_department_code IS NULL;

-- =====================================================
-- STEP 4: Update unique constraints
-- =====================================================

-- Drop old constraint if exists
ALTER TABLE departments
DROP CONSTRAINT IF EXISTS departments_organization_id_facility_id_department_code_key;

-- Add new constraint for base_department_code per facility
ALTER TABLE departments
DROP CONSTRAINT IF EXISTS departments_org_facility_base_code_unique;

ALTER TABLE departments
ADD CONSTRAINT departments_org_facility_base_code_unique 
UNIQUE (organization_id, facility_id, base_department_code);

-- =====================================================
-- STEP 5: Create helper functions
-- =====================================================

-- Function to generate department code from facility number and base code
CREATE OR REPLACE FUNCTION generate_department_code(
  p_facility_number INTEGER,
  p_base_code INTEGER
) RETURNS TEXT AS $$
BEGIN
  IF p_facility_number < 1 OR p_facility_number > 99 THEN
    RAISE EXCEPTION 'Facility number must be between 1 and 99';
  END IF;
  IF p_base_code < 0 OR p_base_code > 999 THEN
    RAISE EXCEPTION 'Base code must be between 0 and 999';
  END IF;
  RETURN p_facility_number::TEXT || LPAD(p_base_code::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate material number from facility number and sequence
CREATE OR REPLACE FUNCTION generate_material_number(
  p_facility_number INTEGER,
  p_sequence INTEGER
) RETURNS TEXT AS $$
BEGIN
  IF p_facility_number < 1 OR p_facility_number > 99 THEN
    RAISE EXCEPTION 'Facility number must be between 1 and 99';
  END IF;
  IF p_sequence < 1 OR p_sequence > 999999 THEN
    RAISE EXCEPTION 'Sequence must be between 1 and 999999';
  END IF;
  RETURN p_facility_number::TEXT || LPAD(p_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse department code
CREATE OR REPLACE FUNCTION parse_department_code(
  p_department_code TEXT
) RETURNS TABLE (
  facility_number INTEGER,
  base_code INTEGER
) AS $$
DECLARE
  v_facility INTEGER;
  v_base INTEGER;
BEGIN
  IF p_department_code ~ '^\d{4}$' THEN
    v_facility := LEFT(p_department_code, 1)::INTEGER;
    v_base := RIGHT(p_department_code, 3)::INTEGER;
  ELSIF p_department_code ~ '^\d{5}$' THEN
    v_facility := LEFT(p_department_code, 2)::INTEGER;
    v_base := RIGHT(p_department_code, 3)::INTEGER;
  ELSE
    RETURN;
  END IF;
  
  RETURN QUERY SELECT v_facility, v_base;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse material number
CREATE OR REPLACE FUNCTION parse_material_number(
  p_material_number TEXT
) RETURNS TABLE (
  facility_number INTEGER,
  sequence INTEGER
) AS $$
DECLARE
  v_facility INTEGER;
  v_sequence INTEGER;
BEGIN
  IF p_material_number ~ '^\d{7}$' THEN
    v_facility := LEFT(p_material_number, 1)::INTEGER;
    v_sequence := RIGHT(p_material_number, 6)::INTEGER;
  ELSIF p_material_number ~ '^\d{8}$' THEN
    v_facility := LEFT(p_material_number, 2)::INTEGER;
    v_sequence := RIGHT(p_material_number, 6)::INTEGER;
  ELSE
    RETURN;
  END IF;
  
  RETURN QUERY SELECT v_facility, v_sequence;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 6: Create indexes for new columns
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_facilities_number ON facilities(organization_id, facility_number);
CREATE INDEX IF NOT EXISTS idx_departments_facility_number ON departments(organization_id, facility_number);
CREATE INDEX IF NOT EXISTS idx_departments_base_code ON departments(organization_id, base_department_code);
CREATE INDEX IF NOT EXISTS idx_departments_inventory_code ON departments(organization_id, inventory_department_code);

-- =====================================================
-- STEP 7: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN facilities.facility_number IS 'Unique facility number within organization (1-99). Used as prefix for department codes and material numbers.';
COMMENT ON COLUMN departments.base_department_code IS 'Base department code (0-999). Combined with facility_number to form full department_code.';
COMMENT ON COLUMN departments.facility_number IS 'Facility number this department belongs to. Used for generating department_code.';
COMMENT ON COLUMN departments.inventory_department_code IS 'Inventory department code (1-9) used as first digit of material numbers for this department.';
COMMENT ON COLUMN departments.gl_code_prefix IS '4-digit GL code prefix. Shared across facilities for same department type.';

COMMENT ON FUNCTION generate_department_code IS 'Generates department code from facility number and base code. Format: [facility_number][base_code padded to 3 digits]';
COMMENT ON FUNCTION generate_material_number IS 'Generates material number from facility number and sequence. Format: [facility_number][sequence padded to 6 digits]';
