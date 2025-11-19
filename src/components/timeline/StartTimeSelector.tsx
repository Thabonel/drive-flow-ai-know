import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Calendar, Clock } from 'lucide-react';

interface StartTimeSelectorProps {
  hoursFromNow: number;
  onHoursFromNowChange: (hours: number) => void;
  label?: string;
}

export function StartTimeSelector({
  hoursFromNow,
  onHoursFromNowChange,
  label = 'Start Time'
}: StartTimeSelectorProps) {
  const [mode, setMode] = useState<'relative' | 'absolute'>('relative');
  const [absoluteDate, setAbsoluteDate] = useState<Date | undefined>(undefined);

  const handleAbsoluteDateChange = (date: Date | undefined) => {
    setAbsoluteDate(date);
    if (date) {
      // Calculate hours from now
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      onHoursFromNowChange(Number(diffHours.toFixed(2)));
    }
  };

  const handleRelativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onHoursFromNowChange(value);
    // Clear absolute date when using relative mode
    setAbsoluteDate(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === 'relative' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('relative')}
            className="h-7 text-xs"
          >
            <Clock className="h-3 w-3 mr-1" />
            Relative
          </Button>
          <Button
            type="button"
            variant={mode === 'absolute' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('absolute')}
            className="h-7 text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Date
          </Button>
        </div>
      </div>

      {mode === 'relative' ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={hoursFromNow}
              onChange={handleRelativeChange}
              step="0.25"
              className="flex-1"
              placeholder="Hours from now"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              hours from now
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Use negative values for past items
          </p>
        </>
      ) : (
        <>
          <DateTimePicker
            value={absoluteDate}
            onChange={handleAbsoluteDateChange}
          />
          <p className="text-xs text-muted-foreground">
            Select a specific date and time for this item
          </p>
        </>
      )}
    </div>
  );
}
