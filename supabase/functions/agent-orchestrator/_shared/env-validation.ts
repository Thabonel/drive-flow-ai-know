/**
 * Environment Variable Validation Utility
 *
 * Validates that required environment variables are set before function execution.
 * Provides clear error messages for missing configuration.
 *
 * Usage:
 *   import { validateEnvVars, REQUIRED_ENV } from '../_shared/env-validation.ts';
 *
 *   // At the start of your function:
 *   const envError = validateEnvVars(['SUPABASE_URL', 'ANTHROPIC_API_KEY']);
 *   if (envError) {
 *     return new Response(JSON.stringify({ error: envError }), { status: 500 });
 *   }
 */

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  error?: string;
}

/**
 * Validates that all required environment variables are set
 * @param required - Array of required environment variable names
 * @returns null if all valid, or an error message if any are missing
 */
export function validateEnvVars(required: string[]): string | null {
  const missing: string[] = [];

  for (const envVar of required) {
    const value = Deno.env.get(envVar);
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please configure these in your Supabase Edge Function secrets.';
    console.error(`[ENV VALIDATION ERROR] ${errorMsg}`);
    return errorMsg;
  }

  return null;
}

/**
 * Validates environment variables and returns detailed result
 */
export function validateEnvVarsDetailed(required: string[]): EnvValidationResult {
  const missing: string[] = [];

  for (const envVar of required) {
    const value = Deno.env.get(envVar);
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      error: `Missing required environment variables: ${missing.join(', ')}`
    };
  }

  return { valid: true, missing: [] };
}

/**
 * Gets an environment variable with a default value
 */
export function getEnvOrDefault(name: string, defaultValue: string): string {
  return Deno.env.get(name) || defaultValue;
}

/**
 * Gets a required environment variable, throws if missing
 */
export function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

// Common environment variable groups for different function types
export const REQUIRED_ENV = {
  // Core Supabase (required by all functions)
  SUPABASE_CORE: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],

  // AI Query functions
  AI_QUERY: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'],

  // AI Query with fallback
  AI_QUERY_FULL: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY'],

  // Email functions
  EMAIL: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'],

  // Google Drive integration
  GOOGLE_DRIVE: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],

  // Stripe integration
  STRIPE: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'],

  // Document processing
  DOCUMENT_PROCESSING: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
} as const;
