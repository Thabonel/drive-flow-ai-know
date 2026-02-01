import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ExportRequest {
  user_id?: string;
}

interface ExportData {
  user_id: string;
  export_date: string;
  format: string;
  data: {
    documents: any[];
    conversations: any[];
    knowledge_bases: any[];
    query_history: any[];
    settings: any[];
    integrations: any[];
  };
  metadata: {
    export_request_date: string;
    data_controller: string;
    export_method: string;
    data_sources: string[];
    retention_info: string;
    deletion_rights: string;
  };
}

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const requestBody: ExportRequest = await req.json();
    const userId = requestBody.user_id || user.id;

    // Verify user can only export their own data
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot export data for different user' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting data export for user: ${userId}`);

    // Export user documents
    const { data: documents } = await supabase
      .from('knowledge_documents')
      .select(`
        id,
        title,
        content,
        file_name,
        file_size,
        file_type,
        tags,
        metadata,
        summary,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    // Export user conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        messages,
        summary,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    // Export knowledge bases
    const { data: knowledgeBases } = await supabase
      .from('knowledge_bases')
      .select(`
        id,
        name,
        description,
        source_document_ids,
        tags,
        metadata,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    // Export query history
    const { data: queryHistory } = await supabase
      .from('ai_query_history')
      .select(`
        id,
        query,
        response,
        model_used,
        knowledge_base_id,
        document_count,
        response_time_ms,
        created_at
      `)
      .eq('user_id', userId);

    // Export user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select(`
        id,
        model_preference,
        max_query_results,
        default_knowledge_base_id,
        theme,
        language,
        timezone,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    // Export integration data (excluding sensitive tokens)
    const { data: integrations } = await supabase
      .from('user_google_tokens')
      .select(`
        id,
        service,
        scope,
        created_at,
        expires_at,
        last_used_at
      `)
      .eq('user_id', userId);

    // Export team memberships
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        role,
        permissions,
        joined_at,
        teams (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('user_id', userId);

    // Export user timeline items
    const { data: timeline } = await supabase
      .from('timeline_items')
      .select(`
        id,
        title,
        description,
        date,
        item_type,
        metadata,
        layer_id,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    // Export user support tickets
    const { data: supportTickets } = await supabase
      .from('support_tickets')
      .select(`
        id,
        subject,
        message,
        status,
        priority,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    const exportDate = new Date().toISOString();
    const exportData: ExportData = {
      user_id: userId,
      export_date: exportDate.split('T')[0],
      format: 'JSON',
      data: {
        documents: documents || [],
        conversations: conversations || [],
        knowledge_bases: knowledgeBases || [],
        query_history: queryHistory || [],
        settings: settings || [],
        integrations: (integrations || []).map(integration => ({
          ...integration,
          // Remove sensitive token data for security
          access_token: undefined,
          refresh_token: undefined
        }))
      },
      metadata: {
        export_request_date: exportDate,
        data_controller: 'AI Query Hub',
        export_method: 'automated',
        data_sources: [
          'user_account',
          'documents',
          'conversations',
          'knowledge_bases',
          'query_history',
          'settings',
          'integrations'
        ],
        retention_info: 'Data is retained as long as your account is active. Upon account deletion, personal data is deleted within 30 days except where retention is required by law.',
        deletion_rights: 'You have the right to request deletion of your personal data. Contact privacy@aiqueryhub.com or use the account deletion feature in your settings.'
      }
    };

    // Add additional data if available
    if (teamMemberships && teamMemberships.length > 0) {
      exportData.data.team_memberships = teamMemberships;
    }

    if (timeline && timeline.length > 0) {
      exportData.data.timeline_items = timeline;
    }

    if (supportTickets && supportTickets.length > 0) {
      exportData.data.support_tickets = supportTickets;
    }

    // Log export for audit trail
    const exportLogEntry = {
      user_id: userId,
      action: 'data_export',
      timestamp: exportDate,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      data_types_exported: Object.keys(exportData.data).filter(key =>
        exportData.data[key as keyof typeof exportData.data]?.length > 0
      )
    };

    // Insert audit log entry
    await supabase
      .from('compliance_audit_log')
      .insert(exportLogEntry);

    console.log(`Data export completed for user: ${userId}, total items: ${
      Object.values(exportData.data).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0)
    }`);

    return new Response(
      JSON.stringify(exportData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="aiqueryhub-data-export-${userId}-${exportDate.split('T')[0]}.json"`
        }
      }
    );

  } catch (error) {
    console.error('Data export error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

export default serve;