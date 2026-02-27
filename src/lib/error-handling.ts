/**
 * Production-Safe Error Handling for Edge Functions
 *
 * Prevents internal errors from reaching users in production while
 * providing detailed diagnostics in staging/development.
 */

import { config } from '@/config/environment';
import { toast } from '@/hooks/use-toast';

export interface EdgeFunctionError {
  message: string;
  details?: string;
  code?: string;
  isUserFacing?: boolean;
}

export interface ErrorHandlingOptions {
  userMessage?: string;
  showToast?: boolean;
  reportToAdmin?: boolean;
  silentInProduction?: boolean;
}

/**
 * Enhanced error handler for Edge Function calls
 * - Production: Shows user-friendly messages, reports to admin
 * - Staging: Silent mode - detailed console logs only (no toasts)
 * - Development: Shows detailed error toasts for immediate debugging
 */
export const handleEdgeFunctionError = (
  error: any,
  context: string,
  options: ErrorHandlingOptions = {}
): EdgeFunctionError => {
  const {
    userMessage = 'Something went wrong. Please try again.',
    showToast = true,
    reportToAdmin = true,
    silentInProduction = false
  } = options;

  // Determine error details
  const errorMessage = error?.message || 'Unknown error';
  const isSupabaseEdgeError = errorMessage.includes('Edge Function returned a non-2xx status code');
  const isMissingConfig = errorMessage.includes('GOOGLE_CLIENT_SECRET') ||
                         errorMessage.includes('environment variable') ||
                         errorMessage.includes('not configured');

  // Create structured error
  const structuredError: EdgeFunctionError = {
    message: errorMessage,
    details: error?.details || error?.stack,
    code: error?.code,
    isUserFacing: !isSupabaseEdgeError
  };

  // Log for debugging (always logged)
  console.error(`[Edge Function Error - ${context}]:`, {
    error: structuredError,
    timestamp: new Date().toISOString(),
    environment: config.environment,
    userAgent: navigator.userAgent,
  });

  // Report to admin in production (when configured)
  if (config.isProduction && reportToAdmin) {
    reportToAdmin && reportErrorToAdmin(structuredError, context);
  }

  // Handle user-facing error display
  // CRITICAL: In production, NEVER show toasts for Edge Function errors - they're handled gracefully
  const shouldShowToast = showToast &&
                         !silentInProduction &&
                         (!config.isProduction || !isSupabaseEdgeError);

  if (shouldShowToast) {
    if (config.isProduction) {
      // Production: User-friendly messages only (and only for non-Edge Function errors)
      if (isMissingConfig) {
        toast({
          title: 'Configuration Issue',
          description: 'Please contact support if this issue persists.',
          variant: 'destructive',
        });
      } else if (!isSupabaseEdgeError) {
        // Only show toast for non-Edge Function errors in production
        toast({
          title: 'Connection Failed',
          description: userMessage,
          variant: 'destructive',
        });
      }
    } else if (config.isStaging) {
      // Staging: Silent mode - no toasts, console logging only for debugging
      // This prevents user-facing popups while still providing detailed logs for developers
      // (Toast suppressed in staging to avoid bothering users while still debugging)
    } else {
      // Development: Show detailed errors for immediate debugging feedback
      // But only if explicitly requested (not silentInProduction)
      if (!silentInProduction) {
        toast({
          title: `${context} Error`,
          description: `${errorMessage} (Dev Mode)`,
          variant: 'destructive',
        });
      }
    }
  }

  return structuredError;
};

/**
 * Safe wrapper for Edge Function calls
 * Automatically handles errors according to environment
 */
export const safeEdgeFunctionCall = async <T>(
  functionCall: () => Promise<{ data: T | null; error: any }>,
  context: string,
  options: ErrorHandlingOptions = {}
): Promise<{ data: T | null; error: EdgeFunctionError | null }> => {
  try {
    const result = await functionCall();

    if (result.error) {
      // Mark error as handled to prevent duplicate global handling
      if (result.error && typeof result.error === 'object') {
        result.error._alreadyHandled = true;
      }

      const handledError = handleEdgeFunctionError(result.error, context, options);
      return { data: null, error: handledError };
    }

    return { data: result.data, error: null };
  } catch (error) {
    // Mark error as handled to prevent duplicate global handling
    if (error && typeof error === 'object') {
      (error as any)._alreadyHandled = true;
    }

    const handledError = handleEdgeFunctionError(error, context, options);
    return { data: null, error: handledError };
  }
};

/**
 * Report critical errors to admin (placeholder - implement with your preferred service)
 */
const reportErrorToAdmin = (error: EdgeFunctionError, context: string) => {
  // TODO: Implement with your error reporting service
  // Examples: Sentry, LogRocket, custom admin dashboard, email alerts

  // For now, log structured data that can be collected
  console.warn('[ADMIN ALERT]', {
    type: 'EDGE_FUNCTION_ERROR',
    context,
    error: {
      message: error.message,
      code: error.code,
      isUserFacing: error.isUserFacing
    },
    timestamp: new Date().toISOString(),
    environment: config.environment,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
};

/**
 * Environment-specific error messages
 */
export const getEnvironmentSpecificMessage = (
  defaultMessage: string,
  technicalDetails?: string
): string => {
  if (config.isProduction) {
    return defaultMessage;
  } else {
    return technicalDetails ? `${defaultMessage} (${technicalDetails})` : defaultMessage;
  }
};

/**
 * Check if error should be visible to user
 */
export const shouldShowErrorToUser = (error: EdgeFunctionError): boolean => {
  if (config.isProduction) {
    return error.isUserFacing !== false; // Show unless explicitly hidden
  } else {
    return true; // Show all errors in dev/staging
  }
};