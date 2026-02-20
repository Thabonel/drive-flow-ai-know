/**
 * Production-Safe Edge Function Wrapper
 *
 * Easy-to-use wrapper for existing Edge Function calls.
 * Drop-in replacement that prevents errors from reaching users in production.
 */

import { supabase } from '@/integrations/supabase/client';
import { safeEdgeFunctionCall, type ErrorHandlingOptions } from './error-handling';

/**
 * Safe wrapper for supabase.functions.invoke calls
 *
 * Usage: Replace your existing calls like this:
 *
 * BEFORE:
 * const { data, error } = await supabase.functions.invoke('my-function', { body: {...} });
 *
 * AFTER:
 * const { data, error } = await safeFunctionInvoke('my-function', { body: {...} });
 */
export const safeFunctionInvoke = async <T = any>(
  functionName: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
  } = {},
  errorHandlingOptions: ErrorHandlingOptions = {}
) => {
  return safeEdgeFunctionCall(
    () => supabase.functions.invoke(functionName, options),
    `Edge Function: ${functionName}`,
    {
      userMessage: `Operation failed. Please try again.`,
      reportToAdmin: true,
      ...errorHandlingOptions
    }
  );
};

/**
 * Specialized wrappers for common functions
 */
export const safeAIQuery = (query: string, options: any = {}) => {
  return safeFunctionInvoke('ai-query', {
    body: { query, ...options }
  }, {
    userMessage: 'AI query failed. Please try again.',
    reportToAdmin: true,
  });
};

export const safeGoogleTokenExchange = (code: string, redirectUri: string, scope: string) => {
  return safeFunctionInvoke('store-google-tokens', {
    body: { code, redirect_uri: redirectUri, scope }
  }, {
    userMessage: 'Failed to connect Google account. Please check your permissions and try again.',
    reportToAdmin: true,
  });
};

export const safeParseDocument = (file: any, options: any = {}) => {
  return safeFunctionInvoke('parse-document', {
    body: { file, ...options }
  }, {
    userMessage: 'Failed to process document. Please try again with a different file.',
    reportToAdmin: false, // Common operation, don't spam admin
  });
};

export const safeGoogleDriveSync = (options: any = {}) => {
  return safeFunctionInvoke('google-drive-sync', {
    body: options
  }, {
    userMessage: 'Failed to sync with Google Drive. Please check your connection and try again.',
    reportToAdmin: false, // User can retry
  });
};

/**
 * Health check wrapper - silent by default
 */
export const safeHealthCheck = (functionName: string, body: any = {}) => {
  return safeFunctionInvoke(functionName, { body }, {
    showToast: false,
    silentInProduction: true,
    reportToAdmin: false,
  });
};

/**
 * Critical operation wrapper - always reports to admin
 */
export const safeCriticalOperation = (functionName: string, body: any = {}, userMessage?: string) => {
  return safeFunctionInvoke(functionName, { body }, {
    userMessage: userMessage || 'Critical operation failed. Support has been notified.',
    reportToAdmin: true,
    showToast: true,
  });
};

/**
 * Background operation wrapper - silent in production
 */
export const safeBackgroundOperation = (functionName: string, body: any = {}) => {
  return safeFunctionInvoke(functionName, { body }, {
    showToast: false,
    silentInProduction: true,
    reportToAdmin: false,
  });
};

/**
 * Migration helper: Find all Edge Function calls in codebase
 *
 * Run this command to find calls that need wrapping:
 * grep -r "supabase\.functions\.invoke\|functions\.invoke" src/ --include="*.ts" --include="*.tsx"
 *
 * Priority order for updating:
 * 1. User-facing operations (auth, document operations, AI queries)
 * 2. Health checks and diagnostics
 * 3. Background operations
 * 4. Admin-only operations
 */