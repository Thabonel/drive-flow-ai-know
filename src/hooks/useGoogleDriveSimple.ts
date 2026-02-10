import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DriveItem } from '@/types/googleDrive';

// Google Client ID (public - safe to include in frontend code)
const GOOGLE_CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

export const useGoogleDriveSimple = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'My Drive' }
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Refresh the access token using the stored refresh token (transparent to user)
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('Drive: Attempting to refresh Google access token...');
      const { data, error } = await supabase.functions.invoke('refresh-google-token', {});

      if (error) {
        console.error('Drive: Token refresh invocation error:', error);
        return null;
      }

      if (data?.needs_reauth) {
        console.log('Drive: Token refresh requires re-authentication:', data.error);
        setIsAuthenticated(false);
        return null;
      }

      if (data?.access_token) {
        console.log('Drive: Token refresh successful, refreshed:', data.refreshed);
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error('Drive: Token refresh failed:', error);
      return null;
    }
  }, []);

  // Check if we have a valid Google token, with auto-refresh support
  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      const { data: storedToken } = await supabase
        .from('user_google_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (storedToken?.access_token) {
        const expiresAt = new Date(storedToken.expires_at);
        const bufferMs = 5 * 60 * 1000; // 5 minutes
        const isExpiringSoon = new Date().getTime() >= (expiresAt.getTime() - bufferMs);

        if (!isExpiringSoon) {
          setIsAuthenticated(true);
          return true;
        }

        // Token expiring soon - try to refresh
        if (storedToken.refresh_token) {
          console.log('Drive: Token expiring soon, attempting auto-refresh...');
          const newToken = await refreshAccessToken();
          if (newToken) {
            setIsAuthenticated(true);
            return true;
          }
        }
      }

      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, [user, refreshAccessToken]);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Get access token, with auto-refresh if expired/expiring
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data: storedToken } = await supabase
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storedToken?.access_token) {
      const expiresAt = new Date(storedToken.expires_at);
      const bufferMs = 5 * 60 * 1000; // 5 minutes
      const isExpiringSoon = new Date().getTime() >= (expiresAt.getTime() - bufferMs);

      if (!isExpiringSoon) {
        return storedToken.access_token;
      }

      // Token expiring soon - try to refresh
      if (storedToken.refresh_token) {
        console.log('Drive: Access token expiring, refreshing before API call...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          return newToken;
        }
      }
    }
    return null;
  }, [user, refreshAccessToken]);

  // OAuth sign in using authorization code flow with manual popup (provides refresh tokens)
  const signIn = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in first before connecting Google Drive.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningIn(true);

    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'https://www.googleapis.com/auth/drive.readonly';

      console.log('Initializing authorization code flow for Google Drive (manual popup)...');

      // Build Google OAuth URL manually for full control over redirect_uri
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

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
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for the authorization code from our callback page
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'google-oauth-callback') return;

        window.removeEventListener('message', messageHandler);
        clearInterval(pollTimer);

        if (event.data.error) {
          toast({
            title: 'Connection Failed',
            description: event.data.error || 'Failed to connect to Google',
            variant: 'destructive',
          });
          setIsSigningIn(false);
          return;
        }

        if (!event.data.code) {
          toast({
            title: 'Connection Failed',
            description: 'No authorization code received from Google',
            variant: 'destructive',
          });
          setIsSigningIn(false);
          return;
        }

        try {
          console.log('Got authorization code, exchanging for tokens...');
          const { data, error } = await supabase.functions.invoke('store-google-tokens', {
            body: {
              code: event.data.code,
              redirect_uri: redirectUri,
              scope,
            }
          });

          if (error) throw new Error(error.message || 'Failed to exchange authorization code');
          if (data?.error) throw new Error(data.error);

          console.log('Tokens exchanged and stored:', {
            success: data?.success,
            hasRefreshToken: data?.has_refresh_token,
          });

          setIsAuthenticated(true);
          toast({
            title: 'Connected Successfully!',
            description: 'Google Drive is now connected.',
          });

          await loadDriveItems('root');
        } catch (storeError: any) {
          console.error('Error exchanging/storing tokens:', storeError);
          toast({
            title: 'Storage Error',
            description: `Failed to save token: ${storeError.message}`,
            variant: 'destructive',
          });
        }
        setIsSigningIn(false);
      };

      window.addEventListener('message', messageHandler);

      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            window.removeEventListener('message', messageHandler);
            setIsSigningIn(false);
          }
        } catch {
          clearInterval(pollTimer);
        }
      }, 1000);

    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Drive',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  }, [user, toast]); // loadDriveItems excluded - defined after signIn, called async in callback

  // Load Drive items
  const loadDriveItems = useCallback(async (folderId: string = 'root') => {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      toast({
        title: 'Not Connected',
        description: 'Please connect Google Drive first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id,name,mimeType,parents)',
          pageSize: '100',
          orderBy: 'folder,name'
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // If we get a 401, token might have been revoked - mark as disconnected
        if (response.status === 401) {
          console.log('Drive: Got 401, token may be revoked');
          setIsAuthenticated(false);
        }
        throw new Error(`Drive API error: ${response.status}`);
      }

      const data = await response.json();
      setDriveItems(data.files || []);
      setCurrentFolder(folderId);
    } catch (error) {
      console.error('Error loading drive items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Google Drive items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, toast]);

  const navigateToFolder = useCallback(async (folderId: string, folderName: string) => {
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    await loadDriveItems(folderId);
  }, [loadDriveItems]);

  const navigateToBreadcrumb = useCallback(async (index: number) => {
    const targetCrumb = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    await loadDriveItems(targetCrumb.id);
  }, [breadcrumbs, loadDriveItems]);

  return {
    isAuthenticated,
    driveItems,
    isLoading,
    isSigningIn,
    currentFolder,
    breadcrumbs,
    signIn,
    loadDriveItems,
    navigateToFolder,
    navigateToBreadcrumb,
    checkConnection,
  };
};
