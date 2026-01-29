import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GoogleSheet {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
}

export interface SheetData {
  range: string;
  majorDimension: string;
  values: any[][];
}

export interface SheetMetadata {
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      gridProperties: {
        rowCount: number;
        columnCount: number;
      };
    };
  }>;
  properties: {
    title: string;
  };
}

export const useGoogleSheets = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if we have a valid Google token (reuse Drive token with extended scope)
  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsAuthenticated(false);
      return false;
    }

    try {
      // Check if there's a provider token in the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.provider_token) {
        setIsAuthenticated(true);
        return true;
      }

      // Fall back to checking stored tokens
      const { data: storedToken } = await supabase
        .from('user_google_tokens')
        .select('access_token, expires_at, scope')
        .eq('user_id', user.id)
        .maybeSingle();

      if (storedToken?.access_token) {
        // Check if token has Sheets scope
        const hasSheetScope = storedToken.scope?.includes('spreadsheets');
        const expiresAt = new Date(storedToken.expires_at);

        if (expiresAt > new Date() && hasSheetScope) {
          setIsAuthenticated(true);
          return true;
        }
      }

      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Error checking Sheets connection:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, [user]);

  // Check connection on mount and when user changes
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Call Google Sheets API via our Edge Function
  const callSheetsAPI = useCallback(async (action: string, params: any = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-api', {
        body: { action, ...params }
      });

      if (error) {
        throw new Error(error.message || 'Google Sheets API call failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.data;
    } catch (error) {
      console.error(`Google Sheets API error (${action}):`, error);
      throw error;
    }
  }, []);

  // List user's Google Sheets
  const listSheets = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Not Connected',
        description: 'Please connect Google Sheets first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const sheetsData = await callSheetsAPI('list');
      setSheets(sheetsData || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, callSheetsAPI, toast]);

  // Get sheet metadata
  const getSheetMetadata = useCallback(async (sheetId: string): Promise<SheetMetadata | null> => {
    try {
      return await callSheetsAPI('metadata', { sheet_id: sheetId });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get sheet information',
        variant: 'destructive',
      });
      return null;
    }
  }, [callSheetsAPI, toast]);

  // Read data from a sheet
  const readSheetData = useCallback(async (sheetId: string, range?: string): Promise<SheetData | null> => {
    try {
      return await callSheetsAPI('read', { sheet_id: sheetId, range });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to read sheet data',
        variant: 'destructive',
      });
      return null;
    }
  }, [callSheetsAPI, toast]);

  // Write data to a sheet
  const writeSheetData = useCallback(async (
    sheetId: string,
    data: any[][],
    range?: string
  ): Promise<boolean> => {
    try {
      await callSheetsAPI('write', { sheet_id: sheetId, data, range });
      toast({
        title: 'Success',
        description: 'Sheet updated successfully',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sheet',
        variant: 'destructive',
      });
      return false;
    }
  }, [callSheetsAPI, toast]);

  // Create a new sheet
  const createSheet = useCallback(async (
    title: string,
    headers?: string[]
  ): Promise<GoogleSheet | null> => {
    try {
      const result = await callSheetsAPI('create', { title, headers });
      toast({
        title: 'Success',
        description: `Sheet "${title}" created successfully`,
      });

      // Refresh sheets list
      await listSheets();

      // Return the created sheet info
      return {
        id: result.spreadsheetId,
        name: title,
        createdTime: new Date().toISOString(),
        modifiedTime: new Date().toISOString(),
        webViewLink: result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}`
      };
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new sheet',
        variant: 'destructive',
      });
      return null;
    }
  }, [callSheetsAPI, toast, listSheets]);

  // Sign in uses the same Google OAuth as Drive (with extended scope)
  const signIn = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in first before connecting Google Sheets.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningIn(true);

    try {
      // Use Google Identity Services for token-only flow
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

      // Request access token with Sheets scope
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google OAuth error:', response.error);
            toast({
              title: 'Connection Failed',
              description: response.error_description || 'Failed to connect to Google',
              variant: 'destructive',
            });
            setIsSigningIn(false);
            return;
          }

          // Got access token - store it via edge function
          try {
            const { data, error } = await supabase.functions.invoke('store-google-tokens', {
              body: {
                access_token: response.access_token,
                refresh_token: null,
                token_type: 'Bearer',
                expires_in: response.expires_in || 3600,
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
              }
            });

            if (error || data?.error) {
              throw new Error(error?.message || data?.error || 'Failed to store token');
            }

            setIsAuthenticated(true);
            toast({
              title: 'Connected Successfully!',
              description: 'Google Sheets is now connected.',
            });

            // Automatically load sheets after successful authentication
            await listSheets();
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

      // Request the token (opens popup)
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (error) {
      console.error('Error connecting to Google Sheets:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Sheets',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  }, [user, toast, listSheets]);

  // Disconnect (clear stored token)
  const disconnect = useCallback(async () => {
    try {
      if (user) {
        await supabase
          .from('user_google_tokens')
          .delete()
          .eq('user_id', user.id);
      }

      setIsAuthenticated(false);
      setSheets([]);

      toast({
        title: 'Disconnected',
        description: 'Google Sheets connection removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Sheets',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  return {
    // State
    isAuthenticated,
    sheets,
    isLoading,
    isSigningIn,

    // Actions
    signIn,
    disconnect,
    listSheets,
    getSheetMetadata,
    readSheetData,
    writeSheetData,
    createSheet,
    checkConnection,
  };
};