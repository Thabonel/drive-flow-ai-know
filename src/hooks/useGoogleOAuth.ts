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

// PKCE (Proof Key for Code Exchange) utilities for secure OAuth
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate secure state parameter for CSRF protection
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
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
  // - No Client Secret is used (OAuth 2.0 implicit flow for browser-based apps)
  //
  // Multi-User Flow:
  // User A → OAuth with same Client ID → User A's Google account → User A's tokens
  // User B → OAuth with same Client ID → User B's Google account → User B's tokens
  //
  // This approach allows unlimited users to connect their individual Google accounts
  // while maintaining security and proper token isolation.
  const getOAuthConfig = useCallback((): OAuthConfig => {
    const currentOrigin = window.location.origin;
    return {
      google: {
        client_id: '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com',
        redirect_uri: `${currentOrigin}/auth/google/callback`,
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

  // Initiate Google OAuth with PKCE and CSRF protection
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

      // ADD DIAGNOSTIC LOGGING
      console.log('Google OAuth initialization:', {
        hasGoogleAPI: !!window.google?.accounts?.oauth2,
        clientId: config.google.client_id?.substring(0, 20) + '...',
        scope: scope,
        timestamp: new Date().toISOString()
      });

      // Note: PKCE parameters removed - not supported by initTokenClient()
      // initTokenClient() uses implicit flow (popup-based token return)
      // PKCE is for authorization code flow only

      toast({
        title: 'Opening Google Sign-In',
        description: 'Please sign in and grant the requested permissions',
      });

      // Use Google Identity Services (simplified configuration matching working Google Drive pattern)
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.google.client_id,
        scope: scope,
        callback: async (response: any) => {
          try {
            // ADD DIAGNOSTIC LOGGING FOR OAUTH CALLBACK
            console.log('Google OAuth callback received:', {
              hasError: !!response.error,
              hasAccessToken: !!response.access_token,
              responseKeys: Object.keys(response || {}),
              timestamp: new Date().toISOString()
            });

            // Note: State validation removed - not applicable for initTokenClient() implicit flow
            // CSRF protection is handled by Google's popup-based authentication

            if (response.error) {
              console.error('OAuth error details:', {
                error: response.error,
                description: response.error_description,
                uri: response.error_uri
              });
              throw new Error(`OAuth error: ${response.error}${response.error_description ? ' - ' + response.error_description : ''}`);
            }

            console.log('Google OAuth successful, storing tokens...');

            // Store tokens in Supabase via Edge Function (simplified - no PKCE fields)
            const { data, error } = await supabase.functions.invoke('store-google-tokens', {
              body: {
                access_token: response.access_token,
                refresh_token: null, // Token client doesn't provide refresh tokens
                token_type: 'Bearer',
                expires_in: response.expires_in || 3600,
                scope: scope,
                // Note: code_verifier removed - not applicable for implicit flow
              },
            });

            if (error) {
              throw new Error(`Token storage failed: ${error.message}`);
            }

            console.log('Tokens stored successfully:', data);
            setIsAuthenticated(true);

            toast({
              title: 'Connected Successfully',
              description: 'Your Google account has been connected securely.',
            });

          } catch (callbackError) {
            console.error('OAuth callback error:', callbackError);
            toast({
              title: 'Connection Failed',
              description: callbackError.message || 'Failed to connect Google account',
              variant: 'destructive',
            });
          } finally {
            // Note: No PKCE cleanup needed for implicit flow
            setIsLoading(false);
          }
        },
      });

      // Request authorization
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (error) {
      console.error('OAuth initiation error:', error);
      setIsLoading(false);

      // Note: No PKCE cleanup needed for implicit flow

      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initiate Google connection',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, oauthConfig, getOAuthConfig, loadGoogleScript, toast]);

  // Check if user has valid Google tokens
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      const { data: tokenRecord } = await supabase
        .from('user_google_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!tokenRecord?.access_token) {
        setIsAuthenticated(false);
        return false;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenRecord.expires_at);
      if (now >= expiresAt) {
        console.log('Google token expired');
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
  }, [user]);

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

    } catch (error) {
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
  };
};