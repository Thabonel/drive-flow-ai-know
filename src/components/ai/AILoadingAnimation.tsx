import { Loader2, Sparkles, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AILoadingAnimationProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'sparkles' | 'brain';
}

export function AILoadingAnimation({
  message = 'AI is thinking...',
  size = 'md',
  variant = 'default'
}: AILoadingAnimationProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      {/* Animated icon */}
      <div className="relative">
        {/* Outer pulse ring */}
        <div className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 animate-ping",
          sizeClasses[size]
        )} />

        {/* Inner rotating ring */}
        <div className={cn(
          "relative rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-0.5 animate-spin",
          sizeClasses[size]
        )}>
          <div className="rounded-full bg-background p-1.5">
            {variant === 'sparkles' && <Sparkles className={cn("text-purple-500", sizeClasses[size === 'sm' ? 'sm' : size === 'md' ? 'sm' : 'md'])} />}
            {variant === 'brain' && <Brain className={cn("text-blue-500", sizeClasses[size === 'sm' ? 'sm' : size === 'md' ? 'sm' : 'md'])} />}
            {variant === 'default' && <Loader2 className={cn("text-primary", sizeClasses[size === 'sm' ? 'sm' : size === 'md' ? 'sm' : 'md'])} />}
          </div>
        </div>
      </div>

      {/* Loading message */}
      {message && (
        <div className="flex flex-col items-center gap-1">
          <p className={cn("font-medium text-foreground", textSizeClasses[size])}>
            {message}
          </p>
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}

export function AITypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 w-fit">
      <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" />
      </div>
      <span className="text-xs text-muted-foreground">AI is typing</span>
    </div>
  );
}

export function AIProcessingSteps({
  steps,
  currentStep
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="space-y-2 w-full max-w-md">
      {steps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
            index === currentStep && "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20",
            index < currentStep && "opacity-60",
            index > currentStep && "opacity-30"
          )}
        >
          {index < currentStep ? (
            <div className="h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : index === currentStep ? (
            <Loader2 className="h-5 w-5 text-purple-500 animate-spin flex-shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
          )}
          <span className={cn(
            "text-sm transition-colors",
            index === currentStep && "font-medium text-foreground",
            index < currentStep && "text-muted-foreground line-through",
            index > currentStep && "text-muted-foreground"
          )}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}
