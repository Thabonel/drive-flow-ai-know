import { useEffect } from 'react';

/**
 * Service Worker Manager Component
 *
 * Handles service worker registration and communication for:
 * - ChunkLoadError prevention and recovery
 * - Cache management
 * - Offline functionality
 * - App update notifications
 */

interface ServiceWorkerManagerProps {
  onChunkError?: (error: any) => void;
  onUpdateAvailable?: () => void;
  onOfflineReady?: () => void;
}

export function ServiceWorkerManager({
  onChunkError,
  onUpdateAvailable,
  onOfflineReady
}: ServiceWorkerManagerProps) {

  useEffect(() => {
    // Only register service worker in production or when explicitly enabled
    if (!('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service workers not supported');
      return;
    }

    registerServiceWorker();

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[SW Manager] Registering service worker...');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW Manager] Service worker registered successfully');

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('[SW Manager] New service worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW Manager] New service worker installed, update available');
              onUpdateAvailable?.();
            }
          });
        }
      });

      // Check if service worker is already controlling the page
      if (navigator.serviceWorker.controller) {
        console.log('[SW Manager] Service worker is controlling the page');
        onOfflineReady?.();
      }

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Manager] Service worker controller changed, reloading page');
        window.location.reload();
      });

    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error);
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, ...data } = event.data;

    console.log('[SW Manager] Received message from service worker:', type, data);

    switch (type) {
      case 'CHUNK_LOADED':
        console.log('[SW Manager] Chunk loaded successfully:', data.url);
        break;

      case 'CHUNK_LOAD_ERROR':
        console.error('[SW Manager] Chunk load error detected:', data);
        onChunkError?.(data);
        break;

      case 'REQUEST_CACHE_CLEAR_AND_RELOAD':
        console.log('[SW Manager] Service worker requesting cache clear and reload');
        handleCacheClearAndReload(data.reason);
        break;

      case 'CACHE_CLEARED':
        console.log('[SW Manager] Caches cleared by service worker:', data.reason);
        // Optionally reload the page after cache clear
        if (data.reason === 'chunk_error_recovery') {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        break;

      default:
        console.log('[SW Manager] Unhandled service worker message:', type, data);
    }
  };

  const handleCacheClearAndReload = async (reason: string) => {
    console.log(`[SW Manager] Handling cache clear and reload for reason: ${reason}`);

    try {
      // Send message to service worker to clear caches
      await sendMessageToServiceWorker({
        type: 'CHUNK_LOAD_ERROR_RECOVERY'
      });

      // Also clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      console.log('[SW Manager] Local storage cleared, reloading page...');

      // Force reload with cache bypass
      window.location.reload();

    } catch (error) {
      console.error('[SW Manager] Failed to clear caches:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  // This component doesn't render anything
  return null;
}

/**
 * Utility Functions for Service Worker Communication
 */

// Send message to service worker
export async function sendMessageToServiceWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller available'));
      return;
    }

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    messageChannel.port1.onmessageerror = (error) => {
      reject(error);
    };

    try {
      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    } catch (error) {
      reject(error);
    }
  });
}

// Get cache information from service worker
export async function getCacheInfo(): Promise<any> {
  return sendMessageToServiceWorker({ type: 'GET_CACHE_INFO' });
}

// Clear all caches via service worker
export async function clearAllCaches(): Promise<any> {
  return sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
}

// Get offline status from service worker
export async function getOfflineStatus(): Promise<any> {
  return sendMessageToServiceWorker({ type: 'GET_OFFLINE_STATUS' });
}

// Force service worker to skip waiting and activate
export async function skipWaiting(): Promise<void> {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

// React hook for service worker functionality
export function useServiceWorker() {
  const clearCaches = async () => {
    try {
      await clearAllCaches();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return { success: false, error };
    }
  };

  const getCaches = async () => {
    try {
      const info = await getCacheInfo();
      return { success: true, data: info };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return { success: false, error };
    }
  };

  const getStatus = async () => {
    try {
      const status = await getOfflineStatus();
      return { success: true, data: status };
    } catch (error) {
      console.error('Failed to get offline status:', error);
      return { success: false, error };
    }
  };

  return {
    clearCaches,
    getCaches,
    getStatus,
    skipWaiting
  };
}