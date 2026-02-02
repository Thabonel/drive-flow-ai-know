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
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Enhanced logging for cascade failures
    if (error.message?.includes('Export') || error.message?.includes('import')) {
      console.error('Possible module loading cascade failure detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isModuleLoadingError = this.state.error?.message?.includes('Export') ||
                                   this.state.error?.message?.includes('import') ||
                                   this.state.error?.message?.includes('environment') ||
                                   this.state.error?.message?.includes('SUPABASE');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-6 w-6 mr-3" />
                {isModuleLoadingError ? 'Application Initialization Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {isModuleLoadingError
                  ? 'The application failed to initialize properly. This is typically caused by missing or invalid configuration.'
                  : 'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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