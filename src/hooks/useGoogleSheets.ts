import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleOAuth } from '@/hooks/useGoogleOAuth';

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
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
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

  // Call Google Sheets API via our secure Edge Function
  const callSheetsAPI = useCallback(async (action: string, params: any = {}) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session');
      }

      const { data, error } = await supabase.functions.invoke('google-sheets-api', {
        body: { action, ...params },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(`API call failed: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data?.data || data;
    } catch (error) {
      console.error('Sheets API error:', error);

      // Handle specific error cases
      if (error.message.includes('No Google Sheets access token')) {
        toast({
          title: 'Google Sheets Not Connected',
          description: 'Please connect your Google account first.',
          variant: 'destructive',
        });
        return null;
      }

      throw error;
    }
  }, [user, toast]);

  // List all Google Sheets
  const listSheets = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot list sheets');
      return;
    }

    setIsLoading(true);
    try {
      const sheetsData = await callSheetsAPI('list');
      if (sheetsData) {
        setSheets(sheetsData);
      }
    } catch (error) {
      console.error('Error listing sheets:', error);
      toast({
        title: 'Failed to Load Sheets',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      setSheets([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, callSheetsAPI, toast]);

  // Read data from a specific sheet
  const readSheet = useCallback(async (sheetId: string, range?: string): Promise<SheetData | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Google Sheets Not Connected',
        description: 'Please connect your Google account first.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const data = await callSheetsAPI('read', { sheet_id: sheetId, range });
      return data as SheetData;
    } catch (error) {
      console.error('Error reading sheet:', error);
      toast({
        title: 'Failed to Read Sheet',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return null;
    }
  }, [isAuthenticated, callSheetsAPI, toast]);

  // Write data to a specific sheet
  const writeSheet = useCallback(async (sheetId: string, data: any[][], range?: string): Promise<boolean> => {
    if (!isAuthenticated) {
      toast({
        title: 'Google Sheets Not Connected',
        description: 'Please connect your Google account first.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await callSheetsAPI('write', { sheet_id: sheetId, data, range });
      toast({
        title: 'Sheet Updated',
        description: 'Data has been written to the sheet successfully.',
      });
      return true;
    } catch (error) {
      console.error('Error writing sheet:', error);
      toast({
        title: 'Failed to Write Sheet',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return false;
    }
  }, [isAuthenticated, callSheetsAPI, toast]);

  // Create a new sheet
  const createSheet = useCallback(async (title: string, headers?: string[]): Promise<GoogleSheet | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Google Sheets Not Connected',
        description: 'Please connect your Google account first.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const newSheet = await callSheetsAPI('create', { title, headers });
      toast({
        title: 'Sheet Created',
        description: `"${title}" has been created successfully.`,
      });

      // Refresh the sheets list
      await listSheets();
      return newSheet as GoogleSheet;
    } catch (error) {
      console.error('Error creating sheet:', error);
      toast({
        title: 'Failed to Create Sheet',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return null;
    }
  }, [isAuthenticated, callSheetsAPI, toast, listSheets]);

  // Get sheet metadata
  const getSheetMetadata = useCallback(async (sheetId: string): Promise<SheetMetadata | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Google Sheets Not Connected',
        description: 'Please connect your Google account first.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const metadata = await callSheetsAPI('metadata', { sheet_id: sheetId });
      return metadata as SheetMetadata;
    } catch (error) {
      console.error('Error getting sheet metadata:', error);
      toast({
        title: 'Failed to Get Sheet Info',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return null;
    }
  }, [isAuthenticated, callSheetsAPI, toast]);

  // Sign in using secure OAuth with PKCE
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
      // Use secure OAuth with Google Drive and Sheets scopes
      await initiateGoogleOAuth('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets');

      // Automatically load sheets after successful authentication
      setTimeout(() => {
        listSheets();
      }, 1000); // Small delay to ensure token is properly stored
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  }, [user, toast, listSheets, initiateGoogleOAuth]);

  // Disconnect Google Sheets
  const disconnect = useCallback(async () => {
    try {
      await disconnectOAuth();
      setSheets([]);

      toast({
        title: 'Disconnected',
        description: 'Google Sheets has been disconnected.',
      });
    } catch (error) {
      console.error('Error disconnecting Google Sheets:', error);
      toast({
        title: 'Disconnection Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect Google Sheets',
        variant: 'destructive',
      });
    }
  }, [disconnectOAuth, toast]);

  // Auto-load sheets when authenticated
  useEffect(() => {
    if (isAuthenticated && sheets.length === 0) {
      listSheets();
    }
  }, [isAuthenticated, sheets.length, listSheets]);

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
    readSheet,
    writeSheet,
    createSheet,
    getSheetMetadata,
    checkConnection,
  };
};