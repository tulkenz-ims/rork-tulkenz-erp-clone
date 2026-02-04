-- Task Feed Template System Migration
-- Creates tables for template-based task management with multi-department coordination

-- ============================================================================
-- Table 1: task_feed_templates
-- Stores all template definitions for Add Task, Report Issue, Request Purchase
-- ============================================================================
CREATE TABLE task_feed_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  button_type TEXT NOT NULL CHECK (button_type IN ('add_task', 'report_issue', 'request_purchase')),
  
  -- Department Configuration
  triggering_department TEXT NOT NULL,
  assigned_departments JSONB NOT NULL DEFAULT '[]',
  
  -- Form Fields Configuration (JSON array of field definitions)
  -- Each field: { id, label, type, required, options[], placeholder }
  -- Types: dropdown, text_input, text_area, radio, checkbox, number, date
  form_fields JSONB NOT NULL DEFAULT '[]',
  
  -- Requirements
  photo_required BOOLEAN DEFAULT TRUE,
  
  -- Workflow Rules (JSON for conditional logic)
  -- { all_must_complete: boolean, conditional_alerts: [], auto_create_work_order: boolean }
  workflow_rules JSONB DEFAULT '{"all_must_complete": true}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name)
);

-- ============================================================================
-- Table 2: task_feed_posts
-- Main posts that appear in the Task Feed
-- ============================================================================
CREATE TABLE task_feed_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id),
  
  -- Unique Post ID (TF-XXXXXX format)
  post_number TEXT NOT NULL,
  
  -- Template Reference (store snapshot for historical integrity)
  template_id UUID REFERENCES task_feed_templates(id),
  template_name TEXT NOT NULL,
  template_snapshot JSONB,
  button_type TEXT NOT NULL CHECK (button_type IN ('add_task', 'report_issue', 'request_purchase')),
  
  -- Creator Info
  created_by UUID NOT NULL REFERENCES employees(id),
  created_by_name TEXT NOT NULL,
  department TEXT NOT NULL,
  
  -- Location
  location_id UUID REFERENCES locations(id),
  location_name TEXT,
  
  -- Form Data (stores all submitted form values)
  form_data JSONB NOT NULL DEFAULT '{}',
  
  -- Photo (Required)
  photo_url TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]',
  
  -- Notes
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'requires_followup')),
  
  -- Assigned Departments (snapshot from template)
  assigned_departments JSONB NOT NULL DEFAULT '[]',
  
  -- Completion Tracking
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence for post numbers
CREATE SEQUENCE IF NOT EXISTS task_feed_post_seq START 100000;

-- ============================================================================
-- Table 3: task_feed_department_tasks
-- Tracks each department's individual task linked to the main post
-- ============================================================================
CREATE TABLE task_feed_department_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Link to main post
  post_id UUID NOT NULL REFERENCES task_feed_posts(id) ON DELETE CASCADE,
  post_number TEXT NOT NULL,
  
  -- Department Assignment
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  
  -- Completion Info
  completed_by UUID REFERENCES employees(id),
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  completion_photo_url TEXT,
  
  -- Module Reference (stores where this was completed - e.g., work order ID)
  module_reference_type TEXT,
  module_reference_id UUID,
  
  -- Notifications
  notified_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, department_code)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Templates
CREATE INDEX idx_task_feed_templates_org ON task_feed_templates(organization_id);
CREATE INDEX idx_task_feed_templates_button_type ON task_feed_templates(organization_id, button_type);
CREATE INDEX idx_task_feed_templates_department ON task_feed_templates(organization_id, triggering_department);
CREATE INDEX idx_task_feed_templates_active ON task_feed_templates(organization_id, is_active);

