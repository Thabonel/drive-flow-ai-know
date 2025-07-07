import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, File, Cloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface GoogleDrivePickerProps {
  onItemsSelected: (items: { folder_id: string; folder_name: string; folder_path: string | null }[]) => void;
}

const GoogleDrivePicker = ({ onItemsSelected }: GoogleDrivePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const initializeGoogleDrive = async () => {
    try {
      // Fetch Google API configuration from edge function
      const { data: config, error } = await supabase.functions.invoke('get-google-config');
      if (error) throw error;

      // Load Google Identity Services and API client
      await Promise.all([
        loadScript('https://accounts.google.com/gsi/client'),
        loadScript('https://apis.google.com/js/api.js')
      ]);

      // Initialize Google API client
      await new Promise((resolve, reject) => {
        window.gapi.load('client', {callback: resolve, onerror: reject});
      });

      await window.gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      });

      // Initialize Google Identity Services
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
  };

  const loadScript = (src: string): Promise<void> => {
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
  };

  const handleCredentialResponse = async (response: any) => {
    try {
      // For OAuth 2.0 with PKCE, we need to handle the token differently
      // This is called when using Google Identity Services
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
  };

  const signIn = async () => {
    try {
      // Use OAuth 2.0 with PKCE for Drive API access
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
  };

  const getClientId = async () => {
    const { data: config } = await supabase.functions.invoke('get-google-config');
    return config.clientId;
  };

  const loadDriveItems = async () => {
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
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleConfirmSelection = () => {
    const selectedDriveItems = driveItems.filter(item => selectedItems.has(item.id));
    const formattedItems = selectedDriveItems.map(item => ({
      folder_id: item.id,
      folder_name: item.name,
      folder_path: null // We could build path from parents if needed
    }));
    
    onItemsSelected(formattedItems);
    setIsOpen(false);
    setSelectedItems(new Set());
  };

  const isFolderType = (mimeType: string) => {
    return mimeType === 'application/vnd.google-apps.folder';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          onClick={() => {
            setIsOpen(true);
            if (!isAuthenticated) {
              initializeGoogleDrive();
            }
          }}
        >
          <Cloud className="h-4 w-4 mr-2" />
          Browse Google Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select from Google Drive</DialogTitle>
          <DialogDescription>
            Choose files and folders from your Google Drive to sync
          </DialogDescription>
        </DialogHeader>
        
        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect to Google Drive</CardTitle>
              <CardDescription>
                Sign in to your Google account to browse and select files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={signIn}>
                <Cloud className="h-4 w-4 mr-2" />
                Sign in to Google Drive
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              {isLoading ? (
                <div className="text-center py-8">Loading your Google Drive...</div>
              ) : driveItems.length === 0 ? (
                <div className="text-center py-8">No files or folders found</div>
              ) : (
                <div className="space-y-2">
                  {driveItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                      />
                      {isFolderType(item.mimeType) ? (
                        <FolderOpen className="h-4 w-4 text-primary" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {isFolderType(item.mimeType) ? 'Folder' : 'File'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {selectedItems.size > 0 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} item(s) selected
                </span>
                <Button onClick={handleConfirmSelection}>
                  Add Selected Items
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GoogleDrivePicker;