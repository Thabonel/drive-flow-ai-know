import React, { ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

// Environment debugger component
function EnvironmentDebugger() {
  const envVars = {
    'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'VITE_SUPABASE_PUBLISHABLE_KEY': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  const hasIssues = Object.values(envVars).some(value => !value);

  // Don't show in production unless there are issues
  if (!hasIssues && import.meta.env.PROD) {
    return null;
  }

  return (
    <Alert variant={hasIssues ? 'destructive' : 'default'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Environment Configuration</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1 text-sm font-mono">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-muted-foreground">{key}:</span>
                <span className={value ? 'text-green-600' : 'text-red-600'}>
                  {value ? '✓ Set' : '✗ Missing'}
                </span>
              </div>
            ))}
          </div>
          {hasIssues && (
            <div className="text-sm mt-2 space-y-1">
              <p>Missing environment variables detected.</p>
              <p>Check your <code className="bg-muted px-1 rounded">.env</code> file or deployment configuration.</p>
            </div>
          )}
          {!hasIssues && !import.meta.env.PROD && (
            <p className="text-sm text-green-600">All environment variables are properly configured.</p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isChunkLoadError?: boolean;
  isSilentlyReloading?: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0, isChunkLoadError: false, isSilentlyReloading: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Don't show error UI for navigation errors - they will auto-retry
    const isNavigationError = error.message?.includes('426') ||
                              error.message?.includes('SUPABASE');

    // Detect ChunkLoadError and other module loading failures - auto-handle these silently
    const isChunkLoadError = error.message?.includes('ChunkLoadError') ||
                            error.message?.includes('Loading chunk') ||
                            error.message?.includes('Loading CSS chunk') ||
                            error.message?.includes('Failed to fetch dynamically imported module') ||
                            error.message?.includes('Failed to import') ||
                            error.message?.includes('Cannot resolve module') ||
                            error.name === 'ChunkLoadError' ||
                            // React minified error #310 pattern
                            (error.message?.includes('Minified React error #310') ||
                             window.location.href.includes('invariant=310'));

    if (isNavigationError) {
      console.log('Navigation error detected, will auto-retry without showing error UI');
      return { hasError: false, error, retryCount: 0 };
    }

    if (isChunkLoadError) {
      console.log('ChunkLoadError detected, will handle silently with immediate cache clear and reload');
      // Don't show error UI for chunk load errors - handle silently
      return { hasError: false, error, retryCount: 0, isChunkLoadError: true };
    }

    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Detect ChunkLoadError and other module loading failures (React error #310)
    const isChunkLoadError = error.message?.includes('ChunkLoadError') ||
                            error.message?.includes('Loading chunk') ||
                            error.message?.includes('Loading CSS chunk') ||
                            error.message?.includes('Failed to fetch dynamically imported module') ||
                            error.message?.includes('Failed to import') ||
                            error.message?.includes('Cannot resolve module') ||
                            error.name === 'ChunkLoadError' ||
                            // React minified error #310 pattern
                            (error.message?.includes('Minified React error #310') ||
                             window.location.href.includes('invariant=310'));

    // Enhanced logging for cascade failures
    if (error.message?.includes('Export') || error.message?.includes('import')) {
      console.error('Possible module loading cascade failure detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    // Handle ChunkLoadError with automatic cache clearing
    if (isChunkLoadError) {
      console.error('ChunkLoadError detected:', {
        error: error.message,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // For chunk load errors, show minimal loading state while clearing cache
      console.log('Handling chunk load error silently - clearing cache and reloading immediately...');
      this.setState({ isSilentlyReloading: true });
      this.handleChunkLoadError();

      this.props.onError?.(error, errorInfo);
      return;
    }

    // Auto-retry once for navigation-related errors (e.g., React error #426)
    const isNavigationError = error.message?.includes('426') ||
                              (error.message?.includes('SUPABASE') && this.state.retryCount === 0);

    if (isNavigationError && this.state.retryCount < 1) {
      console.log('Auto-retrying navigation error...');
      // Navigation errors don't show UI (handled in getDerivedStateFromError)
      // Just increment retry count and let it resolve naturally
      setTimeout(() => {
        this.setState({
          retryCount: this.state.retryCount + 1
        });
      }, 0);
      return;
    }

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: this.state.retryCount + 1,
      isChunkLoadError: false,
      isSilentlyReloading: false
    });
  };

  // Comprehensive cache clearing for ChunkLoadError
  private handleChunkLoadError = async () => {
    console.log('Handling ChunkLoadError with comprehensive cache clearing...');

    try {
      // 1. Clear all caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // 2. Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // 3. Clear IndexedDB if possible (best effort)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases?.() || [];
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                return new Promise((resolve) => {
                  deleteReq.onsuccess = () => resolve(undefined);
                  deleteReq.onerror = () => resolve(undefined); // Don't fail on this
                });
              }
            })
          );
        } catch (e) {
          console.log('Could not clear IndexedDB, continuing anyway');
        }
      }

      console.log('Cache clearing complete, reloading application...');

      // 4. Force hard reload with cache bypass
      window.location.reload();

    } catch (error) {
      console.error('Error during cache clearing:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  render() {
    // Show minimal loading screen during silent reload (no error messaging)
    if (this.state.isSilentlyReloading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Only show initialization error for actual configuration problems
      const isModuleLoadingError = (this.state.error?.message?.includes('Export') ||
                                   this.state.error?.message?.includes('import')) &&
                                   !window.location.href.includes('/auth');

      // Detect chunk load errors for specific messaging
      const isChunkError = this.state.isChunkLoadError ||
                          this.state.error?.message?.includes('ChunkLoadError') ||
                          this.state.error?.message?.includes('Loading chunk') ||
                          this.state.error?.message?.includes('Minified React error #310');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-6 w-6 mr-3" />
                {isChunkError
                  ? 'Application Update Required'
                  : isModuleLoadingError
                    ? 'Application Initialization Error'
                    : 'Something went wrong'
                }
              </CardTitle>
              <CardDescription>
                {isChunkError
                  ? 'The application has been updated and requires a cache refresh. We\'re automatically clearing the cache and reloading...'
                  : isModuleLoadingError
                    ? 'The application failed to initialize properly. This is typically caused by missing or invalid configuration.'
                    : 'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isChunkError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Automatic Cache Refresh in Progress</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="text-sm">
                        The application was updated while you were using it. We're automatically:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Clearing browser cache and stored data</li>
                        <li>• Reloading with the latest version</li>
                        <li>• This should resolve the loading issue</li>
                      </ul>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">Refreshing application...</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!isChunkError && (
                <Alert variant={isModuleLoadingError ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Details</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="text-sm bg-muted/50 p-3 rounded font-mono">
                        {this.state.error?.message || 'Unknown error occurred'}
                      </div>
                      {isModuleLoadingError && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Common causes:</p>
                          <ul className="text-sm space-y-1 ml-4">
                            <li>• Missing environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)</li>
                            <li>• Invalid Supabase configuration</li>
                            <li>• Module loading cascade failure</li>
                            <li>• Build or deployment issues</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <EnvironmentDebugger />

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Development Debug Info</AlertTitle>
                  <AlertDescription>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium mb-2">
                        Component Stack Trace
                      </summary>
                      <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                    {this.state.error?.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium mb-2">
                          Error Stack Trace
                        </summary>
                        <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {isChunkError ? (
                  // Special buttons for chunk errors
                  <>
                    <Button onClick={this.handleChunkLoadError} className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Force Refresh Now</span>
                    </Button>
                    <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center space-x-2">
                      <span>Simple Reload</span>
                    </Button>
                  </>
                ) : (
                  // Normal error buttons
                  <>
                    <Button onClick={() => window.location.reload()} className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Reload Application</span>
                    </Button>

                    <Button variant="outline" onClick={this.handleRetry} className="flex items-center space-x-2">
                      <span>Try Again</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => window.open('https://github.com/anthropics/claude-code/issues', '_blank')}
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Report Issue</span>
                    </Button>
                  </>
                )}
              </div>

              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>If this issue persists, please check your environment configuration or contact support.</p>
                <p className="mt-1">Error ID: {Date.now().toString(36)} | Time: {new Date().toISOString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialization error component for use outside error boundary
export function InitializationError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-6 w-6 mr-3" />
            Initialization Failed
          </CardTitle>
          <CardDescription>
            Cannot start the application due to configuration issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              <div className="text-sm bg-muted/50 p-3 rounded font-mono">
                {error.message}
              </div>
            </AlertDescription>
          </Alert>

          <EnvironmentDebugger />

          <Button onClick={() => window.location.reload()} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Application
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = (error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    // Could integrate with error reporting service here
  };

  return handleError;
};