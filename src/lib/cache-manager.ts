/**
 * Smart cache management system for selective cache clearing
 * Preserves user data while clearing chunk-related caches
 */

interface CacheInfo {
  name: string;
  type: 'chunk' | 'asset' | 'api' | 'user' | 'unknown';
  size?: number;
}

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Analyzes available caches and categorizes them
   */
  public async analyzeCaches(): Promise<CacheInfo[]> {
    if (!('caches' in window)) {
      console.warn('Cache API not available');
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfos: CacheInfo[] = [];

      for (const cacheName of cacheNames) {
        const cacheInfo: CacheInfo = {
          name: cacheName,
          type: this.categorizeCacheName(cacheName),
        };

        try {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          cacheInfo.size = requests.length;
        } catch (error) {
          console.warn(`Failed to analyze cache ${cacheName}:`, error);
        }

        cacheInfos.push(cacheInfo);
      }

      return cacheInfos;
    } catch (error) {
      console.error('Failed to analyze caches:', error);
      return [];
    }
  }

  /**
   * Categorizes cache by name patterns
   */
  private categorizeCacheName(cacheName: string): CacheInfo['type'] {
    const lowerName = cacheName.toLowerCase();

    // Chunk and asset related caches
    if (
      lowerName.includes('chunk') ||
      lowerName.includes('assets') ||
      lowerName.includes('js-') ||
      lowerName.includes('css-') ||
      lowerName.includes('vite') ||
      lowerName.includes('build') ||
      lowerName.includes('static')
    ) {
      return 'chunk';
    }

    // API and data caches
    if (
      lowerName.includes('api') ||
      lowerName.includes('supabase') ||
      lowerName.includes('query') ||
      lowerName.includes('fetch')
    ) {
      return 'api';
    }

    // User data caches
    if (
      lowerName.includes('user') ||
      lowerName.includes('auth') ||
      lowerName.includes('session') ||
      lowerName.includes('profile')
    ) {
      return 'user';
    }

    // Asset caches (images, fonts, etc.)
    if (
      lowerName.includes('image') ||
      lowerName.includes('font') ||
      lowerName.includes('media') ||
      lowerName.includes('asset')
    ) {
      return 'asset';
    }

    return 'unknown';
  }

  /**
   * Clears only chunk-related caches, preserving user data
   */
  public async clearChunkCaches(): Promise<void> {
    console.log('🧹 Starting selective cache clearing...');

    const cacheInfos = await this.analyzeCaches();
    const chunkCaches = cacheInfos.filter(cache => cache.type === 'chunk');

    if (chunkCaches.length === 0) {
      console.log('ℹ️ No chunk caches found to clear');
      return;
    }

    const results = await Promise.allSettled(
      chunkCaches.map(async (cacheInfo) => {
        try {
          const deleted = await caches.delete(cacheInfo.name);
          if (deleted) {
            console.log(`✅ Cleared cache: ${cacheInfo.name} (${cacheInfo.size} entries)`);
          } else {
            console.warn(`⚠️ Failed to delete cache: ${cacheInfo.name}`);
          }
          return { success: deleted, name: cacheInfo.name };
        } catch (error) {
          console.error(`❌ Error clearing cache ${cacheInfo.name}:`, error);
          return { success: false, name: cacheInfo.name, error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`🧹 Cache clearing complete: ${successful} cleared, ${failed} failed`);
  }

  /**
   * Clears localStorage items related to chunks and build artifacts
   * Preserves authentication tokens, user settings, and application state
   */
  public clearChunkLocalStorage(): void {
    console.log('🧹 Clearing chunk-related localStorage...');

    const keysToRemove: string[] = [];

    // Scan localStorage for chunk-related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const lowerKey = key.toLowerCase();

      // Target chunk and build-related keys
      if (
        lowerKey.includes('chunk') ||
        lowerKey.includes('vite') ||
        lowerKey.includes('build') ||
        lowerKey.includes('hot-reload') ||
        lowerKey.includes('dev-server') ||
        lowerKey.startsWith('__vite') ||
        lowerKey.includes('dynamic-import') ||
        lowerKey.includes('module-cache')
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove identified keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove localStorage key ${key}:`, error);
      }
    });

    if (keysToRemove.length === 0) {
      console.log('ℹ️ No chunk-related localStorage items found');
    } else {
      console.log(`🧹 Removed ${keysToRemove.length} localStorage items`);
    }
  }

  /**
   * Clears sessionStorage items related to chunks
   * Preserves navigation state and temporary user data
   */
  public clearChunkSessionStorage(): void {
    console.log('🧹 Clearing chunk-related sessionStorage...');

    const keysToRemove: string[] = [];

    // Scan sessionStorage for chunk-related keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;

      const lowerKey = key.toLowerCase();

      // Target chunk and build-related keys (be more conservative with sessionStorage)
      if (
        lowerKey.includes('chunk-error') ||
        lowerKey.includes('dynamic-import-failed') ||
        lowerKey.includes('module-load-error')
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove identified keys
    keysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed sessionStorage: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to remove sessionStorage key ${key}:`, error);
      }
    });

    if (keysToRemove.length === 0) {
      console.log('ℹ️ No chunk-related sessionStorage items found');
    } else {
      console.log(`🧹 Removed ${keysToRemove.length} sessionStorage items`);
    }
  }

  /**
   * Progressive recovery strategy for chunk load failures
   */
  public async recoverFromChunkFailure(chunkId: string): Promise<void> {
    console.log(`🔧 Starting recovery for chunk: ${chunkId}`);

    try {
      // Step 1: Clear chunk caches
      await this.clearChunkCaches();

      // Step 2: Clear localStorage chunk data
      this.clearChunkLocalStorage();

      // Step 3: Clear sessionStorage chunk data
      this.clearChunkSessionStorage();

      // Step 4: If service worker is active, ask it to clear caches too
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEAR_CHUNK_CACHES',
            chunkId,
          });
          console.log('📨 Requested service worker to clear chunk caches');
        } catch (error) {
          console.warn('Failed to communicate with service worker:', error);
        }
      }

      console.log('✅ Chunk recovery strategy completed');

    } catch (error) {
      console.error('❌ Chunk recovery failed:', error);
      throw error;
    }
  }

  /**
   * Emergency full cache clear (preserves only essential user data)
   */
  public async emergencyFullClear(): Promise<void> {
    console.warn('🚨 Starting emergency full cache clear...');

    // Preserve critical user data
    const preservedData = {
      auth: localStorage.getItem('supabase.auth.token'),
      refreshToken: localStorage.getItem('supabase.auth.refresh-token'),
      userSettings: localStorage.getItem('user-settings'),
      theme: localStorage.getItem('theme'),
      language: localStorage.getItem('language'),
    };

    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.allSettled(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log(`🧹 Cleared all ${cacheNames.length} caches`);
      }

      // Clear all localStorage
      localStorage.clear();

      // Clear all sessionStorage
      sessionStorage.clear();

      // Restore critical user data
      Object.entries(preservedData).forEach(([key, value]) => {
        if (value !== null) {
          if (key.startsWith('supabase') || key === 'auth' || key === 'refreshToken') {
            localStorage.setItem(`supabase.auth.${key.replace('supabase.auth.', '')}`, value);
          } else {
            localStorage.setItem(key, value);
          }
        }
      });

      console.log('✅ Emergency cache clear completed, user data preserved');

    } catch (error) {
      console.error('❌ Emergency cache clear failed:', error);
      throw error;
    }
  }

  /**
   * Reports current cache status for debugging
   */
  public async getCacheReport(): Promise<{
    total: number;
    byType: Record<string, number>;
    details: CacheInfo[];
  }> {
    const cacheInfos = await this.analyzeCaches();

    const byType = cacheInfos.reduce((acc, cache) => {
      acc[cache.type] = (acc[cache.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: cacheInfos.length,
      byType,
      details: cacheInfos,
    };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();