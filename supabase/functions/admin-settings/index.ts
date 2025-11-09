import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !userRoles) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { method, settingKey, settingValue } = await req.json();

    if (method === 'GET') {
      // Get all admin settings
      const { data: settings, error } = await supabaseClient
        .from('admin_messages')
        .select('*')
        .eq('message_type', 'admin_setting')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert array of settings into object
      const settingsObj = settings?.reduce((acc: any, setting: any) => {
        try {
          const metadata = setting.metadata || {};
          if (metadata.setting_key) {
            acc[metadata.setting_key] = metadata.setting_value;
          }
        } catch (e) {
          console.error('Error parsing setting:', e);
        }
        return acc;
      }, {}) || {};

      return new Response(
        JSON.stringify({ settings: settingsObj }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'UPDATE') {
      // Update a single setting using admin_messages table
      if (!settingKey) {
        throw new Error('Setting key is required');
      }

      // First, check if setting exists
      const { data: existing } = await supabaseClient
        .from('admin_messages')
        .select('id')
        .eq('message_type', 'admin_setting')
        .eq('metadata->>setting_key', settingKey)
        .single();

      let result;
      if (existing) {
        // Update existing setting
        const { data, error } = await supabaseClient
          .from('admin_messages')
          .update({
            metadata: {
              setting_key: settingKey,
              setting_value: settingValue,
              updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new setting
        const { data, error } = await supabaseClient
          .from('admin_messages')
          .insert({
            user_id: user.id,
            message_type: 'admin_setting',
            message_content: `Setting ${settingKey} updated`,
            metadata: {
              setting_key: settingKey,
              setting_value: settingValue,
              created_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return new Response(
        JSON.stringify({ success: true, setting: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid method. Use GET or UPDATE.');

  } catch (error) {
    console.error('Error in admin-settings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
