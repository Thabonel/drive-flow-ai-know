import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DriveItem } from '@/types/googleDrive';

export const useGoogleDrive = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if we have a valid Google token in session or stored
  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      // First check if there's a provider token in the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.provider_token) {
        setIsAuthenticated(true);
        return true;
      }

      // Fall back to checking stored tokens
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

  // Check connection on mount and when user changes
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Store provider token using edge function (bypasses RLS)
  const storeProviderToken = useCallback(async (session: any) => {
    if (!session?.provider_token || !session?.user?.id) return;

    console.log('Storing Google provider token via edge function...');
    try {
      const { data, error } = await supabase.functions.invoke('store-google-tokens', {
        body: {
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token || null,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
        }
      });

      if (error) {
        console.error('Error storing provider token:', error);
        toast({
          title: 'Storage Error',
          description: error.message || 'Failed to store Google token',
          variant: 'destructive',
        });
      } else {
        console.log('Token stored successfully:', data);
        setIsAuthenticated(true);
        toast({
          title: 'Connected Successfully!',
          description: 'Google Drive is now connected',
        });
      }
    } catch (error) {
      console.error('Error storing provider token:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to store Google token',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Check for provider token on mount (handles redirect from Google)
  useEffect(() => {
    const checkForProviderToken = async () => {
      // Check if we're returning from OAuth (URL might have hash with tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlAccessToken = hashParams.get('access_token');
      const urlProviderToken = hashParams.get('provider_token');

      if (urlAccessToken || urlProviderToken) {
        console.log('Detected OAuth callback in URL hash, waiting for session...');
        // Give Supabase a moment to process the URL hash
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      console.log('Session check on mount:', {
        hasSession: !!session,
        hasProviderToken: !!session?.provider_token,
        userId: session?.user?.id,
        error: error?.message
      });

      if (session?.provider_token) {
        console.log('Found provider token in session on mount');
        await storeProviderToken(session);
      } else if (session?.user) {
        // User is logged in but no provider token - check stored tokens
        console.log('No provider token in session, checking stored tokens...');
        await checkConnection();
      }
    };
    checkForProviderToken();
  }, [storeProviderToken, checkConnection]);

  // Listen for auth state changes (handles redirect back from Google)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, 'has provider_token:', !!session?.provider_token);

      // Check for provider token on any auth event
      if (session?.provider_token) {
        await storeProviderToken(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [storeProviderToken]);

  // Get the current access token (from session or stored)
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // First try session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      return session.provider_token;
    }

    // Fall back to stored token
    if (user) {
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
    }

    return null;
  }, [user]);

  // Connect Google Drive using Google Identity Services (popup, no session change)
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
      // Use Google Identity Services for token-only flow (doesn't affect Supabase session)
      const clientId = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

      // Load Google Identity Services script if not loaded
      if (!window.google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
          document.head.appendChild(script);
        });
      }

      // Request access token via popup (doesn't change Supabase session)
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
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

          // Got access token - store it via edge function
          console.log('Got Google access token, storing...');
          try {
            const { data, error } = await supabase.functions.invoke('store-google-tokens', {
              body: {
                access_token: response.access_token,
                refresh_token: null, // Token client doesn't provide refresh tokens
                token_type: 'Bearer',
                expires_in: response.expires_in || 3600,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
              }
            });

            console.log('Store tokens response:', { data, error });

            // Check for function-level error (network, auth, or 500)
            if (error) {
              console.error('Function invoke error:', error);
              // Try to get the actual error message from the response body
              let errorMessage = error.message || 'Function call failed';
              try {
                // FunctionsHttpError has context with the response
                if (error.context) {
                  const errorBody = await error.context.json();
                  console.error('Error body from function:', errorBody);
                  errorMessage = errorBody.error || errorMessage;
                }
              } catch (e) {
                console.error('Could not parse error body:', e);
              }
              throw new Error(errorMessage);
            }

            // Check for application-level error in response body
            if (data?.error) {
              console.error('Application error from function:', data.error);
              throw new Error(data.error);
            }

            if (!data?.success) {
              console.error('Unexpected response:', data);
              throw new Error('Unexpected response from server');
            }

            setIsAuthenticated(true);
            toast({
              title: 'Connected Successfully!',
              description: 'Google Drive is now connected.',
            });
          } catch (storeError: any) {
            console.error('Error storing token:', storeError);
            const errorMessage = storeError?.message || 'Unknown error';
            toast({
              title: 'Storage Error',
              description: `Failed to save token: ${errorMessage}`,
              variant: 'destructive',
            });
          }
          setIsSigningIn(false);
        },
      });

      // Request the token (opens popup)
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

  // Load Drive items using the access token
  const loadDriveItems = useCallback(async () => {
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
      // Query for root-level items only (in "My Drive", not nested in photo backups)
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
          q: "'root' in parents and trashed=false",
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

  // Initialize is now a no-op (Supabase handles everything)
  const initializeGoogleDrive = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  return {
    isAuthenticated,
    driveItems,
    isLoading,
    isSigningIn,
    initializeGoogleDrive,
    signIn,
    loadDriveItems,
    checkConnection,
  };
};
