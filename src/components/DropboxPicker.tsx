import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Cloud } from 'lucide-react';
import { useDropbox } from '@/hooks/useDropbox';
import DropboxAuthCard from '@/components/DropboxAuthCard';
import DropboxItemsList from '@/components/DropboxItemsList';
import { DropboxItem, SelectedDropboxItem } from '@/types/dropbox';

interface DropboxPickerProps {
  onItemsSelected: (items: SelectedDropboxItem[]) => void;
}

const DropboxPicker = ({ onItemsSelected }: DropboxPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, dropboxItems, isLoading, isSigningIn, initializeDropbox, signIn, loadDropboxItems } = useDropbox();

  const handleConfirmSelection = (selectedItems: DropboxItem[]) => {
    const formattedItems: SelectedDropboxItem[] = selectedItems.map(item => ({
      folder_id: item.id,
      folder_name: item.name,
      folder_path: item.path_display || null
    }));

    onItemsSelected(formattedItems);
    setIsOpen(false);
  };

  const handleOpen = async () => {
    setIsOpen(true);
    if (!isAuthenticated) {
      await initializeDropbox();
    } else {
      await loadDropboxItems();
    }
  };

  const handleSignIn = async () => {
    await signIn();
    // Load items after successful sign in
    setTimeout(async () => {
      await loadDropboxItems();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={handleOpen}
        >
          <Cloud className="h-4 w-4 mr-2" />
          Browse Dropbox
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 20l6 4 6-4-6-4-6 4z"/>
            </svg>
            Select from Dropbox
          </DialogTitle>
          <DialogDescription>
            Choose files and folders from your Dropbox to sync
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <DropboxAuthCard onSignIn={handleSignIn} isSigningIn={isSigningIn} />
        ) : (
          <DropboxItemsList
            items={dropboxItems}
            isLoading={isLoading}
            onConfirmSelection={handleConfirmSelection}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DropboxPicker;
