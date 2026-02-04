-- Notifications System for Task Feed and other modules
-- This table stores in-app notifications for users and departments

-- Drop existing table if it has different structure
DROP TABLE IF EXISTS notification_receipts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Target (who should see this notification)
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'department', 'role', 'all')),
  target_user_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  target_department_code TEXT,
  target_role TEXT,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'task_feed_assigned',
    'task_feed_completed',
    'task_feed_urgent',
    'work_order_created',
    'work_order_assigned',
    'approval_required',
    'approval_decision',
    'alert',
    'info',
    'warning'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Source reference (what triggered this notification)
  source_type TEXT,
  source_id UUID,
  source_number TEXT,
  
  -- Action link
  action_url TEXT,
  action_label TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'dismissed')),
  read_at TIMESTAMPTZ,
  read_by_id UUID REFERENCES employees(id),
  read_by_name TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification read receipts (for tracking who has seen department/role notifications)
CREATE TABLE notification_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  UNIQUE(notification_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(organization_id, target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_target_dept ON notifications(organization_id, target_department_code, status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(organization_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(organization_id, status) WHERE status = 'unread';

CREATE INDEX IF NOT EXISTS idx_notification_receipts_notification ON notification_receipts(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user ON notification_receipts(user_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_receipts ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE notifications IS 'In-app notifications for users and departments';
COMMENT ON TABLE notification_receipts IS 'Tracks which users have read department/role notifications';
COMMENT ON COLUMN notifications.target_type IS 'Who should see: user (specific), department (all in dept), role (all with role), all (everyone)';
COMMENT ON COLUMN notifications.source_type IS 'What triggered: task_feed_post, work_order, approval, etc.';
