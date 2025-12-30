import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Generate Customer Invite function initialized');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can generate customer invites' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { assigned_email, expires_in_days = 30, metadata = {} } = await req.json();

    // Validate email if provided
    if (assigned_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(assigned_email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('customer_invites')
      .insert({
        created_by: user.id,
        assigned_email: assigned_email?.toLowerCase() || null,
        expires_at: expiresAt.toISOString(),
        plan_tier: 'executive',
        metadata: {
          ...metadata,
          created_by_email: user.email,
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Invite creation error:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://aiqueryhub.com';
    const magicLink = `${frontendUrl}/signup?invite=${invite.invite_token}`;

    console.log(`Customer invite created: ${invite.id} by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          id: invite.id,
          token: invite.invite_token,
          magic_link: magicLink,
          assigned_email: invite.assigned_email,
          expires_at: invite.expires_at,
          plan_tier: invite.plan_tier,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-customer-invite function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
