import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { detectOAuthEnvironment } from '@/config/oauth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

/**
 * Enhanced Google OAuth Callback Page
 *
 * Handles both popup-based and redirect-based OAuth flows with:
 * - CSRF protection via state parameter validation
 * - Enhanced error diagnostics
 * - Automatic return to original page after successful auth
 * - Support for both OAuth methods
 */
const EnhancedGoogleCallback = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [statusMessage, setStatusMessage] = useState('Processing Google authentication...');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [isRedirectFlow, setIsRedirectFlow] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const processOAuthCallback = async () => {
      const env = detectOAuthEnvironment();
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const state = params.get('state');

      // Determine if this is a redirect flow (no opener) vs popup flow (has opener)
      const isRedirect = !window.opener;
      setIsRedirectFlow(isRedirect);

      if (env.debugEnabled) {
        console.log('🔧 Enhanced OAuth Callback Debug:', {
          environment: env.name,
          origin: window.location.origin,
          isRedirectFlow: isRedirect,
          hasCode: !!code,
          hasError: !!error,
          hasState: !!state,
          error: error || 'none',
          errorDescription: errorDescription || 'none',
          timestamp: new Date().toISOString(),
        });
      }

      // CSRF Protection: Validate state parameter
      if (isRedirect && state) {
        const storedState = sessionStorage.getItem('oauth_state');
        if (state !== storedState) {
          setStatus('error');
          setStatusMessage('Security Error');
          setErrorDetails('OAuth state mismatch - possible CSRF attempt');

          toast({
            title: 'Security Error',
            description: 'OAuth state validation failed. Please try again.',
            variant: 'destructive',
          });

          setTimeout(() => {
            navigate('/settings?tab=security');
          }, 3000);
          return;
        }
        // Clean up state
        sessionStorage.removeItem('oauth_state');
      }

      // Handle OAuth errors with enhanced diagnostics
      if (error) {
        setStatus('error');

        let diagnosticMessage = '';
        let userFriendlyError = '';

        switch (error) {
          case 'redirect_uri_mismatch':
            userFriendlyError = 'Domain Configuration Error';
            diagnosticMessage = 'The current domain is not registered in Google Cloud Console. Please contact support.';
            break;
          case 'unauthorized_client':
            userFriendlyError = 'Backend Configuration Error';
            diagnosticMessage = 'GOOGLE_CLIENT_SECRET is not configured. Please check environment variables.';
            break;
          case 'access_denied':
            userFriendlyError = 'Access Denied';
            diagnosticMessage = 'You denied access to your Google account. Please try again if this was unintended.';
            break;
          case 'invalid_request':
            userFriendlyError = 'Invalid OAuth Request';
            diagnosticMessage = 'The OAuth request was malformed. Please try again.';
            break;
          default:
            userFriendlyError = 'OAuth Error';
            diagnosticMessage = errorDescription || error;
        }

        setStatusMessage(userFriendlyError);
        setErrorDetails(diagnosticMessage);

        if (isRedirect) {
          toast({
            title: userFriendlyError,
            description: diagnosticMessage,
            variant: 'destructive',
          });

          // Return to settings page after error
          setTimeout(() => {
            navigate('/settings?tab=security&error=oauth_failed');
          }, 5000);
        } else {
          // Send error to popup opener
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'google-oauth-callback',
                error: `${userFriendlyError}: ${diagnosticMessage}`,
                code: null,
                state,
              },
              window.location.origin
            );
            setTimeout(() => window.close(), 3000);
          }
        }
        return;
      }

      // Validate authorization code
      if (!code) {
        setStatus('error');
        setStatusMessage('No Authorization Code');
        setErrorDetails('Google did not provide an authorization code. Please try again.');

        if (isRedirect) {
          toast({
            title: 'Authentication Failed',
            description: 'No authorization code received from Google',
            variant: 'destructive',
          });

          setTimeout(() => {
            navigate('/settings?tab=security&error=no_auth_code');
          }, 3000);
        } else if (window.opener) {
          window.opener.postMessage(
            {
              type: 'google-oauth-callback',
              error: 'No authorization code received from Google',
              code: null,
              state,
            },
            window.location.origin
          );
          setTimeout(() => window.close(), 3000);
        }
        return;
      }

      // Success - process authorization code
      setStatusMessage('Exchanging authorization code for tokens...');

      try {
        if (isRedirect) {
          // Handle redirect flow - exchange tokens directly
          const { data, error: tokenError } = await supabase.functions.invoke('store-google-tokens', {
            body: {
              code,
              redirect_uri: `${window.location.origin}/auth/google/callback`,
              scope: 'https://www.googleapis.com/auth/drive.readonly',
            },
          });

          if (tokenError) {
            throw new Error(`Token exchange failed: ${tokenError.message}`);
          }

          if (data?.error) {
            throw new Error(`Token exchange failed: ${data.error}`);
          }

          setStatus('success');
          setStatusMessage('Google Account Connected Successfully!');

          toast({
            title: 'Connection Successful',
            description: 'Your Google account has been securely connected',
          });

          // Return to original page or settings
          const returnUrl = sessionStorage.getItem('oauth_return_url') || '/settings?tab=security';
          sessionStorage.removeItem('oauth_return_url');

          setTimeout(() => {
            navigate(returnUrl + '&success=google_connected');
          }, 2000);

        } else {
          // Handle popup flow - send code to opener
          setStatus('success');
          setStatusMessage('Authentication Successful!');

          if (window.opener) {
            if (env.debugEnabled) {
              console.log('✅ Enhanced OAuth Success - Sending authorization code to opener');
            }

            window.opener.postMessage(
              {
                type: 'google-oauth-callback',
                code,
                error: null,
                state,
              },
              window.location.origin
            );

            setTimeout(() => window.close(), 1000);
          }
        }

      } catch (tokenError: any) {
        console.error('Token exchange error:', tokenError);

        setStatus('error');
        setStatusMessage('Token Exchange Failed');

        let errorMessage = tokenError.message;
        if (errorMessage.includes('GOOGLE_CLIENT_SECRET')) {
          errorMessage = 'Backend configuration error: GOOGLE_CLIENT_SECRET environment variable is not set in Supabase';
        }

        setErrorDetails(errorMessage);

        if (isRedirect) {
          toast({
            title: 'Connection Failed',
            description: errorMessage,
            variant: 'destructive',
          });

          setTimeout(() => {
            navigate('/settings?tab=security&error=token_exchange_failed');
          }, 5000);
        } else if (window.opener) {
          window.opener.postMessage(
            {
              type: 'google-oauth-callback',
              error: errorMessage,
              code: null,
              state,
            },
            window.location.origin
          );
          setTimeout(() => window.close(), 3000);
        }
      }
    };

    processOAuthCallback();
  }, [navigate, toast]);

  const handleReturnToApp = () => {
    const returnUrl = sessionStorage.getItem('oauth_return_url') || '/settings?tab=security';
    sessionStorage.removeItem('oauth_return_url');
    navigate(returnUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'processing' && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}

            Google Authentication
          </CardTitle>
          <CardDescription>
            {isRedirectFlow ? 'Processing your Google account connection' : 'Popup-based OAuth flow'}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <div className={`p-4 rounded-lg ${
            status === 'success' ? 'bg-green-50 border border-green-200' :
            status === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`font-medium ${
              status === 'success' ? 'text-green-800' :
              status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {statusMessage}
            </p>

            {errorDetails && (
              <p className="text-sm text-red-600 mt-2">
                {errorDetails}
              </p>
            )}
          </div>

          {status === 'processing' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRedirectFlow ? 'Exchanging tokens...' : 'Closing popup...'}
              </p>
            </div>
          )}

          {status === 'success' && isRedirectFlow && (
            <div className="space-y-3">
              <p className="text-sm text-green-600">
                Redirecting you back to the app...
              </p>
              <Button onClick={handleReturnToApp} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to App
              </Button>
            </div>
          )}

          {status === 'error' && isRedirectFlow && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You will be redirected back to the app in a few seconds
              </p>
              <Button onClick={handleReturnToApp} variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Settings
              </Button>
            </div>
          )}

          {!isRedirectFlow && (
            <p className="text-xs text-muted-foreground">
              This popup will close automatically
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedGoogleCallback;