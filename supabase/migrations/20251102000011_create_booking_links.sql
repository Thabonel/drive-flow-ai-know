-- Create Booking Links System
-- Created: 2025-11-02
-- Purpose: Calendly-style booking links with availability checking

-- Enable btree_gist extension for UUID equality in GiST indexes
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Booking links (user's shareable scheduling links)
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Link details
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),

  -- Availability settings
  availability_hours JSONB NOT NULL DEFAULT '{
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "17:00"}],
    "saturday": [],
    "sunday": []
  }'::JSONB,

  -- Buffer times (in minutes)
  buffer_before_minutes INTEGER DEFAULT 0 NOT NULL,
  buffer_after_minutes INTEGER DEFAULT 0 NOT NULL,

  -- Scheduling constraints
  min_notice_hours INTEGER DEFAULT 24 NOT NULL,
  max_days_advance INTEGER DEFAULT 60 NOT NULL,

  -- Custom questions for bookers
  custom_questions JSONB DEFAULT '[]'::JSONB,
  -- Example: [{"question": "What's your company?", "required": true, "type": "text"}]

  -- Location/meeting details
  location_type TEXT DEFAULT 'zoom' CHECK (location_type IN ('zoom', 'google_meet', 'phone', 'in_person', 'custom')),
  location_details TEXT,

  -- Settings
  is_active BOOLEAN DEFAULT true NOT NULL,
  require_confirmation BOOLEAN DEFAULT false NOT NULL,
  send_reminders BOOLEAN DEFAULT true NOT NULL,

  -- Color for calendar display
  color TEXT DEFAULT '#3b82f6',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure slug is URL-safe
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Bookings (scheduled meetings through booking links)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Booking details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,

  -- Booker information
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  booker_phone TEXT,
  booker_timezone TEXT NOT NULL,

  -- Custom question responses
  custom_responses JSONB DEFAULT '{}'::JSONB,
  -- Example: {"company": "Acme Inc", "project_details": "Need help with..."}

  -- Status
  status TEXT DEFAULT 'confirmed' NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Calendar integration
  timeline_item_id UUID REFERENCES timeline_items(id) ON DELETE SET NULL,
  google_calendar_event_id TEXT,

  -- Reminders sent
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_1h BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent double booking
  CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('confirmed', 'pending'))
);

-- Booking link analytics
CREATE TABLE IF NOT EXISTS booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'booking_started', 'booking_completed', 'booking_cancelled')),

  -- Visitor info
  visitor_ip TEXT,
  visitor_country TEXT,
  visitor_timezone TEXT,

  -- Referrer
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_links
CREATE POLICY "Users can view their own booking links"
  ON booking_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking links"
  ON booking_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking links"
  ON booking_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking links"
  ON booking_links FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access to active booking links by slug
CREATE POLICY "Anyone can view active booking links by slug"
  ON booking_links FOR SELECT
  USING (is_active = true);

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for analytics
CREATE POLICY "Users can view analytics for their booking links"
  ON booking_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_links
      WHERE booking_links.id = booking_analytics.booking_link_id
        AND booking_links.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert analytics"
  ON booking_analytics FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_links_user_id
  ON booking_links(user_id);

CREATE INDEX IF NOT EXISTS idx_booking_links_slug
  ON booking_links(slug) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_link_id
  ON bookings(booking_link_id);

CREATE INDEX IF NOT EXISTS idx_bookings_start_time
  ON bookings(user_id, start_time) WHERE status IN ('confirmed', 'pending');

