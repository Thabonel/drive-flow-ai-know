// Modal for choosing resize scope: Just Today vs All Days

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';

interface ResizeRoutineModalProps {
  open: boolean;
  onClose: () => void;
  routineName: string;
  currentDate: string;
  oldDuration: number;
  newDuration: number;
  onConfirm: (applyToAll: boolean) => void;
}

export function ResizeRoutineModal({
  open,
  onClose,
  routineName,
  currentDate,
  oldDuration,
  newDuration,
  onConfirm,
}: ResizeRoutineModalProps) {
  const [scope, setScope] = useState<'today' | 'all'>('today');

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleConfirm = () => {
    onConfirm(scope === 'all');
    onClose();
    setScope('today'); // Reset for next time
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update {routineName} Duration</DialogTitle>
          <DialogDescription>
            {formatDuration(oldDuration)} → {formatDuration(newDuration)}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'today' | 'all')}>
          <div className="space-y-3">
            {/* Just Today Option */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors">
              <RadioGroupItem value="today" id="today" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="today" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">Just Today</span>
                  <span className="text-sm text-muted-foreground">({formatDate(currentDate)})</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Only change this specific day. Your routine template remains unchanged.
                </p>
              </div>
            </div>

            {/* All Days Option */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors">
              <RadioGroupItem value="all" id="all" className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-semibold">All Days</span>
                  <span className="text-sm text-muted-foreground">(Update Routine)</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Update your routine template. This affects all past and future days.
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
