import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';

interface TimeEstimateInputProps {
  value: number | null;
  onChange: (minutes: number) => void;
  label?: string;
  showCustomInput?: boolean;
}

const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120];

export function TimeEstimateInput({
  value,
  onChange,
  label = 'Estimated Duration',
  showCustomInput = true,
}: TimeEstimateInputProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState(value?.toString() || '');

  const handleQuickSelect = (minutes: number) => {
    onChange(minutes);
    setCustomMode(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomValue(val);

    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {label}
      </Label>

      {/* Quick duration buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_DURATIONS.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            variant={value === minutes ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickSelect(minutes)}
            className="min-w-[60px]"
          >
            {formatDuration(minutes)}
          </Button>
        ))}

        {showCustomInput && (
          <Button
            type="button"
            variant={customMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCustomMode(!customMode)}
          >
            Custom
          </Button>
        )}
      </div>

      {/* Custom input */}
      {customMode && showCustomInput && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Minutes"
            value={customValue}
            onChange={handleCustomChange}
            min="1"
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">minutes</span>
        </div>
      )}

      {/* Current selection display */}
      {value && !customMode && (
        <p className="text-sm text-muted-foreground">
          Selected: {formatDuration(value)}
        </p>
      )}
    </div>
  );
}
