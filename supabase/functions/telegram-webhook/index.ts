/**
 * Telegram Webhook Edge Function
 *
 * Handles incoming Telegram messages via webhook and routes them to the AI orchestrator.
 * Supports text messages, voice messages (with transcription), and image analysis.
 *
 * Security: Uses webhook signature verification and user account linking for access control.
 *
 * Environment Variables Required:
 * - TELEGRAM_BOT_TOKEN: Your Telegram bot token from @BotFather
 * - TELEGRAM_SECRET_TOKEN: Secret token for webhook signature verification
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database operations
 * - OPENAI_API_KEY: For voice transcription (Whisper)
 * - ANTHROPIC_API_KEY: For AI responses (Claude)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CLAUDE_MODELS } from '../_shared/models.ts';

// Telegram Bot API types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramVoice;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  caption?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

// Environment variables
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_SECRET_TOKEN = Deno.env.get('TELEGRAM_SECRET_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

/**
 * Verify webhook signature using Telegram secret token
 */
async function verifyWebhookSignature(request: Request, body: string): Promise<boolean> {
  if (!TELEGRAM_SECRET_TOKEN) {
    console.warn('TELEGRAM_SECRET_TOKEN not configured, skipping signature verification');
    return true; // Allow requests if no secret token is set (dev mode)
  }

  const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!signature) {
    console.warn('Missing X-Telegram-Bot-Api-Secret-Token header');
    return false;
  }

  // Simple string comparison (Telegram sends the exact secret token)
  return signature === TELEGRAM_SECRET_TOKEN;
}

// Telegram API helper
async function sendTelegramMessage(chatId: number, text: string, parseMode?: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  // Telegram has a 4096 character limit, split if needed
  const maxLength = 4000;
  const chunks: string[] = [];

  if (text.length <= maxLength) {
    chunks.push(text);
  } else {
    // Split by paragraphs first, then by sentences if needed
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Find a good split point
      let splitIndex = remaining.lastIndexOf('\n\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = remaining.lastIndexOf('\n', maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = remaining.lastIndexOf('. ', maxLength);
        if (splitIndex !== -1) splitIndex += 1; // Include the period
      }
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = maxLength;
      }

      chunks.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }
  }

  // Send each chunk
  for (const chunk of chunks) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram send error:', error);
    }

    // Small delay between chunks to respect rate limits
    if (chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function sendTypingAction(chatId: number): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      action: 'typing',
    }),
  });
}

async function getTelegramFile(fileId: string): Promise<ArrayBuffer> {
  // Get file path
  const fileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const fileResponse = await fetch(fileUrl);
  const fileData = await fileResponse.json();

  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Failed to get file path from Telegram');
  }

  // Download the file
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error('Failed to download file from Telegram');
  }

  return response.arrayBuffer();
}

// Transcribe voice message using OpenAI Whisper
async function transcribeVoice(fileId: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured for voice transcription');
  }

  // Download the voice file from Telegram
  const audioBuffer = await getTelegramFile(fileId);

  // Create form data for Whisper API
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  // Call OpenAI Whisper API
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Whisper API error:', error);
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const result = await response.json();
  return result.text || '';
}

// Convert image to base64 for Claude Vision
async function getImageAsBase64(fileId: string): Promise<{ base64: string; mediaType: string }> {
  const imageBuffer = await getTelegramFile(fileId);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  // Telegram photos are usually JPEG
  return {
    base64,
    mediaType: 'image/jpeg',
  };
}

// Generate query embedding for memory search
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, skipping embedding generation');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.substring(0, 8000), // Truncate for token limit
        model: 'text-embedding-3-small',
        dimensions: 1536,
      }),
    });

    if (!response.ok) {
      console.error('Embedding generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// Retrieve relevant memories for context
async function retrieveMemoryContext(
  supabase: any,
  userId: string,
  query: string
): Promise<string> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    if (!queryEmbedding) {
      return ''; // No embedding, skip memory retrieval
    }

    // Call the search function
    const { data: memories, error } = await supabase.rpc('search_semantic_memories', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_memory_types: null, // All types
      p_limit: 5,
      p_similarity_threshold: 0.6,
    });

    if (error) {
      console.error('Memory search error:', error.message);
      return '';
    }

    if (!memories || memories.length === 0) {
      return '';
    }

    // Format memories as context
    const memoryContext = memories.map((m: any) =>
      `[${m.memory_type}] ${m.content}`
    ).join('\n\n');

    return `\nRelevant context from previous conversations:\n${memoryContext}\n`;
  } catch (error) {
    console.error('Memory retrieval error:', error);
    return '';
  }
}

