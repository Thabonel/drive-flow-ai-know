-- Living Assistant: Proactive Check-in System
-- Created: 2026-02-05
-- Purpose: Configuration and scheduling for proactive check-ins

-- =============================================================================
-- PART 1: User check-in preferences
-- =============================================================================
CREATE TABLE IF NOT EXISTS proactive_checkin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Overall enable/disable
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Check-in frequency (in minutes)
  check_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (check_interval_minutes >= 15),

  -- Quiet hours (don't disturb during these times)
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  quiet_days INTEGER[] DEFAULT ARRAY[0, 6], -- 0=Sunday, 6=Saturday

  -- Channel preferences
  telegram_enabled BOOLEAN DEFAULT TRUE,
  telegram_chat_id TEXT,
  slack_enabled BOOLEAN DEFAULT FALSE,
  slack_channel_id TEXT,
  phone_enabled BOOLEAN DEFAULT FALSE,
  phone_number TEXT,

  -- Thresholds for actions
  text_threshold INTEGER NOT NULL DEFAULT 4 CHECK (text_threshold BETWEEN 1 AND 10),
  call_threshold INTEGER NOT NULL DEFAULT 8 CHECK (call_threshold BETWEEN 1 AND 10),

  -- What to monitor
  monitor_emails BOOLEAN DEFAULT TRUE,
  monitor_calendar BOOLEAN DEFAULT TRUE,
  monitor_tasks BOOLEAN DEFAULT TRUE,
  monitor_goals BOOLEAN DEFAULT TRUE,

  -- Email monitoring settings
  email_urgent_keywords TEXT[] DEFAULT ARRAY['urgent', 'asap', 'immediately', 'critical', 'deadline'],
  email_important_senders TEXT[] DEFAULT ARRAY[],

  -- Calendar monitoring settings
  calendar_reminder_minutes INTEGER DEFAULT 15, -- Remind X minutes before meeting
  calendar_include_all_day BOOLEAN DEFAULT FALSE,

  -- Last check-in tracking
  last_checkin_at TIMESTAMPTZ,
  last_action_taken TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 2: Check-in execution tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS checkin_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Execution details
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),

  -- Context gathered
  emails_scanned INTEGER DEFAULT 0,
  urgent_emails INTEGER DEFAULT 0,
  calendar_events_scanned INTEGER DEFAULT 0,
  upcoming_meetings INTEGER DEFAULT 0,
  tasks_scanned INTEGER DEFAULT 0,
  overdue_tasks INTEGER DEFAULT 0,
  high_priority_tasks INTEGER DEFAULT 0,

  -- Decision
  urgency_score INTEGER CHECK (urgency_score BETWEEN 0 AND 10),
  action_decided TEXT CHECK (action_decided IN ('skip', 'text', 'call')),
  action_reason TEXT,

  -- Execution result
  message_sent TEXT,
  message_sent_at TIMESTAMPTZ,
  call_initiated BOOLEAN DEFAULT FALSE,
  call_duration_seconds INTEGER,

  -- User response
  user_acknowledged BOOLEAN DEFAULT FALSE,
  user_acknowledged_at TIMESTAMPTZ,
  user_feedback TEXT,

  -- Error tracking
  error_message TEXT,

  -- Context snapshot (full details)
  context_snapshot JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_proactive_settings_user ON proactive_checkin_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_settings_enabled ON proactive_checkin_settings(enabled) WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_checkin_executions_user ON checkin_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_executions_status ON checkin_executions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_checkin_executions_created ON checkin_executions(user_id, created_at DESC);

-- =============================================================================
-- PART 4: RLS Policies
-- =============================================================================
ALTER TABLE proactive_checkin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own proactive_checkin_settings"
  ON proactive_checkin_settings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own checkin_executions"
  ON checkin_executions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all checkin_executions"
  ON checkin_executions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can read all proactive_checkin_settings"
  ON proactive_checkin_settings FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- PART 5: Functions for check-in scheduling
-- =============================================================================

