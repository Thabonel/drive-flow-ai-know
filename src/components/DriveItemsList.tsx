import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, File } from 'lucide-react';
import { DriveItem } from '@/types/googleDrive';

interface DriveItemsListProps {
  items: DriveItem[];
  isLoading: boolean;
  onConfirmSelection: (selectedItems: DriveItem[]) => void;
}

const DriveItemsList = ({ items, isLoading, onConfirmSelection }: DriveItemsListProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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
    const selectedDriveItems = items.filter(item => selectedItems.has(item.id));
    onConfirmSelection(selectedDriveItems);
    setSelectedItems(new Set());
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const isFolderType = (mimeType: string) => {
    return mimeType === 'application/vnd.google-apps.folder';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading your Google Drive...</div>;
  }

  if (items.length === 0) {
    return <div className="text-center py-8">No files or folders found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSelectAll}
          disabled={items.length === 0}
        >
          Select All
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDeselectAll}
          disabled={selectedItems.size === 0}
        >
          Deselect All
        </Button>
      </div>
      
      <ScrollArea className="h-96 w-full border rounded-md p-4">
        <div className="space-y-2">
          {items.map((item) => (
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
  );
};

export default DriveItemsList;