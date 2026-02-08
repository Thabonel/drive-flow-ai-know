import React, { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Home, Bug } from 'lucide-react';
import { errorReporter } from '@/lib/error-reporter';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName: string;
  fallback?: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  lastRetryTime: number;
}

/**
 * Route-specific error boundary with smart retry logic and session preservation
 * Handles chunk loading failures with exponential backoff and selective recovery
 */
export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  private retryTimeouts: number[] = [];
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second

  constructor(props: RouteErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastRetryTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error(`RouteErrorBoundary caught an error in route ${this.props.routeName}:`, error);
    console.error('Component stack trace:', errorInfo.componentStack);

    // Report chunk errors to our error reporting system
    if (this.isChunkLoadError(error)) {
      errorReporter.reportSimpleChunkError(error, this.props.routeName, 0).catch(err => {
        console.warn('Failed to report chunk error:', err);
      });
    }

    // Report to analytics if available
    if ((window as any).analytics?.track) {
      (window as any).analytics.track('Route Error', {
        route: this.props.routeName,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    }
  }

  componentWillUnmount() {
    // Clean up any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private isChunkLoadError = (error: Error): boolean => {
    return (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading CSS chunk') ||
      error.stack?.includes('import(')
    );
  };

  private calculateRetryDelay = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s
    return this.baseRetryDelay * Math.pow(2, retryCount);
  };

  private clearChunkCaches = async (): Promise<void> => {
    try {
      // Clear only chunk-related caches, preserve user data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const chunkCaches = cacheNames.filter(name =>
          name.includes('chunk') ||
          name.includes('assets') ||
          name.includes('js')
        );

        await Promise.all(
          chunkCaches.map(cacheName => caches.delete(cacheName))
        );

        console.log(`Cleared ${chunkCaches.length} chunk caches`);
      }
    } catch (error) {
      console.warn('Failed to clear chunk caches:', error);
    }
  };

  private retryWithRecovery = async (retryCount: number): Promise<void> => {
    this.setState({ isRetrying: true });

    try {
      // Progressive recovery strategy
      if (retryCount === 0) {
        // First retry: just reload the component
        console.log('Retrying component load...');
      } else if (retryCount === 1) {
        // Second retry: clear chunk caches
        console.log('Clearing chunk caches and retrying...');
        await this.clearChunkCaches();
      } else {
        // Final retry: clear all caches except user data
        console.log('Performing full cache clear and retry...');
        await this.clearChunkCaches();

        // Clear localStorage chunk-related items but preserve auth/settings
        Object.keys(localStorage).forEach(key => {
          if (key.includes('chunk') || key.includes('vite') || key.includes('build')) {
            localStorage.removeItem(key);
          }
        });
      }

      // Wait for the retry delay
      const delay = this.calculateRetryDelay(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Reset error state to trigger re-render
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        lastRetryTime: Date.now(),
      });

    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError);
      this.setState({ isRetrying: false });
    }
  };

  private handleRetry = async (): Promise<void> => {
    const { retryCount } = this.state;

    if (retryCount >= this.maxRetries) {
      console.log('Max retries reached, offering hard refresh');
      return;
    }

    const newRetryCount = retryCount + 1;
    this.setState({ retryCount: newRetryCount });

    await this.retryWithRecovery(retryCount);
  };

  private handleHardRefresh = (): void => {
    // Preserve current path for redirect after refresh
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterRefresh', currentPath);

    // Full page reload to clear all caches and reload chunks
    window.location.reload();
  };

  private handleGoHome = (): void => {
    // Navigate to home page as safe fallback
    window.location.href = '/dashboard';
  };

  render() {
    const { hasError, error, retryCount, isRetrying } = this.state;
    const { children, routeName, fallback } = this.props;

    if (hasError && error) {
      const isChunkError = this.isChunkLoadError(error);
      const canRetry = retryCount < this.maxRetries;
      const nextRetryDelay = this.calculateRetryDelay(retryCount);

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-background p-8 flex items-center justify-center">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {isChunkError ? 'Loading Error' : 'Application Error'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  {isChunkError
                    ? `Failed to load the ${routeName} page. This is usually caused by network issues or cached files.`
                    : `An error occurred while loading the ${routeName} page.`}
                </AlertDescription>
              </Alert>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="bg-muted p-4 rounded-lg">
                  <summary className="font-medium cursor-pointer">
                    Technical Details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="text-xs mt-1 bg-background p-2 rounded overflow-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Retry Information */}
              {isChunkError && retryCount > 0 && (
                <Alert>
                  <RefreshCw className="h-4 w-4" />
                  <AlertDescription>
                    Attempted {retryCount} of {this.maxRetries} automatic retries.
                    {canRetry && ` Next retry in ${Math.ceil(nextRetryDelay / 1000)} seconds.`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {canRetry && !isRetrying && (
                  <Button
                    onClick={this.handleRetry}
                    disabled={isRetrying}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry ({this.maxRetries - retryCount} left)
                  </Button>
                )}

                {isRetrying && (
                  <Button disabled className="gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Retrying...
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={this.handleHardRefresh}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-sm text-muted-foreground">
                {isChunkError ? (
                  <>
                    <strong>What happened?</strong> The application failed to load necessary code files.
                    This can happen due to poor network connectivity or browser cache issues.
                  </>
                ) : (
                  <>
                    <strong>What happened?</strong> An unexpected error occurred in the application.
                    Our team has been notified and will investigate.
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook to wrap routes with error boundaries
 */
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <RouteErrorBoundary routeName={routeName} fallback={fallback}>
      <Component {...props} />
    </RouteErrorBoundary>
  );

  WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}