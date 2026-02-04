-- Task Feed Template System
-- Phase 1: Database Schema

-- Task Feed Templates (stores template definitions)
CREATE TABLE task_feed_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  button_type TEXT NOT NULL CHECK (button_type IN ('add_task', 'report_issue', 'request_purchase')),
  
  -- Department Configuration
  triggering_department TEXT NOT NULL,
  assigned_departments TEXT[] NOT NULL DEFAULT '{}',
  
  -- Form Fields (JSON array of field definitions)
  form_fields JSONB NOT NULL DEFAULT '[]',
  
  -- Requirements
  photo_required BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Workflow Rules
  workflow_rules JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  updated_by TEXT,
  updated_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name)
);

-- Task Feed Posts (main posts created from templates)
CREATE TABLE task_feed_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Post ID (human readable)
  post_number TEXT NOT NULL,
  
  -- Template Reference
  template_id UUID REFERENCES task_feed_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  template_snapshot JSONB DEFAULT '{}',
  
  -- Creator
  created_by_id UUID REFERENCES employees(id),
  created_by_name TEXT NOT NULL,
  
  -- Location
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  location_id TEXT,
  location_name TEXT,
  
  -- Form Data
  form_data JSONB NOT NULL DEFAULT '{}',
  
  -- Photo (required)
  photo_url TEXT,
  additional_photos JSONB DEFAULT '[]',
  
  -- Notes
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Completion tracking
  total_departments INTEGER DEFAULT 0,
  completed_departments INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, post_number)
);

-- Task Feed Department Tasks (tracks each department's task for a post)
CREATE TABLE task_feed_department_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Link to main post
  post_id UUID NOT NULL REFERENCES task_feed_posts(id) ON DELETE CASCADE,
  post_number TEXT NOT NULL,
  
  -- Department
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  
  -- Completion
  completed_by_id UUID REFERENCES employees(id),
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Module history reference (stores completion in department's module)
  module_history_type TEXT,
  module_history_id UUID,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, department_code)
);

-- Indexes
CREATE INDEX idx_task_feed_templates_org ON task_feed_templates(organization_id);
CREATE INDEX idx_task_feed_templates_active ON task_feed_templates(organization_id, is_active);
CREATE INDEX idx_task_feed_templates_button ON task_feed_templates(organization_id, button_type);
CREATE INDEX idx_task_feed_templates_dept ON task_feed_templates(organization_id, triggering_department);

CREATE INDEX idx_task_feed_posts_org ON task_feed_posts(organization_id);
CREATE INDEX idx_task_feed_posts_template ON task_feed_posts(template_id);
CREATE INDEX idx_task_feed_posts_status ON task_feed_posts(organization_id, status);
CREATE INDEX idx_task_feed_posts_created ON task_feed_posts(organization_id, created_at);
CREATE INDEX idx_task_feed_posts_facility ON task_feed_posts(organization_id, facility_id);
CREATE INDEX idx_task_feed_posts_creator ON task_feed_posts(created_by_id);

CREATE INDEX idx_task_feed_dept_tasks_org ON task_feed_department_tasks(organization_id);
CREATE INDEX idx_task_feed_dept_tasks_post ON task_feed_department_tasks(post_id);
CREATE INDEX idx_task_feed_dept_tasks_dept ON task_feed_department_tasks(organization_id, department_code);
CREATE INDEX idx_task_feed_dept_tasks_status ON task_feed_department_tasks(organization_id, status);
CREATE INDEX idx_task_feed_dept_tasks_pending ON task_feed_department_tasks(organization_id, department_code, status) WHERE status = 'pending';

-- RLS
ALTER TABLE task_feed_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_feed_department_tasks ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_task_feed_templates_updated_at BEFORE UPDATE ON task_feed_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_feed_posts_updated_at BEFORE UPDATE ON task_feed_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_feed_dept_tasks_updated_at BEFORE UPDATE ON task_feed_department_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate post number
CREATE OR REPLACE FUNCTION generate_task_feed_post_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(post_number FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM task_feed_posts
  WHERE post_number LIKE 'TF-%';
  
  new_number := 'TF-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update post completion status
CREATE OR REPLACE FUNCTION update_task_feed_post_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
  new_status TEXT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_count, completed_count
  FROM task_feed_department_tasks
  WHERE post_id = NEW.post_id;
  
  IF completed_count = total_count AND total_count > 0 THEN
    new_status := 'completed';
  ELSIF completed_count > 0 THEN
    new_status := 'in_progress';
  ELSE
    new_status := 'pending';
  END IF;
  
  UPDATE task_feed_posts
  SET 
    completed_departments = completed_count,
    completion_rate = CASE WHEN total_count > 0 THEN (completed_count::DECIMAL / total_count * 100) ELSE 0 END,
    status = new_status,
    completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_completion
AFTER INSERT OR UPDATE ON task_feed_department_tasks
FOR EACH ROW EXECUTE FUNCTION update_task_feed_post_completion();
