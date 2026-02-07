import { useEffect } from 'react';
import { cacheManager } from '@/lib/cache-manager';
import { errorReporter } from '@/lib/error-reporter';

/**
 * Global ChunkLoadError Handler Component
 *
 * This component sets up global error listeners to catch ChunkLoadError
 * that might not be caught by React ErrorBoundary (e.g., dynamic imports).
 *
 * It provides automatic retry with cache clearing for robust recovery.
 */

interface ChunkLoadErrorHandlerProps {
  onError?: (error: Error) => void;
}

export function ChunkLoadErrorHandler({ onError }: ChunkLoadErrorHandlerProps) {
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;

    // Progressive cache clearing strategy
    const handleChunkFailure = async () => {
      console.log('ChunkLoadErrorHandler: Starting progressive cache clearing...');

      try {
        // Start with selective chunk cache clearing (preserves user data)
        if (retryCount === 0) {
          console.log('ChunkLoadErrorHandler: Step 1 - Selective chunk cache clearing');
          await cacheManager.clearChunkCaches();
          cacheManager.clearChunkLocalStorage();
          cacheManager.clearChunkSessionStorage();
        } else if (retryCount === 1) {
          console.log('ChunkLoadErrorHandler: Step 2 - Emergency full cache clear');
          await cacheManager.emergencyFullClear();
        }

        console.log('ChunkLoadErrorHandler: Cache clearing complete');
        return true;
      } catch (error) {
        console.error('ChunkLoadErrorHandler: Error during cache clearing:', error);
        return false;
      }
    };

    // Handle unhandled promise rejections (failed dynamic imports)
    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Check if this is a ChunkLoadError
      const isChunkError = error?.message?.includes('Loading chunk') ||
                          error?.message?.includes('ChunkLoadError') ||
                          error?.name === 'ChunkLoadError' ||
                          // Network errors loading JS/CSS chunks
                          (error?.message?.includes('Failed to fetch') &&
                           (error?.stack?.includes('.js') || error?.stack?.includes('.css')));

      if (isChunkError && retryCount < maxRetries) {
        console.error('ChunkLoadErrorHandler: Unhandled ChunkLoadError detected:', {
          error: error?.message,
          stack: error?.stack,
          url: window.location.href,
          retryCount,
          timestamp: new Date().toISOString()
        });

        // Report chunk error with retry count
        errorReporter.reportSimpleChunkError(error, window.location.pathname, retryCount).catch(err => {
          console.warn('Failed to report chunk error:', err);
        });

        // Prevent the error from reaching the console
        event.preventDefault();

        retryCount++;

        // Clear caches and reload
        const cacheCleared = await handleChunkFailure();

        if (cacheCleared) {
          console.log('ChunkLoadErrorHandler: Reloading after cache clear...');
          window.location.reload();
        } else {
          console.log('ChunkLoadErrorHandler: Fallback reload...');
          window.location.href = window.location.href; // Hard navigation
        }

        // Call error callback if provided
        onError?.(error);
      }
    };

    // Handle regular JavaScript errors that might be chunk-related
    const handleError = async (event: ErrorEvent) => {
      const error = event.error;

      // Check for chunk loading errors in regular error events
      const isChunkError = error?.message?.includes('Loading chunk') ||
                          error?.message?.includes('ChunkLoadError') ||
                          event.message?.includes('Loading chunk') ||
                          // Network errors loading scripts
                          (event.message?.includes('Script error') &&
                           event.filename?.includes('.js'));

      if (isChunkError && retryCount < maxRetries) {
        console.error('ChunkLoadErrorHandler: Global ChunkLoadError detected:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: error?.message,
          retryCount,
          timestamp: new Date().toISOString()
        });

        retryCount++;

        // Clear caches and reload
        const cacheCleared = await handleChunkFailure();

        if (cacheCleared) {
          console.log('ChunkLoadErrorHandler: Reloading after cache clear...');
          window.location.reload();
        } else {
          console.log('ChunkLoadErrorHandler: Fallback reload...');
          window.location.href = window.location.href; // Hard navigation
        }

        // Call error callback if provided
        onError?.(error || new Error(event.message));
      }
    };

    // Set up global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [onError]);

  // This component doesn't render anything
  return null;
}