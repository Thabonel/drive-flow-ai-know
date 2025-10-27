// Action menu for timeline items (especially logjammed items)

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TimelineItem, rescheduleItem as calculateReschedule } from '@/lib/timelineUtils';
import { RESCHEDULE_OPTIONS } from '@/lib/timelineConstants';
import { Check, Clock, Pause, Trash2, Edit } from 'lucide-react';

interface ItemActionMenuProps {
  item: TimelineItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (itemId: string) => void;
  onComplete: (itemId: string) => void;
  onReschedule: (itemId: string, newStartTime: string) => void;
  onPark: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}

export function ItemActionMenu({
  item,
  open,
  onClose,
  onEdit,
  onComplete,
  onReschedule,
  onPark,
  onDelete,
}: ItemActionMenuProps) {
  if (!item) return null;

  const handleEdit = () => {
    onEdit(item.id);
    onClose();
  };

  const handleComplete = () => {
    onComplete(item.id);
    onClose();
  };

  const handleReschedule = (hours: number) => {
    const newStartTime = calculateReschedule(item.start_time, hours);
    onReschedule(item.id, newStartTime);
    onClose();
  };

  const handlePark = () => {
    onPark(item.id);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      onDelete(item.id);
      onClose();
    }
  };

  const isLogjammed = item.status === 'logjam';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLogjammed && (
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            )}
            {item.title}
          </DialogTitle>
          <DialogDescription>
            {isLogjammed
              ? 'This item is overdue. Choose an action:'
              : 'Manage this timeline item:'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Edit Item */}
          <Button
            onClick={handleEdit}
            className="w-full justify-start"
            variant="outline"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Item
          </Button>

          {/* Mark as Done */}
          {item.status !== 'completed' && (
            <Button
              onClick={handleComplete}
              className="w-full justify-start"
              variant="default"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark as Done
            </Button>
          )}

          {/* Reschedule options */}
          {item.status !== 'completed' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reschedule:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RESCHEDULE_OPTIONS.map((option) => (
                  <Button
                    key={option.hours}
                    onClick={() => handleReschedule(option.hours)}
                    variant="outline"
                    size="sm"
                  >
                    <Clock className="mr-2 h-3 w-3" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Park for later */}
          {item.status !== 'completed' && (
            <Button
              onClick={handlePark}
              className="w-full justify-start"
              variant="outline"
            >
              <Pause className="mr-2 h-4 w-4" />
              Park for Later
            </Button>
          )}

          {/* Delete */}
          <Button
            onClick={handleDelete}
            className="w-full justify-start"
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Item
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Duration: {item.duration_minutes} minutes</p>
          <p>Started: {new Date(item.start_time).toLocaleString()}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
