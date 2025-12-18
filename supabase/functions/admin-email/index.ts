import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailMethod =
  | 'CHECK_CONFIG'
  | 'SEND_INDIVIDUAL'
  | 'SEND_BULK'
  | 'SEND_BY_TIER'
  | 'SEND_TO_ALL'
  | 'GET_HISTORY'

interface EmailRequest {
  method: EmailMethod
  to?: string                    // For individual emails
  userIds?: string[]             // For selected users
  tier?: string                  // For tier-based emails (free, ai_starter, professional, executive)
  subject?: string
  message?: string
  templateType?: 'update' | 'announcement' | 'maintenance' | 'custom'
}

const EMAIL_TEMPLATES = {
  update: {
    subject: 'AI Query Hub - New Update Available',
    preheader: 'Check out what\'s new!',
    badgeText: 'UPDATE',
    badgeColor: '#3b82f6'
  },
  announcement: {
    subject: 'AI Query Hub - Important Announcement',
    preheader: 'Important information for you',
    badgeText: 'ANNOUNCEMENT',
    badgeColor: '#8b5cf6'
  },
  maintenance: {
    subject: 'AI Query Hub - Scheduled Maintenance',
    preheader: 'Upcoming maintenance notice',
    badgeText: 'MAINTENANCE',
    badgeColor: '#f59e0b'
  },
  custom: {
    subject: '',
    preheader: '',
    badgeText: '',
    badgeColor: '#0A2342'
  }
}

