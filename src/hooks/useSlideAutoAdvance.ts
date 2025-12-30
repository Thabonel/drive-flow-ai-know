/**
 * useSlideAutoAdvance Hook
 *
 * Handles automatic advancement between slides after a timed interval.
 *
 * Delay mappings:
 * - slow: 5000ms (5 seconds)
 * - medium: 3000ms (3 seconds)
 * - fast: 2000ms (2 seconds)
 *
 * Behavior:
 * - Starts countdown when enabled
 * - Calls onAdvance when countdown completes
 * - Can be paused/resumed (for hover interactions)
 * - Resets countdown on slide change
 */

import { useEffect, useRef, useCallback, useState } from 'react';

type AdvanceSpeed = 'slow' | 'medium' | 'fast';

const DELAY_MS: Record<AdvanceSpeed, number> = {
  slow: 5000,
  medium: 3000,
  fast: 2000,
};

interface UseSlideAutoAdvanceOptions {
  /** Whether auto-advance is enabled */
  enabled: boolean;
  /** Advance speed setting */
  speed: AdvanceSpeed;
  /** Called when countdown completes (should advance to next slide) */
  onAdvance: () => void;
  /** Whether there is a next slide to advance to */
  canAdvance: boolean;
  /** Dependency to reset countdown (typically currentSlideIndex) */
  resetDependency?: number | string;
}

interface UseSlideAutoAdvanceResult {
  /** Whether countdown is active */
  isActive: boolean;
  /** Whether countdown is paused */
  isPaused: boolean;
  /** Pause the countdown */
  pause: () => void;
  /** Resume the countdown */
  resume: () => void;
  /** Reset the countdown */
  reset: () => void;
  /** Time remaining in ms */
  timeRemaining: number;
  /** Progress (0-1, where 1 means countdown complete) */
  progress: number;
  /** Total delay time for current speed */
  totalDelay: number;
}

export function useSlideAutoAdvance({
  enabled,
  speed,
  onAdvance,
  canAdvance,
  resetDependency,
}: UseSlideAutoAdvanceOptions): UseSlideAutoAdvanceResult {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DELAY_MS[speed]);
  const [progress, setProgress] = useState(0);

  // Refs for timing
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const totalDelay = DELAY_MS[speed];

  /**
   * Clear the interval
   */
  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Start the countdown
   */
  const start = useCallback(() => {
    if (!enabled || !canAdvance) return;

    clearIntervalRef();
    setIsActive(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    setTimeRemaining(totalDelay);
    setProgress(0);

    // Update every 100ms for smooth progress
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, totalDelay - elapsed);

      setTimeRemaining(remaining);
      setProgress(Math.min(elapsed / totalDelay, 1));

      if (remaining <= 0) {
        clearIntervalRef();
        setIsActive(false);
        onAdvance();
      }
    }, 100);
  }, [enabled, canAdvance, totalDelay, clearIntervalRef, onAdvance]);

  /**
   * Stop the countdown
   */
  const stop = useCallback(() => {
    clearIntervalRef();
    setIsActive(false);
    setIsPaused(false);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setTimeRemaining(totalDelay);
    setProgress(0);
  }, [clearIntervalRef, totalDelay]);

  /**
   * Pause the countdown
   */
  const pause = useCallback(() => {
    if (!isActive || isPaused) return;

    clearIntervalRef();
    setIsPaused(true);

    // Store elapsed time when paused
    if (startTimeRef.current !== null) {
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
  }, [isActive, isPaused, clearIntervalRef]);

  /**
   * Resume the countdown
   */
  const resume = useCallback(() => {
    if (!isActive || !isPaused || !canAdvance) return;

    setIsPaused(false);

    // Adjust start time to account for pause duration
    startTimeRef.current = Date.now() - pausedTimeRef.current;

    // Resume the interval
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, totalDelay - elapsed);

      setTimeRemaining(remaining);
      setProgress(Math.min(elapsed / totalDelay, 1));

      if (remaining <= 0) {
        clearIntervalRef();
        setIsActive(false);
        onAdvance();
      }
    }, 100);
  }, [isActive, isPaused, canAdvance, totalDelay, clearIntervalRef, onAdvance]);

  /**
   * Reset the countdown (for new slides)
   */
  const reset = useCallback(() => {
    stop();
    if (enabled && canAdvance) {
      start();
    }
  }, [stop, enabled, canAdvance, start]);

  /**
   * Effect: Start/stop based on enabled state and canAdvance
   */
  useEffect(() => {
    if (enabled && canAdvance) {
      start();
    } else {
      stop();
    }

    return () => {
      clearIntervalRef();
    };
  }, [enabled, canAdvance, start, stop, clearIntervalRef]);

  /**
   * Effect: Reset countdown when resetDependency changes (e.g., slide index)
   */
  useEffect(() => {
    if (enabled && canAdvance) {
      // Reset on slide change
      stop();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetDependency]);

  /**
   * Effect: Handle speed changes
   */
  useEffect(() => {
    if (isActive && !isPaused) {
      // Restart with new speed
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  return {
    isActive,
    isPaused,
    pause,
    resume,
    reset,
    timeRemaining,
    progress,
    totalDelay,
  };
}

export default useSlideAutoAdvance;
