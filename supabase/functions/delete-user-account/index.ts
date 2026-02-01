import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface DeletionRequest {
  user_id?: string;
  confirmation?: string;
  immediate?: boolean;
  admin_override?: boolean;
  reason?: string;
  request_export?: boolean;
}

interface DeletionResponse {
  user_id: string;
  status: string;
  scheduled_deletion: string;
  deletion_requested_at: string;
  grace_period?: {
    days: number;
    cancellation_deadline: string;
  };
  message: string;
  audit: {
    action: string;
    user_id: string;
    timestamp: string;
    ip_address: string;
    user_agent: string;
    reason?: string;
  };
  cascade_info: {
    tables_affected: string[];
    estimated_records: number;
  };
  export_info?: {
    export_requested: boolean;
    export_url?: string;
  };
}

const TABLES_TO_CASCADE = [
  'knowledge_documents',
  'conversations',
  'knowledge_bases',
  'ai_query_history',
  'user_settings',
  'user_google_tokens',
  'team_members',
  'timeline_items',
  'support_tickets',
  'compliance_audit_log'
];

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
    const requestBody: DeletionRequest = await req.json();
    const userId = requestBody.user_id || user.id;

    // Verify user can only delete their own account (unless admin override)
    if (userId !== user.id && !requestBody.admin_override) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete different user account' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate confirmation
    if (!requestBody.confirmation && !requestBody.admin_override) {
      return new Response(
        JSON.stringify({
          error: 'Account deletion requires confirmation. Please provide confirmation: "DELETE_MY_ACCOUNT"'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing account deletion request for user: ${userId}`);

    // Check if user is already scheduled for deletion
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser?.raw_user_meta_data?.deletion_scheduled) {
      return new Response(
        JSON.stringify({
          error: 'Account is already scheduled for deletion',
          scheduled_deletion: existingUser.raw_user_meta_data.scheduled_deletion
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate deletion schedule
    const now = new Date();
    const gracePeriodDays = requestBody.immediate && requestBody.admin_override ? 1 : 30;
    const scheduledDeletion = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    // Count records to be affected
    let totalRecords = 0;
    const affectedTables = [];

    for (const table of TABLES_TO_CASCADE) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (count && count > 0) {
          affectedTables.push(table);
          totalRecords += count;
        }
      } catch (error) {
        console.warn(`Could not count records in table ${table}:`, error);
      }
    }

    // Update user metadata to mark for deletion
    const userMetadata = {
      deletion_scheduled: true,
      scheduled_deletion: scheduledDeletion.toISOString(),
      deletion_requested_at: now.toISOString(),
      deletion_reason: requestBody.reason || 'User requested account deletion',
      grace_period_days: gracePeriodDays,
      status: 'deletion_scheduled'
    };

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: userMetadata
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      throw new Error('Failed to schedule account deletion');
    }

    // Trigger data export if requested
    let exportInfo;
    if (requestBody.request_export) {
      try {
        const { data: exportData } = await supabase.functions.invoke('export-user-data', {
          body: { user_id: userId }
        });

        exportInfo = {
          export_requested: true,
          export_url: exportData ? '/functions/v1/export-user-data' : undefined
        };
      } catch (error) {
        console.warn('Failed to trigger data export:', error);
        exportInfo = {
          export_requested: false,
          error: 'Export failed, please request separately'
        };
      }
    }

    // Create audit trail entry
    const auditEntry = {
      user_id: userId,
      action: 'account_deletion_scheduled',
      timestamp: now.toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      additional_metadata: {
        grace_period_days: gracePeriodDays,
        scheduled_deletion: scheduledDeletion.toISOString(),
        admin_override: requestBody.admin_override || false,
        immediate: requestBody.immediate || false,
        reason: requestBody.reason,
        tables_affected: affectedTables,
        estimated_records: totalRecords
      }
    };

    await supabase
      .from('compliance_audit_log')
      .insert(auditEntry);

    // Prepare response
    const response: DeletionResponse = {
      user_id: userId,
      status: 'deletion_scheduled',
      scheduled_deletion: scheduledDeletion.toISOString(),
      deletion_requested_at: now.toISOString(),
      message: `Account deletion has been scheduled for ${scheduledDeletion.toLocaleDateString()}. You have ${gracePeriodDays} days to cancel this request if you change your mind.`,
      audit: {
        action: 'account_deletion_scheduled',
        user_id: userId,
        timestamp: now.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        reason: requestBody.reason
      },
      cascade_info: {
        tables_affected: affectedTables,
        estimated_records: totalRecords
      }
    };

    // Add grace period info if applicable
    if (gracePeriodDays > 1) {
      response.grace_period = {
        days: gracePeriodDays,
        cancellation_deadline: scheduledDeletion.toISOString()
      };
    }

    // Add export info if requested
    if (exportInfo) {
      response.export_info = exportInfo;
    }

    console.log(`Account deletion scheduled for user: ${userId}, scheduled for: ${scheduledDeletion.toISOString()}, tables affected: ${affectedTables.length}, records: ${totalRecords}`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Account deletion error:', error);

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