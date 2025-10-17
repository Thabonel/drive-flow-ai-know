import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MicrosoftDriveItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl: string;
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
  size?: number;
}

export const useMicrosoft = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveItems, setDriveItems] = useState<MicrosoftDriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const storeTokens = useCallback(async (tokenResponse: any) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('store-microsoft-tokens', {
        body: {
          access_token: tokenResponse.accessToken,
          refresh_token: tokenResponse.refreshToken || null,
          token_type: 'Bearer',
          expires_in: tokenResponse.expiresIn || 3600,
          scope: tokenResponse.scope || 'Files.Read.All Sites.Read.All',
        }
      });

      if (error) {
        console.error('Error storing Microsoft tokens:', error);
        throw error;
      }

      console.log('Microsoft tokens stored securely:', data);
    } catch (error) {
      console.error('Error storing Microsoft tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to store authentication tokens securely',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const loadDriveItems = useCallback(async (accessToken: string) => {
    setIsLoading(true);
    try {
      // Fetch root items from OneDrive
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load OneDrive items: ${response.statusText}`);
      }

      const data = await response.json();
      setDriveItems(data.value || []);
    } catch (error) {
      console.error('Error loading Microsoft Drive items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load OneDrive items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const signIn = useCallback(async () => {
    try {
      // Get Microsoft OAuth configuration
      const { data: config, error: configError } = await supabase.functions.invoke('get-microsoft-config');

      if (configError) {
        throw configError;
      }

      toast({
        title: 'Opening Microsoft Sign-In',
        description: 'Please sign in with your Microsoft account and grant access to OneDrive',
      });

      // Microsoft OAuth 2.0 PKCE flow
      const { clientId, tenantId, redirectUri, scopes } = config;

      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code verifier for later use
      sessionStorage.setItem('microsoft_code_verifier', codeVerifier);

      // Build authorization URL
      const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('response_mode', 'query');
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('prompt', 'consent');

      // Redirect to Microsoft login
      window.location.href = authUrl.toString();

    } catch (error) {
      console.error('Error signing in to Microsoft:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Microsoft. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleCallback = useCallback(async (code: string) => {
    try {
      const { data: config } = await supabase.functions.invoke('get-microsoft-config');
      const codeVerifier = sessionStorage.getItem('microsoft_code_verifier');

      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          scope: config.scopes.join(' '),
          code: code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error_description || 'Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();

      // Store tokens securely
      await storeTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
      });

      // Load drive items
      await loadDriveItems(tokens.access_token);

      setIsAuthenticated(true);

      // Clean up
      sessionStorage.removeItem('microsoft_code_verifier');

      toast({
        title: 'Connected Successfully!',
        description: 'You can now browse and sync your OneDrive files',
      });

    } catch (error) {
      console.error('Error handling Microsoft callback:', error);
      toast({
        title: 'Authentication Failed',
        description: error instanceof Error ? error.message : 'Failed to complete authentication',
        variant: 'destructive',
      });
    }
  }, [storeTokens, loadDriveItems, toast]);

  return {
    isAuthenticated,
    driveItems,
    isLoading,
    signIn,
    handleCallback,
    loadDriveItems
  };
};

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
