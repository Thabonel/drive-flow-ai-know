import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Scheduled Google Calendar sync started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with calendar sync enabled and auto-sync turned on
    const { data: syncSettings, error: settingsError } = await supabaseClient
      .from('calendar_sync_settings')
      .select('user_id, selected_calendar_id, sync_interval_minutes, last_sync_at')
      .eq('enabled', true)
      .eq('auto_sync_enabled', true);

    if (settingsError) {
      throw new Error(`Failed to fetch sync settings: ${settingsError.message}`);
    }

    if (!syncSettings || syncSettings.length === 0) {
      console.log('No users have auto-sync enabled');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users to sync',
          users_synced: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${syncSettings.length} users with auto-sync enabled`);

    // Filter users who need syncing based on their interval
    const now = new Date();
    const usersToSync = syncSettings.filter(setting => {
      if (!setting.last_sync_at) {
        return true; // Never synced before
      }

      const lastSync = new Date(setting.last_sync_at);
      const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);

      // Sync if enough time has passed based on user's interval
      return minutesSinceLastSync >= setting.sync_interval_minutes;
    });

    console.log(`${usersToSync.length} users need syncing`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Sync each user sequentially
    for (const setting of usersToSync) {
      try {
        console.log(`Syncing user ${setting.user_id}`);

        // Get user's auth token to call sync function
        const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(
          setting.user_id
        );

        if (userError || !user) {
          throw new Error(`User not found: ${setting.user_id}`);
        }

        // Generate a service token for this user
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.createSession({
          userId: setting.user_id,
        });

        if (sessionError || !sessionData.access_token) {
          throw new Error(`Failed to create session for user ${setting.user_id}`);
        }

        // Call the main sync function
        const syncResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-sync`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sync_type: 'scheduled',
              calendar_id: setting.selected_calendar_id,
            }),
          }
        );

        if (!syncResponse.ok) {
          const errorText = await syncResponse.text();
          throw new Error(`Sync failed for user ${setting.user_id}: ${errorText}`);
        }

        const syncResult = await syncResponse.json();
        console.log(`Successfully synced user ${setting.user_id}:`, syncResult);
        successCount++;

      } catch (error) {
        console.error(`Error syncing user ${setting.user_id}:`, error);
        errorCount++;
        errors.push(`User ${setting.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Scheduled sync completed: ${successCount} succeeded, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        users_checked: syncSettings.length,
        users_synced: successCount,
        errors: errorCount,
        error_details: errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in scheduled calendar sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
