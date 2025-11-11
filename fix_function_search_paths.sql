-- ============================================================================
-- FIX FUNCTION SEARCH PATHS - SECURITY ENHANCEMENT
-- Run this directly in Supabase SQL Editor
-- ============================================================================
-- This script fixes all functions with mutable search_path by setting
-- search_path = '' (empty string) which prevents search path injection attacks.
-- ============================================================================

-- Step 1: Find all functions without proper search_path setting
DO $$
DECLARE
  func_rec record;
  func_def text;
  new_func_def text;
  execute_sql text;
  fixed_count integer := 0;
  skipped_count integer := 0;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Fixing functions with mutable search_path...';
  RAISE NOTICE '==================================================';

  -- Loop through all functions in public schema that don't have search_path set
  FOR func_rec IN
    SELECT
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- Only regular functions (not procedures)
      AND NOT EXISTS (
        SELECT 1
        FROM pg_proc_proconfig(p.oid) as config
        WHERE config LIKE 'search_path=%'
      )
    ORDER BY p.proname
  LOOP
    BEGIN
      -- Get the current function definition
      func_def := func_rec.function_definition;

      -- Check if it already has SET search_path (double-check)
      IF func_def LIKE '%SET search_path%' THEN
        RAISE NOTICE '  Skipping % - already has search_path set', func_rec.function_name;
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      -- Add SET search_path = '' before the AS clause
      -- Handle both "AS $" and "AS $$" patterns
      IF func_def ~ 'AS \$' THEN
        new_func_def := regexp_replace(
          func_def,
          '(LANGUAGE \w+\s*(?:SECURITY (?:DEFINER|INVOKER)\s*)?)\s*AS',
          E'\\1\nSET search_path = ''''\nAS',
          'g'
        );

        -- Execute the modified function definition
        EXECUTE new_func_def;

        RAISE NOTICE '  Fixed: %', func_rec.function_name;
        fixed_count := fixed_count + 1;
      ELSE
        RAISE NOTICE '  Warning: Could not parse % - manual fix required', func_rec.function_name;
        skipped_count := skipped_count + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '  Error fixing %: %', func_rec.function_name, SQLERRM;
        skipped_count := skipped_count + 1;
    END;
  END LOOP;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Fixed % functions', fixed_count;
  RAISE NOTICE 'Skipped % functions', skipped_count;
  RAISE NOTICE '==================================================';
END $$;

-- Step 2: Verify the fixes
DO $$
DECLARE
  func_rec record;
  remaining_count integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Verification - Remaining functions without search_path:';
  RAISE NOTICE '==================================================';

  FOR func_rec IN
    SELECT
      p.proname as function_name,
      n.nspname as schema_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_proc_proconfig(p.oid) as config
        WHERE config LIKE 'search_path=%'
      )
    ORDER BY p.proname
  LOOP
    RAISE NOTICE '  %.%', func_rec.schema_name, func_rec.function_name;
    remaining_count := remaining_count + 1;
  END LOOP;

  IF remaining_count = 0 THEN
    RAISE NOTICE '  (None - all functions have search_path set!)';
  END IF;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Total remaining: %', remaining_count;
  RAISE NOTICE '==================================================';
END $$;
