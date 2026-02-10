import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  // Use hardcoded OAuth configuration (consistent with working Google Drive and Calendar hooks)
  //
  // ARCHITECTURAL NOTE: This is the standard OAuth 2.0 pattern for multi-user SaaS applications
  // - Client ID is PUBLIC by design and safe to hardcode in frontend code
  // - Each user authenticates with their OWN Google account via OAuth popup
  // - User tokens are stored per-user in database with Row-Level Security
  // - Client Secret is stored server-side only (GOOGLE_CLIENT_SECRET env var in Supabase)
  //
  // Authorization Code Flow (with refresh tokens):
  // 1. Frontend uses initCodeClient() with ux_mode: 'popup' to get an authorization code
  // 2. Authorization code is sent to store-google-tokens Edge Function
  // 3. Edge Function exchanges code for access_token + refresh_token using redirect_uri: 'postmessage'
  // 4. Tokens stored in user_google_tokens table with RLS
  // 5. When access_token expires, refresh-google-token Edge Function uses refresh_token
  //    to silently obtain a new access_token (no user interaction needed)
  //
  // IMPORTANT: For popup-based code flow, Google's GIS library uses postMessage internally.
  // The token exchange MUST use redirect_uri: 'postmessage' (NOT a URL) to match.
  const getOAuthConfig = useCallback((): OAuthConfig => {
    const currentOrigin = window.location.origin;
    return {
      google: {
        client_id: '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com',
        redirect_uri: 'postmessage',
      },
      microsoft: {
        client_id: '', // Not implemented yet
        tenant_id: 'common',
        redirect_uri: `${currentOrigin}/auth/microsoft/callback`,
      },
      dropbox: {
        client_id: '', // Not implemented yet
        redirect_uri: `${currentOrigin}/auth/dropbox/callback`,
      },
    };
  }, []);

  // Initialize OAuth configuration on mount - now synchronous since hardcoded
  useEffect(() => {
    if (!oauthConfig) {
      setOAuthConfig(getOAuthConfig());
    }
  }, [oauthConfig, getOAuthConfig]);

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

  // Initiate Google OAuth with authorization code flow for refresh token support
  const initiateGoogleOAuth = useCallback(async (scope: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get config directly if not loaded
    const config = oauthConfig || getOAuthConfig();

    setIsLoading(true);

    try {
      // Load Google script
      await loadGoogleScript();

      console.log('Google OAuth initialization (authorization code flow):', {
        hasGoogleAPI: !!window.google?.accounts?.oauth2,
        clientId: config.google.client_id?.substring(0, 20) + '...',
        scope: scope,
        timestamp: new Date().toISOString()
      });

      toast({
        title: 'Opening Google Sign-In',
        description: 'Please sign in and grant the requested permissions',
      });

      // Use authorization code flow (initCodeClient) instead of implicit flow (initTokenClient).
      // This provides refresh tokens for silent token renewal, solving the 1-hour expiration problem.
      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: config.google.client_id,
        scope: scope,
        ux_mode: 'popup',
        callback: async (response: any) => {
          try {
            console.log('Google OAuth code callback received:', {
              hasError: !!response.error,
              hasCode: !!response.code,
              responseKeys: Object.keys(response || {}),
              timestamp: new Date().toISOString()
            });

            if (response.error) {
              console.error('OAuth error details:', {
                error: response.error,
                description: response.error_description,
                uri: response.error_uri
              });
              throw new Error(`OAuth error: ${response.error}${response.error_description ? ' - ' + response.error_description : ''}`);
            }

            if (!response.code) {
              throw new Error('No authorization code received from Google');
            }

            console.log('Google OAuth code received, exchanging for tokens via Edge Function...');

            // Send the authorization code to the backend Edge Function
            // The Edge Function will exchange it for access_token + refresh_token
            // using the GOOGLE_CLIENT_SECRET (stored server-side only)
            const { data, error } = await supabase.functions.invoke('store-google-tokens', {
              body: {
                code: response.code,
                redirect_uri: config.google.redirect_uri,
                scope: scope,
              },
            });

            if (error) {
              throw new Error(`Token exchange failed: ${error.message}`);
            }

            if (data?.error) {
              throw new Error(`Token exchange failed: ${data.error}`);
            }

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
        },
      });

      // Request authorization code - prompt consent to ensure refresh token is granted
      codeClient.requestCode();

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
  }, [user, oauthConfig, getOAuthConfig, loadGoogleScript, toast]);

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
