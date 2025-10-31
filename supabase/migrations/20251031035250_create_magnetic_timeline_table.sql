-- Create magnetic_timeline_items table for gap-free 24-hour timeline

CREATE TABLE IF NOT EXISTS magnetic_timeline_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_locked_time BOOLEAN NOT NULL DEFAULT false,
  is_flexible BOOLEAN NOT NULL DEFAULT true,
  original_duration INTEGER,
  template_id TEXT REFERENCES timeline_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_magnetic_timeline_items_user_id ON magnetic_timeline_items(user_id);
CREATE INDEX IF NOT EXISTS idx_magnetic_timeline_items_start_time ON magnetic_timeline_items(start_time);
CREATE INDEX IF NOT EXISTS idx_magnetic_timeline_items_user_start ON magnetic_timeline_items(user_id, start_time);

-- Enable RLS
ALTER TABLE magnetic_timeline_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own magnetic timeline items"
  ON magnetic_timeline_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own magnetic timeline items"
  ON magnetic_timeline_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own magnetic timeline items"
  ON magnetic_timeline_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own magnetic timeline items"
  ON magnetic_timeline_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Assistants can manage magnetic timeline for their executives (if they have manage_timeline permission)
CREATE POLICY "Assistants can view executive magnetic timeline items"
  ON magnetic_timeline_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = magnetic_timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

CREATE POLICY "Assistants can insert executive magnetic timeline items"
  ON magnetic_timeline_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = magnetic_timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

CREATE POLICY "Assistants can update executive magnetic timeline items"
  ON magnetic_timeline_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = magnetic_timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

CREATE POLICY "Assistants can delete executive magnetic timeline items"
  ON magnetic_timeline_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assistant_relationships ar
      WHERE ar.assistant_id = auth.uid()
        AND ar.executive_id = magnetic_timeline_items.user_id
        AND ar.status = 'active'
        AND (ar.permissions->>'manage_timeline')::boolean = true
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_magnetic_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_magnetic_timeline_updated_at
  BEFORE UPDATE ON magnetic_timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION update_magnetic_timeline_updated_at();
