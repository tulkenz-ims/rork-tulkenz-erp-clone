-- Fix Login RLS Policies
-- Run this in Supabase SQL Editor

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow public read for login" ON employees;
DROP POLICY IF EXISTS "Allow public read for login" ON organizations;
DROP POLICY IF EXISTS "Allow public read for login" ON facilities;
DROP POLICY IF EXISTS "Allow all for employees" ON employees;
DROP POLICY IF EXISTS "Allow all for organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all for facilities" ON facilities;

-- Enable RLS on core tables (if not already)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Create policies that allow public SELECT for login purposes
-- These are necessary because the app uses anon key for login queries

CREATE POLICY "Allow anon select for organizations"
ON organizations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon select for employees"
ON employees FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon select for facilities"
ON facilities FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to update/insert their own data
CREATE POLICY "Allow authenticated insert for employees"
ON employees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for employees"
ON employees FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for organizations"
ON organizations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for facilities"
ON facilities FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for facilities"
ON facilities FOR UPDATE
TO authenticated
USING (true);

-- Fix the employee_directory view - remove SECURITY DEFINER
DROP VIEW IF EXISTS employee_directory;

CREATE VIEW employee_directory AS
SELECT
  e.id,
  e.organization_id,
  e.facility_id,
  f.name AS facility_name,
  e.employee_code,
  e.first_name,
  e.last_name,
  CONCAT(e.first_name, ' ', e.last_name) AS full_name,
  e.email,
  e.role,
  e."position",
  e.department_code,
  e.status,
  e.hire_date,
  e.manager_id,
  CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
  COALESCE(e.profile->>'phone', '') AS phone,
  COALESCE(e.profile->>'extension', '') AS extension,
  COALESCE(e.profile->>'location', '') AS office_location,
  COALESCE(e.profile->>'avatar_url', '') AS avatar_url,
  COALESCE(e.profile->>'title', e."position") AS job_title,
  COALESCE(e.profile->>'bio', '') AS bio,
  COALESCE(e.profile->>'skills', '[]')::JSONB AS skills,
  e.created_at
FROM employees e
LEFT JOIN facilities f ON e.facility_id = f.id
LEFT JOIN employees m ON e.manager_id = m.id
WHERE e.status = 'active';

-- Fix the search function with explicit search_path
CREATE OR REPLACE FUNCTION search_employee_directory(
  p_organization_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_department_code TEXT DEFAULT NULL,
  p_facility_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  facility_id UUID,
  facility_name TEXT,
  employee_code TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  role TEXT,
  "position" TEXT,
  department_code TEXT,
  status TEXT,
  hire_date DATE,
  manager_id UUID,
  manager_name TEXT,
  phone TEXT,
  extension TEXT,
  office_location TEXT,
  avatar_url TEXT,
  job_title TEXT,
  bio TEXT,
  skills JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ed.*
  FROM employee_directory ed
  WHERE ed.organization_id = p_organization_id
    AND (p_search_term IS NULL OR (
      ed.full_name ILIKE '%' || p_search_term || '%'
      OR ed.email ILIKE '%' || p_search_term || '%'
      OR ed.employee_code ILIKE '%' || p_search_term || '%'
      OR ed."position" ILIKE '%' || p_search_term || '%'
      OR ed.department_code ILIKE '%' || p_search_term || '%'
    ))
    AND (p_department_code IS NULL OR ed.department_code = p_department_code)
    AND (p_facility_id IS NULL OR ed.facility_id = p_facility_id)
    AND (p_role IS NULL OR ed.role = p_role)
  ORDER BY ed.last_name, ed.first_name;
END;
$$;

-- Fix update_updated_at_column function with search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- SEED DATA - Create test organization and user
-- ============================================

-- Insert test organization (if not exists)
INSERT INTO organizations (id, name, code, subscription_tier)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ACME Manufacturing',
  'ACME',
  'enterprise_plus'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  subscription_tier = EXCLUDED.subscription_tier;

-- Insert test facility (if not exists)
INSERT INTO facilities (id, organization_id, name, facility_code, address, active)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Main Plant',
  'MAIN',
  '123 Industrial Way, Manufacturing City, MC 12345',
  true
)
ON CONFLICT (organization_id, facility_code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  active = EXCLUDED.active;

-- Insert admin user (if not exists)
-- Email: admin@acme.com, PIN: 1234
INSERT INTO employees (
  id,
  organization_id,
  facility_id,
  employee_code,
  pin,
  first_name,
  last_name,
  email,
  role,
  "position",
  hire_date,
  status,
  department_code
)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'ADMIN001',
  '1234',
  'Admin',
  'User',
  'admin@acme.com',
  'manager',
  'System Administrator',
  '2024-01-01',
  'active',
  'ADMIN'
)
ON CONFLICT (organization_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  pin = EXCLUDED.pin,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Insert a regular employee for testing
INSERT INTO employees (
  id,
  organization_id,
  facility_id,
  employee_code,
  pin,
  first_name,
  last_name,
  email,
  role,
  "position",
  hire_date,
  status,
  department_code
)
VALUES (
  'e0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'EMP001',
  '1234',
  'John',
  'Smith',
  'john.smith@acme.com',
  'technician',
  'Maintenance Technician',
  '2024-01-15',
  'active',
  'MAINT'
)
ON CONFLICT (organization_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  pin = EXCLUDED.pin,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Verify the data was inserted
SELECT 'Organizations:' as info, count(*) as count FROM organizations;
SELECT 'Employees:' as info, count(*) as count FROM employees;
SELECT 'Facilities:' as info, count(*) as count FROM facilities;

-- Show the test credentials
SELECT 
  '=== TEST CREDENTIALS ===' as info,
  '' as company_code,
  '' as email,
  '' as password
UNION ALL
SELECT 
  'Company Login:',
  '',
  'admin@acme.com',
  'any password (4+ chars)'
UNION ALL
SELECT 
  'Employee Login:',
  'ACME',
  'ADMIN001 or EMP001',
  'PIN: 1234';
