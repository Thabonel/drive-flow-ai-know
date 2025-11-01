-- Cleanup orphaned "Me" timeline layer and items after magnetic timeline revert
-- Created: 2025-11-01
-- Purpose: Remove all data from the magnetic timeline experiment

-- Step 1: Delete all timeline items that belong to the "Me" layer
-- (This handles the stacked routine items that were auto-created)
DELETE FROM timeline_items
WHERE layer_id IN (
  SELECT id FROM timeline_layers
  WHERE is_primary_timeline = true
);

-- Step 2: Delete the "Me" layer itself
DELETE FROM timeline_layers
WHERE is_primary_timeline = true;

-- Step 3: Clean up any orphaned routine template data (if table exists)
-- Note: This will fail gracefully if the table doesn't exist in this version
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'timeline_templates'
  ) THEN
    DELETE FROM timeline_templates WHERE is_system_default = true;
  END IF;
END $$;

-- Verification queries (commented out - uncomment to check cleanup)
-- SELECT COUNT(*) as remaining_items FROM timeline_items WHERE layer_id IN (SELECT id FROM timeline_layers WHERE is_primary_timeline = true);
-- SELECT COUNT(*) as remaining_me_layers FROM timeline_layers WHERE is_primary_timeline = true;
