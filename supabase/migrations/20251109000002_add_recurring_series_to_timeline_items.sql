-- Add recurring series tracking to timeline_items table
-- This allows identifying which timeline items are part of the same recurring task series

ALTER TABLE timeline_items
ADD COLUMN recurring_series_id UUID DEFAULT NULL,
ADD COLUMN occurrence_index INTEGER DEFAULT NULL;

-- Add comment to document the fields
COMMENT ON COLUMN timeline_items.recurring_series_id IS 'UUID to group timeline items that are part of the same recurring task series. NULL for non-recurring items.';
COMMENT ON COLUMN timeline_items.occurrence_index IS 'The index of this occurrence in the recurring series (0-based). NULL for non-recurring items. Used to identify if this is the first, second, etc. occurrence.';

-- Create index for filtering by recurring series
CREATE INDEX idx_timeline_items_recurring_series ON timeline_items(recurring_series_id) WHERE recurring_series_id IS NOT NULL;
