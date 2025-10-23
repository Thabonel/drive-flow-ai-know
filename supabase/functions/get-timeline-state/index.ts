// Edge Function to get timeline state for AI visibility
// This allows Claude AI to help users manage their schedule

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current time
    const now = new Date();

    // Fetch active and logjammed items
    const { data: activeItems, error: activeError } = await supabase
      .from('timeline_items')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'logjam'])
      .order('start_time', { ascending: true });

    if (activeError) throw activeError;

    // Fetch recently completed items (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: completedItems, error: completedError } = await supabase
      .from('timeline_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', oneDayAgo.toISOString())
      .order('completed_at', { ascending: false });

    if (completedError) throw completedError;

    // Fetch items approaching NOW (within next 2 hours)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const approachingItems = activeItems?.filter(item => {
      const startTime = new Date(item.start_time);
      return startTime <= twoHoursFromNow && startTime >= now;
    }) || [];

    // Fetch logjammed items
    const logjammedItems = activeItems?.filter(item => item.status === 'logjam') || [];

    // Fetch all layers
    const { data: layers, error: layersError } = await supabase
      .from('timeline_layers')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (layersError) throw layersError;

    // Fetch parked items
    const { data: parkedItems, error: parkedError } = await supabase
      .from('timeline_parked_items')
      .select('*')
      .eq('user_id', user.id)
      .order('parked_at', { ascending: false });

    if (parkedError) throw parkedError;

    // Fetch user settings
    const { data: settings, error: settingsError } = await supabase
      .from('timeline_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    // Calculate some useful statistics
    const stats = {
      total_active_items: activeItems?.length || 0,
      logjammed_count: logjammedItems.length,
      approaching_count: approachingItems.length,
      completed_today: completedItems?.length || 0,
      parked_count: parkedItems?.length || 0,
      total_layers: layers?.length || 0,
    };

    // Detect conflicts (overlapping items on the same layer)
    const conflicts: Array<{ item1: any; item2: any }> = [];
    if (activeItems) {
      for (let i = 0; i < activeItems.length - 1; i++) {
        for (let j = i + 1; j < activeItems.length; j++) {
          const item1 = activeItems[i];
          const item2 = activeItems[j];

          // Check if same layer
          if (item1.layer_id !== item2.layer_id) continue;

          // Check if times overlap
          const start1 = new Date(item1.start_time);
          const end1 = new Date(start1.getTime() + item1.duration_minutes * 60 * 1000);
          const start2 = new Date(item2.start_time);
          const end2 = new Date(start2.getTime() + item2.duration_minutes * 60 * 1000);

          if (start1 < end2 && start2 < end1) {
            conflicts.push({ item1, item2 });
          }
        }
      }
    }

    // Build response
    const timelineState = {
      current_time: now.toISOString(),
      user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      stats,
      active_items: activeItems || [],
      logjammed_items: logjammedItems,
      approaching_items: approachingItems,
      completed_items_today: completedItems || [],
      parked_items: parkedItems || [],
      layers: layers || [],
      conflicts,
      settings: settings || null,
      recommendations: generateRecommendations(
        activeItems || [],
        logjammedItems,
        approachingItems,
        conflicts
      ),
    };

    return new Response(
      JSON.stringify(timelineState),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-timeline-state:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate AI recommendations based on timeline state
function generateRecommendations(
  activeItems: any[],
  logjammedItems: any[],
  approachingItems: any[],
  conflicts: any[]
): string[] {
  const recommendations: string[] = [];

  if (logjammedItems.length > 0) {
    recommendations.push(
      `You have ${logjammedItems.length} overdue item(s). Consider completing, rescheduling, or parking them.`
    );
  }

  if (approachingItems.length > 3) {
    recommendations.push(
      `You have ${approachingItems.length} items starting in the next 2 hours. Consider prioritizing.`
    );
  }

  if (conflicts.length > 0) {
    recommendations.push(
      `There are ${conflicts.length} scheduling conflict(s) where items overlap on the same layer.`
    );
  }

  if (activeItems.length > 20) {
    recommendations.push(
      'Your timeline has many items. Consider breaking down large tasks or parking low-priority items.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Your timeline looks good! Keep up the great work.');
  }

  return recommendations;
}
