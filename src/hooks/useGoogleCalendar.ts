import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Google Client ID (public - safe to include in frontend code)
const GOOGLE_CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  backgroundColor?: string;
  accessRole: string;
  primary?: boolean;
}

export interface CalendarSyncSettings {
  user_id: string;
  enabled: boolean;
  selected_calendar_id: string | null;
  sync_direction: 'to_calendar' | 'from_calendar' | 'both';
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  target_layer_id: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

export const useGoogleCalendar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [syncSettings, setSyncSettings] = useState<CalendarSyncSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Refresh the access token using the stored refresh token (transparent to user)
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('Calendar: Attempting to refresh Google access token...');
      const { data, error } = await supabase.functions.invoke('refresh-google-token', {});

      if (error) {
        console.error('Calendar: Token refresh invocation error:', error);
        return null;
      }

      if (data?.needs_reauth) {
        console.log('Calendar: Token refresh requires re-authentication:', data.error);
        setIsAuthenticated(false);
        return null;
      }

      if (data?.access_token) {
        console.log('Calendar: Token refresh successful, refreshed:', data.refreshed);
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error('Calendar: Token refresh failed:', error);
      return null;
    }
  }, []);

  // Store tokens securely in database via Edge Function (authorization code flow)
  // Now sends the authorization code instead of the access token
  const exchangeAndStoreTokens = useCallback(async (
    code: string,
    redirectUri: string,
    scope: string
  ): Promise<boolean> => {
    if (!user) {
      console.error('exchangeAndStoreTokens: No user available');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('store-google-tokens', {
        body: {
          code: code,
          redirect_uri: redirectUri,
          scope: scope,
        }
      });

      if (error) {
        console.error('Error exchanging/storing tokens:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Calendar tokens exchanged and stored securely:', {
        success: data?.success,
        hasRefreshToken: data?.has_refresh_token,
      });
      return true;
    } catch (error) {
      console.error('Error exchanging/storing tokens:', error);
      toast({
        title: 'Token Storage Failed',
        description: 'Failed to store authentication tokens. Please try connecting again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  // Load external script helper
  const loadScript = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }, []);

  // Initialize Google Calendar API - using OAuth-only pattern like Google Drive (no API key needed)
  const initializeGoogleCalendar = useCallback(async () => {
    try {
      // SAFETY CHECK: Prevent cascade failures from missing dependencies
      if (!isSupabaseConfigured) {
        console.warn('Supabase configuration not complete, skipping Calendar initialization');
        return;
      }

      // Load Google Identity Services script only (no GAPI needed)
      await loadScript('https://accounts.google.com/gsi/client');

      console.log('Google Calendar API initialized successfully (OAuth-only pattern)');
    } catch (error) {
      console.error('Error initializing Google Calendar services:', error);
      // PREVENT CASCADE: Don't show error toast that could cause module loading issues
      // Just log the error and return silently to prevent cascade failures
      return;
    }
  }, [loadScript]);

  // Get a valid access token, with auto-refresh if expired/expiring
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData?.access_token) {
      return null;
    }

    const expiresAt = new Date(tokenData.expires_at);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const isExpiringSoon = new Date().getTime() >= (expiresAt.getTime() - bufferMs);

    if (!isExpiringSoon) {
      return tokenData.access_token;
    }

    // Token expiring soon - try to refresh
    if (tokenData.refresh_token) {
      console.log('Calendar: Access token expiring, refreshing before API call...');
      const newToken = await refreshAccessToken();
      if (newToken) {
        return newToken;
      }
    }

    return null;
  }, [user, refreshAccessToken]);

  // Load user's calendar list from Google - using direct API calls (no GAPI client needed)
  const loadCalendars = useCallback(async () => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const accessToken = await getValidAccessToken();

      if (!accessToken) {
        throw new Error('No Google token found. Please reconnect your Google Calendar.');
      }

      // Make direct API call to Google Calendar REST API
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&minAccessRole=writer', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Calendar: Got 401, token may be revoked');
          setIsAuthenticated(false);
        }
        throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const calendarList = data.items || [];
      setCalendars(calendarList as GoogleCalendar[]);

      return calendarList as GoogleCalendar[];
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load Google Calendars',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, getValidAccessToken]);

  // Connect to Google Calendar (OAuth authorization code flow with manual popup)
  const connectCalendar = useCallback(async () => {
    setIsConnecting(true);
    try {
      toast({
        title: 'Opening Google Sign-In',
        description: 'Please sign in and grant access to Google Calendar',
      });

      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar';

      console.log('Initializing authorization code flow for Calendar (manual popup)...');

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
          console.error('OAuth error from callback:', event.data.error);
          toast({
            title: 'Authentication Failed',
            description: event.data.error || 'Failed to connect to Google Calendar',
            variant: 'destructive',
          });
          setIsConnecting(false);
          return;
        }

        if (!event.data.code) {
          toast({
            title: 'Authentication Failed',
            description: 'No authorization code received from Google',
            variant: 'destructive',
          });
          setIsConnecting(false);
          return;
        }

        console.log('=== AUTHORIZATION CODE RECEIVED ===');

        // Exchange authorization code for tokens via Edge Function
        console.log('Calling exchangeAndStoreTokens...');
        const tokenStored = await exchangeAndStoreTokens(
          event.data.code,
          redirectUri,
          scope
        );
        if (!tokenStored) {
          console.error('Token exchange/storage failed - aborting connection');
          setIsConnecting(false);
          return;
        }
        console.log('exchangeAndStoreTokens completed successfully');

        setIsAuthenticated(true);

        // Load user's calendars
        console.log('Calling loadCalendars...');
        const calendarList = await loadCalendars();
        console.log('loadCalendars returned:', calendarList?.length, 'calendars');

        if (!calendarList || calendarList.length === 0) {
          console.warn('No calendars loaded, aborting sync setup.');
          toast({
            title: 'Setup Failed',
            description: 'Could not load your calendars. Please try again.',
            variant: 'destructive',
          });
          setIsConnecting(false);
          return;
        }

        // Auto-select primary calendar if exists
        const primaryCalendar = calendarList.find(cal => cal.primary);
        if (primaryCalendar) {
          const { data: visibleLayers } = await supabase
            .from('timeline_layers')
            .select('id')
            .eq('user_id', user?.id)
            .eq('is_visible', true)
            .order('sort_order', { ascending: true })
            .limit(1);

          const targetLayerId = visibleLayers?.[0]?.id || null;

          const { data: settingsResult, error: settingsError } = await supabase
            .from('calendar_sync_settings')
            .upsert({
              user_id: user?.id,
              enabled: true,
              selected_calendar_id: primaryCalendar.id,
              sync_direction: 'both',
              auto_sync_enabled: true,
              sync_interval_minutes: 15,
              target_layer_id: targetLayerId,
            })
            .select()
            .single();

          if (settingsError || !settingsResult) {
            console.error('Failed to create sync settings:', settingsError);
            toast({
              title: 'Setup Failed',
              description: 'Could not save calendar settings. Please try again.',
              variant: 'destructive',
            });
            setIsConnecting(false);
            return;
          }

          await loadSyncSettings();

          toast({
            title: 'Connected Successfully!',
            description: 'Syncing your calendar events now...',
          });

          try {
            const { data: syncResult, error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
              body: {
                sync_type: 'initial',
                calendar_id: primaryCalendar.id,
              }
            });

            if (syncError) {
              console.error('Auto-sync error:', syncError);
              toast({
                title: 'Sync Warning',
                description: 'Connected successfully but initial sync failed. Try "Sync Now" manually.',
                variant: 'destructive',
              });
            } else {
              console.log('Auto-sync completed:', syncResult);
              toast({
                title: 'Calendar Synced!',
                description: `Imported ${syncResult?.items_created || 0} events from Google Calendar`,
              });
            }
          } catch (syncErr) {
            console.error('Auto-sync exception:', syncErr);
          }
        } else {
          toast({
            title: 'Connected!',
            description: 'Open Calendar Settings to select which calendar to sync.',
          });
        }

        setIsConnecting(false);
      };

      window.addEventListener('message', messageHandler);

      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer);
            window.removeEventListener('message', messageHandler);
            setIsConnecting(false);
          }
        } catch {
          clearInterval(pollTimer);
        }
      }, 1000);

    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Calendar. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [exchangeAndStoreTokens, loadCalendars, toast, user]); // loadSyncSettings excluded - defined after, called async

  // Disconnect from Google Calendar
  const disconnectCalendar = useCallback(async () => {
    try {
      if (!user) return;

      // Disable sync settings
      await supabase
        .from('calendar_sync_settings')
        .update({ enabled: false })
        .eq('user_id', user.id);

      // Clear authentication state
      setIsAuthenticated(false);
      setCalendars([]);
      setSyncSettings(null);

      toast({
        title: 'Disconnected',
        description: 'Google Calendar has been disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Calendar',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Load sync settings from database
  const loadSyncSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setSyncSettings(data as CalendarSyncSettings | null);

      // If sync is enabled, set authenticated state
      if (data?.enabled) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }
  }, [user]);

  // Update sync settings
  const updateSyncSettings = useCallback(async (updates: Partial<CalendarSyncSettings>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;

      setSyncSettings(data as CalendarSyncSettings);

      toast({
        title: 'Settings Updated',
        description: 'Calendar sync settings have been updated',
      });
    } catch (error) {
      console.error('Error updating sync settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sync settings',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Trigger manual sync
  const syncNow = useCallback(async () => {
    if (!user || !syncSettings?.enabled) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          sync_type: 'manual',
          calendar_id: syncSettings.selected_calendar_id,
        }
      });

      if (error) throw error;

      await loadSyncSettings(); // Refresh settings to get latest sync status

      toast({
        title: 'Sync Complete',
        description: `Synced ${data.events_synced || 0} events successfully`,
      });
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync calendar',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [user, syncSettings, toast, loadSyncSettings]);

  // Load sync settings on mount
  useEffect(() => {
    if (user) {
      initializeGoogleCalendar();
      loadSyncSettings();
    }
  }, [user, initializeGoogleCalendar, loadSyncSettings]);

  return {
    // State
    isAuthenticated,
    calendars,
    syncSettings,
    isLoading,
    isConnecting,
    isSyncing,

    // Methods
    connectCalendar,
    disconnectCalendar,
    loadCalendars,
    loadSyncSettings,
    updateSyncSettings,
    syncNow,
  };
};
