// Form for adding new timeline items

import React, { useState, useEffect } from 'react';
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
import { TimelineLayer, getRandomItemColor, TimelineItem } from '@/lib/timelineUtils';
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
  onUpdateItem?: (itemId: string, updates: Partial<TimelineItem>) => Promise<void>;
  onAddLayer: (name: string, color?: string) => Promise<any>;
  initialStartTime?: string;
  initialLayerId?: string;
  editingItem?: TimelineItem | null;
}

export function AddItemForm({
  open,
  onClose,
  layers,
  onAddItem,
  onUpdateItem,
  onAddLayer,
  initialStartTime,
  initialLayerId,
  editingItem,
}: AddItemFormProps) {
  const isEditMode = !!editingItem;
  const [title, setTitle] = useState('');
  const [hoursFromNow, setHoursFromNow] = useState(1);
  const [duration, setDuration] = useState(60);
  const [durationValue, setDurationValue] = useState(60); // User input value
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [newLayerName, setNewLayerName] = useState('');
  const [isCreatingLayer, setIsCreatingLayer] = useState(false);
  const [color, setColor] = useState(getRandomItemColor());

  // Set initial values when provided (from double-click)
  useEffect(() => {
    if (initialStartTime && initialLayerId) {
      // Calculate hours from now based on initial start time
      const now = new Date();
      const targetTime = new Date(initialStartTime);
      const hoursDiff = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      setHoursFromNow(Number(hoursDiff.toFixed(2)));
      setSelectedLayerId(initialLayerId);
    }
  }, [initialStartTime, initialLayerId]);

  // When dialog opens (non-edit), default to first available layer if none selected
  useEffect(() => {
    if (open && !editingItem) {
      if (!selectedLayerId && layers && layers.length > 0) {
        setSelectedLayerId(initialLayerId || layers[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, layers, editingItem]);

  // Populate form when editing an item
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setSelectedLayerId(editingItem.layer_id);
      setColor(editingItem.color);
      setDuration(editingItem.duration_minutes);
      setDurationValue(editingItem.duration_minutes);
      setDurationUnit('minutes');

      // Calculate hours from now
      const now = new Date();
      const startTime = new Date(editingItem.start_time);
      const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      setHoursFromNow(Number(hoursDiff.toFixed(2)));
    } else {
      // Reset form when not editing
      setTitle('');
      setHoursFromNow(1);
      setDuration(60);
      setDurationValue(60);
      setDurationUnit('minutes');
      setColor(getRandomItemColor());
      setNewLayerName('');
      setIsCreatingLayer(false);
    }
  }, [editingItem]);

  // Convert duration value to minutes based on unit
  const convertToMinutes = (value: number, unit: 'minutes' | 'hours' | 'days'): number => {
    switch (unit) {
      case 'minutes':
        return value;
      case 'hours':
        return value * 60;
      case 'days':
        return value * 60 * 24;
      default:
        return value;
    }
  };

  // Update duration whenever value or unit changes
  const handleDurationValueChange = (value: number) => {
    setDurationValue(value);
    setDuration(convertToMinutes(value, durationUnit));
  };

  const handleDurationUnitChange = (unit: 'minutes' | 'hours' | 'days') => {
    setDurationUnit(unit);
    setDuration(convertToMinutes(durationValue, unit));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let layerId = selectedLayerId;

    // If creating a new layer (only in add mode)
    if (!isEditMode && isCreatingLayer && newLayerName.trim()) {
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

    if (isEditMode && editingItem && onUpdateItem) {
      // Update existing item
      await onUpdateItem(editingItem.id, {
        title: title.trim(),
        layer_id: layerId,
        start_time: startTime.toISOString(),
        duration_minutes: duration,
        color: color,
      });
    } else {
      // Add new item
      await onAddItem(
        layerId,
        title.trim(),
        startTime.toISOString(),
        duration,
        color
      );
    }

    // Reset form
    setTitle('');
    setHoursFromNow(1);
    setDuration(60);
    setDurationValue(60);
    setDurationUnit('minutes');
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    onClose();
  };

  const handleQuickDuration = (minutes: number) => {
    setDuration(minutes);
    setDurationValue(minutes);
    setDurationUnit('minutes');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Timeline Item' : 'Add Timeline Item'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details of your timeline item' : 'Create a new item on your timeline'}
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
            <Label htmlFor="duration">Duration *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="duration"
                type="number"
                value={durationValue}
                onChange={(e) => handleDurationValueChange(Number(e.target.value))}
                min="1"
                step="any"
                required
                className="flex-1"
              />
              <Select
                value={durationUnit}
                onValueChange={handleDurationUnitChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-wrap">
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
            <Button type="submit">{isEditMode ? 'Update Item' : 'Add Item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
