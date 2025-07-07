import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DriveItem } from '@/types/googleDrive';

export const useGoogleDrive = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  const getClientId = useCallback(async () => {
    const { data: config } = await supabase.functions.invoke('get-google-config');
    return config.clientId;
  }, []);

  const loadDriveItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await window.gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' or mimeType contains 'document'",
        fields: 'files(id,name,mimeType,parents)',
        pageSize: 100
      });

      setDriveItems(response.result.files || []);
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
  }, [toast]);

  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      console.log('Credential response:', response);
      setIsAuthenticated(true);
      await loadDriveItems();
    } catch (error) {
      console.error('Error handling credential response:', error);
      toast({
        title: 'Error',
        description: 'Failed to authenticate with Google',
        variant: 'destructive',
      });
    }
  }, [loadDriveItems, toast]);

  const initializeGoogleDrive = useCallback(async () => {
    try {
      const { data: config, error } = await supabase.functions.invoke('get-google-config');
      if (error) throw error;

      await Promise.all([
        loadScript('https://accounts.google.com/gsi/client'),
        loadScript('https://apis.google.com/js/api.js')
      ]);

      await new Promise((resolve, reject) => {
        window.gapi.load('client', {callback: resolve, onerror: reject});
      });

      await window.gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      });

      window.google.accounts.id.initialize({
        client_id: config.clientId,
        callback: handleCredentialResponse,
      });

      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error initializing Google services:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize Google Drive services',
        variant: 'destructive',
      });
    }
  }, [loadScript, handleCredentialResponse, toast]);

  const signIn = useCallback(async () => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: await getClientId(),
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.access_token) {
            window.gapi.client.setToken(response);
            setIsAuthenticated(true);
            loadDriveItems();
          }
        },
      });
      
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in to Google Drive',
        variant: 'destructive',
      });
    }
  }, [getClientId, loadDriveItems, toast]);

  return {
    isAuthenticated,
    driveItems,
    isLoading,
    initializeGoogleDrive,
    signIn,
    loadDriveItems
  };
};