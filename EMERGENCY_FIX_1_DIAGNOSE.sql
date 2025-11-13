-- ============================================================================
-- STEP 1: DIAGNOSE THE 4 PROBLEMATIC TIMELINE ITEMS
-- ============================================================================
-- Run this in Supabase SQL Editor to see what's wrong
-- URL: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql/new
-- ============================================================================

-- View the full details of the 4 problem items
SELECT
  id,
  user_id,
  layer_id,
  title,
  status,
  visibility,
  is_meeting,
  is_flexible,
  sync_status,
  sync_source,
  team_id,
  assigned_to,
  routine_id,
  google_event_id,
  created_at,
  updated_at
FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Check if layer_id references still exist (foreign key check)
SELECT
  ti.id,
  ti.layer_id,
  tl.id as layer_exists,
  CASE
    WHEN tl.id IS NULL THEN 'LAYER DELETED - ORPHANED ITEM!'
    ELSE 'OK'
  END as status
FROM timeline_items ti
LEFT JOIN timeline_layers tl ON ti.layer_id = tl.id
WHERE ti.id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Check for NULL values in columns that should NOT be NULL
SELECT
  id,
  title,
  CASE WHEN is_meeting IS NULL THEN 'NULL!' ELSE 'OK' END as is_meeting_status,
  CASE WHEN is_flexible IS NULL THEN 'NULL!' ELSE 'OK' END as is_flexible_status,
  CASE WHEN sync_status IS NULL THEN 'NULL!' ELSE 'OK' END as sync_status_status,
  CASE WHEN sync_source IS NULL THEN 'NULL!' ELSE 'OK' END as sync_source_status,
  CASE WHEN visibility IS NULL THEN 'NULL!' ELSE 'OK' END as visibility_status
FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Check for invalid CHECK constraint values
SELECT
  id,
  title,
  visibility,
  CASE
    WHEN visibility NOT IN ('personal', 'team', 'assigned') THEN 'INVALID!'
    ELSE 'OK'
  END as visibility_check,
  sync_status,
  CASE
    WHEN sync_status NOT IN ('synced', 'pending', 'conflict', 'local_only', 'error') THEN 'INVALID!'
    ELSE 'OK'
  END as sync_status_check,
  sync_source,
  CASE
    WHEN sync_source NOT IN ('local', 'google', 'both') THEN 'INVALID!'
    ELSE 'OK'
  END as sync_source_check
FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);

-- Summary of issues
SELECT
  'Diagnostic Complete' as status,
  COUNT(*) as problem_items_found
FROM timeline_items
WHERE id IN (
  '1ce54f57-bf56-4746-8955-afde3470dd9b',
  '5f8847b9-c53e-424b-91bd-61ba66095874',
  '5c120093-109d-4631-9626-186b9a8cdcad',
  '0d0c3502-08e9-4d97-a2dc-5b221e8b3f65'
);
