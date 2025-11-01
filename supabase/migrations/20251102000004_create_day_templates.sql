-- Create Day Templates System
-- Created: 2025-11-02
-- Purpose: Store reusable day schedule templates

CREATE TABLE IF NOT EXISTS day_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  template_blocks JSONB NOT NULL DEFAULT '[]'::JSONB,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- System templates don't have user_id, user templates must have user_id
  CONSTRAINT user_or_system_check CHECK (
    (is_system = true AND user_id IS NULL) OR
    (is_system = false AND user_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE day_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view system templates and their own templates
CREATE POLICY "Users can view system and own templates"
  ON day_templates FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

-- Users can only insert their own templates (not system)
CREATE POLICY "Users can insert own templates"
  ON day_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON day_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON day_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_day_templates_user_id
  ON day_templates(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_day_templates_is_system
  ON day_templates(is_system)
  WHERE is_system = true;

CREATE INDEX IF NOT EXISTS idx_day_templates_usage
  ON day_templates(usage_count DESC, last_used_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_day_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_day_templates_updated_at_trigger
  BEFORE UPDATE ON day_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_day_templates_updated_at();

COMMENT ON TABLE day_templates IS 'Reusable day schedule templates (system and user-created)';
COMMENT ON COLUMN day_templates.template_blocks IS 'Array of time blocks: [{start_time, duration_minutes, title, type, color, is_flexible}]';
COMMENT ON COLUMN day_templates.is_system IS 'System templates are shared with all users (read-only)';
COMMENT ON COLUMN day_templates.is_default IS 'User can mark one template as their default';
COMMENT ON COLUMN day_templates.usage_count IS 'Track how often this template is used';
