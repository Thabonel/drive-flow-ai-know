// Service Worker for AI Query Hub Mobile Experience + ChunkLoadError Prevention
// Provides offline functionality for attention budget calculations and prevents chunk loading errors

const CACHE_VERSION = 'v4-mobile-chunks';
const CACHE_NAME = `ai-query-hub-${CACHE_VERSION}`;
const OFFLINE_CACHE = 'aiqueryhub-offline-v2';
const ATTENTION_DATA_CACHE = 'attention-data-v2';
const CHUNK_CACHE = 'aiqueryhub-chunks-v1';

// Resources to cache for offline functionality
const urlsToCache = [
  '/',
  '/timeline',
  '/attention-budget',
  '/team-dashboard',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing mobile attention features');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching critical resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME &&
                cacheName !== OFFLINE_CACHE &&
                cacheName !== ATTENTION_DATA_CACHE &&
                cacheName !== CHUNK_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle offline requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // Handle attention calculation requests
  if (url.pathname.includes('/functions/v1/attention-') ||
      url.pathname.includes('/attention-budget')) {
    event.respondWith(handleAttentionRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/functions/v1/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Special handling for JavaScript and CSS chunks
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      url.pathname.includes('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(handleChunkRequest(request));
    return;
  }

  // Network-first for HTML/navigation requests with chunk error recovery
  if (request.mode === 'navigate' ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      handleNavigationRequest(request)
    );
    return;
  }

  // Cache-first for static resources
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            return getOfflineFallback(request);
          });
      })
  );
});

// Handle attention calculation requests with offline fallback
async function handleAttentionRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache the response data
      const responseData = await response.clone().json();
      await cacheAttentionData(request.url, responseData);
      return response;
    }

    throw new Error('Network request failed');
  } catch (error) {
    // Fallback to cached data or offline calculation
    return await getOfflineAttentionResponse(request);
  }
}

// Handle general API requests
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);

    // Cache GET requests that succeed
    if (response.ok && request.method === 'GET') {
      const responseClone = response.clone();
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    // Try to return cached version
    const cache = await caches.open(OFFLINE_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline message
    return new Response(
      JSON.stringify({
        error: 'Offline - this feature requires internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// Handle JavaScript/CSS chunk requests with enhanced error recovery
async function handleChunkRequest(request) {
  const url = new URL(request.url);
  console.log('[SW] Handling chunk request:', url.pathname);

  try {
    // Try network first for chunks (they may have been updated)
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      console.log('[SW] Chunk loaded from network successfully');

      // Cache the successful response
      const cache = await caches.open(CHUNK_CACHE);
      await cache.put(request, networkResponse.clone());

      // Notify main thread of successful chunk load
      notifyAllClients({
        type: 'CHUNK_LOADED',
        url: request.url,
        cached: false
      });

      return networkResponse;
    } else {
      throw new Error(`Network response not ok: ${networkResponse.status}`);
    }

  } catch (networkError) {
    console.error('[SW] Chunk network request failed:', networkError);

    // Try cache as fallback
    const cache = await caches.open(CHUNK_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving chunk from cache');

      notifyAllClients({
        type: 'CHUNK_LOADED',
        url: request.url,
        cached: true
      });

      return cachedResponse;
    }

    // No cache available - this is a ChunkLoadError scenario
    console.error('[SW] Chunk not available in cache or network:', request.url);

    // Notify main thread of chunk load failure
    notifyAllClients({
      type: 'CHUNK_LOAD_ERROR',
      url: request.url,
      error: networkError.message,
      timestamp: Date.now()
    });

    // Trigger cache cleanup and reload after short delay
    setTimeout(() => {
      notifyAllClients({
        type: 'REQUEST_CACHE_CLEAR_AND_RELOAD',
        reason: 'chunk_load_failure'
      });
    }, 1000);

    throw networkError;
  }
}

// Handle navigation requests with chunk error recovery
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Navigation request failed:', error);

    // Check if we have a cached version
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving navigation from cache due to network error');
      return cachedResponse;
    }

    // No cache available - try to serve the main app shell
    const appShellResponse = await cache.match('/');
    if (appShellResponse) {
      console.log('[SW] Serving app shell as fallback for navigation');
      return appShellResponse;
    }

    return getOfflineFallback(request);
  }
}

// Cache attention calculation data
async function cacheAttentionData(url, data) {
  try {
    const cache = await caches.open(ATTENTION_DATA_CACHE);
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Timestamp': new Date().toISOString()
      }
    });
    await cache.put(url, response);
  } catch (error) {
    console.error('Failed to cache attention data:', error);
  }
}

