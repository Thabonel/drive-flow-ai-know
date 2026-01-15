import { motion } from 'framer-motion';
import type { Position } from './DocumentCard';

type AnimationPhase = 'entering' | 'settled' | 'questioning' | 'pulsing' | 'connecting' | 'revealing' | 'holding' | 'exiting';

interface ConnectionLinesProps {
  centerPoint: Position;
  documentPositions: Position[];
  activeConnections: number[];
  phase: AnimationPhase;
  reducedMotion: boolean;
  containerSize: { width: number; height: number };
}

export function ConnectionLines({
  centerPoint,
  documentPositions,
  activeConnections,
  phase,
  reducedMotion,
  containerSize,
}: ConnectionLinesProps) {
  const isConnecting = phase === 'connecting';
  const isExiting = phase === 'exiting';
  const showLines = ['connecting', 'revealing', 'holding'].includes(phase) && !isExiting;

  if (!showLines && !reducedMotion) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerSize.width}
      height={containerSize.height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>

        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {activeConnections.map((docIndex, i) => {
        const docPos = documentPositions[docIndex];
        // Safety check: ensure all coordinates are valid numbers
        if (!docPos ||
            !Number.isFinite(centerPoint.x) || !Number.isFinite(centerPoint.y) ||
            !Number.isFinite(docPos.x) || !Number.isFinite(docPos.y)) {
          return null;
        }

        const lineLength = Math.sqrt(
          Math.pow(docPos.x - centerPoint.x, 2) +
          Math.pow(docPos.y - centerPoint.y, 2)
        );

        return (
          <motion.line
            key={docIndex}
            x1={centerPoint.x}
            y1={centerPoint.y}
            x2={docPos.x}
            y2={docPos.y}
            stroke="url(#lineGradient)"
            strokeWidth={2}
            strokeLinecap="round"
            filter={isConnecting ? "url(#glow)" : undefined}
            initial={reducedMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: showLines || reducedMotion ? 1 : 0,
              opacity: showLines || reducedMotion ? 0.7 : 0,
            }}
            transition={{
              duration: reducedMotion ? 0 : 0.4,
              delay: reducedMotion ? 0 : i * 0.12,
              ease: 'easeOut',
            }}
            style={{
              strokeDasharray: lineLength,
              strokeDashoffset: 0,
            }}
          />
        );
      })}

      {/* Animated particles traveling along lines */}
      {!reducedMotion && showLines && activeConnections.map((docIndex, i) => {
        const docPos = documentPositions[docIndex];
        // Safety check: ensure all coordinates are valid numbers
        if (!docPos ||
            !Number.isFinite(centerPoint.x) || !Number.isFinite(centerPoint.y) ||
            !Number.isFinite(docPos.x) || !Number.isFinite(docPos.y)) {
          return null;
        }

        return (
          <motion.circle
            key={`particle-${docIndex}`}
            r={2.5}
            fill="hsl(var(--accent))"
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{
              cx: [centerPoint.x, docPos.x, centerPoint.x],
              cy: [centerPoint.y, docPos.y, centerPoint.y],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.25,
              ease: 'linear',
            }}
          />
        );
      })}
    </svg>
  );
}
