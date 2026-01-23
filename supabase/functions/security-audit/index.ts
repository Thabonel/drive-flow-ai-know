import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://drive-flow-ai-know.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const user_id = user.id;
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (req.method === 'POST') {
      // Log security event
      const body = await req.json();
      const { action, resource_type, resource_id, success, details } = body;

      // Input validation
      if (!action || typeof action !== 'string') {
        throw new Error('Action is required and must be a string');
      }

      if (!resource_type || typeof resource_type !== 'string') {
        throw new Error('Resource type is required and must be a string');
      }

      if (typeof success !== 'boolean') {
        throw new Error('Success must be a boolean');
      }

      // Insert security audit log
      const { error: insertError } = await supabaseService
        .from('security_audit_log')
        .insert({
          user_id,
          action,
          resource_type,
          resource_id: resource_id || null,
          ip_address: clientIP,
          user_agent: userAgent,
          success,
          details: details || {}
        });

      if (insertError) {
        throw new Error(`Failed to log security event: ${insertError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Security event logged' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } else if (req.method === 'GET') {
      // Get security audit logs for user
      const url = new URL(req.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

      const { data: auditLogs, error: logsError } = await supabaseService
        .from('security_audit_log')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (logsError) {
        throw new Error(`Failed to fetch audit logs: ${logsError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: auditLogs || [],
          count: auditLogs?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('Error in security-audit function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});