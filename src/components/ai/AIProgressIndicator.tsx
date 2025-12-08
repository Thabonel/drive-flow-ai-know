import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStage {
  label: string;
  duration: number | null; // null means stays until complete
}

interface AIProgressIndicatorProps {
  useDocuments?: boolean;
  className?: string;
}

// Progress stages with timing
const BASE_STAGES: ProgressStage[] = [
  { label: "Understanding your question", duration: 2000 },
  { label: "Searching your documents", duration: 4000 },
  { label: "Analyzing information", duration: 4000 },
  { label: "Generating response", duration: null },
];

const NO_DOCS_STAGES: ProgressStage[] = [
  { label: "Understanding your question", duration: 2000 },
  { label: "Thinking", duration: 3000 },
  { label: "Generating response", duration: null },
];

export const AIProgressIndicator = ({ useDocuments = true, className }: AIProgressIndicatorProps) => {
  const [currentStage, setCurrentStage] = useState(0);
  const stages = useDocuments ? BASE_STAGES : NO_DOCS_STAGES;

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const advanceStage = () => {
      setCurrentStage(prev => {
        const nextStage = prev + 1;
        // Don't advance past the last stage
        if (nextStage >= stages.length) return prev;

        const nextDuration = stages[nextStage]?.duration;
        if (nextDuration) {
          timeout = setTimeout(advanceStage, nextDuration);
        }
        return nextStage;
      });
    };

    // Start the first transition
    const firstDuration = stages[0]?.duration;
    if (firstDuration) {
      timeout = setTimeout(advanceStage, firstDuration);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [stages]);

  return (
    <div className={cn("flex justify-start", className)}>
      <div className="bg-muted border border-border rounded-lg p-4 min-w-[280px]">
        <div className="space-y-2">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStage;
            const isCurrent = index === currentStage;
            const isPending = index > currentStage;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 text-sm transition-all duration-300",
                  isCompleted && "text-green-600",
                  isCurrent && "text-foreground font-medium",
                  isPending && "text-muted-foreground"
                )}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                  )}
                  {isCurrent && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {isPending && (
                    <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>

                {/* Stage label */}
                <span className={cn(
                  "transition-opacity duration-300",
                  isPending && "opacity-50"
                )}>
                  {stage.label}
                  {isCurrent && "..."}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIProgressIndicator;
