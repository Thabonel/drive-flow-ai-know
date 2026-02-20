import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getOAuthConfig, detectOAuthEnvironment, validateOAuthEnvironment } from '@/config/oauth';
import { safeEdgeFunctionCall } from '@/lib/error-handling';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  details?: string;
  evidence?: Record<string, any>;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'error';
  checks: HealthCheck[];
  lastChecked: Date;
  environment: string;
}

/**
 * Google Integration Health Monitor - Diagnostic Component
 *
 * Implements Phase 1 of systematic debugging by gathering evidence
 * from each component boundary in the Google OAuth flow to identify
 * WHERE the integration breaks.
 */
export const GoogleIntegrationHealth = () => {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();

  const runHealthCheck = async (): Promise<HealthReport> => {
    const checks: HealthCheck[] = [];
    const env = detectOAuthEnvironment();

    // CHECK 1: Environment Variables (Frontend)
    try {
      const config = getOAuthConfig();
      const validation = validateOAuthEnvironment();

      checks.push({
        name: 'Frontend Configuration',
        status: validation.valid ? 'healthy' : 'warning',
        message: validation.valid ? 'OAuth configuration is valid' : 'Configuration issues detected',
        details: validation.issues.join(', '),
        evidence: {
          environment: env.name,
          origin: env.origin,
          redirectUri: config.google.redirect_uri,
          clientIdLength: config.google.client_id.length,
          debugEnabled: env.debugEnabled
        }
      });
    } catch (error) {
      checks.push({
        name: 'Frontend Configuration',
        status: 'error',
        message: 'Failed to load OAuth configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // CHECK 2: Google Client Secret (Backend)
    const { data, error } = await safeEdgeFunctionCall(
      () => supabase.functions.invoke('store-google-tokens', {
        body: { health_check: true }
      }),
      'Google Client Secret Health Check',
      {
        showToast: false, // Don't show toast for health checks
        silentInProduction: true, // Silent in production
        reportToAdmin: false, // Don't spam admin with health check failures
      }
    );

    if (error) {
      // Check if the error indicates missing GOOGLE_CLIENT_SECRET
      const errorMsg = error.message || '';
      if (errorMsg.includes('GOOGLE_CLIENT_SECRET')) {
        checks.push({
          name: 'Google Client Secret',
          status: 'error',
          message: '❌ GOOGLE_CLIENT_SECRET not configured',
          details: 'Environment variable missing in Supabase dashboard',
          evidence: {
            errorType: 'MISSING_CLIENT_SECRET',
            errorMessage: errorMsg,
            resolution: 'Set GOOGLE_CLIENT_SECRET in Supabase Dashboard > Settings > Environment Variables'
          }
        });
      } else {
        checks.push({
          name: 'Google Client Secret',
          status: 'error',
          message: 'Token exchange endpoint error',
          details: errorMsg,
          evidence: { error: error }
        });
      }
    } else if (data) {
      // Health check response
      const hasClientSecret = data.has_google_client_secret;
      const environmentStatus = data.environment_status;

      checks.push({
        name: 'Google Client Secret',
        status: hasClientSecret ? 'healthy' : 'error',
        message: hasClientSecret
          ? '✅ GOOGLE_CLIENT_SECRET is configured'
          : '❌ GOOGLE_CLIENT_SECRET not configured',
        details: hasClientSecret
          ? 'Backend environment is properly configured'
          : 'Environment variable missing in Supabase dashboard',
        evidence: {
          hasClientSecret,
          environmentStatus,
          resolution: hasClientSecret
            ? null
            : 'Set GOOGLE_CLIENT_SECRET in Supabase Dashboard > Settings > Environment Variables'
        }
      });
    } else {
      checks.push({
        name: 'Google Client Secret',
        status: 'warning',
        message: 'Unexpected response from health check',
        details: 'Could not determine environment variable status'
      });
    }

    // CHECK 3: Google Cloud Console Configuration
    try {
      const config = getOAuthConfig();
      const testUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      testUrl.searchParams.set('client_id', config.google.client_id);
      testUrl.searchParams.set('redirect_uri', config.google.redirect_uri);
      testUrl.searchParams.set('response_type', 'code');
      testUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly');
      testUrl.searchParams.set('access_type', 'offline');

      // Test if Google accepts our client_id and redirect_uri (this will fail if not registered)
      // Note: We can't actually test this due to CORS, but we provide the URL for manual testing

      checks.push({
        name: 'Google Cloud Console Config',
        status: 'unknown',
        message: '⚠️  Redirect URI registration cannot be verified automatically',
        details: 'Manual verification required - test OAuth flow to confirm',
        evidence: {
          clientId: config.google.client_id,
          redirectUri: config.google.redirect_uri,
          authUrl: testUrl.toString(),
          instruction: 'Open this URL manually to test if redirect_uri is registered'
        }
      });
    } catch (error) {
      checks.push({
        name: 'Google Cloud Console Config',
        status: 'warning',
        message: 'Cannot verify Google Cloud Console configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // CHECK 4: User Token Status (if user is authenticated)
    if (user) {
      try {
        const { data: tokenRecord, error } = await supabase
          .from('user_google_tokens')
          .select('access_token, refresh_token, expires_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          checks.push({
            name: 'User Token Status',
            status: 'error',
            message: 'Cannot check user token status',
            details: error.message
          });
        } else if (!tokenRecord) {
          checks.push({
            name: 'User Token Status',
            status: 'warning',
            message: 'No Google tokens found for user',
            details: 'User has not connected Google account yet',
            evidence: { hasTokens: false }
          });
        } else {
          const now = new Date();
          const expiresAt = new Date(tokenRecord.expires_at);
          const isExpired = now > expiresAt;

          checks.push({
            name: 'User Token Status',
            status: isExpired ? 'warning' : 'healthy',
            message: isExpired ? 'Access token expired' : 'Valid Google tokens found',
            details: `Expires: ${expiresAt.toLocaleString()}`,
            evidence: {
              hasAccessToken: !!tokenRecord.access_token,
              hasRefreshToken: !!tokenRecord.refresh_token,
              expiresAt: tokenRecord.expires_at,
              isExpired: isExpired,
              lastUpdated: tokenRecord.updated_at
            }
          });
        }
      } catch (error) {
        checks.push({
          name: 'User Token Status',
          status: 'error',
          message: 'Failed to check user tokens',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      checks.push({
        name: 'User Token Status',
        status: 'warning',
        message: 'User not authenticated',
        details: 'Log in to check Google token status'
      });
    }

    // Determine overall health status
    const hasErrors = checks.some(c => c.status === 'error');
    const hasWarnings = checks.some(c => c.status === 'warning');

    const overallStatus: 'healthy' | 'degraded' | 'error' =
      hasErrors ? 'error' : hasWarnings ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      checks,
      lastChecked: new Date(),
      environment: env.name
    };
  };

  const handleRunCheck = async () => {
    setIsRunning(true);
    try {
      const report = await runHealthCheck();
      setHealth(report);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Run initial health check on mount
    handleRunCheck();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Google Integration Health
              {health && getStatusIcon(health.status)}
            </CardTitle>
            <CardDescription>
              Diagnostic tool to identify OAuth integration issues
            </CardDescription>
          </div>
          <Button
            onClick={handleRunCheck}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Run Health Check'
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {health && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(health.status)}>
                {health.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                Environment: {health.environment} • Last checked: {health.lastChecked.toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-3">
              {health.checks.map((check, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <span className="font-medium">{check.name}</span>
                    </div>
                    <Badge variant="outline" className={getStatusColor(check.status)}>
                      {check.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-700">{check.message}</p>

                  {check.details && (
                    <p className="text-xs text-gray-500">{check.details}</p>
                  )}

                  {check.evidence && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        View diagnostic evidence
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(check.evidence, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Action Buttons */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Quick Actions:</h4>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                >
                  Open Google Cloud Console
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://app.supabase.com/project/fskwutnoxbbflzqrphro/settings/environment-variables', '_blank')}
                >
                  Open Supabase Environment Variables
                </Button>
                {health.checks.some(c => c.evidence?.authUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const authUrl = health.checks.find(c => c.evidence?.authUrl)?.evidence?.authUrl;
                      if (authUrl) window.open(authUrl, '_blank');
                    }}
                  >
                    Test OAuth URL
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};