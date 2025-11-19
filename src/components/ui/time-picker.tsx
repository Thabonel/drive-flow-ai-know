import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [hours, setHours] = useState(value?.getHours() ?? 9);
  const [minutes, setMinutes] = useState(value?.getMinutes() ?? 0);

  const handleHoursChange = (newHours: number) => {
    const clampedHours = Math.max(0, Math.min(23, newHours));
    setHours(clampedHours);

    const newDate = value ? new Date(value) : new Date();
    newDate.setHours(clampedHours, minutes, 0, 0);
    onChange(newDate);
  };

  const handleMinutesChange = (newMinutes: number) => {
    const clampedMinutes = Math.max(0, Math.min(59, newMinutes));
    setMinutes(clampedMinutes);

    const newDate = value ? new Date(value) : new Date();
    newDate.setHours(hours, clampedMinutes, 0, 0);
    onChange(newDate);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Label htmlFor="hours" className="text-xs">Hour</Label>
        <Input
          id="hours"
          type="number"
          min="0"
          max="23"
          value={hours}
          onChange={(e) => handleHoursChange(parseInt(e.target.value) || 0)}
          className="text-center"
        />
      </div>
      <span className="text-2xl font-bold pt-5">:</span>
      <div className="flex-1">
        <Label htmlFor="minutes" className="text-xs">Minute</Label>
        <Input
          id="minutes"
          type="number"
          min="0"
          max="59"
          value={minutes.toString().padStart(2, '0')}
          onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
          className="text-center"
        />
      </div>
    </div>
  );
}
