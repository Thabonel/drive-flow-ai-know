import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleOAuth } from '@/hooks/useGoogleOAuth';
import { DriveItem } from '@/types/googleDrive';

export const useGoogleDrive = () => {
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'My Drive' }
  ]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Use secure OAuth utility
  const {
    isAuthenticated,
    initiateGoogleOAuth,
    checkConnection,
    disconnect: disconnectOAuth,
  } = useGoogleOAuth();

  // Initialize connection check from secure OAuth utility
  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user, checkConnection]);

  // Get the current access token (from stored tokens)
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

  // Load Drive items using the access token
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
      // Query for items in the specified folder
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

  // Sign in using secure OAuth with PKCE
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
      // Use secure OAuth with Google Drive and Sheets scopes
      await initiateGoogleOAuth('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets');

      // Automatically load drive items after successful authentication
      setTimeout(() => {
        loadDriveItems('root');
      }, 1000); // Small delay to ensure token is properly stored
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Drive',
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  }, [user, toast, loadDriveItems, initiateGoogleOAuth]);

  // Disconnect Google Drive
  const disconnect = useCallback(async () => {
    try {
      await disconnectOAuth();
      setDriveItems([]);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setCurrentFolder('root');

      toast({
        title: 'Disconnected',
        description: 'Google Drive has been disconnected.',
      });
    } catch (error) {
      console.error('Error disconnecting Google Drive:', error);
      toast({
        title: 'Disconnection Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect Google Drive',
        variant: 'destructive',
      });
    }
  }, [disconnectOAuth, toast]);

  // Initialize Google Drive by checking connection
  const initializeGoogleDrive = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  // Navigate into a folder
  const navigateToFolder = useCallback(async (folderId: string, folderName: string) => {
    // Add to breadcrumbs
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    await loadDriveItems(folderId);
  }, [loadDriveItems]);

  // Navigate back via breadcrumb
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
    initializeGoogleDrive,
    signIn,
    disconnect,
    loadDriveItems,
    navigateToFolder,
    navigateToBreadcrumb,
    checkConnection,
  };
};
