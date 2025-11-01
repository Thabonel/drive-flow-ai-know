# AI Daily Brief & Email-to-Task System Setup Guide

Complete implementation of AI-powered daily brief generation and email-to-task processing.

## Features Implemented

### 1. AI Daily Brief 📊
- **Beautiful full-page daily brief** with executive summary
- **AI-generated insights** about your day ahead
- **Priority meetings** with time, location, and attendees
- **Tasks due today** with priority and duration
- **Key decisions needed** with deadlines
- **Schedule overview** for the complete day
- **AI suggestions** for optimizing your day
- **Email delivery** option to send brief to your inbox

### 2. Email-to-Task System 📧
- **Automatic email receiving** at tasks@yourdomain.com
- **AI-powered task extraction** from email content
- **Smart categorization** (actionable, informational, spam, newsletter, meeting)
- **Priority detection** (1-5 scale)
- **Time estimation** for each task
- **Suggested deadlines** based on email content
- **Sender pattern learning** for auto-categorization
- **Bulk approval** of extracted tasks
- **Edit before approving** capability

---

## Database Setup

### Step 1: Run Migration

```bash
# Open this file in Supabase SQL Editor:
supabase/migrations/20251102000014_create_email_to_task_system.sql

# Copy all content and run in SQL Editor
```

This creates:
- **received_emails** table - Stores incoming emails
- **email_tasks** table - AI-extracted tasks from emails
- **email_sender_patterns** table - Learned sender preferences
- **daily_briefs** table - Generated daily briefs
- **Functions** for data processing
- **RLS policies** for security
- **Indexes** for performance

### Step 2: Verify Migration

```sql
-- Should return 4 tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('received_emails', 'email_tasks', 'email_sender_patterns', 'daily_briefs');

-- Should return 4 functions
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'get_pending_email_tasks_count',
  'update_sender_pattern',
  'get_daily_brief_data',
  'update_email_system_updated_at'
);
```

---

## Edge Functions Setup

### Required Functions

1. **generate-daily-brief** - Generates AI insights for daily brief
2. **receive-email** - Receives and stores incoming emails
3. **process-email-with-ai** - Extracts tasks using GPT-4

### Deploy Functions

```bash
# Deploy all email/brief functions
supabase functions deploy generate-daily-brief
supabase functions deploy receive-email
supabase functions deploy process-email-with-ai
```

### Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

```bash
# Required for AI processing
OPENAI_API_KEY=your_openai_key_here

# Already set (if using existing project)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Email Setup (Email-to-Task)

### Option A: Using SendGrid Inbound Parse

1. **Add Domain to SendGrid**
   - Go to SendGrid Dashboard → Inbound Parse
   - Add domain: yourdomain.com
   - Add subdomain: tasks

2. **Configure Webhook**
   - Destination URL: `https://[your-project-ref].supabase.co/functions/v1/receive-email`
   - Check "POST the raw, full MIME message"

3. **User Email Addresses**
   Each user forwards emails to: `tasks-{their_email}@yourdomain.com`

   Example:
   - john@company.com → tasks-john@company.com@yourdomain.com
   - Or use: tasks+john-company-com@yourdomain.com

### Option B: Using Mailgun Routes

1. **Add Route in Mailgun**
   ```
   Match Recipient: tasks-(.*)@yourdomain.com
   Forward to URL: https://[your-project-ref].supabase.co/functions/v1/receive-email
   ```

2. **Configure Action**
   - Select "Store and forward"
   - Set priority: 10

### Option C: Direct SMTP (Advanced)

Configure your mail server to forward emails to the Supabase Edge Function.

---

## Frontend Components

### Components Created

✅ **src/components/ai/AIDailyBrief.tsx**
- Main daily brief display component
- Beautiful UI with sections and cards
- Auto-generate on page load
- Email sending capability

✅ **src/components/email/EmailToTaskManager.tsx**
- Email and task management interface
- Tabbed view (Tasks | Emails | Patterns)
- Edit tasks before approval
- Bulk operations
- Sender pattern management

### Hooks Created

✅ **src/hooks/useAIDailyBrief.ts**
- Fetches and generates daily briefs
- Calls Edge Function for AI processing
- Email delivery
- State management

✅ **src/hooks/useAIEmailParser.ts**
- Manages email and task state
- Approve/reject tasks
- Update task details
- Sender pattern configuration
- Bulk operations

### Pages Created

✅ **src/pages/DailyBrief.tsx** - Daily brief page
✅ **src/pages/EmailToTask.tsx** - Email-to-task management page

