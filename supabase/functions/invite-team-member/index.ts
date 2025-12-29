import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Invite Team Member function initialized");

// Generate team invitation email HTML
function generateInvitationEmailHtml(
  teamName: string,
  inviterName: string,
  inviteUrl: string,
  role: string,
  expiresInDays: number = 7
): string {
  const roleDescriptions = {
    admin: "manage team members and settings",
    member: "view and edit shared documents and timeline",
    viewer: "view team documents and timeline (read-only)",
  };

  const roleDescription = roleDescriptions[role as keyof typeof roleDescriptions] || roleDescriptions.member;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0A2342 0%, #1a3a5c 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: white;">AI Query Hub</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <span style="display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 20px;">TEAM INVITATION</span>

                    <h2 style="margin-top: 0; color: #0A2342; font-size: 24px;">You're Invited to Join a Team!</h2>

                    <p style="color: #444; font-size: 16px; margin: 20px 0;">
                      <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on AI Query Hub.
                    </p>

                    <p style="color: #444; font-size: 16px; margin: 20px 0;">
                      As a <strong>${role}</strong>, you'll be able to ${roleDescription}.
                    </p>

                    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
                      <p style="margin: 0; color: #1e40af; font-size: 14px;">
                        <strong>Team Benefits:</strong> Access shared documents in AI queries, collaborate on team timeline, and enable context fluency with your teammates.
                      </p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${inviteUrl}" style="display: inline-block; background: #FFC300; color: #0A2342; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                      This invitation will expire in <strong>${expiresInDays} days</strong>. If you don't want to join this team, you can safely ignore this email.
                    </p>

                    <p style="color: #999; font-size: 13px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                      Can't click the button? Copy and paste this link into your browser:<br>
                      <span style="color: #3b82f6; word-break: break-all;">${inviteUrl}</span>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666; font-size: 14px;"><strong>AI Query Hub</strong></p>
                    <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">Team collaboration and AI-powered knowledge management</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

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

    const { team_id, email, role = "member" } = await req.json();

    if (!team_id || !email) {
      return new Response(
        JSON.stringify({ error: "Team ID and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or owner of the team
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(
        JSON.stringify({
          error: "Only team owners and admins can invite members",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("*, team_members(count)")
      .eq("id", team_id)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if team has reached member limit
    const currentMemberCount = team.team_members[0]?.count || 0;
    if (currentMemberCount >= team.max_members) {
      return new Response(
        JSON.stringify({
          error: `Team has reached maximum member limit (${team.max_members} members)`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({
          error: "This user is already a team member",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id, accepted_at")
      .eq("team_id", team_id)
      .eq("email", email.toLowerCase())
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      if (existingInvite.accepted_at) {
        return new Response(
          JSON.stringify({
            error: "This email has already accepted an invitation to this team",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          error: "An active invitation already exists for this email",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .insert({
        team_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Invitation creation error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send invitation email
    const inviteUrl = `${Deno.env.get("FRONTEND_URL") || "https://aiqueryhub.com"}/accept-invite/${invitation.invitation_token}`;

    // Get inviter's name for email
    const inviterName = user.user_metadata?.full_name || user.email?.split("@")[0] || "A team admin";

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: "AI Query Hub <onboarding@resend.dev>",
          to: [email],
          subject: `You're invited to join ${team.name} on AI Query Hub`,
          html: generateInvitationEmailHtml(
            team.name,
            inviterName,
            inviteUrl,
            role,
            7
          ),
        });

        if (emailError) {
          console.error("Email send error:", emailError);
          // Don't fail the invitation if email fails - invitation is still created
        } else {
          console.log(`Invitation email sent to ${email}:`, emailResult?.id);
        }
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Continue - invitation is still valid even if email fails
      }
    } else {
      console.warn("RESEND_API_KEY not configured - invitation created but email not sent");
    }

    console.log(`Invitation created for ${email} to team ${team_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          invite_url: inviteUrl,
        },
        email_sent: !!resendApiKey,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-team-member function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
