-- ============================================================================
-- STEP 3: PREVENT FUTURE ISSUES
-- ============================================================================
-- Run this AFTER running STEP 2 to fix ALL timeline items (not just the 4)
-- This ensures no other items have similar data integrity issues
-- URL: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql/new
-- ============================================================================

-- Count how many items have data issues
SELECT
  COUNT(*) as items_with_issues,
  'Items needing repair' as status
FROM timeline_items
WHERE
  is_meeting IS NULL
  OR is_flexible IS NULL
  OR sync_status IS NULL
  OR sync_source IS NULL
  OR visibility IS NULL
  OR visibility NOT IN ('personal', 'team', 'assigned')
  OR sync_status NOT IN ('synced', 'pending', 'conflict', 'local_only', 'error')
  OR sync_source NOT IN ('local', 'google', 'both');

-- Fix ALL items with NULL or invalid values
UPDATE timeline_items
SET
  is_meeting = COALESCE(is_meeting, false),
  is_flexible = COALESCE(is_flexible, true),
  sync_status = COALESCE(sync_status, 'local_only'),
  sync_source = COALESCE(sync_source, 'local'),
  visibility = COALESCE(visibility, 'personal')
WHERE
  is_meeting IS NULL
  OR is_flexible IS NULL
  OR sync_status IS NULL
  OR sync_source IS NULL
  OR visibility IS NULL;

-- Fix invalid CHECK constraint values
UPDATE timeline_items
SET visibility = 'personal'
WHERE visibility NOT IN ('personal', 'team', 'assigned');

UPDATE timeline_items
SET sync_status = 'local_only'
WHERE sync_status NOT IN ('synced', 'pending', 'conflict', 'local_only', 'error');

UPDATE timeline_items
SET sync_source = 'local'
WHERE sync_source NOT IN ('local', 'google', 'both');

-- Verify all items are now valid
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS! All items have valid data'
    ELSE '⚠️ WARNING! Still ' || COUNT(*) || ' items with issues'
  END as validation_status
FROM timeline_items
WHERE
  is_meeting IS NULL
  OR is_flexible IS NULL
  OR sync_status IS NULL
  OR sync_source IS NULL
  OR visibility IS NULL
  OR visibility NOT IN ('personal', 'team', 'assigned')
  OR sync_status NOT IN ('synced', 'pending', 'conflict', 'local_only', 'error')
  OR sync_source NOT IN ('local', 'google', 'both');

-- Add NOT NULL constraints to prevent future NULL issues
-- (These may already exist, IF NOT EXISTS will prevent errors)
DO $$
BEGIN
  -- is_meeting
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timeline_items'
    AND column_name = 'is_meeting'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE timeline_items ALTER COLUMN is_meeting SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to is_meeting';
  END IF;

  -- is_flexible
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timeline_items'
    AND column_name = 'is_flexible'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE timeline_items ALTER COLUMN is_flexible SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to is_flexible';
  END IF;

  -- sync_status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timeline_items'
    AND column_name = 'sync_status'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE timeline_items ALTER COLUMN sync_status SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to sync_status';
  END IF;

  -- sync_source
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timeline_items'
    AND column_name = 'sync_source'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE timeline_items ALTER COLUMN sync_source SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to sync_source';
  END IF;

  -- visibility
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timeline_items'
    AND column_name = 'visibility'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE timeline_items ALTER COLUMN visibility SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to visibility';
  END IF;
END $$;

-- Final verification
SELECT
  '✅ PREVENTION COMPLETE!' as status,
  COUNT(*) as total_timeline_items,
  'All items should now be valid' as message
FROM timeline_items;
