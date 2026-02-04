-- Migration: Add branding and settings fields to organizations table
-- Run this in Supabase SQL Editor

-- Add branding fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS accent_color TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add contact information fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT,
ADD COLUMN IF NOT EXISTS support_phone TEXT;

-- Add address fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';

-- Add company profile fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS employee_count_range TEXT;

-- Add regional/localization settings
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago',
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add comments for documentation
COMMENT ON COLUMN organizations.logo_url IS 'URL to the organization logo image';
COMMENT ON COLUMN organizations.primary_color IS 'Primary brand color in hex format (e.g., #1E40AF)';
COMMENT ON COLUMN organizations.secondary_color IS 'Secondary brand color in hex format';
COMMENT ON COLUMN organizations.accent_color IS 'Accent brand color in hex format';
COMMENT ON COLUMN organizations.tagline IS 'Company tagline or slogan';
COMMENT ON COLUMN organizations.website IS 'Company website URL';
COMMENT ON COLUMN organizations.support_email IS 'Support contact email';
COMMENT ON COLUMN organizations.support_phone IS 'Support contact phone number';
COMMENT ON COLUMN organizations.industry IS 'Industry classification';
COMMENT ON COLUMN organizations.employee_count_range IS 'Employee count range (e.g., 1-10, 11-50, etc.)';
COMMENT ON COLUMN organizations.fiscal_year_start_month IS 'Month when fiscal year starts (1-12)';
COMMENT ON COLUMN organizations.timezone IS 'Default timezone for the organization';
COMMENT ON COLUMN organizations.date_format IS 'Preferred date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)';
COMMENT ON COLUMN organizations.time_format IS 'Preferred time format (12h or 24h)';
COMMENT ON COLUMN organizations.currency IS 'Default currency code (e.g., USD, EUR)';
COMMENT ON COLUMN organizations.language IS 'Default language code (e.g., en, es)';

-- Create index for industry filtering (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry);

-- Update RLS policies to allow organization admins to update their own org
-- (Assuming existing policies, just ensure UPDATE is allowed)
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Organizations can be updated by authenticated users'
  ) THEN
    CREATE POLICY "Organizations can be updated by authenticated users"
      ON organizations
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
