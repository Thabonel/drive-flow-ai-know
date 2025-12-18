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

  // Sign in with Google using Supabase OAuth
  const signIn = useCallback(async () => {
    setIsSigningIn(true);

    try {
      toast({
        title: 'Connecting to Google',
        description: 'You will be redirected to sign in with Google...',
      });

      // Check if user is already logged in
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (currentSession?.user) {
        // User is logged in - try to link Google identity (preserves session)
        console.log('User logged in, attempting to link Google identity...');
        const { error: linkError } = await supabase.auth.linkIdentity({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/drive.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            redirectTo: `${window.location.origin}/settings`,
          },
        });

        if (linkError) {
          // If linking is disabled or fails, inform user
          if (linkError.message.includes('Manual linking is disabled')) {
            console.log('Manual linking disabled, need to enable in Supabase dashboard');
            toast({
              title: 'Configuration Required',
              description: 'Please enable "Manual linking" in Supabase Authentication settings, then try again.',
              variant: 'destructive',
            });
            setIsSigningIn(false);
            return;
          }
          throw linkError;
        }
      } else {
        // No user logged in - use signInWithOAuth
        console.log('No user session, using signInWithOAuth...');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/drive.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            redirectTo: `${window.location.origin}/settings`,
          },
        });

        if (error) {
          throw error;
        }
      }
      // Note: OAuth redirects, so isSigningIn will reset on page load
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Drive',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  }, [toast]);

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
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
          q: "mimeType='application/vnd.google-apps.folder' or mimeType contains 'document'",
          fields: 'files(id,name,mimeType,parents)',
          pageSize: '100'
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
