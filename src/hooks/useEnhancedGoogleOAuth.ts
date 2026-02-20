import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getOAuthConfig, detectOAuthEnvironment } from '@/config/oauth';
import { safeEdgeFunctionCall } from '@/lib/error-handling';

/**
 * Enhanced Google OAuth Hook with Popup Blocking Mitigation
 *
 * Implements systematic debugging Phase 2 fixes:
 * - Popup blocker detection and redirect fallback
 * - Enhanced error diagnostics
 * - Better user experience for OAuth failures
 */
export const useEnhancedGoogleOAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Detect if popups are blocked by attempting to open a test popup
  const detectPopupBlocking = useCallback((): boolean => {
    try {
      const testPopup = window.open('', '', 'width=1,height=1');
      const isBlocked = !testPopup || testPopup.closed;

      if (testPopup && !testPopup.closed) {
        testPopup.close();
      }

      return isBlocked;
    } catch {
      return true; // Assume blocked if test fails
    }
  }, []);

  // Enhanced OAuth initiation with popup fallback
  const initiateGoogleOAuth = useCallback(async (
    scope: string,
    preferredMethod: 'popup' | 'redirect' | 'auto' = 'auto'
  ): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const config = getOAuthConfig();
    const env = detectOAuthEnvironment();
    setIsLoading(true);

    if (env.debugEnabled) {
      console.log('🔧 Enhanced OAuth Debug - Initiating OAuth:', {
        environment: env.name,
        preferredMethod,
        scope
      });
    }

    try {
      const redirectUri = config.google.redirect_uri;

      // Build OAuth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.google.client_id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      // Add state parameter for CSRF protection
      const state = crypto.randomUUID();
      authUrl.searchParams.set('state', state);
      sessionStorage.setItem('oauth_state', state);

      // Determine OAuth method based on popup blocking
      let useRedirect = false;

      if (preferredMethod === 'redirect') {
        useRedirect = true;
      } else if (preferredMethod === 'popup') {
        useRedirect = false;
      } else { // auto
        const isPopupBlocked = detectPopupBlocking();
        if (isPopupBlocked) {
          useRedirect = true;
          console.log('🚨 Popup blocking detected - using redirect flow');
        }
      }

      if (useRedirect) {
        // Redirect-based OAuth flow
        toast({
          title: 'Redirecting to Google',
          description: 'You will be redirected to Google for authentication',
        });

        // Store return URL to navigate back after OAuth
        sessionStorage.setItem('oauth_return_url', window.location.pathname);

        // Redirect to Google OAuth
        window.location.href = authUrl.toString();
        return;
      }

      // Popup-based OAuth flow (existing logic)
      toast({
        title: 'Opening Google Sign-In',
        description: 'Please complete the sign-in in the popup window',
      });

      const width = 500;
      const height = 600;
      const left = Math.round((screen.width - width) / 2);
      const top = Math.round((screen.height - height) / 2);

      const popup = window.open(
        authUrl.toString(),
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        // Popup blocked - fall back to redirect
        console.log('🚨 Popup blocked by browser - falling back to redirect');

        toast({
          title: 'Popup Blocked',
          description: 'Redirecting to Google authentication...',
          variant: 'default',
        });

        sessionStorage.setItem('oauth_return_url', window.location.pathname);
        window.location.href = authUrl.toString();
        return;
      }

      // Listen for popup messages (existing logic)
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'google-oauth-callback') return;

        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);

        // Validate state parameter
        const receivedState = event.data.state;
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        if (receivedState !== storedState) {
          toast({
            title: 'Security Error',
            description: 'OAuth state mismatch - please try again',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        if (event.data.error) {
          console.error('OAuth error from callback:', event.data.error);

          // Enhanced error diagnostics
          let errorMessage = event.data.error;
          let diagnosticInfo = '';

          if (event.data.error.includes('redirect_uri_mismatch')) {
            diagnosticInfo = 'Domain not registered in Google Cloud Console';
          } else if (event.data.error.includes('unauthorized_client')) {
            diagnosticInfo = 'GOOGLE_CLIENT_SECRET not configured in Supabase';
          } else if (event.data.error.includes('access_denied')) {
            diagnosticInfo = 'User denied access or cancelled sign-in';
          }

          toast({
            title: 'Google Sign-In Failed',
            description: `${errorMessage}${diagnosticInfo ? ` (${diagnosticInfo})` : ''}`,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const code = event.data.code;
        if (!code) {
          toast({
            title: 'Authentication Failed',
            description: 'No authorization code received from Google',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Exchange authorization code for tokens using safe wrapper
        const { data, error } = await safeEdgeFunctionCall(
          () => supabase.functions.invoke('store-google-tokens', {
            body: { code, redirect_uri: redirectUri, scope },
          }),
          'Google OAuth Token Exchange',
          {
            userMessage: 'Failed to connect Google account. Please try again.',
            showToast: false, // We'll handle toast ourselves for better UX
            reportToAdmin: true,
          }
        );

        if (error) {
          // Enhanced error diagnostics for token exchange
          let errorMessage = error.message;
          let diagnosticInfo = '';

          if (errorMessage.includes('GOOGLE_CLIENT_SECRET')) {
            errorMessage = 'Backend configuration error';
            diagnosticInfo = 'GOOGLE_CLIENT_SECRET not configured in Supabase';
          } else if (errorMessage.includes('redirect_uri_mismatch')) {
            diagnosticInfo = 'Domain not registered in Google Cloud Console';
          } else if (errorMessage.includes('unauthorized_client')) {
            diagnosticInfo = 'GOOGLE_CLIENT_SECRET not configured in Supabase';
          }

          toast({
            title: 'Connection Failed',
            description: `${errorMessage}${diagnosticInfo ? ` (${diagnosticInfo})` : ''}`,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        if (data?.error) {
          toast({
            title: 'Connection Failed',
            description: `Token exchange failed: ${data.error}`,
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        toast({
          title: 'Connected Successfully!',
          description: 'Your Google account has been securely connected',
        });
        setIsLoading(false);
      };

      window.addEventListener('message', messageHandler);

      // Poll for popup close
      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            window.removeEventListener('message', messageHandler);
            setIsLoading(false);

            toast({
              title: 'Sign-In Cancelled',
              description: 'Google sign-in window was closed',
              variant: 'default',
            });
          }
        } catch {
          clearInterval(pollTimer);
        }
      }, 1000);

    } catch (error: any) {
      console.error('OAuth initiation error:', error);
      setIsLoading(false);

      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initiate Google connection',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, toast, detectPopupBlocking]);

  return {
    isAuthenticated,
    isLoading,
    initiateGoogleOAuth,
    detectPopupBlocking,
  };
};