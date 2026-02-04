-- Fix RLS policies for pm_schedules table
-- Drop existing policies if any
DROP POLICY IF EXISTS "pm_schedules_select" ON pm_schedules;
DROP POLICY IF EXISTS "pm_schedules_insert" ON pm_schedules;
DROP POLICY IF EXISTS "pm_schedules_update" ON pm_schedules;
DROP POLICY IF EXISTS "pm_schedules_delete" ON pm_schedules;

-- Create permissive policies for pm_schedules
CREATE POLICY "pm_schedules_select" ON pm_schedules FOR SELECT USING (true);
CREATE POLICY "pm_schedules_insert" ON pm_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "pm_schedules_update" ON pm_schedules FOR UPDATE USING (true);
CREATE POLICY "pm_schedules_delete" ON pm_schedules FOR DELETE USING (true);

-- Fix RLS policies for pm_work_orders table as well
DROP POLICY IF EXISTS "pm_work_orders_select" ON pm_work_orders;
DROP POLICY IF EXISTS "pm_work_orders_insert" ON pm_work_orders;
DROP POLICY IF EXISTS "pm_work_orders_update" ON pm_work_orders;
DROP POLICY IF EXISTS "pm_work_orders_delete" ON pm_work_orders;

CREATE POLICY "pm_work_orders_select" ON pm_work_orders FOR SELECT USING (true);
CREATE POLICY "pm_work_orders_insert" ON pm_work_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "pm_work_orders_update" ON pm_work_orders FOR UPDATE USING (true);
CREATE POLICY "pm_work_orders_delete" ON pm_work_orders FOR DELETE USING (true);
