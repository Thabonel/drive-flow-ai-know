# Apply Recurrence Migration

The recurrence feature has been implemented in the code, but the database migration needs to be applied manually.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
2. Navigate to the SQL Editor
3. Copy and paste the SQL from `supabase/migrations/20251102000016_add_task_recurrence.sql`
4. Run the query

## Option 2: Via Supabase CLI

If you want to fix the migration history issues first:

```bash
# Repair the migration history
supabase migration repair --status reverted 20250703122910 20250707021203 20250707023727 20250707040714 20250707044059 20250708015311 20250712112236 20250725042440 20250905042730 20250905043316 20250906020528 20250916102004 20250916102122 20250916102304 20250916102417 20250916102527 20250916102610 20250916102637 20250916102920 20250916103021 20250916103207 20250916103330 20250916104426 20250916104539 20250916104606 20250916104627 20250926100556 20250926101041 20250926104426 20250926110903 20250930102757 20251001013711 20251001080336 20251016004801

# Pull remote schema to sync local migrations
supabase db pull

# Then push the new migration
supabase db push
```

## What the migration does:

- Adds `is_recurring` BOOLEAN field to tasks table
- Adds `recurrence_pattern` JSONB field for pattern storage
- Adds `recurrence_end_date` TIMESTAMPTZ field for end dates
- Adds `parent_task_id` UUID field for tracking task instances
- Creates indexes for performance
- Adds helpful column comments

## After applying the migration:

You can test the recurring tasks feature:
1. Create a task with recurrence settings (Daily, Weekly, or Monthly)
2. Drag it to the timeline
3. Multiple instances will be created automatically based on the pattern