function generateEmailHtml(
  subject: string,
  message: string,
  templateType: keyof typeof EMAIL_TEMPLATES = 'custom',
  recipientEmail?: string
): string {
  const template = EMAIL_TEMPLATES[templateType]
  const showBadge = templateType !== 'custom' && template.badgeText

  return `
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
            background: linear-gradient(135deg, #0A2342 0%, #1a3a5c 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .badge {
            display: inline-block;
            background: ${template.badgeColor};
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
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
          .button {
            display: inline-block;
            background: #FFC300;
            color: #0A2342 !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Query Hub</h1>
          </div>
          <div class="content">
            ${showBadge ? `<span class="badge">${template.badgeText}</span>` : ''}
            <h2 style="margin-top: 0; color: #0A2342;">${subject}</h2>
            <div style="color: #444;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div class="footer">
            <p><strong>AI Query Hub</strong></p>
            <p style="font-size: 12px; color: #999; margin-top: 15px;">
              You're receiving this email because you have an account with AI Query Hub.
              ${recipientEmail ? `<br>Sent to: ${recipientEmail}` : ''}
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminRole) {
      throw new Error('Unauthorized: Admin access required')
    }

    const body: EmailRequest = await req.json()
    const { method, to, userIds, tier, subject, message, templateType = 'custom' } = body

    // CHECK_CONFIG: Verify email configuration
    if (method === 'CHECK_CONFIG') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const hasResendKey = !!resendApiKey && resendApiKey.length > 10

      return new Response(
        JSON.stringify({
          success: true,
          config: {
            resendConfigured: hasResendKey,
            resendKeyPrefix: hasResendKey ? resendApiKey!.substring(0, 8) + '...' : 'Not set',
            emailProvider: hasResendKey ? 'Resend' : 'Not configured',
            status: hasResendKey ? 'ready' : 'not_configured',
            note: hasResendKey
              ? 'Email system is configured and ready to send.'
              : 'RESEND_API_KEY is not set. Add it to Supabase Edge Function secrets.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET_HISTORY: Get email send history from audit log
    if (method === 'GET_HISTORY') {
      const { data: history, error: historyError } = await supabaseAdmin
        .from('security_audit_log')
        .select('*')
        .in('action', ['admin_email_individual', 'admin_email_bulk', 'admin_email_tier', 'admin_email_all'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (historyError) {
        console.warn('Failed to fetch history:', historyError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          history: history || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate Resend configuration for all send methods
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured. Please add it to your Supabase Edge Function secrets.')
    }

    const resend = new Resend(resendApiKey)

    // SEND_INDIVIDUAL: Send to a single email address
    if (method === 'SEND_INDIVIDUAL') {
      if (!to || !to.includes('@')) {
        throw new Error('Valid email address is required')
      }
      if (!subject || !message) {
        throw new Error('Subject and message are required')
      }

      const { data: emailResponse, error: emailError } = await resend.emails.send({
        from: 'AI Query Hub <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: generateEmailHtml(subject, message, templateType, to),
      })

      if (emailError) {
        throw new Error(`Failed to send email: ${emailError.message}`)
      }

      // Log to audit
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'admin_email_individual',
          resource_type: 'email',
          metadata: {
            to,
            subject,
            template: templateType,
            resend_id: emailResponse?.id
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: `Email sent successfully to ${to}`,
          sent: 1,
          emailId: emailResponse?.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SEND_BULK: Send to selected users by ID
    if (method === 'SEND_BULK') {
      if (!userIds || userIds.length === 0) {
        throw new Error('No users selected')
      }
      if (!subject || !message) {
        throw new Error('Subject and message are required')
      }

      // Get user emails
      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }

      const selectedUsers = authUsers.users.filter(u => userIds.includes(u.id))
      const emails = selectedUsers.map(u => u.email).filter(Boolean) as string[]

      if (emails.length === 0) {
        throw new Error('No valid email addresses found for selected users')
      }

      // Send emails in batches
      const results = await Promise.allSettled(
        emails.map(email =>
          resend.emails.send({
            from: 'AI Query Hub <onboarding@resend.dev>',
            to: [email],
            subject: subject,
            html: generateEmailHtml(subject, message, templateType, email),
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      // Log to audit
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'admin_email_bulk',
          resource_type: 'email',
          metadata: {
            subject,
            template: templateType,
            recipients_count: emails.length,
            successful,
            failed
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: `Bulk email completed: ${successful} sent, ${failed} failed`,
          sent: successful,
          failed,
          total: emails.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SEND_BY_TIER: Send to all users with a specific subscription tier
    if (method === 'SEND_BY_TIER') {
      if (!tier) {
        throw new Error('Subscription tier is required')
      }
      if (!subject || !message) {
        throw new Error('Subject and message are required')
      }

      // Get users with the specified tier
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id')
        .eq('plan_tier', tier)

      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
      }

      if (!subscriptions || subscriptions.length === 0) {
        throw new Error(`No users found with ${tier} subscription`)
      }

      const userIdsForTier = subscriptions.map(s => s.user_id)

      // Get user emails
      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }

      const tierUsers = authUsers.users.filter(u => userIdsForTier.includes(u.id))
      const emails = tierUsers.map(u => u.email).filter(Boolean) as string[]

      if (emails.length === 0) {
        throw new Error('No valid email addresses found')
      }

      // Send emails
      const results = await Promise.allSettled(
        emails.map(email =>
          resend.emails.send({
            from: 'AI Query Hub <onboarding@resend.dev>',
            to: [email],
            subject: subject,
            html: generateEmailHtml(subject, message, templateType, email),
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      // Log to audit
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'admin_email_tier',
          resource_type: 'email',
          metadata: {
            subject,
            template: templateType,
            tier,
            recipients_count: emails.length,
            successful,
            failed
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: `Email sent to ${tier} tier users: ${successful} sent, ${failed} failed`,
          sent: successful,
          failed,
          total: emails.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SEND_TO_ALL: Send to all registered users
    if (method === 'SEND_TO_ALL') {
      if (!subject || !message) {
        throw new Error('Subject and message are required')
      }

      // Get all users
      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }

      const emails = authUsers.users
        .filter(u => u.email && u.email_confirmed_at) // Only confirmed users
        .map(u => u.email) as string[]

      if (emails.length === 0) {
        throw new Error('No users with confirmed emails found')
      }

      // Send emails in batches to avoid rate limits
      const batchSize = 10
      let successful = 0
      let failed = 0

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(email =>
            resend.emails.send({
              from: 'AI Query Hub <onboarding@resend.dev>',
              to: [email],
              subject: subject,
              html: generateEmailHtml(subject, message, templateType, email),
            })
          )
        )
        successful += results.filter(r => r.status === 'fulfilled').length
        failed += results.filter(r => r.status === 'rejected').length

        // Small delay between batches
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Log to audit
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'admin_email_all',
          resource_type: 'email',
          metadata: {
            subject,
            template: templateType,
            recipients_count: emails.length,
            successful,
            failed
          }
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: `Email sent to all users: ${successful} sent, ${failed} failed`,
          sent: successful,
          failed,
          total: emails.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid method. Use CHECK_CONFIG, SEND_INDIVIDUAL, SEND_BULK, SEND_BY_TIER, SEND_TO_ALL, or GET_HISTORY')
  } catch (error) {
    console.error('Admin email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