-- Function to get users due for check-in
CREATE OR REPLACE FUNCTION get_users_due_for_checkin()
RETURNS TABLE (
  user_id UUID,
  telegram_chat_id TEXT,
  slack_channel_id TEXT,
  phone_number TEXT,
  text_threshold INTEGER,
  call_threshold INTEGER,
  monitor_emails BOOLEAN,
  monitor_calendar BOOLEAN,
  monitor_tasks BOOLEAN,
  monitor_goals BOOLEAN,
  email_urgent_keywords TEXT[],
  email_important_senders TEXT[],
  calendar_reminder_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    s.telegram_chat_id,
    s.slack_channel_id,
    s.phone_number,
    s.text_threshold,
    s.call_threshold,
    s.monitor_emails,
    s.monitor_calendar,
    s.monitor_tasks,
    s.monitor_goals,
    s.email_urgent_keywords,
    s.email_important_senders,
    s.calendar_reminder_minutes
  FROM proactive_checkin_settings s
  WHERE s.enabled = TRUE
    -- Check interval has passed since last check-in
    AND (
      s.last_checkin_at IS NULL
      OR s.last_checkin_at < NOW() - (s.check_interval_minutes || ' minutes')::INTERVAL
    )
    -- Not in quiet hours
    AND NOT (
      CURRENT_TIME >= s.quiet_hours_start
      OR CURRENT_TIME <= s.quiet_hours_end
    )
    -- Not a quiet day
    AND NOT (EXTRACT(DOW FROM CURRENT_DATE)::INTEGER = ANY(s.quiet_days))
    -- At least one channel is configured
    AND (
      (s.telegram_enabled AND s.telegram_chat_id IS NOT NULL)
      OR (s.slack_enabled AND s.slack_channel_id IS NOT NULL)
      OR (s.phone_enabled AND s.phone_number IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's pending context
CREATE OR REPLACE FUNCTION get_user_checkin_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}';
  v_emails JSONB;
  v_calendar JSONB;
  v_tasks JSONB;
  v_goals JSONB;
BEGIN
  -- Get unread urgent emails (if received_emails table exists)
  BEGIN
    SELECT jsonb_build_object(
      'total_unread', COUNT(*),
      'urgent_count', COUNT(*) FILTER (WHERE
        subject ILIKE ANY(ARRAY['%urgent%', '%asap%', '%immediately%', '%critical%', '%deadline%'])
        OR ai_category = 'urgent'
      ),
      'important_senders', (
        SELECT jsonb_agg(DISTINCT from_email)
        FROM received_emails
        WHERE user_id = p_user_id
          AND processing_status = 'pending'
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 5
      )
    )
    INTO v_emails
    FROM received_emails
    WHERE user_id = p_user_id
      AND processing_status = 'pending'
      AND created_at > NOW() - INTERVAL '24 hours';

    v_result := v_result || jsonb_build_object('emails', COALESCE(v_emails, '{"total_unread":0,"urgent_count":0}'::jsonb));
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('emails', '{"total_unread":0,"urgent_count":0,"error":"table_not_found"}'::jsonb);
  END;

  -- Get upcoming calendar events
  SELECT jsonb_build_object(
    'upcoming_count', COUNT(*),
    'next_event', (
      SELECT jsonb_build_object(
        'title', title,
        'start_time', start_time,
        'minutes_until', EXTRACT(EPOCH FROM (start_time - NOW())) / 60
      )
      FROM timeline_items
      WHERE user_id = p_user_id
        AND status = 'active'
        AND start_time > NOW()
        AND start_time < NOW() + INTERVAL '2 hours'
      ORDER BY start_time
      LIMIT 1
    ),
    'events_next_2_hours', (
      SELECT jsonb_agg(jsonb_build_object(
        'title', title,
        'start_time', start_time,
        'minutes_until', EXTRACT(EPOCH FROM (start_time - NOW())) / 60
      ) ORDER BY start_time)
      FROM timeline_items
      WHERE user_id = p_user_id
        AND status = 'active'
        AND start_time > NOW()
        AND start_time < NOW() + INTERVAL '2 hours'
    )
  )
  INTO v_calendar
  FROM timeline_items
  WHERE user_id = p_user_id
    AND status = 'active'
    AND start_time > NOW()
    AND start_time < NOW() + INTERVAL '2 hours';

  v_result := v_result || jsonb_build_object('calendar', COALESCE(v_calendar, '{"upcoming_count":0}'::jsonb));

  -- Get pending tasks
  SELECT jsonb_build_object(
    'total_pending', COUNT(*),
    'high_priority', COUNT(*) FILTER (WHERE priority >= 3),
    'overdue', 0, -- Tasks don't have due dates in current schema
    'top_tasks', (
      SELECT jsonb_agg(jsonb_build_object(
        'title', title,
        'priority', priority
      ) ORDER BY priority DESC)
      FROM (
        SELECT title, priority
        FROM tasks
        WHERE user_id = p_user_id
        ORDER BY priority DESC
        LIMIT 3
      ) t
    )
  )
  INTO v_tasks
  FROM tasks
  WHERE user_id = p_user_id;

  v_result := v_result || jsonb_build_object('tasks', COALESCE(v_tasks, '{"total_pending":0,"high_priority":0}'::jsonb));

  -- Get active goals
  SELECT jsonb_build_object(
    'active_count', COUNT(*),
    'overdue', COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND status = 'active'),
    'due_soon', COUNT(*) FILTER (WHERE target_date <= CURRENT_DATE + 7 AND target_date >= CURRENT_DATE AND status = 'active'),
    'recent_goals', (
      SELECT jsonb_agg(jsonb_build_object(
        'title', title,
        'priority', priority,
        'progress', progress_percentage,
        'target_date', target_date
      ) ORDER BY priority DESC)
      FROM (
        SELECT title, priority, progress_percentage, target_date
        FROM user_goals
        WHERE user_id = p_user_id AND status = 'active'
        ORDER BY priority DESC
        LIMIT 3
      ) g
    )
  )
  INTO v_goals
  FROM user_goals
  WHERE user_id = p_user_id AND status = 'active';

  v_result := v_result || jsonb_build_object('goals', COALESCE(v_goals, '{"active_count":0}'::jsonb));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate urgency score
CREATE OR REPLACE FUNCTION calculate_urgency_score(p_context JSONB)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_emails JSONB;
  v_calendar JSONB;
  v_tasks JSONB;
  v_goals JSONB;
  v_minutes_until_meeting INTEGER;
BEGIN
  v_emails := p_context->'emails';
  v_calendar := p_context->'calendar';
  v_tasks := p_context->'tasks';
  v_goals := p_context->'goals';

  -- Email scoring (max 3 points)
  v_score := v_score + LEAST((v_emails->>'urgent_count')::INTEGER * 2, 3);

  -- Calendar scoring (max 5 points)
  v_minutes_until_meeting := (v_calendar->'next_event'->>'minutes_until')::INTEGER;
  IF v_minutes_until_meeting IS NOT NULL THEN
    IF v_minutes_until_meeting <= 10 THEN
      v_score := v_score + 5; -- Meeting in 10 mins or less
    ELSIF v_minutes_until_meeting <= 30 THEN
      v_score := v_score + 3; -- Meeting in 30 mins
    ELSIF v_minutes_until_meeting <= 60 THEN
      v_score := v_score + 1; -- Meeting in 1 hour
    END IF;
  END IF;

  -- Task scoring (max 3 points)
  v_score := v_score + LEAST((v_tasks->>'high_priority')::INTEGER, 3);

  -- Goal scoring (max 2 points)
  v_score := v_score + LEAST((v_goals->>'overdue')::INTEGER * 2, 2);

  -- Cap at 10
  RETURN LEAST(v_score, 10);
END;
$$ LANGUAGE plpgsql;

-- Function to record check-in execution
CREATE OR REPLACE FUNCTION record_checkin_execution(
  p_user_id UUID,
  p_context JSONB,
  p_urgency_score INTEGER,
  p_action TEXT,
  p_reason TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_execution_id UUID;
BEGIN
  INSERT INTO checkin_executions (
    user_id,
    completed_at,
    status,
    emails_scanned,
    urgent_emails,
    calendar_events_scanned,
    upcoming_meetings,
    tasks_scanned,
    high_priority_tasks,
    urgency_score,
    action_decided,
    action_reason,
    message_sent,
    message_sent_at,
    context_snapshot
  ) VALUES (
    p_user_id,
    NOW(),
    'completed',
    COALESCE((p_context->'emails'->>'total_unread')::INTEGER, 0),
    COALESCE((p_context->'emails'->>'urgent_count')::INTEGER, 0),
    COALESCE((p_context->'calendar'->>'upcoming_count')::INTEGER, 0),
    COALESCE((p_context->'calendar'->>'upcoming_count')::INTEGER, 0),
    COALESCE((p_context->'tasks'->>'total_pending')::INTEGER, 0),
    COALESCE((p_context->'tasks'->>'high_priority')::INTEGER, 0),
    p_urgency_score,
    p_action,
    p_reason,
    p_message,
    CASE WHEN p_message IS NOT NULL THEN NOW() ELSE NULL END,
    p_context
  )
  RETURNING id INTO v_execution_id;

  -- Update last check-in time
  UPDATE proactive_checkin_settings
  SET
    last_checkin_at = NOW(),
    last_action_taken = p_action,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 6: Triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION update_proactive_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proactive_settings_timestamp
  BEFORE UPDATE ON proactive_checkin_settings
  FOR EACH ROW EXECUTE FUNCTION update_proactive_settings_updated_at();

-- =============================================================================
-- PART 7: pg_cron job setup (manual execution required in SQL Editor)
-- =============================================================================
-- Note: Run this manually in Supabase SQL Editor to enable the cron job:
--
-- SELECT cron.schedule(
--   'proactive-checkin-30min',
--   '*/30 * * * *',  -- Every 30 minutes
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/proactive-checkin',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To view scheduled jobs: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('proactive-checkin-30min');
