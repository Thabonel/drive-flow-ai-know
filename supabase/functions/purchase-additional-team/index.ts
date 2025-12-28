import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

console.log('Purchase Additional Team function initialized');

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

    const { teamName, teamSlug } = await req.json();

    if (!teamName || !teamSlug) {
      return new Response(
        JSON.stringify({ error: 'Team name and slug are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has active Business tier subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, plan_tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('plan_tier', ['executive', 'enterprise'])
      .single();

    if (subError || !subscription) {
      console.error('Subscription error:', subError);
      return new Response(
        JSON.stringify({
          error: 'Active Business or Enterprise subscription required to purchase additional teams',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscription.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error: 'No Stripe customer ID found. Please contact support.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe checkout session for additional team purchase
    const session = await stripe.checkout.sessions.create({
      customer: subscription.stripe_customer_id,
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1Sj7yODXysaVZSVhhxfqxKKi', // Additional Team Slot - $60/month
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'}/team/create?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'}/settings/billing`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          team_name: teamName,
          team_slug: teamSlug,
          is_additional_team: 'true',
        },
      },
    });

    console.log(`Checkout session created for additional team: ${session.id}`);

    return new Response(
      JSON.stringify({
        sessionUrl: session.url,
        sessionId: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in purchase-additional-team function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
