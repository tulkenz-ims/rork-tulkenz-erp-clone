-- User Push Tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  department_code TEXT,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_org_dept ON user_push_tokens(organization_id, department_code);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(organization_id, is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own push tokens"
  ON user_push_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add notified_at column to task_feed_department_tasks if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_feed_department_tasks' 
    AND column_name = 'notified_at'
  ) THEN
    ALTER TABLE task_feed_department_tasks ADD COLUMN notified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  notification_id UUID,
  notification_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_department_code TEXT,
  source_type TEXT,
  source_id TEXT,
  source_number TEXT,
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_recipients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_org ON notification_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_source ON notification_logs(source_type, source_id);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view notification logs"
  ON notification_logs
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert notification logs"
  ON notification_logs
  FOR INSERT
  WITH CHECK (true);
