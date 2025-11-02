import { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const AI_TIPS = [
  {
    category: 'Productivity',
    tip: 'Block 2 hours for deep work in your calendar',
    detail: 'AI has noticed you work best between 9-11 AM. Schedule your most important tasks during this time.',
  },
  {
    category: 'Planning',
    tip: 'Review your AI daily brief at 8 AM',
    detail: 'Starting your day with the AI-generated brief helps you stay ahead of meetings and deadlines.',
  },
  {
    category: 'Email',
    tip: 'Let AI convert emails to tasks automatically',
    detail: 'Enable email-to-task to never miss action items from your inbox again.',
  },
  {
    category: 'Meetings',
    tip: 'Use AI meeting prep 30 minutes before calls',
    detail: 'AI analyzes your calendar and documents to prepare you for every meeting.',
  },
  {
    category: 'Focus',
    tip: 'Set "Focus Time" blocks and AI will protect them',
    detail: 'AI learns your focus patterns and suggests optimal times for deep work.',
  },
  {
    category: 'Breaks',
    tip: 'Take breaks between back-to-back meetings',
    detail: 'AI recommends 15-minute buffers to prevent burnout and improve meeting quality.',
  },
  {
    category: 'Tasks',
    tip: 'Let AI break down large projects into subtasks',
    detail: 'Complex projects become manageable when AI creates step-by-step action plans.',
  },
  {
    category: 'Schedule',
    tip: 'Review AI scheduling suggestions weekly',
    detail: 'AI learns your preferences and suggests optimizations to your recurring schedule.',
  },
  {
    category: 'Documents',
    tip: 'Upload meeting notes for AI to analyze',
    detail: 'AI extracts action items, decisions, and follow-ups from your notes automatically.',
  },
  {
    category: 'Team',
    tip: 'Share AI briefs with your team',
    detail: 'Keep everyone aligned by sharing AI-generated daily or weekly summaries.',
  },
  {
    category: 'Energy',
    tip: 'Schedule light tasks during low-energy hours',
    detail: 'AI tracks when you complete tasks fastest and suggests optimal scheduling.',
  },
  {
    category: 'Goals',
    tip: 'Set weekly goals and let AI track progress',
    detail: 'AI monitors your task completion and nudges you toward your goals.',
  },
];

interface DailyAITipsProps {
  variant?: 'sidebar' | 'card' | 'inline';
  className?: string;
  showClose?: boolean;
  onClose?: () => void;
}

export function DailyAITips({
  variant = 'sidebar',
  className,
  showClose = true,
  onClose,
}: DailyAITipsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    // Get tip of the day based on date
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    setCurrentTip(dayOfYear % AI_TIPS.length);
  }, []);

  const tip = AI_TIPS[currentTip];

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  const handleNextTip = () => {
    setCurrentTip((prev) => (prev + 1) % AI_TIPS.length);
  };

  if (dismissed) return null;

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20', className)}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100 truncate">
            {tip.tip}
          </p>
        </div>
        {showClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-amber-500/20"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn('border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5', className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-2">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                  AI Tip of the Day
                </p>
                <p className="text-xs text-muted-foreground">{tip.category}</p>
              </div>
            </div>
            {showClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 -mr-1 -mt-1"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">{tip.tip}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.detail}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-amber-500/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextTip}
              className="h-7 text-xs gap-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Next Tip
              <ChevronRight className="h-3 w-3" />
            </Button>
            <p className="text-xs text-muted-foreground">
              {currentTip + 1} of {AI_TIPS.length}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // sidebar variant
  return (
    <div className={cn('space-y-2 p-3 rounded-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
            AI Tip of the Day
          </p>
        </div>
        {showClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-5 w-5 p-0 hover:bg-amber-500/20"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-foreground">{tip.tip}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextTip}
        className="w-full h-7 text-xs gap-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-500/10"
      >
        Show Another Tip
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface AIQuickTipProps {
  tip: string;
  icon?: string;
  className?: string;
}

export function AIQuickTip({ tip, icon, className }: AIQuickTipProps) {
  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      {icon && <span>{icon}</span>}
      <span>{tip}</span>
    </div>
  );
}
