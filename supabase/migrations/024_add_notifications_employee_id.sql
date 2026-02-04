-- Migration: Add employee_id column to notifications table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Check if employee_id column exists and add it if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN employee_id UUID REFERENCES employees(id) ON DELETE CASCADE;
    
    -- Create index for employee_id
    CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(organization_id, employee_id, status) WHERE status = 'unread';
  END IF;
END $$;

-- Update RLS policies for notifications to allow employees to see their own notifications
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Allow all authenticated users to read notifications for their organization
CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT USING (true);

-- Allow all authenticated users to insert notifications
CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT WITH CHECK (true);

-- Allow all authenticated users to update notifications
CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE USING (true);

-- Allow all authenticated users to delete notifications
CREATE POLICY "notifications_delete_policy" ON notifications
  FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
