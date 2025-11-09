// Dialog to choose action scope for recurring timeline items

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, CalendarClock } from 'lucide-react';

interface RecurringActionDialogProps {
  open: boolean;
  onClose: () => void;
  actionType: 'delete' | 'edit';
  onThisOnly: () => void;
  onThisAndFollowing: () => void;
}

export function RecurringActionDialog({
  open,
  onClose,
  actionType,
  onThisOnly,
  onThisAndFollowing,
}: RecurringActionDialogProps) {
  const isDelete = actionType === 'delete';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDelete ? 'Delete Recurring Item' : 'Edit Recurring Item'}
          </DialogTitle>
          <DialogDescription>
            This item is part of a recurring series. What would you like to {isDelete ? 'delete' : 'edit'}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Just This Occurrence */}
          <Button
            onClick={() => {
              onThisOnly();
              onClose();
            }}
            className="w-full justify-start h-auto py-4"
            variant="outline"
          >
            <CalendarCheck className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">
                {isDelete ? 'Delete' : 'Edit'} just this occurrence
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Only this single item will be {isDelete ? 'deleted' : 'modified'}
              </div>
            </div>
          </Button>

          {/* This and All Following */}
          <Button
            onClick={() => {
              onThisAndFollowing();
              onClose();
            }}
            className="w-full justify-start h-auto py-4"
            variant={isDelete ? 'destructive' : 'default'}
          >
            <CalendarClock className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">
                {isDelete ? 'Delete' : 'Edit'} this and all following
              </div>
              <div className="text-xs mt-0.5" style={{ opacity: 0.9 }}>
                All future occurrences will be {isDelete ? 'deleted' : 'modified'}
              </div>
            </div>
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
