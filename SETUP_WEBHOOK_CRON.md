# Setup Stripe Webhook Cron Job

The `process-stripe-webhooks` function needs to run automatically every 5 minutes to process queued webhook events.

## Option 1: Supabase Edge Function Cron (Recommended)

**Status:** ⚠️ This feature is in beta. May require Pro plan.

```bash
# Create a cron schedule
supabase functions schedule create process-webhooks \
  --schedule "*/5 * * * *" \
  --function process-stripe-webhooks \
  --project-ref fskwutnoxbbflzqrphro
```

**Verify it's running:**
```bash
supabase functions schedule list --project-ref fskwutnoxbbflzqrphro
```

---

## Option 2: PostgreSQL pg_cron Extension (Most Reliable)

### Step 1: Enable pg_cron Extension

Run in Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Step 2: Create Cron Job

```sql
-- Schedule webhook processor to run every 5 minutes
SELECT cron.schedule(
  'process-stripe-webhooks',           -- Job name
  '*/5 * * * *',                       -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) as request_id;
  $$
);
```

### Step 3: Verify Cron Job Created

```sql
-- Check cron jobs
SELECT * FROM cron.job;
```

Expected output:
```
jobid | schedule      | command                           | nodename | ...
------|---------------|-----------------------------------|----------|----
1     | */5 * * * *   | SELECT net.http_post(url := ...  | ...      | ...
```

### Step 4: Monitor Cron Execution

```sql
-- Check recent cron runs
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-stripe-webhooks')
ORDER BY start_time DESC
LIMIT 10;
```

### Manage Cron Job

```sql
-- Pause cron job
SELECT cron.unschedule('process-stripe-webhooks');

-- Resume cron job (run the CREATE schedule again)

-- Delete cron job permanently
SELECT cron.unschedule('process-stripe-webhooks');
DELETE FROM cron.job WHERE jobname = 'process-stripe-webhooks';
```

---

## Option 3: External Cron Service (If Supabase options don't work)

Use a service like **cron-job.org**, **EasyCron**, or **GitHub Actions**.

### Example: GitHub Actions Workflow

Create `.github/workflows/process-webhooks.yml`:

```yaml
name: Process Stripe Webhooks
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger webhook processor
        run: |
          curl -X POST \
            https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks \
            -H "Content-Type: application/json"
```

**Note:** No authentication needed - function is public and only processes queued events.

---

## Option 4: Manual Trigger (For Testing)

### Via curl:

```bash
curl -X POST \
  https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks \
  -H "Content-Type: application/json"
```

### Via Supabase CLI:

```bash
supabase functions invoke process-stripe-webhooks \
  --method POST \
  --project-ref fskwutnoxbbflzqrphro
```

### Via Browser:

Open: https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks

---

## Verification

After setting up cron, verify it's working:

### 1. Send Test Webhook

```bash
# Install Stripe CLI if not already installed
stripe trigger customer.subscription.created
```

### 2. Check Queue

Run in SQL Editor:
```sql
SELECT * FROM webhook_events_queue
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Wait 5 Minutes

### 4. Check Processing

```sql
SELECT
  event_id,
  event_type,
  processed,
  processed_at,
  created_at,
  AGE(processed_at, created_at) as processing_time
FROM webhook_events_queue
ORDER BY created_at DESC
LIMIT 5;
```

Expected: `processed = true` within 5-10 minutes

---

## Troubleshooting

### Cron not running

**Check pg_cron is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not found:
```sql
CREATE EXTENSION pg_cron;
```

**Check net extension is available:**
```sql
SELECT * FROM pg_extension WHERE extname IN ('http', 'pg_net');
```

If pg_net not found, use option 3 (external cron).

### Cron running but events not processing

**Check function logs:**
1. Go to Supabase Dashboard
2. Functions → process-stripe-webhooks
3. Logs tab
4. Look for errors

**Common issues:**
- Environment variables not set (STRIPE_SECRET_KEY, SUPABASE_URL, etc.)
- Table name mismatch (FIXED in this deployment)
- Database connection timeout
- RLS policy blocking service role

### Manual recovery

If events are stuck, process manually:
```bash
# Run processor 10 times to clear backlog
for i in {1..10}; do
  curl -X POST https://fskwutnoxbbflzqrphro.supabase.co/functions/v1/process-stripe-webhooks
  echo "Run $i complete"
  sleep 2
done
```

---

## Recommended Setup

1. ✅ Use **Option 2 (pg_cron)** for most reliable automated processing
2. ✅ Set up **Option 4 (manual trigger)** as backup
3. ✅ Monitor with queries from `STRIPE_WEBHOOK_MONITORING.sql`
4. ✅ Set up alerts for queue depth > 10 or age > 30 minutes

---

## Next Steps

After cron is set up:
1. Test with Stripe CLI: `stripe trigger customer.subscription.created`
2. Monitor queue with monitoring queries
3. Set up alerts for failures
4. Document cron status in team wiki
