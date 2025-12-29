// Panel for viewing and restoring parked timeline items

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParkedItem, TimelineLayer } from '@/lib/timelineUtils';
import { Archive, Trash2, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ParkedItemsPanelProps {
  open: boolean;
  onClose: () => void;
  parkedItems: ParkedItem[];
  layers: TimelineLayer[];
  onRestoreItem: (parkedItemId: string, layerId: string, startTime: string) => Promise<void>;
  onDeleteParkedItem?: (parkedItemId: string) => Promise<void>;
}

export function ParkedItemsPanel({
  open,
  onClose,
  parkedItems,
  layers,
  onRestoreItem,
  onDeleteParkedItem,
}: ParkedItemsPanelProps) {
  const [restoringItemId, setRestoringItemId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [hoursFromNow, setHoursFromNow] = useState(1);

  const handleRestore = async (parkedItem: ParkedItem) => {
    setRestoringItemId(parkedItem.id);
  };

  const handleConfirmRestore = async () => {
    if (!restoringItemId || !selectedLayerId) return;

    // Calculate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + hoursFromNow);

    await onRestoreItem(restoringItemId, selectedLayerId, startTime.toISOString());

    // Reset
    setRestoringItemId(null);
    setSelectedLayerId('');
    setHoursFromNow(1);
  };

  const handleCancelRestore = () => {
    setRestoringItemId(null);
    setSelectedLayerId('');
    setHoursFromNow(1);
  };

  const restoringItem = parkedItems.find(item => item.id === restoringItemId);

  return (
    <TooltipProvider delayDuration={300}>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Parked Items
          </DialogTitle>
          <DialogDescription>
            Items you've parked for later. Restore them to your timeline when you're ready.
          </DialogDescription>
        </DialogHeader>

        {restoringItemId ? (
          // Restore form
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-1">{restoringItem?.title}</h3>
              <p className="text-sm text-muted-foreground">
                Duration: {restoringItem?.duration_minutes} minutes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restore-layer">Restore to Layer *</Label>
              <Select
                value={selectedLayerId}
                onValueChange={setSelectedLayerId}
                required
              >
                <SelectTrigger id="restore-layer">
                  <SelectValue placeholder="Select a layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((layer) => (
                    <SelectItem key={layer.id} value={layer.id}>
                      {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restore-time">Start Time</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="restore-time"
                  type="number"
                  value={hoursFromNow}
                  onChange={(e) => setHoursFromNow(Number(e.target.value))}
                  step="0.25"
                />
                <span className="text-sm text-muted-foreground">
                  hours from now
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use negative values for past items
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleConfirmRestore}
                disabled={!selectedLayerId}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Restore to Timeline
              </Button>
              <Button
                onClick={handleCancelRestore}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Parked items list
          <div className="space-y-3 py-4">
            {parkedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No parked items</p>
                <p className="text-sm">Park items to save them for later</p>
              </div>
            ) : (
              parkedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Duration: {item.duration_minutes}m</span>
                        <span>
                          Parked: {new Date(item.parked_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRestore(item)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      {onDeleteParkedItem && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => onDeleteParkedItem(item.id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Delete parked item
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!restoringItemId && (
          <DialogFooter>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
