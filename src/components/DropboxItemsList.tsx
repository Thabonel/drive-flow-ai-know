import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, File, Loader2 } from 'lucide-react';
import { DropboxItem } from '@/types/dropbox';

interface DropboxItemsListProps {
  items: DropboxItem[];
  isLoading: boolean;
  onConfirmSelection: (selectedItems: DropboxItem[]) => void;
}

const DropboxItemsList = ({ items, isLoading, onConfirmSelection }: DropboxItemsListProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const selected = items.filter(item => selectedItems.has(item.id));
    onConfirmSelection(selected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading Dropbox files...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No files or folders found in your Dropbox root.</p>
        <p className="text-sm">Try adding some files to your Dropbox first.</p>
      </div>
    );
  }

  // Sort folders first, then files
  const sortedItems = [...items].sort((a, b) => {
    if (a['.tag'] === 'folder' && b['.tag'] !== 'folder') return -1;
    if (a['.tag'] !== 'folder' && b['.tag'] === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg cursor-pointer"
              onClick={() => toggleItem(item.id)}
            >
              <Checkbox
                checked={selectedItems.has(item.id)}
                onCheckedChange={() => toggleItem(item.id)}
              />
              {item['.tag'] === 'folder' ? (
                <Folder className="h-5 w-5 text-blue-500" />
              ) : (
                <File className="h-5 w-5 text-gray-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.path_display}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
        </p>
        <Button
          onClick={handleConfirm}
          disabled={selectedItems.size === 0}
        >
          Add Selected
        </Button>
      </div>
    </div>
  );
};

export default DropboxItemsList;
