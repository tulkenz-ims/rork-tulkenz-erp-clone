-- Add Virginia Kessler as Platform Admin Employee
-- Run this in Supabase SQL Editor

-- Insert Virginia Kessler into the platform organization
INSERT INTO employees (
  organization_id,
  employee_code,
  pin,
  first_name,
  last_name,
  email,
  role,
  "position",
  status,
  is_platform_admin,
  hire_date
)
SELECT 
  o.id,
  'ADMIN01',
  'Tk2025',
  'Virginia',
  'Kessler',
  'virginia.kessler@tulkenz.net',
  'superadmin',
  'Platform Administrator',
  'active',
  TRUE,
  CURRENT_DATE
FROM organizations o
WHERE o.is_platform_org = TRUE
ON CONFLICT (organization_id, email) DO UPDATE SET
  pin = 'Tk2025',
  is_platform_admin = TRUE,
  role = 'superadmin',
  updated_at = NOW();
