import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  fullName: string;
  confirmationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, confirmationUrl }: ConfirmationEmailRequest = await req.json();

    console.log('Sending confirmation email to:', email);

    const emailResponse = await resend.emails.send({
      from: "AI Query Hub <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to AI Query Hub - Confirm Your Email",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #0A2342 0%, #FFC300 100%);
                padding: 40px 20px;
                text-align: center;
                color: white;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #0A2342 0%, #FFC300 100%);
                color: white !important;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
              }
              .button:hover {
                opacity: 0.9;
              }
              .footer {
                background: #f9f9f9;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e0e0e0;
              }
              .footer a {
                color: #0A2342;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to AI Query Hub!</h1>
              </div>
              <div class="content">
                <h2 style="margin-top: 0;">Hi ${fullName},</h2>
                <p>Thank you for signing up for AI Query Hub! We're excited to have you on board.</p>
                <p>To complete your registration and start using your AI assistant that remembers everything, please confirm your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #666;">
                  ${confirmationUrl}
                </p>
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                  <strong>What's next?</strong><br>
                  Once confirmed, you'll be able to:
                </p>
                <ul style="color: #555;">
                  <li>Upload and organize your documents</li>
                  <li>Chat with your documents using advanced AI</li>
                  <li>Get instant answers from your knowledge base</li>
                  <li>Create AI-powered summaries and insights</li>
                </ul>
                <p style="color: #888; font-size: 14px; margin-top: 30px;">
                  If you didn't create an account with AI Query Hub, you can safely ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>
                  <strong>AI Query Hub</strong><br>
                  An AI Assistant That Remembers Everything
                </p>
                <p style="margin-top: 10px;">
                  Questions? <a href="mailto:support@aiqueryhub.com">Contact Support</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
