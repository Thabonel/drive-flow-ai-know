import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DriveItem } from '@/types/googleDrive';

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

  // Check if we have a valid Google token
  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      const { data: storedToken } = await supabase
        .from('user_google_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (storedToken?.access_token) {
        const expiresAt = new Date(storedToken.expires_at);
        if (expiresAt > new Date()) {
          setIsAuthenticated(true);
          return true;
        }
      }

      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, [user]);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Get access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data: storedToken } = await supabase
      .from('user_google_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storedToken?.access_token) {
      const expiresAt = new Date(storedToken.expires_at);
      if (expiresAt > new Date()) {
        return storedToken.access_token;
      }
    }
    return null;
  }, [user]);

  // Simple OAuth sign in - EXACTLY like the working version
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
      // Use the EXACT same approach that worked a month ago
      const clientId = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

      // Load Google Identity Services script
      if (!window.google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
          document.head.appendChild(script);
        });
      }

      console.log('Initializing simple OAuth flow...');

      // SIMPLE token client - no PKCE, no state, no complexity
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly', // Single scope like the working version
        callback: async (response: any) => {
          console.log('OAuth callback response:', response);

          if (response.error) {
            console.error('Google OAuth error:', response);
            toast({
              title: 'Connection Failed',
              description: response.error_description || 'Failed to connect to Google',
              variant: 'destructive',
            });
            setIsSigningIn(false);
            return;
          }

          // Store token - same as working version
          console.log('Got Google access token, storing...');
          try {
            const { data, error } = await supabase.functions.invoke('store-google-tokens', {
              body: {
                access_token: response.access_token,
                refresh_token: null,
                token_type: 'Bearer',
                expires_in: response.expires_in || 3600,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
              }
            });

            if (error) throw new Error(error.message || 'Failed to store token');
            if (data?.error) throw new Error(data.error);
            if (!data?.success) throw new Error('Unexpected response from server');

            setIsAuthenticated(true);
            toast({
              title: 'Connected Successfully!',
              description: 'Google Drive is now connected.',
            });

            // Auto-load drive items
            await loadDriveItems('root');
          } catch (storeError: any) {
            console.error('Error storing token:', storeError);
            toast({
              title: 'Storage Error',
              description: `Failed to save token: ${storeError.message}`,
              variant: 'destructive',
            });
          }
          setIsSigningIn(false);
        },
      });

      // Request token with popup
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Drive',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  }, [user, toast]);

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