// Get offline attention response
async function getOfflineAttentionResponse(request) {
  const url = new URL(request.url);

  // Try to get cached attention data
  const cache = await caches.open(ATTENTION_DATA_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const cachedData = await cachedResponse.json();
    const cacheTimestamp = cachedResponse.headers.get('Cache-Timestamp');

    if (cacheTimestamp) {
      const cacheAge = Date.now() - new Date(cacheTimestamp).getTime();
      if (cacheAge < 3600000) { // 1 hour
        return cachedResponse;
      }
    }
  }

  // Perform offline attention calculations
  if (url.pathname.includes('attention-budget') ||
      url.pathname.includes('attention-preferences')) {
    return await performOfflineAttentionCalculation(request);
  }

  // Default offline response
  return new Response(
    JSON.stringify({
      error: 'Offline mode - limited functionality available',
      offline: true,
      preferences: getDefaultAttentionPreferences()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}

// Perform offline attention budget calculations
async function performOfflineAttentionCalculation(request) {
  const url = new URL(request.url);

  // Get cached timeline data
  const timelineData = await getCachedTimelineData();
  const preferences = getDefaultAttentionPreferences();

  if (url.pathname.includes('attention-budget')) {
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const budgetAnalysis = calculateAttentionBudgetOffline(timelineData, preferences, date);

    return new Response(
      JSON.stringify({
        ...budgetAnalysis,
        offline: true,
        message: 'Calculated offline with cached data'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }

  if (url.pathname.includes('attention-preferences')) {
    return new Response(
      JSON.stringify({
        preferences: preferences,
        offline: true
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Unknown attention endpoint' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

// Calculate attention budget offline using cached timeline data
function calculateAttentionBudgetOffline(timelineData, preferences, date) {
  const dayItems = timelineData.filter(item => {
    const itemDate = new Date(item.start_time).toISOString().split('T')[0];
    return itemDate === date && item.attention_type;
  });

  // Calculate usage by attention type
  const usageByType = {
    create: 0,
    review: 0,
    admin: 0
  };

  let totalDuration = 0;
  let contextSwitches = 0;

  dayItems.forEach((item, index) => {
    if (item.attention_type && usageByType.hasOwnProperty(item.attention_type)) {
      usageByType[item.attention_type]++;
      totalDuration += item.duration_minutes || 60;
    }

    // Calculate context switches
    if (index > 0) {
      const prevItem = dayItems[index - 1];
      if (prevItem.attention_type !== item.attention_type) {
        contextSwitches++;
      }
    }
  });

  // Generate budget status
  const budgetStatus = Object.keys(usageByType).map(type => {
    const usage = usageByType[type];
    const budgetLimit = preferences.attention_budgets[type] || 3;
    const usagePercentage = Math.round((usage / budgetLimit) * 100);

    return {
      attention_type: type,
      items_count: usage,
      budget_limit: budgetLimit,
      usage_percentage: usagePercentage,
      is_over_budget: usage > budgetLimit,
      total_duration_minutes: dayItems
        .filter(item => item.attention_type === type)
        .reduce((sum, item) => sum + (item.duration_minutes || 60), 0)
    };
  });

  return {
    budget_status: budgetStatus,
    context_switches: {
      total: contextSwitches,
      budget: preferences.attention_budgets.context_switches || 3,
      is_over_budget: contextSwitches > (preferences.attention_budgets.context_switches || 3)
    },
    total_cognitive_load: totalDuration,
    date: date
  };
}

// Get cached timeline data from Cache API (localStorage not available in service workers)
async function getCachedTimelineData() {
  try {
    const cache = await caches.open(ATTENTION_DATA_CACHE);
    const cachedResponse = await cache.match('timeline-cache');

    if (cachedResponse) {
      return await cachedResponse.json();
    }
    return [];
  } catch (error) {
    console.error('Failed to get cached timeline data:', error);
    return [];
  }
}

// Cache timeline data using Cache API
async function cacheTimelineData(data) {
  try {
    const cache = await caches.open(ATTENTION_DATA_CACHE);
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Timestamp': new Date().toISOString()
      }
    });
    await cache.put('timeline-cache', response);
  } catch (error) {
    console.error('Failed to cache timeline data:', error);
  }
}

// Default attention preferences for offline mode
function getDefaultAttentionPreferences() {
  return {
    id: 'offline-default',
    user_id: 'offline-user',
    current_role: 'maker',
    current_zone: 'peacetime',
    attention_budgets: {
      create: 3,
      review: 4,
      admin: 2,
      context_switches: 3
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Get offline fallback for general requests
async function getOfflineFallback(request) {
  return new Response(
    JSON.stringify({
      error: 'You are offline. Please check your internet connection.',
      offline: true
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_TIMELINE_DATA':
      // Cache timeline data for offline calculations
      try {
        localStorage.setItem('timeline-cache', JSON.stringify(data));
        event.ports[0].postMessage({ success: true });
      } catch (error) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
      break;

    case 'GET_OFFLINE_STATUS':
      event.ports[0].postMessage({
        isOnline: navigator.onLine,
        cacheSize: getCacheSize()
      });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;

    case 'CHUNK_LOAD_ERROR_RECOVERY':
      // Handle chunk load error recovery from main app
      console.log('[SW] Received chunk load error recovery request');
      clearAllCaches().then(() => {
        // Notify all clients to reload after cache clear
        notifyAllClients({
          type: 'CACHE_CLEARED',
          reason: 'chunk_error_recovery',
          timestamp: Date.now()
        });

        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      }).catch((error) => {
        console.error('[SW] Failed to clear caches for chunk error recovery:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error.message });
        }
      });
      break;

    case 'SKIP_WAITING':
      // Force activation of new service worker
      console.log('[SW] Skipping waiting phase');
      self.skipWaiting();
      break;

    case 'GET_CACHE_INFO':
      // Return detailed cache information
      getCacheInfo().then(info => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true, data: info });
        }
      }).catch(error => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error.message });
        }
      });
      break;

    case 'CLEAR_CHUNK_CACHES':
      // Selective chunk cache clearing requested by main app
      console.log('[SW] Selective chunk cache clearing requested');
      clearChunkCaches(data?.chunkId).then(() => {
        notifyAllClients({
          type: 'CHUNK_CACHES_CLEARED',
          chunkId: data?.chunkId,
          timestamp: Date.now()
        });

        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      }).catch(error => {
        console.error('[SW] Failed to clear chunk caches:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error.message });
        }
      });
      break;
  }
});

// Get cache size information
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      totalSize += keys.length;
    }

    return totalSize;
  } catch (error) {
    return 0;
  }
}

// Get detailed cache information for debugging
async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      cacheInfo[cacheName] = {
        entryCount: keys.length,
        entries: keys.map(request => ({
          url: request.url,
          method: request.method
        })).slice(0, 10) // Limit to first 10 entries for performance
      };
    }

    return {
      caches: cacheInfo,
      totalCaches: cacheNames.length,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
  } catch (error) {
    return {
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// Clear all caches with enhanced chunk cache handling
async function clearAllCaches() {
  console.log('[SW] Clearing all caches including chunk cache...');

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => {
      console.log('[SW] Deleting cache:', cacheName);
      return caches.delete(cacheName);
    })
  );

  // Clear localStorage data
  try {
    localStorage.removeItem('timeline-cache');
    console.log('[SW] Cleared localStorage data');
  } catch (error) {
    console.log('[SW] Could not access localStorage:', error);
  }

  console.log('[SW] All caches cleared successfully');
}

