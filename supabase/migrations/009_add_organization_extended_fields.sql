-- Migration: Add extended organization fields
-- This migration adds all the fields that Platform Admin sets up
-- so they sync with Organization Setup for SuperAdmins

-- Add branding fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1E40AF';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0D9488';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#F59E0B';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add contact fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_phone TEXT;

-- Add address fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';

-- Add company info fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_count_range TEXT;

-- Add regional settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12);

-- Add index for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);

-- Comments for documentation
COMMENT ON COLUMN organizations.logo_url IS 'URL to organization logo image';
COMMENT ON COLUMN organizations.primary_color IS 'Primary brand color in hex format';
COMMENT ON COLUMN organizations.secondary_color IS 'Secondary brand color in hex format';
COMMENT ON COLUMN organizations.accent_color IS 'Accent brand color in hex format';
COMMENT ON COLUMN organizations.tagline IS 'Organization tagline or slogan';
COMMENT ON COLUMN organizations.support_email IS 'Primary support/contact email';
COMMENT ON COLUMN organizations.support_phone IS 'Primary support/contact phone';
COMMENT ON COLUMN organizations.industry IS 'Industry classification';
COMMENT ON COLUMN organizations.employee_count_range IS 'Employee count range (e.g., 1-10, 11-50)';
COMMENT ON COLUMN organizations.timezone IS 'Default timezone for the organization';
COMMENT ON COLUMN organizations.date_format IS 'Preferred date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)';
COMMENT ON COLUMN organizations.time_format IS 'Preferred time format (12h or 24h)';
COMMENT ON COLUMN organizations.currency IS 'Default currency code (USD, EUR, etc.)';
COMMENT ON COLUMN organizations.fiscal_year_start_month IS 'Month fiscal year starts (1-12)';
