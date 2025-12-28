import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-02-24.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

console.log("Stripe webhook processor initialized");

// Map frontend plan names to database plan_tier values
function mapPlanTier(frontendPlan: string | undefined): string {
  if (!frontendPlan) return 'free';

  const mapping: Record<string, string> = {
    'starter': 'ai_starter',
    'pro': 'professional',
    'business': 'executive',
  };
  return mapping[frontendPlan] || frontendPlan;
}

// Process queued webhook events
async function processQueuedEvents(supabase: any) {
  console.log("Fetching unprocessed webhook events...");

  // Fetch unprocessed events (limit to 10 per run to prevent timeout)
  const { data: events, error: fetchError } = await supabase
    .from("webhook_events_queue")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(10);

  if (fetchError) {
    console.error("Error fetching queued events:", fetchError);
    return { error: fetchError.message };
  }

  if (!events || events.length === 0) {
    console.log("No unprocessed events in queue");
    return { processed: 0 };
  }

  console.log(`Found ${events.length} unprocessed event(s)`);

  let processedCount = 0;
  let errorCount = 0;

  for (const queuedEvent of events) {
    try {
      console.log(`Processing event ${queuedEvent.event_id} (${queuedEvent.event_type})`);

      await processWebhookEvent(queuedEvent.event_data, supabase);

      // Mark as processed
      await supabase
        .from("webhook_events_queue")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", queuedEvent.id);

      processedCount++;
      console.log(`✅ Event ${queuedEvent.event_id} processed successfully`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error processing event ${queuedEvent.event_id}:`, error);

      // Update retry count and error message
      await supabase
        .from("webhook_events_queue")
        .update({
          retry_count: queuedEvent.retry_count + 1,
          error_message: error.message,
        })
        .eq("id", queuedEvent.id);

      // If retry count exceeds 5, mark as processed to prevent infinite retries
      if (queuedEvent.retry_count >= 5) {
        console.error(`Event ${queuedEvent.event_id} failed after 5 retries, marking as processed`);
        await supabase
          .from("webhook_events_queue")
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq("id", queuedEvent.id);
      }
    }
  }

  return { processed: processedCount, errors: errorCount, total: events.length };
}

// Process individual webhook event (extracted from original webhook handler)
async function processWebhookEvent(event: any, supabase: any) {
  console.log(`Processing event type: ${event.type}`);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.user_id;
      const planType = subscription.metadata.plan_type;

      if (!userId) {
        console.error("No user_id in subscription metadata");
        return;
      }

      // Upsert subscription (FIXED: use correct table and column names)
      const { error } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: userId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0].price.id,
          plan_tier: mapPlanTier(planType),
          status: subscription.status,
          trial_started_at: subscription.trial_start
            ? new Date(subscription.trial_start * 1000).toISOString()
            : null,
          trial_ends_at: subscription.trial_end
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
        throw error;
      }

      // TODO: Initialize usage tracking for new period
      // Skipping for now - needs proper implementation with user_usage table
      // and correct column names (ai_queries_count, etc.)

      // Handle additional team purchase
      const isAdditionalTeam = subscription.metadata?.is_additional_team === 'true';

      if (isAdditionalTeam && event.type === "customer.subscription.created") {
        console.log('Creating additional team from subscription metadata');

        // Create team from metadata
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: subscription.metadata.team_name,
            slug: subscription.metadata.team_slug,
            owner_user_id: userId,
            max_members: 5, // Default for Business plan
          })
          .select()
          .single();

        if (teamError) {
          console.error('Error creating additional team:', teamError);
          throw teamError;
        }

        console.log(`Additional team created: ${team.id}`);

        // Create team_subscription record
        const { error: teamSubError } = await supabase
          .from('team_subscriptions')
          .insert({
            team_id: team.id,
            user_id: userId,
            stripe_subscription_id: subscription.id,
            is_primary_team: false, // This is a purchased additional team
            status: 'active',
          });

        if (teamSubError) {
          console.error('Error creating team subscription record:', teamSubError);
          throw teamSubError;
        }

        console.log(`Team subscription record created for team: ${team.id}`);
        // Note: team member is automatically added by database trigger
      }

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Mark subscription as canceled (FIXED: use correct table name)
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Error updating subscription status:", error);
        throw error;
      }

      // Handle additional team subscription cancellation
      // Mark team subscription as canceled (don't delete the team, just mark inactive)
      const { data: teamSub, error: teamSubError } = await supabase
        .from('team_subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)
        .select('team_id')
        .single();

      if (teamSub) {
        console.log(`Additional team subscription canceled for team: ${teamSub.team_id}`);
      } else if (teamSubError && teamSubError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - it's fine if this is a regular subscription
        console.error('Error updating team subscription status:', teamSubError);
      }

      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;

      // Update subscription status on successful payment (FIXED: use correct table name)
      if (invoice.subscription) {
        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "active" })
          .eq("stripe_subscription_id", invoice.subscription as string);

        if (error) {
          console.error("Error updating subscription status:", error);
          throw error;
        }
      }

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;

      // Update subscription status on failed payment (FIXED: use correct table name)
      if (invoice.subscription) {
        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription as string);

        if (error) {
          console.error("Error updating subscription status:", error);
          throw error;
        }
      }

      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

Deno.serve(async (request) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const result = await processQueuedEvents(supabase);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Webhook processor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
