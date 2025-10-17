import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Cloud } from 'lucide-react';
import { useMicrosoft } from '@/hooks/useMicrosoft';
import MicrosoftAuthCard from '@/components/MicrosoftAuthCard';
import MicrosoftDriveItemsList from '@/components/MicrosoftDriveItemsList';

export interface MicrosoftDriveItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl: string;
  size?: number;
}

export interface SelectedMicrosoftItem {
  folder_id: string;
  folder_name: string;
  folder_path: string | null;
}

interface MicrosoftDrivePickerProps {
  onItemsSelected: (items: SelectedMicrosoftItem[]) => void;
}

const MicrosoftDrivePicker = ({ onItemsSelected }: MicrosoftDrivePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, driveItems, isLoading, signIn } = useMicrosoft();

  const handleConfirmSelection = (selectedItems: MicrosoftDriveItem[]) => {
    const formattedItems: SelectedMicrosoftItem[] = selectedItems.map(item => ({
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
          }}
        >
          <Cloud className="h-4 w-4 mr-2" />
          Browse OneDrive / SharePoint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select from Microsoft 365</DialogTitle>
          <DialogDescription>
            Choose files and folders from your OneDrive or SharePoint to sync
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <MicrosoftAuthCard onSignIn={signIn} />
        ) : (
          <MicrosoftDriveItemsList
            items={driveItems}
            isLoading={isLoading}
            onConfirmSelection={handleConfirmSelection}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MicrosoftDrivePicker;
