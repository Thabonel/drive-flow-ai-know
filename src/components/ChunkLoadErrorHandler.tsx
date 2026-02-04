import { useEffect } from 'react';

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

    // Comprehensive cache clearing function
    const clearAllCaches = async () => {
      console.log('ChunkLoadErrorHandler: Clearing all caches...');

      try {
        // 1. Clear all Cache API caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              console.log('Clearing cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        }

        // 2. Clear browser storage (localStorage, sessionStorage)
        localStorage.clear();
        sessionStorage.clear();

        // 3. Clear IndexedDB (best effort)
        if ('indexedDB' in window && indexedDB.databases) {
          try {
            const databases = await indexedDB.databases();
            await Promise.all(
              databases.map(db => {
                if (db.name) {
                  return new Promise<void>((resolve) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => resolve(); // Don't fail on this
                    deleteReq.onblocked = () => resolve(); // Handle blocked state
                  });
                }
              })
            );
          } catch (e) {
            console.log('Could not clear IndexedDB:', e);
          }
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

        // Prevent the error from reaching the console
        event.preventDefault();

        retryCount++;

        // Clear caches and reload
        const cacheCleared = await clearAllCaches();

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
        const cacheCleared = await clearAllCaches();

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