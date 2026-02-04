-- Migration: Add Platform Admin Support
-- This migration adds the ability to distinguish between:
-- 1. Platform Admins (App Developers) - Can manage ALL organizations
-- 2. Organization Super Admins - Can only manage their own organization

-- Add is_platform_admin to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- Add is_platform_org to organizations table (marks the platform/developer organization)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_platform_org BOOLEAN DEFAULT FALSE;

-- Create index for quick platform admin lookups
CREATE INDEX IF NOT EXISTS idx_employees_platform_admin ON employees(is_platform_admin) WHERE is_platform_admin = TRUE;

-- Update your admin user to be a platform admin
-- Replace 'your-email@example.com' with your actual admin email
-- UPDATE employees SET is_platform_admin = TRUE WHERE email = 'your-email@example.com';

-- Mark your organization as the platform org (optional)
-- UPDATE organizations SET is_platform_org = TRUE WHERE code = 'YOUR_ORG_CODE';

-- Example: To set yourself as platform admin, run:
-- UPDATE employees SET is_platform_admin = TRUE WHERE email = 'admin@tulkenz.com';

COMMENT ON COLUMN employees.is_platform_admin IS 'Platform admins can manage all organizations (app developers)';
COMMENT ON COLUMN organizations.is_platform_org IS 'Marks the platform/developer organization';
