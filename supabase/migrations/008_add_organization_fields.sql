-- Add missing columns to organizations table for full organization management
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_count_range TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
