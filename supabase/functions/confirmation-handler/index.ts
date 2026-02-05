/**
 * Confirmation Handler Edge Function
 *
 * Handles confirmation callbacks from Telegram inline buttons and Slack interactive components.
 * Used for the 2-hour autonomy safeguard and action approvals.
 *
 * Telegram callback_data format: "confirm:<confirmation_id>:<action>"
 * Slack callback format: { callback_id: "<confirmation_id>", actions: [{ value: "approve|deny" }] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');

interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: {
      id: number;
    };
  };
  data?: string;
}

interface TelegramUpdate {
  callback_query?: TelegramCallbackQuery;
}

/**
 * Answer Telegram callback query (removes loading indicator)
 */
async function answerTelegramCallback(
  callbackQueryId: string,
  text: string
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    }
  );
}

/**
 * Edit Telegram message (update button message after response)
 */
async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: undefined,
      }),
    }
  );
}

/**
 * Send Telegram message with inline buttons for confirmation
 */
export async function sendTelegramConfirmation(
  chatId: string,
  confirmationId: string,
  message: string
): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Approve',
                  callback_data: `confirm:${confirmationId}:approve`,
                },
                {
                  text: 'Deny',
                  callback_data: `confirm:${confirmationId}:deny`,
                },
              ],
            ],
          },
        }),
      }
    );

    const result = await response.json();
    if (result.ok) {
      return result.result.message_id.toString();
    }
    console.error('Failed to send confirmation:', result);
    return null;
  } catch (error) {
    console.error('Error sending confirmation:', error);
    return null;
  }
}

/**
 * Request autonomy confirmation from user
 */
export async function requestAutonomyConfirmation(
  supabase: any,
  userId: string,
  channel: 'telegram' | 'slack',
  channelId: string,
  isExtension: boolean = false
): Promise<{ confirmationId: string; messageSent: boolean }> {
  const confirmationType = isExtension ? 'autonomy_extend' : 'autonomy_start';
  const actionDescription = isExtension
    ? 'Extend autonomy session by 2 hours?'
    : 'Start autonomy session (2 hours of autonomous actions)?';

  // Create confirmation record
  const { data: confirmationId } = await supabase.rpc('create_pending_confirmation', {
    p_user_id: userId,
    p_confirmation_type: confirmationType,
    p_action_description: actionDescription,
    p_channel: channel,
    p_channel_id: channelId,
    p_expires_minutes: 5,
  });

  if (!confirmationId) {
    return { confirmationId: '', messageSent: false };
  }

  // Send confirmation message
  const message = isExtension
    ? `Your autonomy session is about to expire.\n\nWould you like to extend it for another 2 hours?\n\nThis allows me to continue taking actions on your behalf without asking for approval each time.`
    : `I need your permission to take autonomous actions.\n\nStarting an autonomy session allows me to:\n- Send proactive check-ins\n- Take actions based on urgency\n- Manage your tasks and calendar\n\nThe session lasts 2 hours. You can end it anytime.\n\nApprove to start?`;

  let messageSent = false;
  let messageId: string | null = null;

  if (channel === 'telegram') {
    messageId = await sendTelegramConfirmation(channelId, confirmationId, message);
    messageSent = !!messageId;
  } else if (channel === 'slack') {
    // Slack interactive messages - would need Slack's interactive component API
    // For now, just log
    console.log('Slack confirmation not yet implemented');
  }

  // Update confirmation with message ID
  if (messageId) {
    await supabase
      .from('pending_confirmations')
      .update({ message_id: messageId })
      .eq('id', confirmationId);
  }

  return { confirmationId, messageSent };
}

/**
 * Handle Telegram callback query
 */