-- Posts
CREATE INDEX idx_task_feed_posts_org ON task_feed_posts(organization_id);
CREATE INDEX idx_task_feed_posts_facility ON task_feed_posts(facility_id);
CREATE INDEX idx_task_feed_posts_number ON task_feed_posts(post_number);
CREATE INDEX idx_task_feed_posts_status ON task_feed_posts(organization_id, status);
CREATE INDEX idx_task_feed_posts_template ON task_feed_posts(template_id);
CREATE INDEX idx_task_feed_posts_created_by ON task_feed_posts(created_by);
CREATE INDEX idx_task_feed_posts_department ON task_feed_posts(organization_id, department);
CREATE INDEX idx_task_feed_posts_created_at ON task_feed_posts(organization_id, created_at DESC);
CREATE INDEX idx_task_feed_posts_button_type ON task_feed_posts(organization_id, button_type);

-- Department Tasks
CREATE INDEX idx_task_feed_dept_tasks_org ON task_feed_department_tasks(organization_id);
CREATE INDEX idx_task_feed_dept_tasks_post ON task_feed_department_tasks(post_id);
CREATE INDEX idx_task_feed_dept_tasks_dept ON task_feed_department_tasks(organization_id, department_code);
CREATE INDEX idx_task_feed_dept_tasks_status ON task_feed_department_tasks(organization_id, department_code, status);
CREATE INDEX idx_task_feed_dept_tasks_pending ON task_feed_department_tasks(organization_id, department_code, status) WHERE status = 'pending';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE task_feed_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_feed_department_tasks ENABLE ROW LEVEL SECURITY;

-- Templates Policies
CREATE POLICY "task_feed_templates_org_access" ON task_feed_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id = auth.uid()
    )
  );

-- Posts Policies
CREATE POLICY "task_feed_posts_org_access" ON task_feed_posts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id = auth.uid()
    )
  );

-- Department Tasks Policies
CREATE POLICY "task_feed_dept_tasks_org_access" ON task_feed_department_tasks
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to generate post number
CREATE OR REPLACE FUNCTION generate_task_feed_post_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TF-' || LPAD(nextval('task_feed_post_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update post status based on department task completions
CREATE OR REPLACE FUNCTION update_task_feed_post_status()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  post_status TEXT;
BEGIN
  -- Count total and completed tasks for this post
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM task_feed_department_tasks
  WHERE post_id = NEW.post_id;
  
  -- Determine post status
  IF completed_tasks = total_tasks THEN
    post_status := 'completed';
  ELSIF completed_tasks > 0 THEN
    post_status := 'in_progress';
  ELSE
    post_status := 'pending';
  END IF;
  
  -- Update the post
  UPDATE task_feed_posts
  SET 
    status = post_status,
    completed_at = CASE WHEN post_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update post status
CREATE TRIGGER trigger_update_task_feed_post_status
  AFTER UPDATE OF status ON task_feed_department_tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_task_feed_post_status();

-- Function to set updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_feed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_task_feed_templates_updated_at
  BEFORE UPDATE ON task_feed_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_task_feed_updated_at();

CREATE TRIGGER trigger_task_feed_posts_updated_at
  BEFORE UPDATE ON task_feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_task_feed_updated_at();

CREATE TRIGGER trigger_task_feed_dept_tasks_updated_at
  BEFORE UPDATE ON task_feed_department_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_feed_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE task_feed_templates IS 'Template definitions for Task Feed actions (Add Task, Report Issue, Request Purchase)';
COMMENT ON TABLE task_feed_posts IS 'Main Task Feed posts created from templates';
COMMENT ON TABLE task_feed_department_tasks IS 'Individual department tasks linked to main posts for multi-department coordination';

COMMENT ON COLUMN task_feed_templates.form_fields IS 'JSON array of form field definitions: [{id, label, type, required, options, placeholder}]';
COMMENT ON COLUMN task_feed_templates.workflow_rules IS 'JSON workflow configuration: {all_must_complete, conditional_alerts, auto_create_work_order}';
COMMENT ON COLUMN task_feed_posts.template_snapshot IS 'Snapshot of template at time of post creation for historical integrity';
COMMENT ON COLUMN task_feed_posts.form_data IS 'All form field values submitted by user';
COMMENT ON COLUMN task_feed_department_tasks.module_reference_type IS 'Type of module where task was completed (e.g., cmms, quality)';
COMMENT ON COLUMN task_feed_department_tasks.module_reference_id IS 'ID of record in the module (e.g., work_order_id)';
