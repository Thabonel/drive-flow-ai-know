/**
 * @deprecated SECURITY WARNING: This client uses dangerouslyAllowBrowser which exposes
 * API keys in the browser. DO NOT use this in production.
 *
 * For production use, all AI calls should go through Supabase Edge Functions:
 * - supabase/functions/ai-query/ (main AI query endpoint)
 * - supabase/functions/claude-document-processor/ (document processing)
 *
 * This file is kept for backwards compatibility and local development only.
 * It will be removed in a future version.
 *
 * Migration guide:
 * Instead of: await openai.chat.completions.create(...)
 * Use: await supabase.functions.invoke('ai-query', { body: { query: ... } })
 */
import OpenAI from 'openai';

// Initialize OpenAI client
// SECURITY: API key is ONLY used if explicitly set in environment
// DO NOT set VITE_OPENAI_API_KEY in production - use Edge Functions instead
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey || apiKey === 'your_openai_api_key_here') {
  console.warn(
    '[DEPRECATED] OpenAI browser client not configured. ' +
    'This is expected - use Supabase Edge Functions for AI calls in production.'
  );
}

export const openai = new OpenAI({
  apiKey: apiKey || 'placeholder',
  // SECURITY WARNING: This flag exposes the API key to the browser.
  // Only use for local development. In production, use Edge Functions.
  dangerouslyAllowBrowser: true,
});

export interface StreamingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Create a chat completion with streaming support
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  options: StreamingOptions = {}
): Promise<string> {
  const {
    model = 'gpt-5',
    temperature = 0.7,
    maxTokens = 4000,
    onToken,
    onComplete,
    onError,
  } = options;

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let fullText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onToken?.(delta);
      }
    }

    onComplete?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error occurred');
    onError?.(err);
    throw err;
  }
}

/**
 * Create a non-streaming chat completion
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = 'gpt-5',
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Create a chat completion with automatic retries
 */
export async function createChatCompletionWithRetry(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<string> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    ...completionOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await createChatCompletion(messages, completionOptions);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Attempt ${attempt + 1} failed:`, lastError);

      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Simple wrapper for making OpenAI calls with a single prompt
 */
export async function callOpenAI(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  return createChatCompletion(messages, {
    model: options.model,
    temperature: options.temperature,
    maxTokens: options.max_tokens,
  });
}

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return !!(apiKey && apiKey !== 'your_openai_api_key_here');
}