// Get user's learning profile for personalization
async function getUserProfile(
  supabase: any,
  userId: string
): Promise<{ communicationStyle: string; preferences: string } | null> {
  try {
    const { data: profile, error } = await supabase
      .from('user_learning_profile')
      .select('communication_style, response_preferences')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return null;
    }

    const style = profile.communication_style;
    const prefs = profile.response_preferences;

    const styleDesc = [];
    if (style?.formality_level) styleDesc.push(`formality: ${style.formality_level}`);
    if (style?.preferred_length) styleDesc.push(`length: ${style.preferred_length}`);
    if (style?.technical_level) styleDesc.push(`technical level: ${style.technical_level}`);

    const prefDesc = [];
    if (prefs?.proactive_suggestions !== undefined) {
      prefDesc.push(prefs.proactive_suggestions ? 'offer suggestions' : 'wait for questions');
    }

    return {
      communicationStyle: styleDesc.join(', ') || 'neutral',
      preferences: prefDesc.join(', ') || 'standard',
    };
  } catch (error) {
    console.error('Profile retrieval error:', error);
    return null;
  }
}

// Call the AI orchestrator (ai-query function)
async function callAIOrchestrator(
  supabase: any,
  userId: string,
  query: string,
  imageData?: { base64: string; media_type: string }
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  // Retrieve memory context and user profile in parallel
  const [memoryContext, userProfile] = await Promise.all([
    retrieveMemoryContext(supabase, userId, query),
    getUserProfile(supabase, userId),
  ]);

  // Build personalized system message
  let personalizations = '';
  if (userProfile) {
    personalizations = `\nUser communication preferences: ${userProfile.communicationStyle}. ${userProfile.preferences}.`;
  }

  // Build system message for Telegram context
  const systemMessage = `You are a helpful AI assistant communicating via Telegram.
Keep responses concise and conversational - this is a chat interface, not a document.
Avoid excessive formatting. Use simple line breaks for structure.
Be friendly but professional.${personalizations}
${memoryContext}
You have access to web search for current information when needed.
If the user asks about their documents or knowledge bases, let them know they should use the web app for document queries.

Current time: ${new Date().toISOString()}`;

  // Call Claude API directly (similar to ai-query)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODELS.FAST, // Use fast model for Telegram (better latency)
      max_tokens: 2048,
      system: systemMessage,
      messages: imageData ? [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.media_type,
                data: imageData.base64,
              },
            },
            {
              type: 'text',
              text: query || 'What do you see in this image?',
            },
          ],
        },
      ] : [
        {
          role: 'user',
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`AI response failed: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === 'text');
  return textBlock?.text || 'I apologize, but I could not generate a response.';
}

// Extract facts and memories from conversation using AI
async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string
): Promise<Array<{ content: string; memory_type: string; importance: number }>> {
  // Simple rule-based extraction (could be enhanced with AI later)
  const memories: Array<{ content: string; memory_type: string; importance: number }> = [];

  // Look for user facts (things the user states about themselves)
  const factPatterns = [
    /my (?:name is|dog is|cat is|wife is|husband is|boss is|job is|favorite|preference)/i,
    /I (?:am|have|work|live|like|prefer|hate|love|need|want)/i,
    /I'm (?:a|an|the|working|living|planning)/i,
  ];

  for (const pattern of factPatterns) {
    if (pattern.test(userMessage)) {
      memories.push({
        content: `User stated: "${userMessage}"`,
        memory_type: 'user_fact',
        importance: 5,
      });
      break;
    }
  }

  // Look for goals
  const goalPatterns = [
    /I want to|I need to|my goal is|I'm trying to|I plan to/i,
    /help me|remind me to|don't let me forget/i,
  ];

  for (const pattern of goalPatterns) {
    if (pattern.test(userMessage)) {
      memories.push({
        content: `User goal/task: "${userMessage}"`,
        memory_type: 'user_goal',
        importance: 6,
      });
      break;
    }
  }

  // Look for preferences
  const preferencePatterns = [
    /I prefer|I like|I don't like|please don't|always|never/i,
  ];

  for (const pattern of preferencePatterns) {
    if (pattern.test(userMessage)) {
      memories.push({
        content: `User preference: "${userMessage}"`,
        memory_type: 'preference',
        importance: 5,
      });
      break;
    }
  }

  // Look for corrections (user correcting the AI)
  const correctionPatterns = [
    /no,? (?:I meant|it's|that's wrong|actually)/i,
    /that's not (?:right|correct|what I)/i,
    /I said|I told you/i,
  ];

  for (const pattern of correctionPatterns) {
    if (pattern.test(userMessage)) {
      memories.push({
        content: `User correction: "${userMessage}" (in response to: "${assistantResponse.substring(0, 200)}")`,
        memory_type: 'user_correction',
        importance: 7,
      });
      break;
    }
  }

  return memories;
}

// Log interaction to database for memory
async function logInteraction(
  supabase: any,
  telegramUserId: number,
  userMessage: string,
  assistantResponse: string,
  messageType: 'text' | 'voice' | 'image'
): Promise<void> {
  try {
    const conversationId = crypto.randomUUID();
    const sourceType = messageType === 'voice' ? 'voice_transcript' : 'text_chat';

    // Log to conversation_summaries for session tracking
    const { error: summaryError } = await supabase
      .from('conversation_summaries')
      .insert({
        user_id: null, // No linked Supabase user yet - could be enhanced
        conversation_id: conversationId,
        source_type: 'telegram',
        chunk_index: 0,
        raw_content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
        summary: userMessage.substring(0, 200),
        key_topics: [messageType, 'telegram'],
        mentioned_entities: [],
        conversation_date: new Date().toISOString(),
      });

    if (summaryError) {
      console.error('Failed to log conversation summary:', summaryError.message);
    }

    // Extract memories from conversation
    const extractedMemories = await extractMemoriesFromConversation(userMessage, assistantResponse);

    // Generate embedding for the conversation
    const conversationText = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
    const embedding = await generateQueryEmbedding(conversationText);

    // Always store a conversation summary memory
    const baseMemory = {
      user_id: null, // No linked Supabase user yet
      memory_type: 'conversation_summary',
      source_type: sourceType,
      content: `[Telegram ${messageType}] ${conversationText.substring(0, 500)}`,
      embedding: embedding,
      importance_score: 3,
      metadata: {
        telegram_user_id: telegramUserId,
        message_type: messageType,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
      },
    };

    const { error: baseMemoryError } = await supabase
      .from('semantic_memories')
      .insert(baseMemory);

    if (baseMemoryError) {
      console.log('Note: Failed to store base memory:', baseMemoryError.message);
    }

    // Store any extracted specific memories
    for (const memory of extractedMemories) {
      const memoryEmbedding = await generateQueryEmbedding(memory.content);

      const { error: memoryError } = await supabase
        .from('semantic_memories')
        .insert({
          user_id: null,
          memory_type: memory.memory_type,
          source_type: sourceType,
          content: memory.content,
          embedding: memoryEmbedding,
          importance_score: memory.importance,
          metadata: {
            telegram_user_id: telegramUserId,
            conversation_id: conversationId,
            extracted_from: 'telegram_conversation',
          },
        });

      if (memoryError) {
        console.log(`Note: Failed to store ${memory.memory_type} memory:`, memoryError.message);
      }
    }

    // Log to audit trail
    await supabase.rpc('log_audit_event', {
      p_user_id: null, // Would be user ID if linked
      p_action_type: 'memory_write',
      p_description: `Logged Telegram ${messageType} conversation`,
      p_source_channel: 'telegram',
      p_metadata: {
        telegram_user_id: telegramUserId,
        conversation_id: conversationId,
        memories_extracted: extractedMemories.length,
      },
    });

    console.log(`Interaction logged successfully. Extracted ${extractedMemories.length} additional memories.`);
  } catch (error) {
    console.error('Error logging interaction:', error);
    // Don't fail the main request if logging fails
  }
}

// Answer Telegram callback query
async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });
}

// Edit Telegram message
async function editMessage(chatId: number, messageId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
    }),
  });
}

// Handle autonomy-related commands
async function handleAutonomyCommand(
  supabase: any,
  chatId: number,
  command: string,
  userId: string
): Promise<string | null> {
  switch (command) {
    case '/status': {
      // Check current autonomy session status
      const { data: session } = await supabase.rpc('get_active_autonomy_session', {
        p_user_id: userId,
      });

      if (session && session.length > 0) {
        const s = session[0];
        return `Autonomy Session Active

Started: ${new Date(s.started_at).toLocaleString()}
Expires: ${new Date(s.expires_at).toLocaleString()}
Time remaining: ${s.time_remaining_minutes} minutes
Actions taken: ${s.actions_count}

Reply /stop to end the session.`;
      } else {
        return `No active autonomy session.

When I need to take autonomous actions (like proactive check-ins), I'll ask for your approval first.

The session lasts 2 hours and lets me act on your behalf without asking each time.`;
      }
    }

    case '/stop': {
      // End current autonomy session
      const { data: ended } = await supabase.rpc('end_autonomy_session', {
        p_user_id: userId,
      });

      if (ended) {
        return `Autonomy session ended.

I'll now ask for your approval before taking any autonomous actions.`;
      } else {
        return `No active autonomy session to end.`;
      }
    }

    case '/autonomy': {
      // Request new autonomy session
      const { data: hasSession } = await supabase.rpc('has_active_autonomy_session', {
        p_user_id: userId,
      });

      if (hasSession) {
        return `You already have an active autonomy session. Use /status to check details or /stop to end it.`;
      }

      // Create confirmation request
      const { data: confirmationId } = await supabase.rpc('create_pending_confirmation', {
        p_user_id: userId,
        p_confirmation_type: 'autonomy_start',
        p_action_description: 'Start 2-hour autonomy session',
        p_channel: 'telegram',
        p_channel_id: chatId.toString(),
        p_expires_minutes: 5,
      });

      if (confirmationId) {
        // Send confirmation with inline buttons
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Start Autonomy Session?

This allows me to:
- Send proactive check-ins
- Take actions based on urgency
- Manage tasks without asking each time

Duration: 2 hours
You can end it anytime with /stop`,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Approve', callback_data: `confirm:${confirmationId}:approve` },
                  { text: 'Deny', callback_data: `confirm:${confirmationId}:deny` },
                ],
              ],
            },
          }),
        });
        return null; // Message already sent
      }

      return `Could not create autonomy request. Please try again.`;
    }

    default:
      return null;
  }
}

// Handle callback query (button presses)
async function handleCallbackQuery(
  supabase: any,
  callbackQuery: TelegramCallbackQuery
): Promise<void> {
  const data = callbackQuery.data;
  if (!data) {
    await answerCallbackQuery(callbackQuery.id, 'Invalid callback');
    return;
  }

  // Handle confirmation callbacks: confirm:<id>:<action>
  if (data.startsWith('confirm:')) {
    const parts = data.split(':');
    if (parts.length !== 3) {
      await answerCallbackQuery(callbackQuery.id, 'Invalid format');
      return;
    }

    const confirmationId = parts[1];
    const action = parts[2];
    const approved = action === 'approve';

    // Process confirmation
    const { data: result, error } = await supabase.rpc('process_confirmation_response', {
      p_confirmation_id: confirmationId,
      p_approved: approved,
      p_response_data: {
        telegram_user_id: callbackQuery.from.id,
        telegram_username: callbackQuery.from.username,
      },
    });

    if (error || !result?.success) {
      await answerCallbackQuery(callbackQuery.id, result?.error || 'Failed to process');
      return;
    }

    // Answer and update message
    const responseText = approved ? 'Approved!' : 'Denied';
    await answerCallbackQuery(callbackQuery.id, responseText);

    if (callbackQuery.message) {
      const updatedText = approved
        ? `Autonomy session STARTED at ${new Date().toLocaleTimeString()}

I can now take actions on your behalf for 2 hours.

Use /status to check session info
Use /stop to end the session early`
        : `Autonomy session DENIED at ${new Date().toLocaleTimeString()}

I'll ask for permission before taking actions.`;

      await editMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        updatedText
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
      },
    });
  }
}

