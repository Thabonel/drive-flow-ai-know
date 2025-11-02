import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecurrencePattern } from '@/hooks/useTasks';
import { Repeat, X } from 'lucide-react';

interface RecurrenceSelectorProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
  endDate: string | null;
  onEndDateChange: (date: string | null) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RecurrenceSelector({
  value,
  onChange,
  endDate,
  onEndDateChange,
}: RecurrenceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customInterval, setCustomInterval] = useState(1);

  const handlePresetSelect = (pattern: RecurrencePattern | null) => {
    onChange(pattern);
    if (!pattern) {
      setIsExpanded(false);
      onEndDateChange(null);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    if (!value || value.frequency !== 'weekly') {
      onChange({
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [day],
      });
    } else {
      const currentDays = value.daysOfWeek || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();

      if (newDays.length === 0) {
        onChange(null);
      } else {
        onChange({
          ...value,
          daysOfWeek: newDays,
        });
      }
    }
  };

  const getRecurrenceLabel = () => {
    if (!value) return 'No repeat';

    if (value.frequency === 'daily') {
      return value.interval === 1 ? 'Daily' : `Every ${value.interval} days`;
    }

    if (value.frequency === 'weekly') {
      const days = value.daysOfWeek || [];
      if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) {
        return 'Weekdays (Mon-Fri)';
      }
      if (days.length === 1) {
        return `Every ${DAYS[days[0]]}`;
      }
      if (days.length > 0) {
        return `Weekly (${days.map(d => DAYS[d]).join(', ')})`;
      }
      return 'Weekly';
    }

    if (value.frequency === 'monthly') {
      return value.interval === 1
        ? `Monthly (day ${value.dayOfMonth || 1})`
        : `Every ${value.interval} months`;
    }

    return 'Custom';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          Repeat
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePresetSelect(null)}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {/* Current selection / Toggle button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between text-xs"
        >
          {getRecurrenceLabel()}
          <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
        </Button>

        {/* Expanded options */}
        {isExpanded && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            {/* Presets */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={value?.frequency === 'daily' && value.interval === 1 ? 'default' : 'outline'}
                onClick={() => handlePresetSelect({ frequency: 'daily', interval: 1 })}
                className="text-xs"
              >
                Daily
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  value?.frequency === 'weekly' &&
                  value.daysOfWeek?.length === 5 &&
                  value.daysOfWeek.every(d => d >= 1 && d <= 5)
                    ? 'default'
                    : 'outline'
                }
                onClick={() => handlePresetSelect({
                  frequency: 'weekly',
                  interval: 1,
                  daysOfWeek: [1,2,3,4,5]
                })}
                className="text-xs"
              >
                Weekdays
              </Button>
            </div>

            {/* Weekly - Day selector */}
            <div>
              <Label className="text-xs mb-2 block">Weekly on:</Label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day, index) => (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={
                      value?.frequency === 'weekly' && value.daysOfWeek?.includes(index)
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => toggleDayOfWeek(index)}
                    className="text-xs px-1"
                  >
                    {day[0]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Monthly */}
            <div>
              <Label className="text-xs mb-2 block">Monthly on day:</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={value?.frequency === 'monthly' ? value.dayOfMonth || 1 : 1}
                onChange={(e) => {
                  const day = Math.min(31, Math.max(1, parseInt(e.target.value) || 1));
                  onChange({
                    frequency: 'monthly',
                    interval: 1,
                    dayOfMonth: day,
                  });
                }}
                className="text-xs"
              />
            </div>

            {/* Custom interval */}
            <div>
              <Label className="text-xs mb-2 block">Every N {value?.frequency || 'days'}:</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={customInterval}
                  onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (value) {
                      onChange({ ...value, interval: customInterval });
                    }
                  }}
                  disabled={!value}
                  className="text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* End date */}
            {value && (
              <div>
                <Label className="text-xs mb-2 block">End date (optional):</Label>
                <Input
                  type="date"
                  value={endDate?.split('T')[0] || ''}
                  onChange={(e) => onEndDateChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
