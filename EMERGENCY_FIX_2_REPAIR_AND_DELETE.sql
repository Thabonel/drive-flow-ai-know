-- ============================================================================
-- STEP 2: FIX DATA INTEGRITY AND DELETE THE 4 PROBLEM ITEMS
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER running STEP 1 diagnostics
-- URL: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql/new
--
-- IMPORTANT: This uses service_role/admin privileges to bypass RLS
-- ============================================================================

-- First, fix any data integrity issues in the 4 problem items
UPDATE timeline_items
SET
  is_meeting = COALESCE(is_meeting, false),
  is_flexible = COALESCE(is_flexible, true),
  sync_status = COALESCE(sync_status, 'local_only'),
  sync_source = COALESCE(sync_source, 'local'),
  visibility = COALESCE(visibility, 'personal')
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Verify the fix worked
SELECT
  id,
  title,
  is_meeting,
  is_flexible,
  sync_status,
  sync_source,
  visibility,
  'FIXED' as status
FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Now DELETE the 4 problem items (using admin privileges to bypass RLS)
DELETE FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Verify deletion succeeded
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS! All 4 items deleted'
    ELSE '❌ FAILED! Still ' || COUNT(*) || ' items remaining'
  END as deletion_status
FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Clean up duplicate parked items created by the auto-parking loop
-- This finds duplicates with the same title created recently
WITH duplicates AS (
  SELECT
    id,
    title,
    user_id,
    parked_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, title, duration_minutes, color
      ORDER BY parked_at ASC
    ) as rn
  FROM timeline_parked_items
  WHERE user_id = 'e0da23bf-a943-4147-9e1c-ac19f04e0dc0'
    AND parked_at > NOW() - INTERVAL '2 hours'
)
DELETE FROM timeline_parked_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Show how many parked items remain for this user
SELECT
  COUNT(*) as remaining_parked_items,
  'Cleanup complete' as status
FROM timeline_parked_items
WHERE user_id = 'e0da23bf-a943-4147-9e1c-ac19f04e0dc0';

-- Show the remaining parked items (if you want to see them)
SELECT
  id,
  title,
  duration_minutes,
  parked_at,
  'Remaining item' as status
FROM timeline_parked_items
WHERE user_id = 'e0da23bf-a943-4147-9e1c-ac19f04e0dc0'
ORDER BY parked_at DESC
LIMIT 20;
