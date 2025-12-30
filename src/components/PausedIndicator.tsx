/**
 * Paused Indicator Component
 *
 * Shows a visual badge when auto-scroll or auto-advance is paused.
 * Positioned prominently but non-intrusively.
 *
 * Features:
 * - Appears with fade-in animation when paused
 * - Shows pause icon + text
 * - Yellow/gold color for visibility
 */

import { Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PausedIndicatorProps {
  /** Whether to show the paused indicator */
  isPaused: boolean;
  /** Optional additional class names */
  className?: string;
}

export function PausedIndicator({ isPaused, className }: PausedIndicatorProps) {
  if (!isPaused) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-full",
        "animate-in fade-in-0 duration-200",
        className
      )}
    >
      <Pause className="h-4 w-4 text-yellow-400 fill-yellow-400" />
      <span className="text-sm font-medium text-yellow-200">Paused</span>
    </div>
  );
}

export default PausedIndicator;