### Routes Added

```typescript
/daily-brief      → Daily Brief page
/email-to-task    → Email-to-Task management
```

### Navigation Added

Sidebar now includes:
- ✨ Daily Brief
- 📧 Email to Task

---

## How to Use

### Daily Brief

1. **Navigate to /daily-brief**
2. Brief auto-generates on first visit
3. Click **"Refresh"** to regenerate
4. Click **"Email Brief"** to send to your inbox

**What You'll See:**
- AI insights about your day
- Priority meetings with details
- Tasks due today
- Schedule overview
- Key decisions needed
- AI suggestions for optimization

### Email-to-Task

1. **Forward emails** to your tasks address
   - Example: `tasks-john@company.com@yourdomain.com`

2. **AI processes email** automatically
   - Extracts actionable tasks
   - Estimates time and priority
   - Suggests deadlines
   - Categorizes email

3. **Review in /email-to-task**
   - **Tasks Tab**: See extracted tasks
   - **Emails Tab**: View processed emails
   - **Patterns Tab**: Manage sender preferences

4. **Approve or reject tasks**
   - Click **"Edit"** to modify details
   - Click **"Approve"** to add to timeline
   - Click **"Reject"** to dismiss
   - Click **"Approve All"** for bulk approval

5. **Task becomes timeline item**
   - Automatically added to your timeline
   - Includes priority, deadline, and category
   - Linked back to original email

### Sender Patterns (Auto-Learning)

As you process emails, the system learns:
- Which senders send actionable emails
- Which senders to auto-ignore
- Email categories by sender
- Priority levels by sender

**Configure Auto-Actions:**
- Go to **Patterns Tab**
- Click **"Auto-Ignore"** on any sender
- Future emails from that sender auto-ignored

---

## AI Processing Details

### Daily Brief Generation

**Input:**
- All timeline items for today
- Tasks due today
- Priority meetings
- Pending email tasks

**AI Analysis:**
```
- Identifies key insights about the day
- Detects decision points
- Suggests optimizations
- Highlights potential conflicts
- Prioritizes your attention
```

**Output:**
- Executive summary
- Key decisions list
- AI suggestions
- HTML and Markdown versions

### Email Task Extraction

**Input:**
- Email subject
- Email body
- Sender information

**AI Extraction:**
```javascript
{
  "category": "actionable|informational|spam|newsletter|meeting|other",
  "priority": 1-5,
  "summary": "Brief summary of email",
  "tasks": [
    {
      "title": "Task title",
      "description": "More details",
      "priority": 1-5,
      "estimated_duration_minutes": 30,
      "suggested_deadline": "2024-01-15T17:00:00Z",
      "category": "work"
    }
  ]
}
```

**Learning:**
- Updates sender patterns
- Tracks actionable vs spam ratio
- Auto-categorizes future emails

---

## Database Schema

### received_emails
```sql
- id (uuid)
- user_id (uuid, FK to users)
- from_email (text)
- from_name (text)
- subject (text)
- body_text (text)
- body_html (text)
- message_id (text)
- in_reply_to (text)
- email_references (text)
- processing_status (enum: pending, processing, completed, failed, ignored)
- ai_extracted_tasks (jsonb)
- ai_summary (text)
- ai_category (text)
- ai_priority (integer 1-5)
- user_reviewed (boolean)
- received_at (timestamptz)
```

### email_tasks
```sql
- id (uuid)
- user_id (uuid, FK to users)
- email_id (uuid, FK to received_emails)
- timeline_item_id (uuid, FK to timeline_items, nullable)
- title (text)
- description (text)
- estimated_duration_minutes (integer)
- ai_priority (integer 1-5)
- ai_suggested_deadline (timestamptz)
- ai_category (text)
- status (enum: pending, approved, rejected, converted)
- user_edited_* fields for modifications
- created_at, approved_at, converted_at (timestamptz)
```

### email_sender_patterns
```sql
- id (uuid)
- user_id (uuid, FK to users)
- sender_email (text)
- total_emails_received (integer)
- actionable_count (integer)
- ignored_count (integer)
- spam_count (integer)
- auto_category (text)
- auto_priority (integer 1-5)
- auto_ignore (boolean)
- first_seen, last_seen (timestamptz)
```

