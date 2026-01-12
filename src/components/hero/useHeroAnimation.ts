import { useState, useEffect, useCallback } from 'react';

export type AnimationPhase =
  | 'idle'
  | 'entering'
  | 'settled'
  | 'questioning'
  | 'pulsing'
  | 'connecting'
  | 'revealing'
  | 'holding';

interface PhaseConfig {
  phase: AnimationPhase;
  duration: number; // milliseconds
}

const ANIMATION_SEQUENCE: PhaseConfig[] = [
  { phase: 'entering', duration: 1500 },
  { phase: 'settled', duration: 1000 },
  { phase: 'questioning', duration: 1000 },
  { phase: 'pulsing', duration: 1000 },
  { phase: 'connecting', duration: 1000 },
  { phase: 'revealing', duration: 1500 },
  { phase: 'holding', duration: 1000 },
];

const TOTAL_DURATION = ANIMATION_SEQUENCE.reduce((sum, p) => sum + p.duration, 0);

interface UseHeroAnimationReturn {
  phase: AnimationPhase;
  progress: number; // 0-1 within current phase
  totalProgress: number; // 0-1 across entire animation
  isPlaying: boolean;
  restart: () => void;
  pause: () => void;
  resume: () => void;
}

export function useHeroAnimation(
  reducedMotion: boolean = false
): UseHeroAnimationReturn {
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);

  // If reduced motion, skip to final state immediately
  useEffect(() => {
    if (reducedMotion) {
      setPhase('holding');
      setPhaseIndex(ANIMATION_SEQUENCE.length - 1);
      setPhaseProgress(1);
      setIsPlaying(false);
      return;
    }

    // Start animation
    setPhaseIndex(0);
    setPhase(ANIMATION_SEQUENCE[0].phase);
    setStartTime(Date.now());
  }, [reducedMotion]);

  // Animation loop
  useEffect(() => {
    if (reducedMotion || !isPlaying || phaseIndex < 0) return;

    const currentPhase = ANIMATION_SEQUENCE[phaseIndex];
    if (!currentPhase) return;

    const phaseStartTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - phaseStartTime;
      const progress = Math.min(elapsed / currentPhase.duration, 1);
      setPhaseProgress(progress);

      if (progress >= 1) {
        // Move to next phase or loop
        const nextIndex = phaseIndex + 1;
        if (nextIndex >= ANIMATION_SEQUENCE.length) {
          // Loop back to start
          setPhaseIndex(0);
          setPhase(ANIMATION_SEQUENCE[0].phase);
          setStartTime(Date.now());
        } else {
          setPhaseIndex(nextIndex);
          setPhase(ANIMATION_SEQUENCE[nextIndex].phase);
        }
      }
    };

    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [phaseIndex, isPlaying, reducedMotion]);

  const restart = useCallback(() => {
    setPhaseIndex(0);
    setPhase(ANIMATION_SEQUENCE[0].phase);
    setPhaseProgress(0);
    setStartTime(Date.now());
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Calculate total progress
  const elapsedBefore = ANIMATION_SEQUENCE
    .slice(0, phaseIndex)
    .reduce((sum, p) => sum + p.duration, 0);
  const currentPhaseDuration = ANIMATION_SEQUENCE[phaseIndex]?.duration || 0;
  const totalElapsed = elapsedBefore + (currentPhaseDuration * phaseProgress);
  const totalProgress = totalElapsed / TOTAL_DURATION;

  return {
    phase,
    progress: phaseProgress,
    totalProgress,
    isPlaying,
    restart,
    pause,
    resume,
  };
}
