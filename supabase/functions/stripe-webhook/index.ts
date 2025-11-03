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

  // Queue the event for async processing (prevents Stripe timeout)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log(`Queueing webhook event: ${receivedEvent.type} (${receivedEvent.id})`);

  try {
    // Store event in queue for async processing
    const { error: queueError } = await supabase
      .from("webhook_events_queue")
      .insert({
        event_id: receivedEvent.id,
        event_type: receivedEvent.type,
        event_data: receivedEvent,
        processed: false,
      });

    if (queueError) {
      // If duplicate event_id, ignore (idempotency)
      if (queueError.code === '23505') {
        console.log(`Duplicate event ${receivedEvent.id}, already queued`);
      } else {
        console.error("Error queueing webhook event:", queueError);
        throw queueError;
      }
    }

    // ✅ IMMEDIATELY return 200 to Stripe (before processing)
    console.log(`✅ Event ${receivedEvent.id} queued successfully`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Event queueing error:", error);
    // Even on error, return 200 to prevent Stripe retry storms
    // The event will be in Stripe's logs and can be manually retried
    return new Response(
      JSON.stringify({ received: true, warning: 'Event queuing failed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