// Main webhook handler
serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Validate required environment variables
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return new Response('Bot not configured', { status: 500 });
  }

  try {
    const body = await req.text();

    // Verify webhook signature for security
    const isValidSignature = await verifyWebhookSignature(req, body);
    if (!isValidSignature) {
      console.warn('Invalid webhook signature received');
      return new Response('Unauthorized', { status: 401 });
    }

    const update: TelegramUpdate = JSON.parse(body);
    console.log('Received Telegram update:', update.update_id);

    // Initialize Supabase client early for callback queries
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle callback queries (button presses)
    if (update.callback_query) {
      await handleCallbackQuery(supabase, update.callback_query);
      return new Response('OK', { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id;

    // Get connected user from Telegram chat ID
    const { data: connectedUser } = await supabase.rpc('get_user_by_telegram_chat_id', {
      p_chat_id: chatId.toString(),
    });

    // If no connected user, provide linking instructions
    if (!connectedUser) {
      console.log(`No connected user for Telegram chat ${chatId}`);
      await sendTelegramMessage(
        chatId,
        `Hello! To use this bot, you need to connect your Telegram account to AI Query Hub.

Go to AI Query Hub Settings → Integrations → Telegram and generate a connection link.

Or send /start <connection-token> if you have a connection token.`
      );
      return new Response('OK', { status: 200 });
    }

    // supabase client already initialized above for callback queries

    // Send typing indicator
    await sendTypingAction(chatId);

    let userQuery = '';
    let messageType: 'text' | 'voice' | 'image' = 'text';
    let imageData: { base64: string; media_type: string } | undefined;

    // Handle different message types
    if (message.voice) {
      // Voice message - transcribe first
      messageType = 'voice';
      console.log('Processing voice message...');

      try {
        userQuery = await transcribeVoice(message.voice.file_id);
        console.log('Transcribed:', userQuery.substring(0, 100));

        if (!userQuery.trim()) {
          await sendTelegramMessage(chatId, 'I could not understand the voice message. Please try again.');
          return new Response('OK', { status: 200 });
        }
      } catch (transcribeError) {
        console.error('Transcription error:', transcribeError);
        await sendTelegramMessage(chatId, 'Sorry, I had trouble processing your voice message. Please try again or send a text message.');
        return new Response('OK', { status: 200 });
      }
    } else if (message.photo && message.photo.length > 0) {
      // Image message - use Claude Vision
      messageType = 'image';
      console.log('Processing image message...');

      try {
        // Get the largest photo size
        const photo = message.photo[message.photo.length - 1];
        const imgData = await getImageAsBase64(photo.file_id);
        imageData = {
          base64: imgData.base64,
          media_type: imgData.mediaType,
        };
        userQuery = message.caption || 'What do you see in this image?';
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        await sendTelegramMessage(chatId, 'Sorry, I had trouble processing your image. Please try again.');
        return new Response('OK', { status: 200 });
      }
    } else if (message.text) {
      // Text message
      messageType = 'text';
      userQuery = message.text;

      // Handle /start command (with optional linking token)
      if (userQuery.startsWith('/start')) {
        const parts = userQuery.split(' ');
        const linkingToken = parts.length > 1 ? parts[1] : null;

        // Check if this is a deep link with a linking token
        if (linkingToken) {
          // Verify and consume the token
          const { data: tokenResult } = await supabase.rpc('verify_messaging_link_token', {
            p_platform: 'telegram',
            p_token: linkingToken,
          });

          if (tokenResult && tokenResult.length > 0 && tokenResult[0].is_valid) {
            const linkedUserId = tokenResult[0].user_id;

            // Create the connection
            await supabase.rpc('connect_messaging_platform', {
              p_user_id: linkedUserId,
              p_platform: 'telegram',
              p_telegram_chat_id: chatId.toString(),
              p_telegram_username: message.from?.username || null,
            });

            await sendTelegramMessage(
              chatId,
              `Your Telegram account has been successfully connected to AI Query Hub.

You can now:
- Receive proactive check-ins and reminders
- Chat with your AI assistant
- Send voice messages and images

Type /help to see all available commands.`
            );
            return new Response('OK', { status: 200 });
          } else {
            const errorMsg = tokenResult?.[0]?.error_message || 'Invalid token';
            await sendTelegramMessage(
              chatId,
              `Connection failed: ${errorMsg}

Please generate a new connection link from AI Query Hub settings and try again.`
            );
            return new Response('OK', { status: 200 });
          }
        }

        // Regular /start without token
        await sendTelegramMessage(
          chatId,
          `Hello! I'm your AI assistant connected to AI Query Hub.

You can:
- Send me text messages for AI assistance
- Send voice messages (I'll transcribe and respond)
- Send images (I'll analyze them)

To connect your account, go to AI Query Hub Settings and generate a connection link.

How can I help you today?`
        );
        return new Response('OK', { status: 200 });
      }

      // Handle /help command
      if (userQuery === '/help') {
        await sendTelegramMessage(
          chatId,
          `Available commands:
/start - Welcome message
/help - Show this help
/status - Check autonomy session status
/autonomy - Start autonomy session
/stop - End autonomy session

Or just send me:
- Text questions
- Voice messages
- Images to analyze

For document queries and knowledge bases, please use the AI Query Hub web app.`
        );
        return new Response('OK', { status: 200 });
      }

      // Handle autonomy commands
      if (['/status', '/stop', '/autonomy'].includes(userQuery)) {
        const response = await handleAutonomyCommand(supabase, chatId, userQuery, connectedUser);
        if (response) {
          await sendTelegramMessage(chatId, response);
        }
        return new Response('OK', { status: 200 });
      }

      // Handle /stats command
      if (userQuery === '/stats') {
        const { data: stats } = await supabase.rpc('get_user_dashboard_stats', {
          p_user_id: connectedUser,
        });

        const statsMessage = stats ? `Assistant Stats

Today:
- Messages: ${stats.today?.messages || 0}
- Check-ins: ${stats.today?.checkins || 0}
- Actions: ${stats.today?.actions || 0}

This Week:
- Messages: ${stats.week?.messages || 0}
- Check-ins: ${stats.week?.checkins || 0}
- Est. Cost: $${((stats.week?.cost_cents || 0) / 100).toFixed(2)}

Memory:
- Total memories: ${stats.memory?.total_memories || 0}
- Facts: ${stats.memory?.user_facts || 0}
- Goals: ${stats.memory?.user_goals || 0}

Autonomy:
- Active session: ${stats.autonomy?.active_session ? 'Yes' : 'No'}
- Total sessions: ${stats.autonomy?.total_sessions || 0}
- Actions taken: ${stats.autonomy?.total_actions || 0}` : 'Could not load stats. Try again later.';

        await sendTelegramMessage(chatId, statsMessage);
        return new Response('OK', { status: 200 });
      }
    } else {
      // Unsupported message type
      await sendTelegramMessage(
        chatId,
        'I can only process text, voice messages, and images. Please send one of those.'
      );
      return new Response('OK', { status: 200 });
    }

    // Call the AI orchestrator
    console.log('Calling AI orchestrator...');
    let aiResponse: string;

    try {
      aiResponse = await callAIOrchestrator(supabase, connectedUser, userQuery, imageData);
    } catch (aiError) {
      console.error('AI orchestrator error:', aiError);
      aiResponse = 'Sorry, I encountered an error processing your request. Please try again.';
    }

    // Send the response
    await sendTelegramMessage(chatId, aiResponse);

    // Log the interaction for memory
    await logInteraction(supabase, userId || 0, userQuery, aiResponse, messageType);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
