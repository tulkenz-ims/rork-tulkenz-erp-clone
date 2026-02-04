-- Fix RLS policies for notifications and task_verifications tables
-- Run this in Supabase SQL Editor

-- ============================================
-- FIX NOTIFICATIONS TABLE RLS
-- ============================================

-- Drop all existing policies on notifications
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;
DROP POLICY IF EXISTS "Allow anon select for notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated insert for notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated update for notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated delete for notifications" ON notifications;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for notifications
CREATE POLICY "notifications_select_all" ON notifications
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "notifications_insert_all" ON notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_update_all" ON notifications
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "notifications_delete_all" ON notifications
  FOR DELETE TO anon, authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON notifications TO anon;
GRANT ALL ON notifications TO authenticated;

-- ============================================
-- FIX TASK_VERIFICATIONS TABLE RLS
-- ============================================

-- Drop all existing policies on task_verifications
DROP POLICY IF EXISTS "task_verifications_select_policy" ON task_verifications;
DROP POLICY IF EXISTS "task_verifications_insert_policy" ON task_verifications;
DROP POLICY IF EXISTS "task_verifications_update_policy" ON task_verifications;
DROP POLICY IF EXISTS "task_verifications_delete_policy" ON task_verifications;
DROP POLICY IF EXISTS "Allow anon select for task_verifications" ON task_verifications;
DROP POLICY IF EXISTS "Allow authenticated insert for task_verifications" ON task_verifications;
DROP POLICY IF EXISTS "Allow authenticated update for task_verifications" ON task_verifications;
DROP POLICY IF EXISTS "Allow authenticated delete for task_verifications" ON task_verifications;

-- Ensure RLS is enabled
ALTER TABLE task_verifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for task_verifications
CREATE POLICY "task_verifications_select_all" ON task_verifications
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "task_verifications_insert_all" ON task_verifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "task_verifications_update_all" ON task_verifications
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "task_verifications_delete_all" ON task_verifications
  FOR DELETE TO anon, authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON task_verifications TO anon;
GRANT ALL ON task_verifications TO authenticated;

-- ============================================
-- FIX NOTIFICATION_RECEIPTS TABLE RLS (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_receipts') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "notification_receipts_select_policy" ON notification_receipts;
    DROP POLICY IF EXISTS "notification_receipts_insert_policy" ON notification_receipts;
    DROP POLICY IF EXISTS "notification_receipts_update_policy" ON notification_receipts;
    DROP POLICY IF EXISTS "notification_receipts_delete_policy" ON notification_receipts;
    
    -- Ensure RLS is enabled
    ALTER TABLE notification_receipts ENABLE ROW LEVEL SECURITY;
    
    -- Create permissive policies
    EXECUTE 'CREATE POLICY "notification_receipts_select_all" ON notification_receipts FOR SELECT TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "notification_receipts_insert_all" ON notification_receipts FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "notification_receipts_update_all" ON notification_receipts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "notification_receipts_delete_all" ON notification_receipts FOR DELETE TO anon, authenticated USING (true)';
    
    -- Grant permissions
    GRANT ALL ON notification_receipts TO anon;
    GRANT ALL ON notification_receipts TO authenticated;
  END IF;
END $$;

-- Verify policies were created
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('notifications', 'task_verifications', 'notification_receipts')
ORDER BY tablename, policyname;
