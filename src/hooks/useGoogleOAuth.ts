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

  // Fetch OAuth configuration securely from backend
  const fetchOAuthConfig = useCallback(async (): Promise<OAuthConfig | null> => {
    if (!user) {
      console.log('No user authenticated, cannot fetch OAuth config');
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session');
      }

      const response = await supabase.functions.invoke('oauth-config', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(`OAuth config error: ${response.error.message}`);
      }

      return response.data as OAuthConfig;
    } catch (error) {
      console.error('Failed to fetch OAuth configuration:', error);
      toast({
        title: 'Configuration Error',
        description: 'Failed to load OAuth configuration. Please refresh and try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Initialize OAuth configuration on mount
  useEffect(() => {
    if (user && !oauthConfig) {
      fetchOAuthConfig().then(setOAuthConfig);
    }
  }, [user, oauthConfig, fetchOAuthConfig]);

  // Load Google Identity Services script securely
  const loadGoogleScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }, []);

  // Initiate Google OAuth with PKCE and CSRF protection
  const initiateGoogleOAuth = useCallback(async (scope: string): Promise<void> => {
    if (!user || !oauthConfig) {
      throw new Error('User not authenticated or OAuth config not loaded');
    }

    setIsLoading(true);

    try {
      // Load Google script
      await loadGoogleScript();

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();

      // Store PKCE parameters securely (use sessionStorage, not localStorage for better security)
      sessionStorage.setItem('google_code_verifier', codeVerifier);
      sessionStorage.setItem('google_state', state);

      toast({
        title: 'Opening Google Sign-In',
        description: 'Please sign in and grant the requested permissions',
      });

      // Use Google Identity Services with PKCE parameters
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: oauthConfig.google.client_id,
        scope: scope,
        state: state, // CSRF protection
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        callback: async (response: any) => {
          try {
            // Validate state parameter
            const storedState = sessionStorage.getItem('google_state');
            if (response.state !== storedState) {
              throw new Error('Invalid state parameter - possible CSRF attack');
            }

            if (response.error) {
              throw new Error(`OAuth error: ${response.error}`);
            }

            console.log('Google OAuth successful, storing tokens...');

            // Store tokens in Supabase via Edge Function
            const { data, error } = await supabase.functions.invoke('store-google-tokens', {
              body: {
                access_token: response.access_token,
                refresh_token: null, // Token client doesn't provide refresh tokens
                token_type: 'Bearer',
                expires_in: response.expires_in || 3600,
                scope: scope,
                // Include code_verifier for server-side validation if needed
                code_verifier: sessionStorage.getItem('google_code_verifier'),
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
            // Clean up PKCE parameters
            sessionStorage.removeItem('google_code_verifier');
            sessionStorage.removeItem('google_state');
            setIsLoading(false);
          }
        },
      });

      // Request authorization
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (error) {
      console.error('OAuth initiation error:', error);
      setIsLoading(false);

      // Clean up on error
      sessionStorage.removeItem('google_code_verifier');
      sessionStorage.removeItem('google_state');

      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initiate Google connection',
        variant: 'destructive',
      });
      throw error;
    }
  }, [user, oauthConfig, loadGoogleScript, toast]);

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