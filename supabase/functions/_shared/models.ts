/**
 * Centralized AI Model Configuration
 *
 * This module provides a single source of truth for all AI model IDs used across edge functions.
 *
 * MODEL ALIASES (Recommended):
 * Using aliases like "claude-sonnet-4-5" automatically points to the latest version,
 * so you don't need to update when Anthropic releases new versions.
 *
 * ENVIRONMENT VARIABLE OVERRIDES:
 * Set these in Supabase dashboard to override defaults without code changes:
 * - CLAUDE_PRIMARY_MODEL: Main model for complex tasks (default: claude-opus-4-6)
 * - CLAUDE_FAST_MODEL: Fast model for quick responses (default: claude-sonnet-4-5)
 * - CLAUDE_CHEAP_MODEL: Cost-effective model (default: claude-haiku-4-5)
 * - OPENROUTER_MODEL: OpenRouter fallback model (default: openai/gpt-4.1)
 * - OPENAI_MODEL: Direct OpenAI model (default: gpt-4.1)
 * - GEMINI_MODEL: Google Gemini model (default: google/gemini-3.1-pro-preview)
 * - LOCAL_MODEL: Local Ollama model (default: llama3)
 */

// Claude model IDs - using current Anthropic API model IDs (February 2026)
// See: https://docs.anthropic.com/en/docs/about-claude/models
export const CLAUDE_MODELS = {
  // Primary: Most capable model for complex reasoning and analysis (Opus 4.6 - Feb 2026)
  PRIMARY: Deno.env.get('CLAUDE_PRIMARY_MODEL') || 'claude-opus-4-6',

  // Fast: Good balance of speed and capability
  FAST: Deno.env.get('CLAUDE_FAST_MODEL') || 'claude-sonnet-4-5',

  // Cheap: Most cost-effective for simple tasks
  CHEAP: Deno.env.get('CLAUDE_CHEAP_MODEL') || 'claude-haiku-4-5-20251001',
} as const;

// OpenRouter models (for fallback)
export const OPENROUTER_MODELS = {
  PRIMARY: Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4.1',
  FAST: 'openai/gpt-4o-mini',
} as const;

// Direct OpenAI models
export const OPENAI_MODELS = {
  PRIMARY: Deno.env.get('OPENAI_MODEL') || 'gpt-4.1',
  FAST: 'gpt-4o-mini',
} as const;

// Google Gemini models (via OpenRouter)
export const GEMINI_MODELS = {
  PRIMARY: Deno.env.get('GEMINI_MODEL') || 'google/gemini-3.1-pro-preview',
} as const;

// Local models (Ollama)
export const LOCAL_MODELS = {
  PRIMARY: Deno.env.get('LOCAL_MODEL') || 'llama3',
} as const;

// Model tiers for semantic selection
export type ModelTier = 'PRIMARY' | 'FAST' | 'CHEAP';

// Provider types
export type Provider = 'claude' | 'openrouter' | 'openai' | 'gemini' | 'local';

/**
 * Get the appropriate Claude model based on tier
 * @param tier - PRIMARY (most capable), FAST (balanced), CHEAP (cost-effective)
 * @returns The Claude model ID/alias
 */
export function getClaudeModel(tier: ModelTier = 'PRIMARY'): string {
  return CLAUDE_MODELS[tier];
}

/**
 * Get model for a specific provider
 * @param provider - The AI provider to use
 * @param tier - Model tier (not all providers support all tiers)
 * @returns The model ID for the specified provider
 */
export function getModel(provider: Provider, tier: ModelTier = 'PRIMARY'): string {
  switch (provider) {
    case 'claude':
      return CLAUDE_MODELS[tier];
    case 'openrouter':
      return tier === 'FAST' ? OPENROUTER_MODELS.FAST : OPENROUTER_MODELS.PRIMARY;
    case 'openai':
      return tier === 'FAST' ? OPENAI_MODELS.FAST : OPENAI_MODELS.PRIMARY;
    case 'gemini':
      return GEMINI_MODELS.PRIMARY;
    case 'local':
      return LOCAL_MODELS.PRIMARY;
    default:
      return CLAUDE_MODELS.PRIMARY;
  }
}

/**
 * Get all current model configurations (useful for debugging/logging)
 */
export function getModelConfig() {
  return {
    claude: CLAUDE_MODELS,
    openrouter: OPENROUTER_MODELS,
    openai: OPENAI_MODELS,
    gemini: GEMINI_MODELS,
    local: LOCAL_MODELS,
  };
}

// Default export for convenience
export default {
  CLAUDE_MODELS,
  OPENROUTER_MODELS,
  OPENAI_MODELS,
  GEMINI_MODELS,
  LOCAL_MODELS,
  getClaudeModel,
  getModel,
  getModelConfig,
};