// Clear only chunk-related caches (selective clearing)
async function clearChunkCaches(chunkId) {
  console.log('[SW] Clearing chunk-related caches...');

  const cacheNames = await caches.keys();
  const chunkCacheNames = cacheNames.filter(name =>
    name.includes('chunk') ||
    name.includes('assets') ||
    name.includes('js')
  );

  if (chunkId) {
    // Clear specific chunk from all caches
    for (const cacheName of cacheNames) {
      try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          if (request.url.includes(chunkId)) {
            await cache.delete(request);
            console.log(`[SW] Deleted specific chunk ${chunkId} from cache ${cacheName}`);
          }
        }
      } catch (error) {
        console.error(`[SW] Error clearing chunk ${chunkId} from cache ${cacheName}:`, error);
      }
    }
  } else {
    // Clear all chunk caches
    await Promise.all(
      chunkCacheNames.map(cacheName => {
        console.log('[SW] Deleting chunk cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }

  console.log(`[SW] Chunk cache clearing complete. ${chunkCacheNames.length} caches processed.`);
}

// Notify all clients of service worker events
async function notifyAllClients(message) {
  try {
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    });

    console.log(`[SW] Notifying ${clients.length} clients:`, message.type);

    clients.forEach(client => {
      try {
        client.postMessage(message);
      } catch (error) {
        console.error('[SW] Failed to notify client:', error);
      }
    });
  } catch (error) {
    console.error('[SW] Failed to get clients:', error);
  }
}

// Push notification handling for attention budget alerts
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body || 'Attention budget notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Budget',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ],
    requireInteraction: data.priority === 'high',
    tag: 'attention-budget'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Attention Budget Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;

  switch (action) {
    case 'view':
      event.waitUntil(
        clients.openWindow('/attention-budget')
      );
      break;
    case 'dismiss':
      // Just close the notification
      break;
    default:
      // Default click action
      event.waitUntil(
        clients.openWindow('/')
      );
      break;
  }
});

console.log('Service Worker: AI Query Hub Mobile Service Worker loaded');
