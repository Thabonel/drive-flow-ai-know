import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Get user's subscription to find customer ID (get most recent one)
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("Subscription query result:", { subscriptions, subError });

    if (subError) {
      console.error("Database error fetching subscription:", subError);
      throw new Error(`Database error: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.error("No subscriptions found for user:", user.id);
      throw new Error("No active subscription found");
    }

    if (!subscriptions[0]?.stripe_customer_id) {
      console.error("Subscription missing stripe_customer_id:", subscriptions[0]);
      throw new Error("Subscription missing customer ID");
    }

    const subscription = subscriptions[0];
    console.log("Using customer ID:", subscription.stripe_customer_id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-10-28.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create customer portal session
    console.log("Creating portal session for customer:", subscription.stripe_customer_id);

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${req.headers.get("origin")}/settings/billing`,
      });

      console.log("Portal session created successfully:", session.id);

      return new Response(
        JSON.stringify({ url: session.url }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (stripeError: any) {
      console.error("Stripe API error:", stripeError);

      // Check for specific Stripe error about portal not being activated
      if (stripeError.code === 'customer_portal_not_configured') {
        throw new Error("Stripe Customer Portal is not activated. Please activate it in your Stripe Dashboard at https://dashboard.stripe.com/test/settings/billing/portal");
      }

      throw new Error(`Stripe error: ${stripeError.message || stripeError}`);
    }
  } catch (error) {
    console.error("Error creating portal session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
