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
}

// Helper function to create a calendar event
async function handleCreateEvent(
  supabase: any,
  googleToken: string,
  calendarId: string,
  userId: string,
  subAgent: any,
  subAgentId: string,
  startTime: number
) {
  try {
    // Extract event details from task_data
    const taskData = subAgent.task_data;
    const eventTitle = taskData.title || 'New Event';
    const eventDescription = taskData.description || '';

    // Parse time from description or use defaults
    // Expected format: "Schedule meeting with Sarah tomorrow at 10am"
    // For now, create event 1 hour from now (will be enhanced with NLP later)
    const eventStart = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const eventEnd = new Date(eventStart.getTime() + 30 * 60 * 1000); // 30 minutes duration

    // Extract attendee emails from description if present
    const attendees = [];
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = eventDescription.match(emailRegex);
    if (emails) {
      attendees.push(...emails.map(email => ({ email })));
    }

    // Create event object
    const eventBody = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: eventStart.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventEnd.toISOString(),
        timeZone: 'UTC',
      },
      attendees: attendees.length > 0 ? attendees : undefined,
    };

    // Create event via Google Calendar API
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('Google Calendar API error:', errorText);
      throw new Error(`Failed to create event: ${createRes.status}`);
    }

    const createdEvent = await createRes.json();

    console.log(`Created calendar event: ${createdEvent.id}`);

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
          event_id: createdEvent.id,
          event_summary: createdEvent.summary,
          event_start: createdEvent.start.dateTime || createdEvent.start.date,
          event_end: createdEvent.end.dateTime || createdEvent.end.date,
          attendees: attendees,
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
          event_id: createdEvent.id,
          event_link: createdEvent.htmlLink,
          event_summary: createdEvent.summary,
          event_start: createdEvent.start.dateTime || createdEvent.start.date,
          calendar_id: calendarId,
        },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', subAgentId);

    // Update task status to completed
    if (taskData?.task_id) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'completed' })
        .eq('id', taskData.task_id);
    }

    return new Response(
      JSON.stringify({
        message: 'Calendar event created successfully',
        event_id: createdEvent.id,
        event_link: createdEvent.htmlLink,
        event_summary: createdEvent.summary,
        status: 'completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Update sub-agent to failed
    await supabase
      .from('sub_agents')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
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
    const { sub_agent_id, action = 'read_events' } = await req.json();

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

    // Get user's Google Calendar token
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data: tokenData, error: tokenError } = await supabase.rpc('get_decrypted_google_token_enhanced', {
      p_user_id: user.id,
      p_ip_address: clientIP,
      p_user_agent: userAgent
    });

    if (tokenError || !tokenData || tokenData.length === 0) {
      // No Google Calendar connected - graceful failure
      const errorMessage = 'Google Calendar not connected. Please connect your calendar in Settings.';

      await supabase
        .from('sub_agents')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', sub_agent_id);

      return new Response(
        JSON.stringify({
          message: errorMessage,
          status: 'failed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const googleToken = tokenData[0].access_token;

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

    // Default: Read events (next 7 days)
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
