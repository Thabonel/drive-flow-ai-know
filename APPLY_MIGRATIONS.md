# How to Apply New Feature Migrations

This document explains how to apply the database migrations for the three new major features:
1. AI Time Intelligence
2. Daily Planning Ritual
3. Booking Links

## Option 1: Via Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/fskwutnoxbbflzqrphro
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `apply-all-migrations.sql` (in this directory)
4. Click **Run** to execute all migrations at once

## Option 2: Individual Migration Files

Apply each migration in order via the Supabase SQL Editor:

### Day Templates & Routines (Supporting Features)
1. `supabase/migrations/20251102000004_create_day_templates.sql`
2. `supabase/migrations/20251102000005_seed_system_templates.sql`
3. `supabase/migrations/20251102000006_create_routine_items.sql`
4. `supabase/migrations/20251102000007_seed_default_routines.sql`
5. `supabase/migrations/20251102000008_add_routine_id_to_timeline_items.sql`

### AI Time Intelligence
6. `supabase/migrations/20251102000009_create_time_tracking.sql`

### Daily Planning Ritual
7. `supabase/migrations/20251102000010_create_daily_planning.sql`

### Booking Links
8. `supabase/migrations/20251102000011_create_booking_links.sql`

## Option 3: Via Supabase CLI (If You Have DB Password)

If you have the database password, you can apply all migrations using:

```bash
cd supabase
npx supabase db push
```

Note: This might fail if there's a migration history mismatch. In that case, use Option 1 or 2.

## Verifying Installation

After applying migrations, verify the tables were created:

```sql
-- Check AI Time Intelligence
SELECT COUNT(*) FROM time_tracking;

-- Check Daily Planning
SELECT COUNT(*) FROM daily_planning_sessions;
SELECT COUNT(*) FROM daily_planning_settings;

-- Check Booking Links
SELECT COUNT(*) FROM booking_links;
SELECT COUNT(*) FROM bookings;

-- Check support tables
SELECT COUNT(*) FROM day_templates;
SELECT COUNT(*) FROM routine_items;
```

## Required Environment Variables

Make sure you have set the OpenAI API key for AI features:

```bash
# In Supabase Edge Functions settings
OPENAI_API_KEY=sk-...
```

You can set this in the Supabase dashboard under:
**Settings** → **Edge Functions** → **Secrets**

## Features Now Available

After applying migrations:

1. **AI Time Intelligence**: Go to Timeline Manager → Create a task to see AI time estimates
2. **Daily Planning**: Click "Daily Planning" button in Timeline Manager
3. **Booking Links**: Click "Booking Links" button or navigate to `/booking-links`

## Troubleshooting

### Migration Fails with "relation already exists"
This means the table was already created. You can skip that migration or drop the table first.

### Function "get_available_slots" does not exist
Make sure you applied migration `20251102000011_create_booking_links.sql` which includes all the functions.

### AI features not working
1. Check that `OPENAI_API_KEY` is set in Supabase Edge Functions settings
2. Verify the `time_tracking` table exists
3. Check browser console for errors

## Need Help?

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify all migrations were applied successfully
3. Check that all tables have RLS policies enabled
4. Ensure your Supabase project has the latest updates
