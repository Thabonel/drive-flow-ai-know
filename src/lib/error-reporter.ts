import { supabase } from '@/integrations/supabase/client';

export interface ChunkLoadError {
  error: Error;
  chunkId?: string;
  route?: string;
  retryCount: number;
  userAgent: string;
  networkConditions?: {
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
    saveData?: boolean;
  };
  performanceMetrics?: {
    timing: PerformanceTiming;
    navigation: PerformanceNavigation;
  };
  buildInfo?: {
    timestamp: string;
    commitHash?: string;
  };
}

export interface ErrorReport {
  error_type: 'chunk_load_failure';
  error_message: string;
  error_stack?: string;
  chunk_id?: string;
  route?: string;
  retry_count: number;
  user_agent: string;
  network_conditions?: any;
  performance_metrics?: any;
  build_info?: any;
  timestamp: string;
  user_id?: string;
}

/**
 * Reports chunk loading errors to Supabase for monitoring and analysis
 */
export class ErrorReporter {
  private static instance: ErrorReporter;

  private constructor() {}

  public static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * Collects network condition information if available
   */
  private getNetworkConditions() {
    try {
      // @ts-ignore - NetworkInformation API may not be available in all browsers
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (connection) {
        return {
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          saveData: connection.saveData,
        };
      }
    } catch (error) {
      console.debug('Network conditions not available:', error);
    }
    return undefined;
  }

  /**
   * Collects performance metrics if available
   */
  private getPerformanceMetrics() {
    try {
      if ('performance' in window) {
        return {
          timing: performance.timing ? {
            navigationStart: performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd,
            domComplete: performance.timing.domComplete,
            domInteractive: performance.timing.domInteractive,
          } : undefined,
          navigation: performance.navigation ? {
            type: performance.navigation.type,
            redirectCount: performance.navigation.redirectCount,
          } : undefined,
        };
      }
    } catch (error) {
      console.debug('Performance metrics not available:', error);
    }
    return undefined;
  }

  /**
   * Attempts to extract build information from the current deployment
   */
  private getBuildInfo() {
    try {
      // Try to get build timestamp from meta tag or environment
      const buildTimestamp = document.querySelector('meta[name="build-timestamp"]')?.getAttribute('content') ||
                           import.meta.env.VITE_BUILD_TIMESTAMP ||
                           new Date().toISOString();

      const commitHash = document.querySelector('meta[name="commit-hash"]')?.getAttribute('content') ||
                        import.meta.env.VITE_COMMIT_HASH;

      return {
        timestamp: buildTimestamp,
        commitHash,
      };
    } catch (error) {
      console.debug('Build info not available:', error);
      return undefined;
    }
  }

  /**
   * Extracts chunk ID from error message or stack trace
   */
  private extractChunkId(error: Error): string | undefined {
    try {
      const message = error.message;
      const stack = error.stack;

      // Try to extract chunk ID from common patterns
      const chunkPatterns = [
        /Loading chunk (\w+-\w+) failed/,
        /Failed to fetch dynamically imported module.*\/assets\/([^\/]+\.js)/,
        /ChunkLoadError.*?([a-zA-Z0-9-_]+\.js)/,
        /\/assets\/([^\/\s]+\.js)/
      ];

      for (const pattern of chunkPatterns) {
        const messageMatch = message.match(pattern);
        if (messageMatch && messageMatch[1]) {
          return messageMatch[1];
        }

        if (stack) {
          const stackMatch = stack.match(pattern);
          if (stackMatch && stackMatch[1]) {
            return stackMatch[1];
          }
        }
      }

      return undefined;
    } catch (error) {
      console.debug('Failed to extract chunk ID:', error);
      return undefined;
    }
  }

  /**
   * Reports a chunk loading error to Supabase
   */
  public async reportChunkError(chunkError: ChunkLoadError): Promise<void> {
    try {
      // Get current user if available
      const { data: { user } } = await supabase.auth.getUser();

      const report: ErrorReport = {
        error_type: 'chunk_load_failure',
        error_message: chunkError.error.message,
        error_stack: chunkError.error.stack,
        chunk_id: chunkError.chunkId || this.extractChunkId(chunkError.error),
        route: chunkError.route || window.location.pathname,
        retry_count: chunkError.retryCount,
        user_agent: chunkError.userAgent,
        network_conditions: chunkError.networkConditions || this.getNetworkConditions(),
        performance_metrics: chunkError.performanceMetrics || this.getPerformanceMetrics(),
        build_info: chunkError.buildInfo || this.getBuildInfo(),
        timestamp: new Date().toISOString(),
        user_id: user?.id,
      };

      // Insert error report into Supabase
      const { error } = await supabase
        .from('error_logs')
        .insert(report);

      if (error) {
        console.error('Failed to report chunk error to Supabase:', error);
      } else {
        console.log('Chunk error reported successfully');
      }

    } catch (error) {
      console.error('Error reporting chunk failure:', error);
    }
  }

  /**
   * Reports a chunk error with minimal information (for use in error boundaries)
   */
  public async reportSimpleChunkError(
    error: Error,
    route?: string,
    retryCount: number = 0
  ): Promise<void> {
    const chunkError: ChunkLoadError = {
      error,
      route,
      retryCount,
      userAgent: navigator.userAgent,
    };

    await this.reportChunkError(chunkError);
  }

  /**
   * Analyzes error trends and provides insights
   */
  public async analyzeErrorTrends(timeRange: '1h' | '1d' | '7d' = '1h'): Promise<{
    totalErrors: number;
    errorsByChunk: Record<string, number>;
    errorsByRoute: Record<string, number>;
    topFailingChunks: Array<{ chunk: string; count: number }>;
  }> {
    try {
      const hoursAgo = timeRange === '1h' ? 1 : timeRange === '1d' ? 24 : 168;
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('error_logs')
        .select('chunk_id, route, timestamp')
        .eq('error_type', 'chunk_load_failure')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Failed to fetch error trends:', error);
        return {
          totalErrors: 0,
          errorsByChunk: {},
          errorsByRoute: {},
          topFailingChunks: [],
        };
      }

      const errors = data || [];
      const errorsByChunk: Record<string, number> = {};
      const errorsByRoute: Record<string, number> = {};

      errors.forEach(err => {
        if (err.chunk_id) {
          errorsByChunk[err.chunk_id] = (errorsByChunk[err.chunk_id] || 0) + 1;
        }
        if (err.route) {
          errorsByRoute[err.route] = (errorsByRoute[err.route] || 0) + 1;
        }
      });

      const topFailingChunks = Object.entries(errorsByChunk)
        .map(([chunk, count]) => ({ chunk, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalErrors: errors.length,
        errorsByChunk,
        errorsByRoute,
        topFailingChunks,
      };

    } catch (error) {
      console.error('Error analyzing error trends:', error);
      return {
        totalErrors: 0,
        errorsByChunk: {},
        errorsByRoute: {},
        topFailingChunks: [],
      };
    }
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();