/**
 * Presentation Progress Indicators
 *
 * Visual feedback components for auto-scroll and auto-advance features:
 * - Linear progress bar for content scroll (shows scroll position within slide)
 * - Circular countdown for slide auto-advance (shows time until next slide)
 *
 * Positioned in bottom-left of presentation for minimal distraction.
 */

import { cn } from '@/lib/utils';

interface PresentationProgressIndicatorsProps {
  /** Content scroll progress (0-1) */
  scrollProgress: number;
  /** Whether content auto-scroll is active */
  isScrollActive: boolean;
  /** Slide auto-advance progress (0-1) */
  advanceProgress: number;
  /** Time remaining for slide advance (ms) */
  advanceTimeRemaining: number;
  /** Whether slide auto-advance is active */
  isAdvanceActive: boolean;
  /** Whether any auto feature is paused */
  isPaused: boolean;
}

/**
 * Circular progress indicator for countdown
 */
function CircularProgress({
  progress,
  timeRemaining,
  isPaused,
}: {
  progress: number;
  timeRemaining: number;
  isPaused: boolean;
}) {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Format time as seconds
  const seconds = Math.ceil(timeRemaining / 1000);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isPaused ? 'rgba(255, 200, 0, 0.6)' : 'rgba(255, 200, 0, 0.9)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-100"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "text-xs font-mono font-bold",
          isPaused ? "text-yellow-400/60" : "text-white"
        )}>
          {seconds}
        </span>
      </div>
    </div>
  );
}

/**
 * Linear progress bar for scroll position
 */
function LinearProgress({
  progress,
  isPaused,
}: {
  progress: number;
  isPaused: boolean;
}) {
  return (
    <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-100",
          isPaused ? "bg-yellow-400/60" : "bg-accent"
        )}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export function PresentationProgressIndicators({
  scrollProgress,
  isScrollActive,
  advanceProgress,
  advanceTimeRemaining,
  isAdvanceActive,
  isPaused,
}: PresentationProgressIndicatorsProps) {
  // Don't render if no auto features are active
  if (!isScrollActive && !isAdvanceActive) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-4">
      {/* Content scroll progress */}
      {isScrollActive && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Scroll</span>
          <LinearProgress progress={scrollProgress} isPaused={isPaused} />
        </div>
      )}

      {/* Slide advance countdown */}
      {isAdvanceActive && (
        <div className="flex items-center gap-2">
          <CircularProgress
            progress={advanceProgress}
            timeRemaining={advanceTimeRemaining}
            isPaused={isPaused}
          />
          <span className="text-xs text-white/60">Next slide</span>
        </div>
      )}
    </div>
  );
}

export default PresentationProgressIndicators;
