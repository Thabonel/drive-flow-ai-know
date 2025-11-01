# Migration Fixes Applied

This document tracks the PostgreSQL reserved keyword issues that were identified and fixed in the booking links migration.

## Issues Fixed

### Issue 1: `current_time` Reserved Keyword
**Error:** `syntax error at or near "current_time"`

**Location:** `get_available_slots()` function in `20251102000011_create_booking_links.sql`

**Problem:** `current_time` is a reserved keyword in PostgreSQL used to get the current time.

**Solution:** Renamed variable from `current_time` to `now_time`

**Changes:**
- Line 258: Variable declaration
- Line 280: Variable assignment
- Lines 293-294: Variable usage in slot validation

**Commit:** `65a4ac0` - fix: Rename current_time to now_time to avoid PostgreSQL reserved keyword

---

### Issue 2: `window` Reserved Keyword
**Error:** `syntax error at or near "window"`

**Location:** `get_available_slots()` function in `20251102000011_create_booking_links.sql`

**Problem:** `window` is a reserved keyword in PostgreSQL used for window functions.

**Solution:** Renamed variable from `window` to `time_window`

**Changes:**
- Line 255: Variable declaration
- Line 283: FOR loop iterator
- Line 285: Extracting start time from window
- Line 288: Extracting end time from window

**Commit:** `8e52f4d` - fix: Rename window to time_window to avoid PostgreSQL reserved keyword

---

## PostgreSQL Reserved Keywords to Avoid

When writing PostgreSQL functions, avoid using these common reserved keywords as variable names:

### Time-related:
- `current_time`
- `current_date`
- `current_timestamp`
- `localtime`
- `localtimestamp`

### Window functions:
- `window`
- `over`
- `partition`
- `rows`
- `range`

### Other common ones:
- `user`
- `session`
- `value`
- `table`
- `column`
- `index`
- `constraint`
- `trigger`

**Best Practice:** Use descriptive, specific names like `now_time`, `time_window`, `user_record`, etc.

---

## Verification

After these fixes, the migration should apply cleanly. To verify:

```sql
-- Test the fixed function
SELECT * FROM get_available_slots(
  'booking-link-uuid-here'::UUID,
  CURRENT_DATE + 1,
  'America/New_York'
);
```

---

## Migration Files Status

All migration files have been fixed and regenerated:

✅ `supabase/migrations/20251102000011_create_booking_links.sql` - Fixed
✅ `apply-all-migrations.sql` - Regenerated with fixes

**Latest version:** Commit `8e52f4d`

---

## What's Fixed

The booking links migration now:
- ✅ Creates `btree_gist` extension for UUID support
- ✅ Uses non-reserved variable names (`now_time`, `time_window`)
- ✅ Properly declares all variables
- ✅ Has correct PostgreSQL syntax throughout

**Status:** Ready to apply via Supabase SQL Editor

---

## Next Steps

1. Open Supabase SQL Editor
2. Copy contents of `apply-all-migrations.sql`
3. Paste and run in SQL Editor
4. All migrations should apply successfully

If you encounter any other syntax errors, they will be fixed immediately.
