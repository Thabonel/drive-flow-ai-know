import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  colorId?: string;
  status: string;
  recurrence?: string[];
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
}

/**
 * Parse time from text like "10am", "2pm", "14:00", "10:30am"
 */
function parseTimeFromText(text: string): { hours: number; minutes: number } | null {
  // Match patterns like "10am", "10:30am", "2pm", "14:00"
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,  // 10:30am, 2:30pm
    /(\d{1,2})\s*(am|pm)/i,           // 10am, 2pm
    /(\d{1,2}):(\d{2})/,              // 14:00, 10:30 (24h)
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] && !match[2].match(/am|pm/i) ? parseInt(match[2], 10) : 0;
      const ampm = match[3] || match[2];

      if (ampm && ampm.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }

      return { hours, minutes };
    }
  }
  return null;
}

/**
 * Parse recurrence pattern from text like "every second day", "every 2 days", "daily"
 */
function parseRecurrenceFromText(text: string): RecurrencePattern | null {
  const lowerText = text.toLowerCase();

  // "every second day" or "every other day"
  if (lowerText.includes('every second day') || lowerText.includes('every other day')) {
    return { frequency: 'daily', interval: 2 };
  }

  // "every N days"
  const everyNDays = lowerText.match(/every\s+(\d+)\s+days?/);
  if (everyNDays) {
    return { frequency: 'daily', interval: parseInt(everyNDays[1], 10) };
  }

  // "daily"
  if (lowerText.includes('daily') || lowerText.includes('every day')) {
    return { frequency: 'daily', interval: 1 };
  }

  // "weekly"
  if (lowerText.includes('weekly') || lowerText.includes('every week')) {
    return { frequency: 'weekly', interval: 1 };
  }

  // "every N weeks"
  const everyNWeeks = lowerText.match(/every\s+(\d+)\s+weeks?/);
  if (everyNWeeks) {
    return { frequency: 'weekly', interval: parseInt(everyNWeeks[1], 10) };
  }

  // "monthly"
  if (lowerText.includes('monthly') || lowerText.includes('every month')) {
    return { frequency: 'monthly', interval: 1 };
  }

  return null;
}

/**
 * Parse "starting from today", "starting tomorrow", "from January 22"
 */
function parseStartDate(text: string): Date {
  const lowerText = text.toLowerCase();
  const now = new Date();

  if (lowerText.includes('starting from today') || lowerText.includes('from today') || lowerText.includes('starting today')) {
    return now;
  }

  if (lowerText.includes('starting tomorrow') || lowerText.includes('from tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Default to today
  return now;
}

/**
 * Convert recurrence pattern to Google Calendar RRULE format
 */
function toRRule(pattern: RecurrencePattern): string {
  let rule = 'RRULE:';

  switch (pattern.frequency) {
    case 'daily':
      rule += `FREQ=DAILY;INTERVAL=${pattern.interval}`;
      break;
    case 'weekly':
      rule += `FREQ=WEEKLY;INTERVAL=${pattern.interval}`;
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        rule += `;BYDAY=${pattern.daysOfWeek.map(d => days[d]).join(',')}`;
      }
      break;
    case 'monthly':
      rule += `FREQ=MONTHLY;INTERVAL=${pattern.interval}`;
      if (pattern.dayOfMonth) {
        rule += `;BYMONTHDAY=${pattern.dayOfMonth}`;
      }
      break;
  }

  return rule;
}

/**
 * Get or create default timeline layer for user
 */
async function getOrCreateDefaultLayer(supabase: any, userId: string): Promise<string> {
  // Check for existing default layer
  const { data: existingLayers } = await supabase
    .from('timeline_layers')
    .select('id')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .limit(1);

  if (existingLayers && existingLayers.length > 0) {
    return existingLayers[0].id;
  }

  // Create default layer
  const { data: newLayer, error } = await supabase
    .from('timeline_layers')
    .insert({
      user_id: userId,
      name: 'My Schedule',
      color: '#3B82F6',
      sort_order: 0,
      is_visible: true,
    })
    .select()
    .single();

  if (error) throw error;
  return newLayer.id;
}

/**
 * Create timeline items for recurring events
 */
async function createTimelineItems(
  supabase: any,
  userId: string,
  layerId: string,
  title: string,
  description: string,
  startDateTime: Date,
  durationMinutes: number,
  recurrence: RecurrencePattern | null,
  maxOccurrences: number = 30 // Create next 30 occurrences
): Promise<{ created: number; seriesId: string | null }> {
  const seriesId = recurrence ? crypto.randomUUID() : null;
  const items = [];

  let currentDate = new Date(startDateTime);

  for (let i = 0; i < (recurrence ? maxOccurrences : 1); i++) {
    items.push({
      user_id: userId,
      layer_id: layerId,
      title: title,
      start_time: currentDate.toISOString(),
      duration_minutes: durationMinutes,
      status: 'active',
      color: '#10B981', // Green for exercise/wellness
      recurring_series_id: seriesId,
      recurrence_pattern: recurrence,
      notes: description,
    });

    if (recurrence) {
      // Calculate next occurrence
      currentDate = getNextOccurrence(currentDate, recurrence);
    }
  }

  const { error } = await supabase
    .from('timeline_items')
    .insert(items);

  if (error) {
    console.error('Error creating timeline items:', error);
    throw error;
  }

  return { created: items.length, seriesId };
}

/**
 * Calculate next occurrence based on recurrence pattern
 */
function getNextOccurrence(currentDate: Date, pattern: RecurrencePattern): Date {
  const next = new Date(currentDate);

  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + pattern.interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * pattern.interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + pattern.interval);
      break;
  }

  return next;
}

