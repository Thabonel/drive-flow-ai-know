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
  // Default to absolute (date/time picker) - more intuitive for most users
  const [mode, setMode] = useState<'relative' | 'absolute'>('absolute');

  // Initialize with current time + hoursFromNow
  const [absoluteDate, setAbsoluteDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setTime(date.getTime() + hoursFromNow * 60 * 60 * 1000);
    return date;
  });

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
            variant={mode === 'absolute' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('absolute')}
            className="h-7 text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Pick Time
          </Button>
          <Button
            type="button"
            variant={mode === 'relative' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('relative')}
            className="h-7 text-xs"
          >
            <Clock className="h-3 w-3 mr-1" />
            Offset
          </Button>
        </div>
      </div>

      {mode === 'absolute' ? (
        <DateTimePicker
          value={absoluteDate}
          onChange={handleAbsoluteDateChange}
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={hoursFromNow}
              onChange={handleRelativeChange}
              step="0.25"
              className="flex-1"
              placeholder="e.g., 2 for 2 hours from now"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              hours
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Positive = future, negative = past
          </p>
        </>
      )}
    </div>
  );
}
