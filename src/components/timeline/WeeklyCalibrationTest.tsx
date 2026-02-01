import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WeeklyCalibrationWizard } from './WeeklyCalibrationWizard';

/**
 * Test component for the Weekly Calibration System
 * Remove this component once the system is fully integrated
 */
export function WeeklyCalibrationTest() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Weekly Calibration System Test</h3>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Test the weekly calibration wizard and related components.
        </p>

        <Button onClick={() => setShowWizard(true)}>
          Test Weekly Calibration Wizard
        </Button>
      </div>

      <WeeklyCalibrationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </div>
  );
}