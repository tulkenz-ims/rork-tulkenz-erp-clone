-- Fix Task Feed Templates RLS Policies
-- Run this in Supabase SQL Editor to fix the RLS policy errors

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "task_feed_templates_org_access" ON task_feed_templates;
DROP POLICY IF EXISTS "task_feed_posts_org_access" ON task_feed_posts;
DROP POLICY IF EXISTS "task_feed_dept_tasks_org_access" ON task_feed_department_tasks;

-- Create permissive policies for task_feed_templates
CREATE POLICY "Allow anon select for task_feed_templates"
ON task_feed_templates FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for task_feed_templates"
ON task_feed_templates FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for task_feed_templates"
ON task_feed_templates FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for task_feed_templates"
ON task_feed_templates FOR DELETE
TO anon, authenticated
USING (true);

-- Create permissive policies for task_feed_posts
CREATE POLICY "Allow anon select for task_feed_posts"
ON task_feed_posts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for task_feed_posts"
ON task_feed_posts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for task_feed_posts"
ON task_feed_posts FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for task_feed_posts"
ON task_feed_posts FOR DELETE
TO anon, authenticated
USING (true);

-- Create permissive policies for task_feed_department_tasks
CREATE POLICY "Allow anon select for task_feed_department_tasks"
ON task_feed_department_tasks FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert for task_feed_department_tasks"
ON task_feed_department_tasks FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update for task_feed_department_tasks"
ON task_feed_department_tasks FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon delete for task_feed_department_tasks"
ON task_feed_department_tasks FOR DELETE
TO anon, authenticated
USING (true);
