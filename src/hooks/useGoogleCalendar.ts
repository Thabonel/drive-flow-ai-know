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

  // Get Google client ID from Edge Function
  const getClientId = useCallback(async () => {
    const { data: config } = await supabase.functions.invoke('get-google-config');
    return config.clientId;
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
      const clientId = await getClientId();

      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      toast({
        title: 'Redirecting to Google',
        description: 'Please sign in and grant access to Google Calendar',
      });

      console.log('Starting OAuth redirect flow with clientId:', clientId?.substring(0, 20) + '...');

      // Build OAuth URL for redirect flow
      const redirectUri = 'https://aiqueryhub.com/auth/google-calendar/callback';
      const scope = 'https://www.googleapis.com/auth/calendar.events';

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
      authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
      authUrl.searchParams.set('include_granted_scopes', 'true');

      console.log('Redirecting to:', authUrl.toString());

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();

      // Note: setIsConnecting(false) will be handled by page unload or callback page
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Calendar. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [getClientId, toast]);

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
