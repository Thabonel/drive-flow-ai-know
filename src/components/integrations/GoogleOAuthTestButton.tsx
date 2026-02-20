import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEnhancedGoogleOAuth } from '@/hooks/useEnhancedGoogleOAuth';
import { PlayCircle, AlertTriangle, CheckCircle, Square, ExternalLink } from 'lucide-react';

/**
 * Google OAuth Test Component
 *
 * Provides testing interface for the enhanced OAuth implementation
 * Includes popup detection, method selection, and diagnostic feedback
 */
export const GoogleOAuthTestButton = () => {
  const { isLoading, initiateGoogleOAuth, detectPopupBlocking } = useEnhancedGoogleOAuth();
  const [lastTestResult, setLastTestResult] = useState<{
    method: string;
    success: boolean;
    error?: string;
    timestamp: Date;
  } | null>(null);

  const isPopupBlocked = detectPopupBlocking();

  const testOAuthFlow = async (method: 'popup' | 'redirect') => {
    try {
      setLastTestResult(null);

      await initiateGoogleOAuth(
        'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
        method
      );

      setLastTestResult({
        method,
        success: true,
        timestamp: new Date()
      });
    } catch (error) {
      setLastTestResult({
        method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          OAuth Flow Testing
        </CardTitle>
        <CardDescription>
          Test Google OAuth integration with different flow methods
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Popup Status Detection */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Square className="h-4 w-4" />
            <span className="text-sm font-medium">Popup Support</span>
          </div>
          <Badge variant={isPopupBlocked ? "destructive" : "default"}>
            {isPopupBlocked ? 'Blocked' : 'Available'}
          </Badge>
        </div>

        {isPopupBlocked && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Popup Blocked</p>
              <p>Your browser is blocking popups. OAuth will automatically use redirect flow.</p>
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={() => testOAuthFlow('popup')}
            disabled={isLoading}
            variant={isPopupBlocked ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Test Popup Flow
            {isPopupBlocked && <span className="text-xs">(will fallback)</span>}
          </Button>

          <Button
            onClick={() => testOAuthFlow('redirect')}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Test Redirect Flow
          </Button>
        </div>

        {/* Last Test Result */}
        {lastTestResult && (
          <div className={`p-3 border rounded-lg ${
            lastTestResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {lastTestResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                lastTestResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {lastTestResult.method.toUpperCase()} Flow {lastTestResult.success ? 'Success' : 'Failed'}
              </span>
            </div>

            {lastTestResult.error && (
              <p className="text-sm text-red-700">
                {lastTestResult.error}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              Tested at {lastTestResult.timestamp.toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Popup Flow:</strong> Opens OAuth in a popup window (blocked by some browsers)</p>
          <p><strong>Redirect Flow:</strong> Redirects to Google OAuth, then returns to callback page</p>
          <p><strong>Auto Detection:</strong> Automatically chooses best method based on browser capabilities</p>
        </div>
      </CardContent>
    </Card>
  );
};