CREATE INDEX IF NOT EXISTS idx_booking_analytics_link_id
  ON booking_analytics(booking_link_id, created_at DESC);

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION is_time_slot_available(
  p_user_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for conflicting bookings
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE user_id = p_user_id
    AND status IN ('confirmed', 'pending')
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  -- Check for conflicting timeline items (meetings)
  SELECT COUNT(*) + conflict_count INTO conflict_count
  FROM timeline_items
  WHERE user_id = p_user_id
    AND is_meeting = true
    AND status != 'completed'
    AND tstzrange(
      start_time,
      start_time + (duration_minutes || ' minutes')::INTERVAL
    ) && tstzrange(p_start_time, p_end_time);

  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate available time slots
CREATE OR REPLACE FUNCTION get_available_slots(
  p_booking_link_id UUID,
  p_date DATE,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_available BOOLEAN
) AS $$
DECLARE
  link RECORD;
  day_name TEXT;
  availability_windows JSONB;
  window JSONB;
  slot_start TIMESTAMPTZ;
  slot_end TIMESTAMPTZ;
  now_time TIMESTAMPTZ;
BEGIN
  -- Get booking link details
  SELECT * INTO link
  FROM booking_links
  WHERE id = p_booking_link_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get day of week name
  day_name := LOWER(TO_CHAR(p_date, 'Day'));
  day_name := TRIM(day_name);

  -- Get availability windows for this day
  availability_windows := link.availability_hours->day_name;

  IF availability_windows IS NULL OR jsonb_array_length(availability_windows) = 0 THEN
    RETURN;
  END IF;

  now_time := NOW();

  -- Generate slots for each availability window
  FOR window IN SELECT * FROM jsonb_array_elements(availability_windows)
  LOOP
    slot_start := (p_date::TEXT || ' ' || (window->>'start'))::TIMESTAMPTZ;

    -- Generate 30-minute slots within this window
    WHILE slot_start < (p_date::TEXT || ' ' || (window->>'end'))::TIMESTAMPTZ
    LOOP
      slot_end := slot_start + (link.duration_minutes || ' minutes')::INTERVAL;

      -- Check if slot is in the future and within constraints
      IF slot_start > now_time + (link.min_notice_hours || ' hours')::INTERVAL
         AND slot_start < now_time + (link.max_days_advance || ' days')::INTERVAL
      THEN
        RETURN QUERY SELECT
          slot_start,
          slot_end,
          is_time_slot_available(link.user_id, slot_start, slot_end);
      END IF;

      -- Move to next slot (every 30 minutes)
      slot_start := slot_start + '30 minutes'::INTERVAL;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create booking and timeline item
CREATE OR REPLACE FUNCTION create_booking_with_calendar_event(
  p_booking_link_id UUID,
  p_start_time TIMESTAMPTZ,
  p_booker_name TEXT,
  p_booker_email TEXT,
  p_booker_timezone TEXT,
  p_custom_responses JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_timeline_item_id UUID;
  v_link RECORD;
  v_end_time TIMESTAMPTZ;
BEGIN
  -- Get booking link details
  SELECT * INTO v_link
  FROM booking_links
  WHERE id = p_booking_link_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking link not found or inactive';
  END IF;

  v_end_time := p_start_time + (v_link.duration_minutes || ' minutes')::INTERVAL;

  -- Check availability
  IF NOT is_time_slot_available(v_link.user_id, p_start_time, v_end_time) THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;

  -- Create timeline item for the host
  INSERT INTO timeline_items (
    user_id,
    title,
    start_time,
    duration_minutes,
    is_meeting,
    color,
    status
  ) VALUES (
    v_link.user_id,
    v_link.title || ' with ' || p_booker_name,
    p_start_time,
    v_link.duration_minutes,
    true,
    v_link.color,
    CASE WHEN v_link.require_confirmation THEN 'pending' ELSE 'scheduled' END
  ) RETURNING id INTO v_timeline_item_id;

  -- Create booking
  INSERT INTO bookings (
    booking_link_id,
    user_id,
    start_time,
    end_time,
    duration_minutes,
    booker_name,
    booker_email,
    booker_timezone,
    custom_responses,
    timeline_item_id,
    status
  ) VALUES (
    p_booking_link_id,
    v_link.user_id,
    p_start_time,
    v_end_time,
    v_link.duration_minutes,
    p_booker_name,
    p_booker_email,
    p_booker_timezone,
    p_custom_responses,
    v_timeline_item_id,
    CASE WHEN v_link.require_confirmation THEN 'pending' ELSE 'confirmed' END
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_links_updated_at
  BEFORE UPDATE ON booking_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE booking_links IS 'Shareable booking links for scheduling meetings';
COMMENT ON TABLE bookings IS 'Scheduled meetings created through booking links';
COMMENT ON TABLE booking_analytics IS 'Analytics for booking link views and conversions';
COMMENT ON FUNCTION is_time_slot_available IS 'Check if a time slot is available for booking';
COMMENT ON FUNCTION get_available_slots IS 'Generate available time slots for a specific date';
COMMENT ON FUNCTION create_booking_with_calendar_event IS 'Create booking and add to host calendar';
