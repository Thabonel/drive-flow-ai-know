// Toggle for showing/hiding completed items

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';

interface CompletedItemsToggleProps {
  showCompleted: boolean;
  onToggle: () => void;
  completedCount: number;
}

export function CompletedItemsToggle({
  showCompleted,
  onToggle,
  completedCount,
}: CompletedItemsToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-green-600" />
        <Label htmlFor="show-completed" className="cursor-pointer">
          Show Completed Items ({completedCount})
        </Label>
      </div>
      <Switch
        id="show-completed"
        checked={showCompleted}
        onCheckedChange={onToggle}
      />
    </div>
  );
}
