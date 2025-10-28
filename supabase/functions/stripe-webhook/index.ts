import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-02-24.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

console.log("Stripe webhook handler initialized");

Deno.serve(async (request) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  const signature = request.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  console.log("Webhook secret configured:", webhookSecret ? `Yes (starts with ${webhookSecret.substring(0, 7)}...)` : 'No');
  console.log("Signature present:", signature ? 'Yes' : 'No');

  if (!signature) {
    console.error("Missing Stripe-Signature header");
    return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET environment variable not set");
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get raw body - CRITICAL: must use .text() for signature verification
  const body = await request.text();
  console.log("Received webhook, body length:", body.length);

  // Verify webhook signature
  let receivedEvent;
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
    console.log(`✅ Event verified: ${receivedEvent.id} (${receivedEvent.type})`);
  } catch (err) {
    console.error(`❌ Webhook verification failed: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Process the event
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log(`Processing webhook event: ${receivedEvent.type}`);

  try {
    switch (receivedEvent.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = receivedEvent.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;
        const planType = subscription.metadata.plan_type;

        if (!userId) {
          console.error("No user_id in subscription metadata");
          break;
        }

        // Upsert subscription
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            plan_type: planType,
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

        if (error) {
          console.error("Error upserting subscription:", error);
        }

        // Initialize usage tracking for new period
        await supabase
          .from("usage_tracking")
          .insert({
            user_id: userId,
            query_count: 0,
            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .onConflict("user_id, period_start")
          .ignore();

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = receivedEvent.data.object as Stripe.Subscription;

        // Mark subscription as canceled
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = receivedEvent.data.object as Stripe.Invoice;

        // Update subscription status on successful payment
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = receivedEvent.data.object as Stripe.Invoice;

        // Update subscription status on failed payment
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${receivedEvent.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Event processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
