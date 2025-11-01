import { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Target, Zap, Calendar, CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export interface Achievement {
  id: string;
  type: 'time_saved' | 'tasks_completed' | 'streak' | 'milestone' | 'efficiency';
  title: string;
  message: string;
  icon: 'trophy' | 'star' | 'trending' | 'target' | 'zap' | 'calendar' | 'check' | 'clock';
  value?: number;
  unit?: string;
  color: string;
  celebratory?: boolean;
}

const ICON_MAP = {
  trophy: Trophy,
  star: Star,
  trending: TrendingUp,
  target: Target,
  zap: Zap,
  calendar: Calendar,
  check: CheckCircle2,
  clock: Clock,
};

interface AISuccessStoryProps {
  achievement: Achievement;
  open: boolean;
  onClose: () => void;
  variant?: 'modal' | 'card';
}

export function AISuccessStory({
  achievement,
  open,
  onClose,
  variant = 'modal',
}: AISuccessStoryProps) {
  useEffect(() => {
    if (open && achievement.celebratory) {
      // Trigger confetti animation
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#a855f7', '#3b82f6', '#10b981'],
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#a855f7', '#3b82f6', '#10b981'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open, achievement.celebratory]);

  const Icon = ICON_MAP[achievement.icon];

  if (variant === 'card') {
    return (
      <Card className={cn('border-2 overflow-hidden', `border-${achievement.color}-500/20`)}>
        <CardContent className="p-0">
          <div className={cn('p-4 bg-gradient-to-r', `from-${achievement.color}-500/10 to-${achievement.color}-600/10`)}>
            <div className="flex items-start gap-3">
              <div className={cn('rounded-full p-3 bg-gradient-to-br', `from-${achievement.color}-500 to-${achievement.color}-600`)}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{achievement.message}</p>
                {achievement.value && (
                  <div className="flex items-baseline gap-2">
                    <span className={cn('text-3xl font-bold', `text-${achievement.color}-600`)}>
                      {achievement.value}
                    </span>
                    {achievement.unit && (
                      <span className="text-sm text-muted-foreground">{achievement.unit}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className={cn('absolute inset-0 rounded-full bg-gradient-to-r animate-ping opacity-20', `from-${achievement.color}-500 to-${achievement.color}-600`)} />
              <div className={cn('relative rounded-full p-4 bg-gradient-to-br', `from-${achievement.color}-500 to-${achievement.color}-600`)}>
                <Icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{achievement.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">{achievement.message}</p>

          {achievement.value && (
            <div className="flex items-center justify-center gap-2 py-4">
              <span className={cn('text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent', `from-${achievement.color}-500 to-${achievement.color}-600`)}>
                {achievement.value}
              </span>
              {achievement.unit && (
                <span className="text-lg text-muted-foreground">{achievement.unit}</span>
              )}
            </div>
          )}

          <div className={cn('p-4 rounded-lg bg-gradient-to-r', `from-${achievement.color}-500/10 to-${achievement.color}-600/10 border border-${achievement.color}-500/20`)}>
            <p className="text-sm text-center text-muted-foreground">
              Keep up the great work! AI is learning from your success patterns.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement share functionality
              onClose();
            }}
            className={cn('flex-1 bg-gradient-to-r text-white', `from-${achievement.color}-500 to-${achievement.color}-600`)}
          >
            Share Achievement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to track and trigger achievements
export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  const showAchievement = (achievement: Achievement) => {
    setCurrentAchievement(achievement);
    setAchievements((prev) => [...prev, achievement]);
  };

  const closeAchievement = () => {
    setCurrentAchievement(null);
  };

  return {
    achievements,
    currentAchievement,
    showAchievement,
    closeAchievement,
  };
}

// Pre-defined achievement templates
export const ACHIEVEMENT_TEMPLATES = {
  timeSaved: (hours: number): Achievement => ({
    id: `time-saved-${Date.now()}`,
    type: 'time_saved',
    title: '⏰ Time Saved!',
    message: 'AI automation has saved you valuable time today',
    icon: 'clock',
    value: hours,
    unit: hours === 1 ? 'hour' : 'hours',
    color: 'blue',
    celebratory: hours >= 2,
  }),

  tasksCompleted: (count: number, total: number): Achievement => ({
    id: `tasks-completed-${Date.now()}`,
    type: 'tasks_completed',
    title: '✅ All Tasks Completed!',
    message: `You completed all ${total} AI-suggested tasks this week`,
    icon: 'check',
    value: count,
    unit: 'tasks',
    color: 'green',
    celebratory: count === total,
  }),

  streak: (days: number): Achievement => ({
    id: `streak-${Date.now()}`,
    type: 'streak',
    title: '🔥 Streak Achievement!',
    message: 'You\'ve been consistent with your daily AI briefs',
    icon: 'calendar',
    value: days,
    unit: 'days',
    color: 'orange',
    celebratory: days >= 7,
  }),

  efficiency: (percentage: number): Achievement => ({
    id: `efficiency-${Date.now()}`,
    type: 'efficiency',
    title: '📈 Efficiency Boost!',
    message: 'Your productivity increased this week',
    icon: 'trending',
    value: percentage,
    unit: '% increase',
    color: 'purple',
    celebratory: percentage >= 25,
  }),

  milestone: (count: number, milestone: string): Achievement => ({
    id: `milestone-${Date.now()}`,
    type: 'milestone',
    title: '🎯 Milestone Reached!',
    message: `You've ${milestone}`,
    icon: 'trophy',
    value: count,
    unit: '',
    color: 'yellow',
    celebratory: true,
  }),
};

// Toast-style success notification
interface AISuccessToastProps {
  achievement: Achievement;
  show: boolean;
  onClose: () => void;
}

export function AISuccessToast({ achievement, show, onClose }: AISuccessToastProps) {
  const Icon = ICON_MAP[achievement.icon];

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      <Card className={cn('min-w-[320px] border-2 shadow-lg', `border-${achievement.color}-500/20`)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-full p-2 bg-gradient-to-br flex-shrink-0', `from-${achievement.color}-500 to-${achievement.color}-600`)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1">{achievement.title}</p>
              <p className="text-sm text-muted-foreground">{achievement.message}</p>
              {achievement.value && (
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={cn('text-2xl font-bold', `text-${achievement.color}-600`)}>
                    {achievement.value}
                  </span>
                  {achievement.unit && (
                    <span className="text-xs text-muted-foreground">{achievement.unit}</span>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 -mt-1 -mr-1"
            >
              ×
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
