-- Add is_template field to tasks table to distinguish between template (reusable) and one-off tasks

ALTER TABLE tasks
ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the field
COMMENT ON COLUMN tasks.is_template IS 'If true, task stays in unscheduled list after being scheduled to timeline. If false, task is deleted after scheduling.';

-- Create index for filtering template tasks
CREATE INDEX idx_tasks_is_template ON tasks(user_id, is_template) WHERE is_template = true;
