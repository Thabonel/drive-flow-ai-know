import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface StreamingTextProps {
  text: string;
  speed?: number; // Characters per second
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
}

export function StreamingText({
  text,
  speed = 50,
  onComplete,
  className,
  showCursor = true
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);

    const intervalMs = 1000 / speed;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
        onComplete?.();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={cn("inline-block", className)}>
      {displayedText}
      {!isComplete && showCursor && (
        <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

interface TypewriterProps {
  lines: string[];
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function Typewriter({
  lines,
  speed = 50,
  onComplete,
  className
}: TypewriterProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const handleLineComplete = () => {
    if (currentLineIndex < lines.length - 1) {
      setTimeout(() => {
        setCurrentLineIndex(currentLineIndex + 1);
      }, 500); // Pause between lines
    } else {
      onComplete?.();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {lines.map((line, index) => (
        <div key={index}>
          {index < currentLineIndex && <p>{line}</p>}
          {index === currentLineIndex && (
            <p>
              <StreamingText
                text={line}
                speed={speed}
                onComplete={handleLineComplete}
              />
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
