import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getOAuthConfig, validateOAuthEnvironment, detectOAuthEnvironment } from '@/config/oauth';

interface OAuthConfig {
  google: {
    client_id: string;
    redirect_uri: string;
  };
  microsoft: {
    client_id: string;
    tenant_id: string;
    redirect_uri: string;
  };
  dropbox: {
    client_id: string;
    redirect_uri: string;
  };
}

export const useGoogleOAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthConfig, setOAuthConfig] = useState<OAuthConfig | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Use centralized OAuth configuration with environment detection
  //
  // ARCHITECTURAL NOTE: This is the standard OAuth 2.0 pattern for multi-user SaaS applications
  // - Client ID is PUBLIC by design and safe to hardcode in frontend code
  // - Each user authenticates with their OWN Google account via OAuth popup
  // - User tokens are stored per-user in database with Row-Level Security
  // - Client Secret is stored server-side only (GOOGLE_CLIENT_SECRET env var in Supabase)
  //
  // Authorization Code Flow (with refresh tokens):
  // 1. Frontend uses manual popup with authorization code flow
  // 2. Authorization code is sent to store-google-tokens Edge Function
  // 3. Edge Function exchanges code for access_token + refresh_token
  // 4. Tokens stored in user_google_tokens table with RLS
  // 5. When access_token expires, refresh-google-token Edge Function uses refresh_token
  //    to silently obtain a new access_token (no user interaction needed)
  const getOAuthConfigLocal = useCallback((): OAuthConfig => {
    return getOAuthConfig();
  }, []);

  // Initialize OAuth configuration on mount with environment validation
  useEffect(() => {
    if (!oauthConfig) {
      // Validate environment and log any issues
      const validation = validateOAuthEnvironment();
      const env = detectOAuthEnvironment();

      if (!validation.valid && env.debugEnabled) {
        console.warn('🚨 OAuth Environment Issues:', validation.issues);
      }

      setOAuthConfig(getOAuthConfigLocal());
    }
  }, [oauthConfig, getOAuthConfigLocal]);

  // Load Google Identity Services script securely
  const loadGoogleScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        console.log('Google Identity Services already loaded');
        resolve();
        return;
      }

      console.log('Loading Google Identity Services script...');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        console.log('Google Identity Services script loaded successfully');
        // Give it a moment to initialize
        setTimeout(() => {
          if (window.google?.accounts?.oauth2) {
            resolve();
          } else {
            reject(new Error('Google Identity Services loaded but API not available'));
          }
        }, 100);
      };
      script.onerror = (error) => {
        console.error('Failed to load Google Identity Services script:', error);
        reject(new Error('Failed to load Google Identity Services - network or CORS error'));
      };
      document.head.appendChild(script);
    });
  }, []);

  // Refresh the access token using the stored refresh token (transparent to user)
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('Attempting to refresh Google access token...');
      const { data, error } = await supabase.functions.invoke('refresh-google-token', {});

      if (error) {
        console.error('Token refresh invocation error:', error);
        return null;
      }

      if (data?.needs_reauth) {
        console.log('Token refresh requires re-authentication:', data.error);
        setIsAuthenticated(false);
        return null;
      }

      if (data?.access_token) {
        console.log('Token refresh successful, refreshed:', data.refreshed);
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }, []);

  // Initiate Google OAuth with authorization code flow for refresh token support.
  // Uses a manual popup with our own callback page to avoid GIS redirect_uri issues.
  const initiateGoogleOAuth = useCallback(async (scope: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const config = oauthConfig || getOAuthConfigLocal();
    const env = detectOAuthEnvironment();
    setIsLoading(true);

    try {
      const redirectUri = config.google.redirect_uri;

      if (env.debugEnabled) {
        console.log('🔧 OAuth Debug - Initiating Google OAuth:', {
          environment: env.name,
          origin: env.origin,
          redirectUri,
          clientId: config.google.client_id.substring(0, 20) + '...',
          scope,
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: 'Opening Google Sign-In',
        description: 'Please sign in and grant the requested permissions',
      });

      // Build Google OAuth authorization URL manually.
      // This gives us full control over redirect_uri, avoiding GIS library
      // redirect_uri_mismatch issues across different deployment environments.
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.google.client_id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      console.log('Google OAuth initialization (manual popup):', {
        clientId: config.google.client_id?.substring(0, 20) + '...',
        redirectUri,
        scope,
      });

      // Open centered popup
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
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }

      // Listen for the authorization code from our callback page via postMessage
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'google-oauth-callback') return;

        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);

        if (event.data.error) {
          console.error('OAuth error from callback:', event.data.error);
          toast({
            title: 'Connection Failed',
            description: event.data.error || 'Google sign-in was denied',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const code = event.data.code;
        if (!code) {
          toast({
            title: 'Connection Failed',
            description: 'No authorization code received from Google',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        try {
          console.log('Authorization code received, exchanging for tokens...');

          const { data, error } = await supabase.functions.invoke('store-google-tokens', {
            body: {
              code,
              redirect_uri: redirectUri,
              scope,
            },
          });

          if (error) throw new Error(`Token exchange failed: ${error.message}`);
          if (data?.error) throw new Error(`Token exchange failed: ${data.error}`);

          console.log('Tokens exchanged and stored successfully:', {
            success: data?.success,
            hasRefreshToken: data?.has_refresh_token,
          });
          setIsAuthenticated(true);

          toast({
            title: 'Connected Successfully',
            description: 'Your Google account has been connected securely.',
          });
        } catch (callbackError: any) {
          console.error('OAuth callback error:', callbackError);
          toast({
            title: 'Connection Failed',
            description: callbackError.message || 'Failed to connect Google account',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };

      window.addEventListener('message', messageHandler);

      // Poll for popup close (user cancelled)
      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            window.removeEventListener('message', messageHandler);
            setIsLoading(false);
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
  }, [user, oauthConfig, getOAuthConfig, toast]);

  // Check if user has valid Google tokens, with auto-refresh support
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      const { data: tokenRecord } = await supabase
        .from('user_google_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!tokenRecord?.access_token) {
        setIsAuthenticated(false);
        return false;
      }

      // Check if token is expired or expiring within 5 minutes
      const now = new Date();
      const expiresAt = new Date(tokenRecord.expires_at);
      const bufferMs = 5 * 60 * 1000; // 5 minutes
      const isExpiringSoon = now.getTime() >= (expiresAt.getTime() - bufferMs);

      if (isExpiringSoon) {
        // Token is expired or expiring soon - try to refresh
        if (tokenRecord.refresh_token) {
          console.log('Google token expiring soon, attempting auto-refresh...');
          const newToken = await refreshAccessToken();
          if (newToken) {
            setIsAuthenticated(true);
            return true;
          }
        }
        console.log('Google token expired and cannot be refreshed');
        setIsAuthenticated(false);
        return false;
      }

      setIsAuthenticated(true);
      return true;

    } catch (error) {
      console.error('Error checking Google connection:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, [user, refreshAccessToken]);

  // Disconnect (revoke tokens)
  const disconnect = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Revoke tokens on server
      const { error } = await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to revoke tokens: ${error.message}`);
      }

      setIsAuthenticated(false);

      toast({
        title: 'Disconnected',
        description: 'Your Google account has been disconnected.',
      });

    } catch (error: any) {
      console.error('Error disconnecting Google:', error);
      toast({
        title: 'Disconnection Failed',
        description: error.message || 'Failed to disconnect Google account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  return {
    isAuthenticated,
    isLoading,
    oauthConfig,
    initiateGoogleOAuth,
    checkConnection,
    disconnect,
    loadGoogleScript,
    refreshAccessToken,
  };
};
