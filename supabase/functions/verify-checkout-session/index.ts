import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-10-28.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get session_id from request
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("No session_id provided");
    }

    console.log("Verifying checkout session:", session_id);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer'],
    });

    console.log("Session status:", session.status);
    console.log("Payment status:", session.payment_status);

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Get the subscription details
    const subscription = session.subscription as Stripe.Subscription;

    if (!subscription) {
      throw new Error("No subscription found in session");
    }

    console.log("Subscription ID:", subscription.id);
    console.log("Subscription status:", subscription.status);

    // Save subscription to database
    const { error: dbError } = await supabaseClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        plan_type: subscription.metadata.plan_type || 'starter',
        status: subscription.status,
        trial_start: subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      }, {
        onConflict: "stripe_subscription_id",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save subscription: ${dbError.message}`);
    }

    // Initialize usage tracking
    await supabaseClient
      .from("usage_tracking")
      .insert({
        user_id: user.id,
        query_count: 0,
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .onConflict("user_id, period_start")
      .ignoreDuplicates();

    console.log("✅ Subscription saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          plan_type: subscription.metadata.plan_type,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
