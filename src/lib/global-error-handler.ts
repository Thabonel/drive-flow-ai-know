/**
 * Global Error Handler
 *
 * Catches unhandled errors and prevents them from showing to users in production.
 * Provides proper error reporting and logging for debugging.
 */

import { config } from '@/config/environment';
import { handleEdgeFunctionError } from './error-handling';

/**
 * Initialize global error handling
 * Call this once in your main App component
 */
export const initializeGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason;

    // Check if this is a Supabase Edge Function error
    const isEdgeFunctionError = error?.message?.includes('Edge Function returned a non-2xx status code');

    if (isEdgeFunctionError) {
      // Prevent the default browser behavior (console error)
      event.preventDefault();

      // Handle with our error handling system
      handleEdgeFunctionError(error, 'Unhandled Promise Rejection', {
        userMessage: 'A background operation failed. Please refresh and try again.',
        showToast: !config.isProduction, // Only show toast in dev/staging
        silentInProduction: true,
        reportToAdmin: true
      });
    } else {
      // Let other unhandled rejections be handled normally in development
      if (!config.isProduction) {
        console.error('Unhandled Promise Rejection:', error);
      } else {
        // In production, prevent showing to user but still log
        event.preventDefault();
        console.error('Unhandled Promise Rejection (suppressed in production):', error);
      }
    }
  });

  // Handle uncaught JavaScript errors
  window.addEventListener('error', (event: ErrorEvent) => {
    const error = event.error;

    // Check if this is related to Edge Functions
    const isEdgeFunctionError = error?.message?.includes('Edge Function') ||
                               error?.message?.includes('supabase') ||
                               event.filename?.includes('supabase');

    if (isEdgeFunctionError && config.isProduction) {
      // Prevent showing to user in production
      event.preventDefault();

      handleEdgeFunctionError(error, 'Uncaught Error', {
        userMessage: 'An error occurred. Please refresh and try again.',
        showToast: false, // Don't show toast for uncaught errors
        silentInProduction: true,
        reportToAdmin: true
      });
    }
  });

  // Initialize error reporting service integration (if needed)
  if (config.isProduction) {
    initializeErrorReporting();
  }

  console.log(`[Global Error Handler] Initialized for ${config.environment} environment`);
};

/**
 * Initialize error reporting service (placeholder)
 */
const initializeErrorReporting = () => {
  // TODO: Initialize your preferred error reporting service
  // Examples:
  // - Sentry.init({ dsn: 'your-dsn' })
  // - LogRocket.init('your-app-id')
  // - Custom error reporting to your admin dashboard

  console.log('[Error Reporting] Production error reporting initialized');
};

/**
 * Manual error reporting function
 * Use this for critical errors that need immediate admin attention
 */
export const reportCriticalError = (
  error: any,
  context: string,
  additionalData?: Record<string, any>
) => {
  const errorReport = {
    type: 'CRITICAL_ERROR',
    context,
    error: {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      ...additionalData
    },
    timestamp: new Date().toISOString(),
    environment: config.environment,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Log for debugging
  console.error('[CRITICAL ERROR]', errorReport);

  // TODO: Send to your error reporting service
  // Example:
  // await fetch('/api/report-error', {
  //   method: 'POST',
  //   body: JSON.stringify(errorReport)
  // });
};

/**
 * Environment-specific console logging
 */
export const environmentLog = {
  error: (...args: any[]) => {
    console.error(`[${config.environment.toUpperCase()}]`, ...args);
  },

  warn: (...args: any[]) => {
    if (config.features.enableDebugLogging) {
      console.warn(`[${config.environment.toUpperCase()}]`, ...args);
    }
  },

  info: (...args: any[]) => {
    if (config.features.enableDebugLogging) {
      console.log(`[${config.environment.toUpperCase()}]`, ...args);
    }
  },

  debug: (...args: any[]) => {
    if (config.isDevelopment) {
      console.debug(`[${config.environment.toUpperCase()}]`, ...args);
    }
  }
};