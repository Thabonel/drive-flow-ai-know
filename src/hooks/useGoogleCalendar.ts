import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  // Store tokens securely in database - returns true on success, false on failure
  const storeTokens = useCallback(async (tokenResponse: any): Promise<boolean> => {
    if (!user) {
      console.error('storeTokens: No user available');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('store-google-tokens', {
        body: {
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token || null,
          token_type: tokenResponse.token_type || 'Bearer',
          expires_in: tokenResponse.expires_in || 3600,
          scope: tokenResponse.scope,
        }
      });

      if (error) {
        console.error('Error storing tokens:', error);
        throw error;
      }

      console.log('Calendar tokens stored securely:', data);
      return true;
    } catch (error) {
      console.error('Error storing tokens:', error);
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

  // Initialize Google Calendar API
  const initializeGoogleCalendar = useCallback(async () => {
    try {
      const { data: config, error } = await supabase.functions.invoke('get-google-config');
      if (error) throw error;

      // Load Google API scripts
      await Promise.all([
        loadScript('https://accounts.google.com/gsi/client'),
        loadScript('https://apis.google.com/js/api.js')
      ]);

      // Load GAPI client
      await new Promise((resolve, reject) => {
        window.gapi.load('client', {callback: resolve, onerror: reject});
      });

      // Initialize GAPI client for Calendar API
      await window.gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      });

      console.log('Google Calendar API initialized');
    } catch (error) {
      console.error('Error initializing Google Calendar services:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize Google Calendar services',
        variant: 'destructive',
      });
    }
  }, [loadScript, toast]);

  // Load user's calendar list from Google
  const loadCalendars = useCallback(async () => {
    if (!user) return [];

    setIsLoading(true);
    try {
      // Ensure GAPI Calendar client is initialized (not just client)
      if (!window.gapi?.client?.calendar) {
        console.log('GAPI Calendar client not ready, initializing...');
        await initializeGoogleCalendar();
      }

      // Safety double-check after initialization
      if (!window.gapi?.client?.calendar) {
        throw new Error('Google Calendar API failed to load. Please refresh and try again.');
      }

      // Ensure token is set in GAPI from stored tokens
      if (!window.gapi?.client?.getToken()) {
        console.log('No GAPI token set, fetching from database...');
        // Fetch stored token from database
        const { data: tokenData, error: tokenError } = await supabase
          .from('user_google_tokens')
          .select('access_token')
          .eq('user_id', user.id)
          .single();

        if (tokenError || !tokenData?.access_token) {
          console.error('No stored token found:', tokenError);
          throw new Error('No Google token found. Please reconnect your Google Calendar.');
        }

        // Set token in GAPI
        console.log('Setting token in GAPI client');
        window.gapi.client.setToken({ access_token: tokenData.access_token });
      }

      const response = await window.gapi.client.calendar.calendarList.list({
        maxResults: 250,
        minAccessRole: 'writer', // Only calendars the user can write to
      });

      const calendarList = response.result.items || [];
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
  }, [toast, user, initializeGoogleCalendar]);

  // Connect to Google Calendar (OAuth flow) - matches working Google Drive pattern
  const connectCalendar = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Use same client ID as working Google Drive implementation
      const clientId = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

      toast({
        title: 'Opening Google Sign-In',
        description: 'Please sign in and grant access to Google Calendar',
      });

      // Load Google Identity Services script if not loaded (same as Google Drive)
      if (!window.google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
          document.head.appendChild(script);
        });
      }

      console.log('Creating token client with clientId:', clientId.substring(0, 20) + '...');

      // Match Google Drive pattern exactly - no error_callback, no FedCM
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: async (response: any) => {
          console.log('=== OAUTH CALLBACK FIRED ===');
          console.log('Calendar OAuth response received:', response);
          console.log('Has access_token:', !!response?.access_token);

          if (response.error) {
            console.error('OAuth error:', response);
            toast({
              title: 'Authentication Failed',
              description: response.error_description || 'Failed to connect to Google Calendar',
              variant: 'destructive',
            });
            setIsConnecting(false);
            return;
          }

          if (response.access_token) {
            console.log('=== ACCESS TOKEN RECEIVED ===');
            // Set the token in the Google API client
            window.gapi.client.setToken(response);
            console.log('Token set in GAPI client');

            // Store tokens securely in database - MUST succeed before proceeding
            console.log('Calling storeTokens...');
            const tokenStored = await storeTokens(response);
            if (!tokenStored) {
              console.error('Token storage failed - aborting connection');
              setIsConnecting(false);
              return; // STOP - token not in database, sync will fail
            }
            console.log('storeTokens completed successfully');

            // Update authentication state
            setIsAuthenticated(true);
            console.log('isAuthenticated set to true');

            // Load user's calendars
            console.log('Calling loadCalendars...');
            const calendarList = await loadCalendars();
            console.log('loadCalendars returned:', calendarList?.length, 'calendars');

            // Guard clause: abort if no calendars loaded
            if (!calendarList || calendarList.length === 0) {
              console.warn('No calendars loaded, aborting sync setup.');
              toast({
                title: 'Setup Failed',
                description: 'Could not load your calendars. Please try again.',
                variant: 'destructive',
              });
              setIsConnecting(false);
              return; // STOP HERE - do not call Edge Function
            }

            // Auto-select primary calendar if exists
            const primaryCalendar = calendarList.find(cal => cal.primary);
            if (primaryCalendar) {
              // Create or update sync settings - MUST confirm write before sync
              console.log('Creating sync settings for calendar:', primaryCalendar.id);
              const { data: settingsResult, error: settingsError } = await supabase
                .from('calendar_sync_settings')
                .upsert({
                  user_id: user?.id,
                  enabled: true,
                  selected_calendar_id: primaryCalendar.id,
                  sync_direction: 'both',
                  auto_sync_enabled: true,
                  sync_interval_minutes: 15,
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
                return; // STOP - settings not saved, sync will fail
              }
              console.log('Sync settings created successfully:', settingsResult);

              await loadSyncSettings();

              toast({
                title: 'Connected Successfully!',
                description: 'Syncing your calendar events now...',
              });

              // Automatically sync events after connection - INSIDE the if block
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
              // No primary calendar found - still connected but user needs to select manually
              toast({
                title: 'Connected!',
                description: 'Open Calendar Settings to select which calendar to sync.',
              });
            }

            setIsConnecting(false);
          } else {
            console.error('No access token in response:', response);
            setIsConnecting(false);
            throw new Error('No access token received from Google');
          }
        },
      });

      // Request the token (opens popup) - matching Google Drive pattern
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Calendar. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [storeTokens, loadCalendars, toast, user]);

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
