import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingEmail {
  from: string;
  from_name?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  message_id?: string;
  in_reply_to?: string;
  email_references?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailData: IncomingEmail = await req.json();

    console.log('Received email:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    });

    // Extract user email from the 'to' field
    // Format: tasks-{user_email}@yourdomain.com or tasks+{user_email}@yourdomain.com
    const toEmail = emailData.to.toLowerCase();
    let userEmail: string | null = null;

    // Try to extract user email from various formats
    if (toEmail.includes('tasks-')) {
      const match = toEmail.match(/tasks-([^@]+)@/);
      if (match) userEmail = match[1].replace(/-/g, '@');
    } else if (toEmail.includes('tasks+')) {
      const match = toEmail.match(/tasks\+([^@]+)@/);
      if (match) userEmail = match[1].replace(/\+/g, '@');
    }

    if (!userEmail) {
      console.error('Could not extract user email from:', toEmail);
      return new Response(
        JSON.stringify({ error: 'Invalid recipient format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = userData.users.find(u => u.email === userEmail);
    if (!user) {
      console.error('User not found:', userEmail);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check sender patterns to see if we should auto-ignore
    const { data: pattern } = await supabase
      .from('email_sender_patterns')
      .select('auto_ignore, auto_category')
      .eq('user_id', user.id)
      .eq('sender_email', emailData.from)
      .single();

    const shouldAutoIgnore = pattern?.auto_ignore || false;
    const autoCategory = pattern?.auto_category || null;

    // Store the email
    const { data: storedEmail, error: storeError } = await supabase
      .from('received_emails')
      .insert({
        user_id: user.id,
        from_email: emailData.from,
        from_name: emailData.from_name,
        subject: emailData.subject,
        body_text: emailData.text,
        body_html: emailData.html,
        message_id: emailData.message_id,
        in_reply_to: emailData.in_reply_to,
        email_references: emailData.email_references,
        processing_status: shouldAutoIgnore ? 'ignored' : 'pending',
        ai_category: autoCategory,
        ignored_reason: shouldAutoIgnore ? 'Auto-ignored based on sender pattern' : null
      })
      .select()
      .single();

    if (storeError) throw storeError;

    // If not auto-ignored, queue for AI processing
    if (!shouldAutoIgnore) {
      console.log('Queueing email for AI processing:', storedEmail.id);

      // Call AI processing function asynchronously
      supabase.functions.invoke('process-email-with-ai', {
        body: {
          email_id: storedEmail.id,
          user_id: user.id
        }
      }).catch(err => {
        console.error('Error invoking AI processing:', err);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: storedEmail.id,
        status: shouldAutoIgnore ? 'ignored' : 'queued_for_processing'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
