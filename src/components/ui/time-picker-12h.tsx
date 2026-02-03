import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TimePicker12HProps {
  value?: string; // HH:MM format (24-hour)
  onChange: (time: string) => void; // Returns HH:MM format (24-hour)
  label?: string;
  className?: string;
}

export function TimePicker12H({ value, onChange, label, className = '' }: TimePicker12HProps) {
  const [hours12, setHours12] = useState(9);
  const [minutes, setMinutes] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse the 24-hour time value into 12-hour format
  useEffect(() => {
    if (value) {
      const [hoursStr, minutesStr] = value.split(':');
      const hours24 = parseInt(hoursStr);
      const mins = parseInt(minutesStr);

      setMinutes(mins);

      if (hours24 === 0) {
        setHours12(12);
        setPeriod('AM');
      } else if (hours24 < 12) {
        setHours12(hours24);
        setPeriod('AM');
      } else if (hours24 === 12) {
        setHours12(12);
        setPeriod('PM');
      } else {
        setHours12(hours24 - 12);
        setPeriod('PM');
      }
    }
  }, [value]);

  // Convert 12-hour format back to 24-hour format
  const updateTime = (newHours12: number, newMinutes: number, newPeriod: 'AM' | 'PM') => {
    let hours24: number;

    if (newPeriod === 'AM') {
      hours24 = newHours12 === 12 ? 0 : newHours12;
    } else {
      hours24 = newHours12 === 12 ? 12 : newHours12 + 12;
    }

    const timeString = `${hours24.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleHoursChange = (newHours: number) => {
    const clampedHours = Math.max(1, Math.min(12, newHours));
    setHours12(clampedHours);
    updateTime(clampedHours, minutes, period);
  };

  const handleMinutesChange = (newMinutes: number) => {
    const clampedMinutes = Math.max(0, Math.min(59, newMinutes));
    setMinutes(clampedMinutes);
    updateTime(hours12, clampedMinutes, period);
  };

  const handlePeriodToggle = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    setPeriod(newPeriod);
    updateTime(hours12, minutes, newPeriod);
  };

  return (
    <div className={className}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex items-center gap-1 mt-1">
        {/* Hours Input */}
        <Input
          type="number"
          min="1"
          max="12"
          value={hours12}
          onChange={(e) => handleHoursChange(parseInt(e.target.value) || 1)}
          className="w-16 text-center"
        />

        {/* Separator */}
        <span className="text-lg font-bold">:</span>

        {/* Minutes Input */}
        <Input
          type="number"
          min="0"
          max="59"
          value={minutes.toString().padStart(2, '0')}
          onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
          className="w-16 text-center"
        />

        {/* AM/PM Toggle Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePeriodToggle}
          className="min-w-[50px] font-semibold"
        >
          {period}
        </Button>
      </div>
    </div>
  );
}