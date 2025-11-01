import { useState, useEffect } from 'react';
import { Brain, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AILearningStatusProps {
  variant?: 'minimal' | 'detailed' | 'inline';
  className?: string;
  animated?: boolean;
}

const LEARNING_MESSAGES = [
  {
    message: 'Learning from your patterns...',
    icon: Brain,
    color: 'text-purple-500',
    progress: 65,
  },
  {
    message: 'Getting smarter with every use',
    icon: TrendingUp,
    color: 'text-blue-500',
    progress: 78,
  },
  {
    message: 'Adapting to your schedule',
    icon: Sparkles,
    color: 'text-indigo-500',
    progress: 82,
  },
  {
    message: 'Optimizing recommendations',
    icon: Zap,
    color: 'text-cyan-500',
    progress: 71,
  },
];

export function AILearningStatus({
  variant = 'minimal',
  className,
  animated = true,
}: AILearningStatusProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentMessage = LEARNING_MESSAGES[currentMessageIndex];
  const Icon = currentMessage.icon;

  useEffect(() => {
    if (!animated) return;

    // Rotate messages every 4 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LEARNING_MESSAGES.length);
      setProgress(0);
    }, 4000);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= currentMessage.progress) return prev;
        return prev + 1;
      });
    }, 50);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [animated, currentMessage.progress, currentMessageIndex]);

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Icon className={cn('h-4 w-4 animate-pulse', currentMessage.color)} />
        <span>{currentMessage.message}</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10', className)}>
        <div className="relative">
          <Icon className={cn('h-5 w-5', currentMessage.color)} />
          {animated && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{currentMessage.message}</p>
        </div>
      </div>
    );
  }

  // detailed variant
  return (
    <div className={cn('space-y-2 p-4 rounded-lg bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10', className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 animate-pulse" />
          <div className="relative rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-2">
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">AI Learning Progress</p>
          <p className="text-xs text-muted-foreground">{currentMessage.message}</p>
        </div>
      </div>
      {animated && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Adaptation Level</span>
            <span className={cn('font-medium', currentMessage.color)}>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

interface AILearningIndicatorProps {
  show?: boolean;
  message?: string;
  className?: string;
}

export function AILearningIndicator({
  show = true,
  message = 'AI is learning...',
  className,
}: AILearningIndicatorProps) {
  if (!show) return null;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20', className)}>
      <div className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1 w-1 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1 w-1 rounded-full bg-purple-500 animate-bounce" />
      </div>
      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
        {message}
      </span>
    </div>
  );
}

interface AISmartBadgeProps {
  level?: number; // 1-5
  className?: string;
}

export function AISmartBadge({ level = 3, className }: AISmartBadgeProps) {
  const levels = [
    { label: 'Learning', color: 'from-gray-500 to-gray-400' },
    { label: 'Adapting', color: 'from-blue-500 to-blue-400' },
    { label: 'Smart', color: 'from-purple-500 to-purple-400' },
    { label: 'Advanced', color: 'from-indigo-500 to-indigo-400' },
    { label: 'Expert', color: 'from-violet-500 to-violet-400' },
  ];

  const currentLevel = levels[Math.min(Math.max(level - 1, 0), 4)];

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r', currentLevel.color, className)}>
      <Brain className="h-3.5 w-3.5 text-white" />
      <span className="text-xs font-semibold text-white">AI {currentLevel.label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 w-1 rounded-full',
              i < level ? 'bg-white' : 'bg-white/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}
