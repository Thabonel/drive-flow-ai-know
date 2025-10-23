-- Timeline Manager Feature Migration
-- This migration creates tables for the Timeline Manager feature

-- Create timeline_layers table (dynamic user-created layers)
CREATE TABLE IF NOT EXISTS timeline_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create timeline_items table
CREATE TABLE IF NOT EXISTS timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer_id UUID NOT NULL REFERENCES timeline_layers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'logjam', 'completed', 'parked')),
  color TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create timeline_settings table (for user preferences)
CREATE TABLE IF NOT EXISTS timeline_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  zoom_horizontal INTEGER DEFAULT 100,
  zoom_vertical INTEGER DEFAULT 80,
  is_locked BOOLEAN DEFAULT TRUE,
  show_completed BOOLEAN DEFAULT TRUE,
  auto_archive_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create timeline_parked_items table (for items removed from timeline but saved)
CREATE TABLE IF NOT EXISTS timeline_parked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  original_layer_id UUID REFERENCES timeline_layers(id) ON DELETE SET NULL,
  color TEXT NOT NULL,
  parked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_timeline_items_user_status ON timeline_items(user_id, status);
CREATE INDEX idx_timeline_items_start_time ON timeline_items(start_time);
CREATE INDEX idx_timeline_items_layer ON timeline_items(layer_id);
CREATE INDEX idx_timeline_layers_user_order ON timeline_layers(user_id, sort_order);
CREATE INDEX idx_timeline_parked_items_user ON timeline_parked_items(user_id);

-- Enable Row Level Security
ALTER TABLE timeline_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_parked_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timeline_layers
CREATE POLICY "Users can view their own layers"
  ON timeline_layers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own layers"
  ON timeline_layers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own layers"
  ON timeline_layers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own layers"
  ON timeline_layers
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for timeline_items
CREATE POLICY "Users can view their own timeline items"
  ON timeline_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline items"
  ON timeline_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline items"
  ON timeline_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline items"
  ON timeline_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for timeline_settings
CREATE POLICY "Users can view their own settings"
  ON timeline_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON timeline_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON timeline_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for timeline_parked_items
CREATE POLICY "Users can view their own parked items"
  ON timeline_parked_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parked items"
  ON timeline_parked_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parked items"
  ON timeline_parked_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parked items"
  ON timeline_parked_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_layers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timeline_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timeline_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER timeline_layers_updated_at
  BEFORE UPDATE ON timeline_layers
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_layers_updated_at();

CREATE TRIGGER timeline_items_updated_at
  BEFORE UPDATE ON timeline_items
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_items_updated_at();

CREATE TRIGGER timeline_settings_updated_at
  BEFORE UPDATE ON timeline_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE timeline_layers IS 'User-created layers for organizing timeline items';
COMMENT ON TABLE timeline_items IS 'Timeline items with start time, duration, and status';
COMMENT ON TABLE timeline_settings IS 'User preferences for timeline display and behavior';
COMMENT ON TABLE timeline_parked_items IS 'Items temporarily removed from timeline for later rescheduling';
