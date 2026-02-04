-- Add RLS policies for inventory_history table
-- Run this in your Supabase SQL Editor

-- Enable RLS (if not already enabled)
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert inventory history for their organization
CREATE POLICY "Users can insert inventory history for their organization"
  ON inventory_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon users to insert (for app without auth)
CREATE POLICY "Anon can insert inventory history"
  ON inventory_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow users to read inventory history for their organization
CREATE POLICY "Users can read inventory history for their organization"
  ON inventory_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon users to read (for app without auth)
CREATE POLICY "Anon can read inventory history"
  ON inventory_history
  FOR SELECT
  TO anon
  USING (true);

-- If you want to restrict by organization_id, use these policies instead:
-- CREATE POLICY "Users can insert inventory history for their organization"
--   ON inventory_history
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (organization_id IN (
--     SELECT organization_id FROM employees WHERE id = auth.uid()
--   ));
