-- Create Tasks Table for Unscheduled Items
-- Created: 2025-11-02
-- Purpose: Store unscheduled tasks that can be dragged to timeline

-- Drop table if it exists (clean slate)
DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_duration_minutes INTEGER DEFAULT 30 CHECK (planned_duration_minutes > 0),
  priority INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id
  ON tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
  ON tasks(user_id, priority DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at
  ON tasks(user_id, created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

COMMENT ON TABLE tasks IS 'Unscheduled tasks that can be dragged to timeline';
COMMENT ON COLUMN tasks.priority IS 'Higher number = higher priority';
COMMENT ON COLUMN tasks.planned_duration_minutes IS 'Estimated duration for scheduling';
