-- Quality Inspections RLS Policies
-- Run this in Supabase SQL Editor to fix the RLS error

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow select for quality_inspections" ON quality_inspections;
DROP POLICY IF EXISTS "Allow insert for quality_inspections" ON quality_inspections;
DROP POLICY IF EXISTS "Allow update for quality_inspections" ON quality_inspections;
DROP POLICY IF EXISTS "Allow delete for quality_inspections" ON quality_inspections;

-- Allow authenticated users to SELECT
CREATE POLICY "Allow select for quality_inspections"
ON quality_inspections FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to INSERT
CREATE POLICY "Allow insert for quality_inspections"
ON quality_inspections FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow authenticated users to UPDATE
CREATE POLICY "Allow update for quality_inspections"
ON quality_inspections FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow authenticated users to DELETE
CREATE POLICY "Allow delete for quality_inspections"
ON quality_inspections FOR DELETE
TO anon, authenticated
USING (true);

-- Also add policies for other quality tables that might be missing
-- NCR Records
DROP POLICY IF EXISTS "Allow select for ncr_records" ON ncr_records;
DROP POLICY IF EXISTS "Allow insert for ncr_records" ON ncr_records;
DROP POLICY IF EXISTS "Allow update for ncr_records" ON ncr_records;

CREATE POLICY "Allow select for ncr_records"
ON ncr_records FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for ncr_records"
ON ncr_records FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for ncr_records"
ON ncr_records FOR UPDATE
TO anon, authenticated
USING (true);

-- CAPA Records
DROP POLICY IF EXISTS "Allow select for capa_records" ON capa_records;
DROP POLICY IF EXISTS "Allow insert for capa_records" ON capa_records;
DROP POLICY IF EXISTS "Allow update for capa_records" ON capa_records;

CREATE POLICY "Allow select for capa_records"
ON capa_records FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for capa_records"
ON capa_records FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for capa_records"
ON capa_records FOR UPDATE
TO anon, authenticated
USING (true);

-- Temperature Logs
DROP POLICY IF EXISTS "Allow select for temperature_logs" ON temperature_logs;
DROP POLICY IF EXISTS "Allow insert for temperature_logs" ON temperature_logs;
DROP POLICY IF EXISTS "Allow update for temperature_logs" ON temperature_logs;

CREATE POLICY "Allow select for temperature_logs"
ON temperature_logs FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for temperature_logs"
ON temperature_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for temperature_logs"
ON temperature_logs FOR UPDATE
TO anon, authenticated
USING (true);

-- Hold Tags
DROP POLICY IF EXISTS "Allow select for hold_tags" ON hold_tags;
DROP POLICY IF EXISTS "Allow insert for hold_tags" ON hold_tags;
DROP POLICY IF EXISTS "Allow update for hold_tags" ON hold_tags;

CREATE POLICY "Allow select for hold_tags"
ON hold_tags FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for hold_tags"
ON hold_tags FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for hold_tags"
ON hold_tags FOR UPDATE
TO anon, authenticated
USING (true);

-- Customer Complaints
DROP POLICY IF EXISTS "Allow select for customer_complaints" ON customer_complaints;
DROP POLICY IF EXISTS "Allow insert for customer_complaints" ON customer_complaints;
DROP POLICY IF EXISTS "Allow update for customer_complaints" ON customer_complaints;

CREATE POLICY "Allow select for customer_complaints"
ON customer_complaints FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for customer_complaints"
ON customer_complaints FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for customer_complaints"
ON customer_complaints FOR UPDATE
TO anon, authenticated
USING (true);

-- Deviation Records
DROP POLICY IF EXISTS "Allow select for deviation_records" ON deviation_records;
DROP POLICY IF EXISTS "Allow insert for deviation_records" ON deviation_records;
DROP POLICY IF EXISTS "Allow update for deviation_records" ON deviation_records;

CREATE POLICY "Allow select for deviation_records"
ON deviation_records FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert for deviation_records"
ON deviation_records FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for deviation_records"
ON deviation_records FOR UPDATE
TO anon, authenticated
USING (true);
