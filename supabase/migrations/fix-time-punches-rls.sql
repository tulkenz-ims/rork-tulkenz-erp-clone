-- Fix RLS Policies for Time Punches and Related Tables
-- Run this in Supabase SQL Editor

-- ============================================
-- TIME PUNCHES POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon select for time_punches" ON time_punches;
DROP POLICY IF EXISTS "Allow anon insert for time_punches" ON time_punches;
DROP POLICY IF EXISTS "Allow anon update for time_punches" ON time_punches;
DROP POLICY IF EXISTS "Allow anon delete for time_punches" ON time_punches;

-- Allow select for all (needed for reading clock status)
CREATE POLICY "Allow anon select for time_punches"
ON time_punches FOR SELECT
TO anon, authenticated
USING (true);

-- Allow insert for all (needed for clock in/out)
CREATE POLICY "Allow anon insert for time_punches"
ON time_punches FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow update for all
CREATE POLICY "Allow anon update for time_punches"
ON time_punches FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow delete for all
CREATE POLICY "Allow anon delete for time_punches"
ON time_punches FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- TIME ENTRIES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for time_entries" ON time_entries;
DROP POLICY IF EXISTS "Allow anon insert for time_entries" ON time_entries;
DROP POLICY IF EXISTS "Allow anon update for time_entries" ON time_entries;
DROP POLICY IF EXISTS "Allow anon delete for time_entries" ON time_entries;

CREATE POLICY "Allow anon select for time_entries"
ON time_entries FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for time_entries"
ON time_entries FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for time_entries"
ON time_entries FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for time_entries"
ON time_entries FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- SHIFTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for shifts" ON shifts;
DROP POLICY IF EXISTS "Allow anon insert for shifts" ON shifts;
DROP POLICY IF EXISTS "Allow anon update for shifts" ON shifts;
DROP POLICY IF EXISTS "Allow anon delete for shifts" ON shifts;

CREATE POLICY "Allow anon select for shifts"
ON shifts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for shifts"
ON shifts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for shifts"
ON shifts FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for shifts"
ON shifts FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- TIME OFF REQUESTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for time_off_requests" ON time_off_requests;
DROP POLICY IF EXISTS "Allow anon insert for time_off_requests" ON time_off_requests;
DROP POLICY IF EXISTS "Allow anon update for time_off_requests" ON time_off_requests;
DROP POLICY IF EXISTS "Allow anon delete for time_off_requests" ON time_off_requests;

CREATE POLICY "Allow anon select for time_off_requests"
ON time_off_requests FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for time_off_requests"
ON time_off_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for time_off_requests"
ON time_off_requests FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for time_off_requests"
ON time_off_requests FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- ATTENDANCE RECORDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow anon insert for attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow anon update for attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow anon delete for attendance_records" ON attendance_records;

CREATE POLICY "Allow anon select for attendance_records"
ON attendance_records FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for attendance_records"
ON attendance_records FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for attendance_records"
ON attendance_records FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for attendance_records"
ON attendance_records FOR DELETE
TO anon, authenticated
USING (true);

-- Verify policies were created
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'time_punches';
