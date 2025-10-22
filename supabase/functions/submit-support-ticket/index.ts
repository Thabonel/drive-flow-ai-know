import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { subject, message, category } = await req.json();

    // Validate inputs
    if (!subject || !message || !category) {
      throw new Error("Subject, message, and category are required");
    }

    if (subject.length > 255) {
      throw new Error("Subject must be 255 characters or less");
    }

    if (message.length < 10) {
      throw new Error("Message must be at least 10 characters");
    }

    const validCategories = ['technical', 'billing', 'feature_request', 'bug_report', 'general'];
    if (!validCategories.includes(category)) {
      throw new Error("Invalid category");
    }

    // Auto-assign priority based on category
    let priority = 'normal';
    if (category === 'billing') {
      priority = 'high';
    } else if (category === 'bug_report') {
      priority = 'high';
    } else if (category === 'technical') {
      priority = 'normal';
    }

    // Create the support ticket
    const { data: ticket, error: insertError } = await supabaseClient
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        message,
        category,
        priority,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating ticket:", insertError);
      throw new Error(`Failed to create support ticket: ${insertError.message}`);
    }

    console.log(`✅ Support ticket created: ${ticket.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in submit-support-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