async function handleTelegramCallback(
  supabase: any,
  callbackQuery: TelegramCallbackQuery
): Promise<void> {
  const data = callbackQuery.data;
  if (!data || !data.startsWith('confirm:')) {
    await answerTelegramCallback(callbackQuery.id, 'Invalid callback');
    return;
  }

  // Parse callback data: confirm:<confirmation_id>:<action>
  const parts = data.split(':');
  if (parts.length !== 3) {
    await answerTelegramCallback(callbackQuery.id, 'Invalid callback format');
    return;
  }

  const confirmationId = parts[1];
  const action = parts[2]; // 'approve' or 'deny'
  const approved = action === 'approve';

  // Process the confirmation
  const { data: result, error } = await supabase.rpc('process_confirmation_response', {
    p_confirmation_id: confirmationId,
    p_approved: approved,
    p_response_data: {
      telegram_user_id: callbackQuery.from.id,
      telegram_username: callbackQuery.from.username,
      responded_via: 'inline_button',
    },
  });

  if (error) {
    console.error('Error processing confirmation:', error);
    await answerTelegramCallback(callbackQuery.id, 'Error processing response');
    return;
  }

  if (!result.success) {
    await answerTelegramCallback(callbackQuery.id, result.error || 'Failed to process');
    return;
  }

  // Answer callback and update message
  const responseText = approved
    ? 'Approved! Autonomy session started.'
    : 'Denied. No autonomous actions will be taken.';

  await answerTelegramCallback(callbackQuery.id, responseText);

  // Update the original message
  if (callbackQuery.message) {
    const updatedMessage = approved
      ? `Autonomy session APPROVED at ${new Date().toLocaleTimeString()}\n\nI can now take actions on your behalf for 2 hours. Reply "stop" to end the session early.`
      : `Autonomy session DENIED at ${new Date().toLocaleTimeString()}\n\nI'll ask for permission before taking actions.`;

    await editTelegramMessage(
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      updatedMessage
    );
  }

  // Log audit event
  await supabase.rpc('log_audit_event', {
    p_user_id: result.user_id,
    p_action_type: 'security_event',
    p_description: `User ${approved ? 'approved' : 'denied'} ${result.confirmation_type}`,
    p_source_channel: 'telegram',
    p_metadata: {
      confirmation_id: confirmationId,
      approved,
      telegram_user_id: callbackQuery.from.id,
    },
  });
}

/**
 * Check if user needs autonomy confirmation before taking action
 */
export async function checkAutonomyBeforeAction(
  supabase: any,
  userId: string,
  actionDescription: string,
  channel: 'telegram' | 'slack',
  channelId: string
): Promise<{ canProceed: boolean; reason: string }> {
  // Check for active session
  const { data: hasSession } = await supabase.rpc('has_active_autonomy_session', {
    p_user_id: userId,
  });

  if (hasSession) {
    // Increment action count
    await supabase.rpc('increment_session_action', {
      p_user_id: userId,
      p_action_description: actionDescription,
    });

    return { canProceed: true, reason: 'Active autonomy session' };
  }

  // Check rate limits
  const { data: rateLimit } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action_type: 'action',
  });

  if (!rateLimit?.allowed) {
    return {
      canProceed: false,
      reason: `Rate limit exceeded. Resets at ${new Date(rateLimit.resets_at).toLocaleTimeString()}`,
    };
  }

  // No active session - need to request confirmation
  const { confirmationId, messageSent } = await requestAutonomyConfirmation(
    supabase,
    userId,
    channel,
    channelId,
    false
  );

  return {
    canProceed: false,
    reason: messageSent
      ? 'Autonomy confirmation requested. Please approve to continue.'
      : 'Could not send confirmation request. Please try again.',
  };
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Telegram webhook
      const update: TelegramUpdate = await req.json();

      if (update.callback_query) {
        await handleTelegramCallback(supabase, update.callback_query);
        return new Response('OK', { status: 200 });
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Slack interactive component
      const body = await req.text();
      const params = new URLSearchParams(body);
      const payload = JSON.parse(params.get('payload') || '{}');

      // Handle Slack interactive components here
      console.log('Slack interactive payload:', payload);

      return new Response(
        JSON.stringify({ text: 'Processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Confirmation handler error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
