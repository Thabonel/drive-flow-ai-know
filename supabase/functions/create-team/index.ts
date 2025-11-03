import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Create Team function initialized");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, slug } = await req.json();

    if (!name || !slug) {
      return new Response(
        JSON.stringify({ error: "Team name and slug are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user has a Business subscription
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("plan_tier", ["business", "enterprise"])
      .single();

    if (subError || !subscription) {
      console.error("Subscription error:", subError);
      return new Response(
        JSON.stringify({
          error: "Business or Enterprise subscription required to create a team",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has a team
    const { data: existingTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (existingTeam) {
      return new Response(
        JSON.stringify({
          error: "You already have a team. Each subscription supports one team.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        owner_user_id: user.id,
        subscription_id: subscription.id,
        max_members: 5, // Default for Business plan
      })
      .select()
      .single();

    if (teamError) {
      console.error("Team creation error:", teamError);
      return new Response(
        JSON.stringify({
          error: teamError.code === "23505"
            ? "Team slug already taken"
            : "Failed to create team",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link subscription to team
    await supabase
      .from("user_subscriptions")
      .update({ team_id: team.id })
      .eq("id", subscription.id);

    console.log(`Team created: ${team.id} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        team,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-team function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
