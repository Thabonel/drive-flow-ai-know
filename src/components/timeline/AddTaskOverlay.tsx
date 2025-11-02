import { useState } from 'react';
import { useTasks, RecurrencePattern } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RecurrenceSelector } from '@/components/RecurrenceSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddTaskOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTaskOverlay({ isOpen, onClose }: AddTaskOverlayProps) {
  const { addTask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(null);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await addTask(newTaskTitle.trim(), newTaskDuration, {
        isRecurring: !!recurrencePattern,
        recurrencePattern,
        recurrenceEndDate,
      });

      // Reset form
      setNewTaskTitle('');
      setNewTaskDuration(30);
      setRecurrencePattern(null);
      setRecurrenceEndDate(null);
      onClose();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleCancel = () => {
    setNewTaskTitle('');
    setNewTaskDuration(30);
    setRecurrencePattern(null);
    setRecurrenceEndDate(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Unscheduled Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Title */}
          <div>
            <Label htmlFor="task-title" className="text-sm">Task Title</Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskTitle.trim()) handleAddTask();
                if (e.key === 'Escape') handleCancel();
              }}
              autoFocus
              className="mt-1.5"
            />
          </div>

          {/* Duration Selection */}
          <div>
            <Label className="text-sm">Duration</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {[15, 30, 60, 120].map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  size="sm"
                  variant={newTaskDuration === mins ? 'default' : 'outline'}
                  onClick={() => setNewTaskDuration(mins)}
                  className="text-xs"
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Custom (minutes)"
              value={newTaskDuration}
              onChange={(e) => setNewTaskDuration(Math.max(1, parseInt(e.target.value) || 30))}
              className="mt-2"
              min="1"
            />
          </div>

          {/* Recurrence Selector */}
          <RecurrenceSelector
            value={recurrencePattern}
            onChange={setRecurrencePattern}
            endDate={recurrenceEndDate}
            onEndDateChange={setRecurrenceEndDate}
          />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAddTask}
              className="flex-1"
              disabled={!newTaskTitle.trim()}
            >
              Add Task
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
