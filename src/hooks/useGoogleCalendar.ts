import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

// Key for storing OAuth state in localStorage
const OAUTH_STATE_KEY = 'google_calendar_oauth_state';

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
  const navigate = useNavigate();
  const location = useLocation();

  // Store tokens securely in database
  const storeTokens = useCallback(async (tokenResponse: any) => {
    if (!user) return;

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
    } catch (error) {
      console.error('Error storing tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to store authentication tokens securely',
        variant: 'destructive',
      });
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

  // Load user's calendar list from Google
  const loadCalendars = useCallback(async () => {
    setIsLoading(true);
    try {
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
        description: 'Failed to load Google Calendars',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  // Connect to Google Calendar (OAuth redirect flow)
  const connectCalendar = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Get config from Edge Function
      const { data: config, error: configError } = await supabase.functions.invoke('get-google-config');
      if (configError) throw configError;

      const clientId = config.clientId;
      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      // Load Google Identity Services script
      await loadScript('https://accounts.google.com/gsi/client');

      // Wait for window.google to be available
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services failed to load');
      }

      // Store the return path so we can redirect back after OAuth
      localStorage.setItem(OAUTH_STATE_KEY, JSON.stringify({
        returnPath: location.pathname,
        timestamp: Date.now(),
      }));

      toast({
        title: 'Redirecting to Google',
        description: 'You will be redirected to sign in with Google',
      });

      // Build the redirect URI - use the /auth/google-calendar/callback route
      const redirectUri = `${window.location.origin}/auth/google-calendar/callback`;

      // Use the OAuth 2.0 authorization URL directly for redirect flow
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('include_granted_scopes', 'true');

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Calendar. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [loadScript, toast, location.pathname]);

  // Handle OAuth callback - process token from URL hash
  const handleOAuthCallback = useCallback(async (hash: string) => {
    setIsConnecting(true);
    try {
      // Parse the hash fragment (remove leading #)
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const tokenType = params.get('token_type');
      const expiresIn = params.get('expires_in');
      const scope = params.get('scope');
      const error = params.get('error');

      if (error) {
        throw new Error(params.get('error_description') || 'Authentication failed');
      }

      if (!accessToken) {
        throw new Error('No access token received from Google');
      }

      console.log('OAuth callback received access token');

      // Get config for GAPI initialization
      const { data: config, error: configError } = await supabase.functions.invoke('get-google-config');
      if (configError) throw configError;

      // Load GAPI script
      await loadScript('https://apis.google.com/js/api.js');

      // Load GAPI client
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', { callback: resolve, onerror: reject });
      });

      // Initialize GAPI client for Calendar API
      await window.gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      });

      // Set the token in the Google API client
      const tokenResponse = {
        access_token: accessToken,
        token_type: tokenType || 'Bearer',
        expires_in: expiresIn ? parseInt(expiresIn) : 3600,
        scope: scope || '',
      };
      window.gapi.client.setToken(tokenResponse);

      // Store tokens securely in database
      await storeTokens(tokenResponse);

      // Update authentication state
      setIsAuthenticated(true);

      // Load user's calendars
      const calendarList = await loadCalendars();

      // Auto-select primary calendar if exists
      const primaryCalendar = calendarList.find(cal => cal.primary);
      if (primaryCalendar && user) {
        // Create or update sync settings
        await supabase
          .from('calendar_sync_settings')
          .upsert({
            user_id: user.id,
            enabled: true,
            selected_calendar_id: primaryCalendar.id,
            sync_direction: 'both',
            auto_sync_enabled: true,
            sync_interval_minutes: 15,
          });

        await loadSyncSettings();
      }

      toast({
        title: 'Connected Successfully!',
        description: 'Your Google Calendar is now connected',
      });

      // Get the return path and navigate back
      const stateStr = localStorage.getItem(OAUTH_STATE_KEY);
      localStorage.removeItem(OAUTH_STATE_KEY);

      if (stateStr) {
        const state = JSON.parse(stateStr);
        // Only use the return path if it's less than 10 minutes old
        if (Date.now() - state.timestamp < 10 * 60 * 1000) {
          navigate(state.returnPath);
          return;
        }
      }

      // Default to timeline page
      navigate('/timeline');
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast({
        title: 'Authentication Error',
        description: error instanceof Error ? error.message : 'Failed to complete Google Calendar connection',
        variant: 'destructive',
      });

      // Navigate back to timeline on error
      navigate('/timeline');
    } finally {
      setIsConnecting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadScript, storeTokens, loadCalendars, toast, user, navigate]);

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
    handleOAuthCallback,
    loadCalendars,
    loadSyncSettings,
    updateSyncSettings,
    syncNow,
  };
};
