import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Cloud } from 'lucide-react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import GoogleAuthCard from '@/components/GoogleAuthCard';
import DriveItemsList from '@/components/DriveItemsList';
import { DriveItem, SelectedDriveItem } from '@/types/googleDrive';

interface GoogleDrivePickerProps {
  onItemsSelected: (items: SelectedDriveItem[]) => void;
}

const GoogleDrivePicker = ({ onItemsSelected }: GoogleDrivePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, driveItems, isLoading, isSigningIn, initializeGoogleDrive, signIn } = useGoogleDrive();

  const handleConfirmSelection = (selectedItems: DriveItem[]) => {
    const formattedItems: SelectedDriveItem[] = selectedItems.map(item => ({
      folder_id: item.id,
      folder_name: item.name,
      folder_path: null
    }));
    
    onItemsSelected(formattedItems);
    setIsOpen(false);
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
          <GoogleAuthCard onSignIn={signIn} isLoading={isSigningIn} />
        ) : (
          <DriveItemsList
            items={driveItems}
            isLoading={isLoading}
            onConfirmSelection={handleConfirmSelection}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GoogleDrivePicker;