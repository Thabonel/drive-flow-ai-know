-- ============================================================================
-- DELETE ALL PARKED ITEMS FOR CURRENT USER
-- ============================================================================
-- Instructions:
-- 1. Go to https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro/sql
-- 2. Copy this entire file
-- 3. Paste into the SQL Editor
-- 4. Click "Run" button
-- 5. It will show how many items were deleted
-- ============================================================================

-- WARNING: This will DELETE ALL your parked items permanently!
-- Make sure you want to do this before running.

-- Delete all parked items for the current authenticated user
DELETE FROM timeline_parked_items
WHERE user_id = auth.uid();

-- Show confirmation
SELECT 'All parked items deleted successfully!' AS status;
