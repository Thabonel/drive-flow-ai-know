// Token estimation and conversation chunking utilities

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Rough token estimation
 * Rule of thumb: 1 token ≈ 4 characters for English text
 * This is a conservative estimate - actual tokenization varies by model
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total tokens in a conversation
 * Includes role prefixes and message formatting overhead
 */
export function calculateConversationTokens(messages: Message[]): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Add tokens for role prefix (e.g., "user: ", "assistant: ")
    totalTokens += estimateTokens(message.role) + 2;

    // Add tokens for message content
    totalTokens += estimateTokens(message.content);

    // Add overhead for message formatting
    totalTokens += 4;
  }

  return totalTokens;
}

/**
 * Smart chunking to keep recent messages within token budget
 * Always keeps the most recent messages (prioritizing recent context)
 *
 * @param messages - Full conversation history
 * @param maxTokens - Maximum tokens to include (leave room for query + response)
 * @returns Chunked messages array (most recent messages that fit)
 */
export function chunkConversationContext(
  messages: Message[],
  maxTokens: number
): Message[] {
  if (messages.length === 0) return [];

  // Start with most recent messages and work backwards
  const chunkedMessages: Message[] = [];
  let currentTokens = 0;

  // Iterate from most recent to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTokens(message.role) + estimateTokens(message.content) + 6;

    // Check if adding this message would exceed the limit
    if (currentTokens + messageTokens > maxTokens) {
      // If we haven't added any messages yet, include at least the most recent one
      if (chunkedMessages.length === 0) {
        chunkedMessages.unshift(message);
      }
      break;
    }

    // Add message to beginning of array (to maintain chronological order)
    chunkedMessages.unshift(message);
    currentTokens += messageTokens;
  }

  return chunkedMessages;
}

/**
 * Get recommended token budget for conversation context
 * Leaves room for the current query and AI response
 *
 * @param providerMaxTokens - Maximum context window for the provider
 * @param currentQueryTokens - Estimated tokens in current query
 * @returns Recommended max tokens for conversation history
 */
export function getConversationTokenBudget(
  providerMaxTokens: number,
  currentQueryTokens: number = 0
): number {
  // Reserve space for:
  // - Current query (if not already counted)
  // - AI response (typically 1000-2000 tokens)
  // - System prompts and formatting overhead (500 tokens)
  const reservedTokens = currentQueryTokens + 2000 + 500;

  // Use at most 70% of available tokens for conversation history
  const maxConversationTokens = Math.floor((providerMaxTokens - reservedTokens) * 0.7);

  return Math.max(1000, maxConversationTokens); // At least 1000 tokens for context
}

/**
 * Provider-specific token limits
 */
export const PROVIDER_TOKEN_LIMITS = {
  claude: 200000,      // Claude Sonnet 4.5: ~200K context window
  'gpt-5': 200000,     // GPT-5: 200K context window
  gemini: 100000,      // Gemini 2.5: ~100K context window
  ollama: 8192,        // Ollama (typical): 8K context window
  openrouter: 128000,  // OpenRouter (varies, using GPT-4 default)
} as const;

/**
 * Get provider token limit from model name
 */
export function getProviderTokenLimit(modelName: string): number {
  const lowerModel = modelName.toLowerCase();

  if (lowerModel.includes('claude')) return PROVIDER_TOKEN_LIMITS.claude;
  if (lowerModel.includes('gpt-5') || lowerModel.includes('gpt-4')) return PROVIDER_TOKEN_LIMITS['gpt-5'];
  if (lowerModel.includes('gemini')) return PROVIDER_TOKEN_LIMITS.gemini;
  if (lowerModel.includes('ollama') || lowerModel.includes('llama')) return PROVIDER_TOKEN_LIMITS.ollama;

  // Default to OpenRouter limit
  return PROVIDER_TOKEN_LIMITS.openrouter;
}

/**
 * Check if conversation context is within safe limits
 * Returns error message if too large, null if OK
 */
export function validateConversationSize(
  messages: Message[],
  providerMaxTokens: number
): string | null {
  const totalTokens = calculateConversationTokens(messages);
  const budget = getConversationTokenBudget(providerMaxTokens);

  if (totalTokens > providerMaxTokens * 0.9) {
    return `Conversation is too large (${totalTokens.toLocaleString()} tokens). Maximum is ${providerMaxTokens.toLocaleString()} tokens.`;
  }

  if (totalTokens > budget) {
    return `Conversation history is large (${totalTokens.toLocaleString()} tokens). Some older messages will be excluded to fit within limits.`;
  }

  return null; // All good
}
