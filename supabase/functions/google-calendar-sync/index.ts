import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  colorId?: string;
  updated: string;
  extendedProperties?: {
    private?: {
      aiqueryhub_id?: string;
      aiqueryhub_layer_id?: string;
      aiqueryhub_status?: string;
    };
  };
}

interface TimelineItem {
  id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  color: string;
  google_event_id?: string;
  google_calendar_id?: string;
  sync_status?: string;
  updated_at: string;
  layer_id: string;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const syncStartTime = Date.now();
  let syncLogId: string | null = null;

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const user_id = user.id;
    const { sync_type = 'manual', calendar_id } = await req.json();

    console.log(`Starting ${sync_type} sync for user ${user_id}`);

    // Get user's sync settings
    const { data: syncSettings, error: settingsError } = await supabaseClient
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();  // Use maybeSingle to handle missing row gracefully

    if (settingsError) {
      console.error('Error fetching sync settings:', settingsError);
      throw new Error('Failed to load sync settings. Please try again.');
    }

    if (!syncSettings) {
      throw new Error('Please open Calendar Settings and select a calendar to sync first.');
    }

    if (!syncSettings.enabled) {
      throw new Error('Calendar sync is disabled. Enable it in Calendar Settings.');
    }

    const targetCalendarId = calendar_id || syncSettings.selected_calendar_id;
    if (!targetCalendarId) {
      throw new Error('No calendar selected for sync');
    }

    // Get user's Google Calendar access token directly from table
    // Using service role key bypasses RLS, so we can query directly
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_google_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error('Token fetch error:', tokenError);
      throw new Error('No Google Calendar access token found. Please reconnect your Google Calendar.');
    }

    const googleToken = tokenData.access_token;
    console.log('Successfully retrieved Google access token');

    // Create sync log entry
    const { data: logEntry, error: logError } = await supabaseClient
      .from('calendar_sync_log')
      .insert({
        user_id,
        sync_type,
        status: 'success', // Will update if errors occur
      })
      .select()
      .single();

    if (!logError && logEntry) {
      syncLogId = logEntry.id;
    }

    // Initialize counters
    let eventsFetched = 0;
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let conflictsDetected = 0;

    // STEP 1: Fetch events from Google Calendar (last 30 days to future 90 days)
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Fetching Google Calendar events from ${timeMin} to ${timeMax}`);

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const calendarRes = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!calendarRes.ok) {
      const errorText = await calendarRes.text();
      console.error('Google Calendar API error:', errorText);
      throw new Error(`Failed to fetch events: ${calendarRes.status} ${calendarRes.statusText}`);
    }

    const calendarData = await calendarRes.json();
    const googleEvents: CalendarEvent[] = calendarData.items || [];
    eventsFetched = googleEvents.length;

    console.log(`Fetched ${eventsFetched} events from Google Calendar`);

    // STEP 2: Get existing timeline items for this user
    const { data: timelineItems, error: itemsError } = await supabaseClient
      .from('timeline_items')
      .select('*')
      .eq('user_id', user_id)
      .gte('start_time', timeMin)
      .lte('start_time', timeMax);

    if (itemsError) {
      throw new Error(`Failed to fetch timeline items: ${itemsError.message}`);
    }

    console.log(`Found ${timelineItems?.length || 0} timeline items in date range`);

    // STEP 3: Sync FROM Google Calendar TO Timeline (if enabled)
    if (syncSettings.sync_direction === 'from_calendar' || syncSettings.sync_direction === 'both') {
      for (const event of googleEvents) {
        if (!event.start?.dateTime || !event.end?.dateTime) {
          continue; // Skip all-day events for now
        }

        // Check if this event already exists in timeline
        const existingItem = timelineItems?.find(item => item.google_event_id === event.id);

        if (existingItem) {
          // Update existing item if Google event is newer
          const eventUpdated = new Date(event.updated);
          const itemUpdated = new Date(existingItem.updated_at);

          if (eventUpdated > itemUpdated) {
            const duration = calculateDuration(event.start.dateTime, event.end.dateTime);

            await supabaseClient
              .from('timeline_items')
              .update({
                title: event.summary || 'Untitled Event',
                start_time: event.start.dateTime,
                duration_minutes: duration,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', existingItem.id);

            itemsUpdated++;
            console.log(`Updated timeline item ${existingItem.id} from Google event ${event.id}`);
          }
        } else {
          // Create new timeline item from Google event
          const duration = calculateDuration(event.start.dateTime, event.end.dateTime);

          // Determine target layer (use setting or default to first VISIBLE layer)
          let targetLayerId = syncSettings.target_layer_id;

          if (!targetLayerId) {
            // Get user's first VISIBLE layer as default
            const { data: layers } = await supabaseClient
              .from('timeline_layers')
              .select('id')
              .eq('user_id', user_id)
              .eq('is_visible', true)  // Only visible layers!
              .order('sort_order', { ascending: true })
              .limit(1);

            targetLayerId = layers?.[0]?.id;

            if (!targetLayerId) {
              console.warn(`No visible layers found for user ${user_id}, skipping event ${event.id}`);
              continue; // Skip this event if no visible layer exists
            }
          }

          if (targetLayerId) {
            await supabaseClient
              .from('timeline_items')
              .insert({
                user_id,
                layer_id: targetLayerId,
                title: event.summary || 'Untitled Event',
                start_time: event.start.dateTime,
                duration_minutes: duration,
                color: mapGoogleColorToHex(event.colorId),
                google_event_id: event.id,
                google_calendar_id: targetCalendarId,
                sync_status: 'synced',
                sync_source: 'google',
                last_synced_at: new Date().toISOString(),
                status: 'active',
              });

            itemsCreated++;
            console.log(`Created timeline item from Google event ${event.id}`);
          }
        }
      }
    }

    // STEP 4: Sync FROM Timeline TO Google Calendar (if enabled)
    if (syncSettings.sync_direction === 'to_calendar' || syncSettings.sync_direction === 'both') {
      const localItems = timelineItems?.filter(item =>
        !item.google_event_id || item.sync_status === 'pending'
      ) || [];

      for (const item of localItems) {
        if (item.google_event_id) {
          // Update existing Google event
          const eventBody = timelineItemToGoogleEvent(item);

          const updateRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${item.google_event_id}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${googleToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventBody),
            }
          );

          if (updateRes.ok) {
            await supabaseClient
              .from('timeline_items')
              .update({
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            eventsUpdated++;
            console.log(`Updated Google event ${item.google_event_id} from timeline item ${item.id}`);
          }
        } else {
          // Create new Google event
          const eventBody = timelineItemToGoogleEvent(item);

          const createRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${googleToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventBody),
            }
          );

          if (createRes.ok) {
            const newEvent = await createRes.json();

            await supabaseClient
              .from('timeline_items')
              .update({
                google_event_id: newEvent.id,
                google_calendar_id: targetCalendarId,
                sync_status: 'synced',
                sync_source: 'both',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            eventsCreated++;
            console.log(`Created Google event ${newEvent.id} from timeline item ${item.id}`);
          }
        }
      }
    }

    // STEP 5: Update sync log
    const syncDuration = Date.now() - syncStartTime;

    if (syncLogId) {
      await supabaseClient
        .from('calendar_sync_log')
        .update({
          events_fetched: eventsFetched,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
          conflicts_detected: conflictsDetected,
          sync_duration_ms: syncDuration,
        })
        .eq('id', syncLogId);
    }

    // STEP 6: Update sync settings with last sync info
    await supabaseClient
      .from('calendar_sync_settings')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
      })
      .eq('user_id', user_id);

    console.log(`Sync completed in ${syncDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        events_synced: eventsFetched,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        items_created: itemsCreated,
        items_updated: itemsUpdated,
        sync_duration_ms: syncDuration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in google-calendar-sync:', error);

    // Try to log error to sync log
    if (syncLogId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient
        .from('calendar_sync_log')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sync_duration_ms: Date.now() - syncStartTime,
        })
        .eq('id', syncLogId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function: Calculate duration in minutes between two ISO timestamps
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / (1000 * 60));
}

