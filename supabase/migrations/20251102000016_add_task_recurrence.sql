-- Add Recurrence Support to Tasks
-- Created: 2025-11-02
-- Purpose: Allow tasks to have recurring patterns

-- Add recurrence fields to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB,
  ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Create index for parent task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON tasks(parent_task_id);

-- Create index for recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring
  ON tasks(user_id, is_recurring) WHERE is_recurring = TRUE;

COMMENT ON COLUMN tasks.is_recurring IS 'Whether this is a recurring task template';
COMMENT ON COLUMN tasks.recurrence_pattern IS 'JSONB pattern: {frequency: daily|weekly|monthly, interval: N, daysOfWeek: [], dayOfMonth: N}';
COMMENT ON COLUMN tasks.recurrence_end_date IS 'When to stop generating recurring instances (null = infinite)';
COMMENT ON COLUMN tasks.parent_task_id IS 'For task instances, reference to the parent recurring task';

-- Example recurrence_pattern structures:
-- Daily: {"frequency": "daily", "interval": 1}
-- Weekly (Mon-Fri): {"frequency": "weekly", "interval": 1, "daysOfWeek": [1,2,3,4,5]}
-- Monthly (15th): {"frequency": "monthly", "interval": 1, "dayOfMonth": 15}
