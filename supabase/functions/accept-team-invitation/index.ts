import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

console.log("Accept Team Invitation function initialized");

Deno.serve(async (req) => {
  // Get CORS headers with origin validation
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    const { token: plainToken, invitation_token } = await req.json();

    // Support both 'token' (new) and 'invitation_token' (legacy) parameter names
    const tokenToUse = plainToken || invitation_token;

    if (!tokenToUse) {
      return new Response(
        JSON.stringify({ error: "Invitation token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the token for secure lookup
    const { data: hashedToken, error: hashError } = await supabase
      .rpc('hash_invitation_token', { token: tokenToUse })
      .single();

    if (hashError || !hashedToken) {
      console.error("Token hashing error:", hashError);
      return new Response(
        JSON.stringify({ error: "Failed to process invitation token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get invitation using hashed token (secure)
    let invitation, inviteError;
    const invitationQuery = await supabase
      .from("team_invitations")
      .select("*, teams(*)")
      .eq("hashed_token", hashedToken)
      .single();

    invitation = invitationQuery.data;
    inviteError = invitationQuery.error;

    // Fallback to old plaintext token lookup for backward compatibility
    if (inviteError && inviteError.code === 'PGRST116') {
      console.log("Trying legacy token lookup for backward compatibility");
      const legacyQuery = await supabase
        .from("team_invitations")
        .select("*, teams(*)")
        .eq("invitation_token", tokenToUse)
        .single();

      invitation = legacyQuery.data;
      inviteError = legacyQuery.error;
    }

    if (inviteError || !invitation) {
      console.error("Invitation lookup error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid invitation token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation has already been accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ error: "Invitation has already been accepted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user's email matches invitation email
    if (!user.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: "This invitation was sent to a different email address",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member of this team
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      // Update invitation as accepted even though user is already a member
      await supabase
        .from("team_invitations")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({
          error: "You are already a member of this team",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check team member limit
    const { count: memberCount } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", invitation.team_id);

    if (memberCount && memberCount >= invitation.teams.max_members) {
      return new Response(
        JSON.stringify({
          error: "Team has reached maximum member limit",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add user as team member
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
      })
      .select()
      .single();

    if (memberError) {
      console.error("Member creation error:", memberError);
      return new Response(
        JSON.stringify({ error: "Failed to add you to the team" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from("team_invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invitation.id);

    console.log(`User ${user.id} accepted invitation to team ${invitation.team_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        team: invitation.teams,
        membership: member,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in accept-team-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
