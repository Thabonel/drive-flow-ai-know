import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DropboxItem } from '@/types/dropbox';

// Dropbox OAuth configuration
const DROPBOX_CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID || '';
const DROPBOX_REDIRECT_URI = `${window.location.origin}/auth/dropbox/callback`;

export const useDropbox = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dropboxItems, setDropboxItems] = useState<DropboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if we have a valid Dropbox token stored
  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      const { data: storedToken } = await supabase
        .from('user_dropbox_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (storedToken?.access_token) {
        // Dropbox tokens don't expire unless revoked, but check if expires_at is set
        if (storedToken.expires_at) {
          const expiresAt = new Date(storedToken.expires_at);
          if (expiresAt > new Date()) {
            setIsAuthenticated(true);
            return true;
          }
        } else {
          // No expiration = long-lived token
          setIsAuthenticated(true);
          return true;
        }
      }

      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Error checking Dropbox connection:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, [user]);

  // Check connection on mount and when user changes
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Get the current access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data: storedToken } = await supabase
      .from('user_dropbox_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storedToken?.access_token) {
      // Check expiration if set
      if (storedToken.expires_at) {
        const expiresAt = new Date(storedToken.expires_at);
        if (expiresAt > new Date()) {
          return storedToken.access_token;
        }
      } else {
        return storedToken.access_token;
      }
    }

    return null;
  }, [user]);

  // Connect to Dropbox using OAuth 2.0 popup flow
  const signIn = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in first before connecting Dropbox.',
        variant: 'destructive',
      });
      return;
    }

    if (!DROPBOX_CLIENT_ID) {
      toast({
        title: 'Configuration Error',
        description: 'Dropbox integration is not configured. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningIn(true);

    try {
      // Generate a random state for CSRF protection
      const state = crypto.randomUUID();
      sessionStorage.setItem('dropbox_oauth_state', state);

      // Build the authorization URL
      const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
      authUrl.searchParams.set('client_id', DROPBOX_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', DROPBOX_REDIRECT_URI);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('token_access_type', 'offline'); // Get refresh token

      // Open popup for OAuth
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl.toString(),
        'dropbox-auth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      // Listen for the callback message
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'dropbox-oauth-callback') {
          window.removeEventListener('message', handleMessage);

          const { code, state: returnedState, error } = event.data;

          if (error) {
            console.error('Dropbox OAuth error:', error);
            toast({
              title: 'Connection Failed',
              description: error || 'Failed to connect to Dropbox',
              variant: 'destructive',
            });
            setIsSigningIn(false);
            return;
          }

          // Verify state
          const savedState = sessionStorage.getItem('dropbox_oauth_state');
          if (returnedState !== savedState) {
            toast({
              title: 'Security Error',
              description: 'OAuth state mismatch. Please try again.',
              variant: 'destructive',
            });
            setIsSigningIn(false);
            return;
          }

          // Exchange code for tokens via edge function
          try {
            const { data, error: funcError } = await supabase.functions.invoke('store-dropbox-tokens', {
              body: { code, redirect_uri: DROPBOX_REDIRECT_URI }
            });

            if (funcError) {
              throw new Error(funcError.message || 'Failed to store tokens');
            }

            if (data?.error) {
              throw new Error(data.error);
            }

            setIsAuthenticated(true);
            toast({
              title: 'Connected Successfully!',
              description: 'Dropbox is now connected.',
            });
          } catch (storeError: any) {
            console.error('Error storing Dropbox token:', storeError);
            toast({
              title: 'Storage Error',
              description: `Failed to save token: ${storeError?.message || 'Unknown error'}`,
              variant: 'destructive',
            });
          }

          sessionStorage.removeItem('dropbox_oauth_state');
          setIsSigningIn(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed without completing auth
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setIsSigningIn(false);
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting to Dropbox:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Dropbox',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  }, [user, toast]);

  // Disconnect from Dropbox
  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      // Delete the stored token
      const { error } = await supabase
        .from('user_dropbox_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setIsAuthenticated(false);
      setDropboxItems([]);
      toast({
        title: 'Disconnected',
        description: 'Dropbox has been disconnected.',
      });
    } catch (error) {
      console.error('Error disconnecting Dropbox:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Dropbox',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Load Dropbox items (root folder contents)
  const loadDropboxItems = useCallback(async (path: string = '') => {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      toast({
        title: 'Not Connected',
        description: 'Please connect Dropbox first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: path || '',
          recursive: false,
          include_deleted: false,
          include_has_explicit_shared_members: false,
          include_mounted_folders: true,
          include_non_downloadable_files: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error_summary || `Dropbox API error: ${response.status}`);
      }

      const data = await response.json();
      setDropboxItems(data.entries || []);
    } catch (error) {
      console.error('Error loading Dropbox items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Dropbox items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, toast]);

  // Initialize (check connection)
  const initializeDropbox = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  return {
    isAuthenticated,
    dropboxItems,
    isLoading,
    isSigningIn,
    initializeDropbox,
    signIn,
    disconnect,
    loadDropboxItems,
    checkConnection,
  };
};
