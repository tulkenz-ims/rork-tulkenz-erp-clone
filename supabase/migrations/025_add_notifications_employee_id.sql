-- Add employee_id column to notifications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN employee_id UUID REFERENCES employees(id) ON DELETE CASCADE;
    CREATE INDEX idx_notifications_employee ON notifications(employee_id);
  END IF;
END $$;