// Helper function to create a calendar event
async function handleCreateEvent(
  supabase: any,
  googleToken: string | null,
  calendarId: string,
  userId: string,
  subAgent: any,
  subAgentId: string,
  executionStartTime: number
) {
  try {
    // Extract event details from task_data
    const taskData = subAgent.task_data;
    const eventTitle = taskData.title || 'New Event';
    const eventDescription = taskData.description || '';

    // Combine title and description for parsing
    const fullText = `${eventTitle} ${eventDescription}`;

    // Parse time from text (default to 9am if not found)
    const parsedTime = parseTimeFromText(fullText) || { hours: 9, minutes: 0 };

    // Parse start date (default to today)
    const startDate = parseStartDate(fullText);

    // Set the time on the start date
    startDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    // Parse recurrence pattern
    const recurrence = parseRecurrenceFromText(fullText);

    // Default duration: 60 minutes for exercise, 30 for meetings
    const isExercise = fullText.toLowerCase().includes('exercise') ||
                       fullText.toLowerCase().includes('workout') ||
                       fullText.toLowerCase().includes('gym');
    const durationMinutes = isExercise ? 60 : 30;

    const eventEnd = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    console.log(`Creating event: "${eventTitle}" at ${startDate.toISOString()}`);
    console.log(`Recurrence: ${recurrence ? JSON.stringify(recurrence) : 'none'}`);

    // STEP 1: Create timeline items in database
    const layerId = await getOrCreateDefaultLayer(supabase, userId);
    const timelineResult = await createTimelineItems(
      supabase,
      userId,
      layerId,
      eventTitle,
      eventDescription,
      startDate,
      durationMinutes,
      recurrence
    );

    console.log(`Created ${timelineResult.created} timeline items`);

    // STEP 2: Optionally create Google Calendar event (if connected)
    let googleEventId = null;
    let googleEventLink = null;

    if (googleToken) {
      try {
        // Create event object for Google Calendar
        const eventBody: any = {
          summary: eventTitle,
          description: eventDescription,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          },
          end: {
            dateTime: eventEnd.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          },
        };

        // Add recurrence rule if applicable
        if (recurrence) {
          eventBody.recurrence = [toRRule(recurrence)];
        }

        const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        });

        if (createRes.ok) {
          const createdEvent = await createRes.json();
          googleEventId = createdEvent.id;
          googleEventLink = createdEvent.htmlLink;
          console.log(`Created Google Calendar event: ${googleEventId}`);
        } else {
          const errorText = await createRes.text();
          console.warn('Google Calendar API error (non-fatal):', errorText);
        }
      } catch (gcalError) {
        console.warn('Google Calendar sync failed (non-fatal):', gcalError);
      }
    }

    // Store event creation in agent_memory
    await supabase
      .from('agent_memory')
      .insert({
        session_id: subAgent.session_id,
        user_id: userId,
        memory_type: 'action_log',
        content: {
          source: 'calendar_agent',
          action: 'event_created',
          timeline_items_created: timelineResult.created,
          series_id: timelineResult.seriesId,
          google_event_id: googleEventId,
          event_summary: eventTitle,
          event_start: startDate.toISOString(),
          recurrence: recurrence,
          created_at: new Date().toISOString(),
        },
        importance: 5,
      });

    // Update sub-agent to completed
    await supabase
      .from('sub_agents')
      .update({
        status: 'completed',
        result_data: {
          timeline_items_created: timelineResult.created,
          series_id: timelineResult.seriesId,
          google_event_id: googleEventId,
          google_event_link: googleEventLink,
          event_summary: eventTitle,
          event_start: startDate.toISOString(),
          recurrence: recurrence,
          calendar_id: calendarId,
        },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - executionStartTime,
      })
      .eq('id', subAgentId);

    // Update task status to completed
    if (taskData?.task_id) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed' })
        .eq('id', taskData.task_id);
    }

    const recurrenceDesc = recurrence
      ? `Recurring ${recurrence.frequency} (every ${recurrence.interval} ${recurrence.frequency === 'daily' ? 'day(s)' : recurrence.frequency === 'weekly' ? 'week(s)' : 'month(s)'})`
      : 'One-time event';

    return new Response(
      JSON.stringify({
        message: `Created ${timelineResult.created} timeline item(s) for "${eventTitle}"`,
        timeline_items_created: timelineResult.created,
        series_id: timelineResult.seriesId,
        google_synced: !!googleEventId,
        google_event_link: googleEventLink,
        event_summary: eventTitle,
        event_start: startDate.toISOString(),
        recurrence: recurrenceDesc,
        status: 'completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in handleCreateEvent:', error);

    // Update sub-agent to failed
    await supabase
      .from('sub_agents')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - executionStartTime,
      })
      .eq('id', subAgentId);

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body (includes sub-agent ID and task details)
    const { sub_agent_id, action = 'create_event' } = await req.json();

    if (!sub_agent_id) {
      return new Response(
        JSON.stringify({ error: 'sub_agent_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get sub-agent details
    const { data: subAgent, error: agentError } = await supabase
      .from('sub_agents')
      .select('*')
      .eq('id', sub_agent_id)
      .single();

    if (agentError || !subAgent) {
      throw new Error('Sub-agent not found');
    }

    // Update sub-agent status to active
    await supabase
      .from('sub_agents')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sub_agent_id);

    const startTime = Date.now();

    // Try to get user's Google Calendar token (optional)
    let googleToken = null;
    try {
      const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      const { data: tokenData } = await supabase.rpc('get_decrypted_google_token_enhanced', {
        p_user_id: user.id,
        p_ip_address: clientIP,
        p_user_agent: userAgent
      });

      if (tokenData && tokenData.length > 0) {
        googleToken = tokenData[0].access_token;
      }
    } catch (tokenError) {
      console.log('Google Calendar not connected (optional):', tokenError);
    }

    // Get calendar ID from sync settings (or use 'primary')
    const { data: syncSettings } = await supabase
      .from('calendar_sync_settings')
      .select('selected_calendar_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const calendarId = syncSettings?.selected_calendar_id || 'primary';

    // Route to appropriate action handler
    if (action === 'create_event') {
      return await handleCreateEvent(
        supabase,
        googleToken,
        calendarId,
        user.id,
        subAgent,
        sub_agent_id,
        startTime
      );
    }

    // Default: Read events (next 7 days) - only if Google is connected
    if (!googleToken) {
      await supabase
        .from('sub_agents')
        .update({
          status: 'completed',
          result_data: {
            message: 'Google Calendar not connected. Timeline items created locally.',
          },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', sub_agent_id);

      return new Response(
        JSON.stringify({
          message: 'Google Calendar not connected. Use create_event action for timeline items.',
          status: 'completed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Fetching calendar events from ${timeMin} to ${timeMax}`);

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;

    const calendarRes = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!calendarRes.ok) {
      const errorText = await calendarRes.text();
      console.error('Google Calendar API error:', errorText);
      throw new Error(`Failed to fetch events: ${calendarRes.status}`);
    }

    const calendarData = await calendarRes.json();
    const events: CalendarEvent[] = calendarData.items || [];

    console.log(`Fetched ${events.length} calendar events`);

    // Store events in agent_memory
    if (events.length > 0) {
      await supabase
        .from('agent_memory')
        .insert({
          session_id: subAgent.session_id,
          user_id: user.id,
          memory_type: 'briefing',
          content: {
            source: 'calendar_agent',
            action: 'events_retrieved',
            event_count: events.length,
            events: events.map(event => ({
              id: event.id,
              summary: event.summary,
              description: event.description,
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date,
              location: event.location,
              attendees: event.attendees?.map(a => ({
                email: a.email,
                name: a.displayName,
                status: a.responseStatus,
              })),
            })),
            retrieved_at: new Date().toISOString(),
          },
          importance: 4,
        });
    }

    // Update sub-agent to completed
    await supabase
      .from('sub_agents')
      .update({
        status: 'completed',
        result_data: {
          events_count: events.length,
          calendar_id: calendarId,
          time_range: {
            start: timeMin,
            end: timeMax,
          },
        },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', sub_agent_id);

    // Update task status to completed
    if (subAgent.task_data?.task_id) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed' })
        .eq('id', subAgent.task_data.task_id);
    }

    return new Response(
      JSON.stringify({
        message: 'Calendar events retrieved successfully',
        events_count: events.length,
        calendar_id: calendarId,
        status: 'completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in calendar sub-agent:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
