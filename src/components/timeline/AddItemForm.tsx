// Form for adding new timeline items

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
import { TimelineLayer, getRandomItemColor } from '@/lib/timelineUtils';
import { QUICK_ADD_DURATIONS } from '@/lib/timelineConstants';

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  layers: TimelineLayer[];
  onAddItem: (
    layerId: string,
    title: string,
    startTime: string,
    durationMinutes: number,
    color: string
  ) => Promise<void>;
  onAddLayer: (name: string, color?: string) => Promise<any>;
}

export function AddItemForm({
  open,
  onClose,
  layers,
  onAddItem,
  onAddLayer,
}: AddItemFormProps) {
  const [title, setTitle] = useState('');
  const [hoursFromNow, setHoursFromNow] = useState(1);
  const [duration, setDuration] = useState(60);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [newLayerName, setNewLayerName] = useState('');
  const [isCreatingLayer, setIsCreatingLayer] = useState(false);
  const [color, setColor] = useState(getRandomItemColor());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let layerId = selectedLayerId;

    // If creating a new layer
    if (isCreatingLayer && newLayerName.trim()) {
      const newLayer = await onAddLayer(newLayerName.trim());
      if (newLayer) {
        layerId = newLayer.id;
      } else {
        return; // Failed to create layer
      }
    }

    if (!layerId || !title.trim()) {
      return;
    }

    // Calculate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + hoursFromNow);

    await onAddItem(
      layerId,
      title.trim(),
      startTime.toISOString(),
      duration,
      color
    );

    // Reset form
    setTitle('');
    setHoursFromNow(1);
    setDuration(60);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    onClose();
  };

  const handleQuickDuration = (minutes: number) => {
    setDuration(minutes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Timeline Item</DialogTitle>
          <DialogDescription>
            Create a new item on your timeline
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              required
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="hoursFromNow">Start Time</Label>
            <div className="flex items-center gap-2">
              <Input
                id="hoursFromNow"
                type="number"
                value={hoursFromNow}
                onChange={(e) => setHoursFromNow(Number(e.target.value))}
                step="0.25"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                hours from now
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Use negative values for past items
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min="1"
              required
            />
            <div className="flex gap-2">
              {QUICK_ADD_DURATIONS.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDuration(minutes)}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
          </div>

          {/* Layer Selection */}
          <div className="space-y-2">
            <Label>Layer *</Label>
            {!isCreatingLayer ? (
              <div className="space-y-2">
                <Select
                  value={selectedLayerId}
                  onValueChange={setSelectedLayerId}
                  required={!isCreatingLayer}
                >
                  <SelectTrigger>
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
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setIsCreatingLayer(true)}
                  className="p-0 h-auto"
                >
                  + Create New Layer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  placeholder="New layer name"
                  required={isCreatingLayer}
                />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setIsCreatingLayer(false);
                    setNewLayerName('');
                  }}
                  className="p-0 h-auto"
                >
                  Cancel - Use Existing Layer
                </Button>
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColor(getRandomItemColor())}
              >
                Random
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