### daily_briefs
```sql
- id (uuid)
- user_id (uuid, FK to users)
- brief_date (date)
- generated_at (timestamptz)
- priority_meetings (jsonb)
- key_decisions (jsonb)
- tasks_due_today (jsonb)
- schedule_overview (jsonb)
- ai_insights (text)
- ai_suggestions (jsonb)
- brief_html (text)
- brief_markdown (text)
- emailed (boolean)
- emailed_at (timestamptz)
```

---

## API Usage

### Generate Daily Brief

```typescript
const { data, error } = await supabase.functions.invoke('generate-daily-brief', {
  body: {
    user_id: user.id,
    date: '2024-01-15',
    raw_data: {
      priority_meetings: [...],
      tasks_due_today: [...],
      schedule_overview: [...],
      pending_email_tasks: [...]
    }
  }
});
```

### Process Email

```typescript
const { data, error } = await supabase.functions.invoke('receive-email', {
  body: {
    from: 'sender@example.com',
    from_name: 'John Sender',
    to: 'tasks-yourname@yourdomain.com',
    subject: 'Email subject',
    text: 'Email body',
    html: '<p>Email body</p>'
  }
});
```

---

## Troubleshooting

### Daily Brief Not Generating

**Check:**
```sql
-- Verify function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'get_daily_brief_data';

-- Test function manually
SELECT get_daily_brief_data(
  'your-user-id-here'::uuid,
  '2024-01-15'::date
);
```

**Fix:**
- Ensure migration ran successfully
- Check OPENAI_API_KEY is set in Edge Functions
- Verify timeline items exist for today

### Emails Not Being Received

**Check:**
1. SendGrid/Mailgun webhook configured correctly
2. Edge Function `receive-email` is deployed
3. Webhook URL is correct
4. Email forwarding format matches expected pattern

**Test manually:**
```bash
curl -X POST https://[your-project].supabase.co/functions/v1/receive-email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "tasks-yourname@yourdomain.com",
    "subject": "Test email",
    "text": "Please review the Q4 report by Friday",
    "message_id": "<test-123@example.com>",
    "in_reply_to": null,
    "email_references": null
  }'
```

### AI Not Extracting Tasks

**Check:**
- OPENAI_API_KEY is valid and has credit
- Email body contains actionable content
- Check Edge Function logs in Supabase

**Test AI extraction:**
```sql
SELECT * FROM received_emails
WHERE processing_status = 'failed'
ORDER BY received_at DESC
LIMIT 10;
```

### Sender Patterns Not Learning

**Verify function:**
```sql
SELECT * FROM email_sender_patterns
WHERE user_id = 'your-user-id';

-- Manually trigger pattern update
SELECT update_sender_pattern(
  'your-user-id'::uuid,
  'sender@example.com',
  'actionable',
  true,
  false
);
```

---

## Cost Estimates

### OpenAI API Costs

**Daily Brief** (GPT-4 Turbo):
- ~2000 tokens input
- ~800 tokens output
- Cost: ~$0.03 per brief

**Email Processing** (GPT-4 Turbo):
- ~500 tokens input per email
- ~200 tokens output
- Cost: ~$0.008 per email

**Monthly estimate** (1 brief/day + 50 emails/day):
- Daily briefs: $0.93/month
- Email processing: $12/month
- **Total: ~$13/month**

---

## Next Steps (Optional Enhancements)

- [ ] Add email threading support
- [ ] Implement email reply from timeline
- [ ] Add calendar integration for meetings from emails
- [ ] Create email templates for common responses
- [ ] Add voice brief generation
- [ ] Implement SMS delivery of brief
- [ ] Add Slack/Teams integration
- [ ] Create weekly/monthly brief summaries
- [ ] Add team-wide brief sharing
- [ ] Implement AI-suggested email replies

---

## Files Reference

**Database:**
- `supabase/migrations/20251102000014_create_email_to_task_system.sql`

**Edge Functions:**
- `supabase/functions/generate-daily-brief/index.ts`
- `supabase/functions/receive-email/index.ts`
- `supabase/functions/process-email-with-ai/index.ts`

**Frontend:**
- `src/components/ai/AIDailyBrief.tsx`
- `src/components/email/EmailToTaskManager.tsx`
- `src/hooks/useAIDailyBrief.ts`
- `src/hooks/useAIEmailParser.ts`
- `src/pages/DailyBrief.tsx`
- `src/pages/EmailToTask.tsx`

**Routes:** Added in `src/App.tsx`
**Navigation:** Updated in `src/components/AppSidebar.tsx`

---

Ready to use! 🚀

Generate your first daily brief at `/daily-brief` and start forwarding emails to see AI task extraction in action.