// Helper function: Convert Timeline item to Google Calendar event
function timelineItemToGoogleEvent(item: TimelineItem) {
  const startTime = new Date(item.start_time);
  const endTime = new Date(startTime.getTime() + item.duration_minutes * 60 * 1000);

  return {
    summary: item.title,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'UTC',
    },
    colorId: mapHexToGoogleColor(item.color),
    description: `Created by AI Query Hub Timeline Manager\nStatus: ${item.status}`,
    extendedProperties: {
      private: {
        aiqueryhub_id: item.id,
        aiqueryhub_layer_id: item.layer_id,
        aiqueryhub_status: item.status,
      },
    },
  };
}

// Helper function: Map Google Calendar color ID to hex
function mapGoogleColorToHex(colorId?: string): string {
  const colorMap: Record<string, string> = {
    '1': '#a4bdfc', // Lavender
    '2': '#7ae7bf', // Sage
    '3': '#dbadff', // Grape
    '4': '#ff887c', // Flamingo
    '5': '#fbd75b', // Banana
    '6': '#ffb878', // Tangerine
    '7': '#46d6db', // Peacock
    '8': '#e1e1e1', // Graphite
    '9': '#5484ed', // Blueberry
    '10': '#51b749', // Basil
    '11': '#dc2127', // Tomato
  };

  return colorMap[colorId || '9'] || '#3b82f6'; // Default to blue
}

// Helper function: Map hex color to Google Calendar color ID (best match)
function mapHexToGoogleColor(hex: string): string {
  // Simple mapping - in production, you might want more sophisticated color matching
  const lowerHex = hex.toLowerCase();

  if (lowerHex.includes('purple') || lowerHex.includes('#6366f1')) return '1';
  if (lowerHex.includes('green') || lowerHex.includes('#10b981')) return '10';
  if (lowerHex.includes('blue') || lowerHex.includes('#3b82f6')) return '9';
  if (lowerHex.includes('red') || lowerHex.includes('#ef4444')) return '11';
  if (lowerHex.includes('yellow') || lowerHex.includes('#f59e0b')) return '5';
  if (lowerHex.includes('orange')) return '6';

  return '9'; // Default to blueberry
}
