-- Add schedule_time and schedule_days columns to pm_schedules table
-- These columns allow users to specify when PM work orders should be created

-- Add schedule_time column (time of day for PM generation, e.g., '08:00')
ALTER TABLE pm_schedules 
ADD COLUMN IF NOT EXISTS schedule_time VARCHAR(5) DEFAULT '08:00';

-- Add schedule_days column (array of days for daily/weekly/biweekly schedules)
-- Values: monday, tuesday, wednesday, thursday, friday, saturday, sunday
ALTER TABLE pm_schedules 
ADD COLUMN IF NOT EXISTS schedule_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

-- Add comment for documentation
COMMENT ON COLUMN pm_schedules.schedule_time IS 'Time of day when PM work order should be created (HH:MM format)';
COMMENT ON COLUMN pm_schedules.schedule_days IS 'Array of days of week for PM generation (used with daily/weekly/biweekly frequency)';
