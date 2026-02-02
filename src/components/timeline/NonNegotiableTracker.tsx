// Component for tracking weekly non-negotiable priority progress
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimelineItem } from '@/lib/timelineUtils';
import { UserAttentionPreferences } from '@/lib/attentionTypes';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import {
  Shield,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Star,
  X
} from 'lucide-react';

interface NonNegotiableTrackerProps {
  items: TimelineItem[];
  preferences?: UserAttentionPreferences | null;
  currentWeek?: Date;
  compact?: boolean;
  onPreferencesUpdate?: (updates: Partial<UserAttentionPreferences>) => void;
}

interface WeeklyProgress {
  totalMinutes: number;
  targetMinutes: number;
  percentage: number;
  remainingMinutes: number;
  status: 'behind' | 'on-track' | 'ahead' | 'complete';
  nonNegotiableItems: TimelineItem[];
  currentStreak: number;
  weekDays: WeeklyDayProgress[];
}

interface WeeklyDayProgress {
  date: Date;
  minutes: number;
  hasNonNegotiable: boolean;
  isPast: boolean;
  isToday: boolean;
}

const getStatusConfig = (status: WeeklyProgress['status']) => {
  switch (status) {
    case 'ahead':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        description: 'Exceeding weekly target'
      };
    case 'on-track':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Target,
        iconColor: 'text-blue-600',
        description: 'On pace to meet target'
      };
    case 'behind':
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertTriangle,
        iconColor: 'text-orange-600',
        description: 'Behind weekly target'
      };
    case 'complete':
      return {
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: Star,
        iconColor: 'text-emerald-600',
        description: 'Weekly target achieved'
      };
  }
};

export function NonNegotiableTracker({
  items,
  preferences,
  currentWeek = new Date(),
  compact = false,
  onPreferencesUpdate
}: NonNegotiableTrackerProps) {

  const { updatePreferences } = useAttentionBudget();
  const [showSettings, setShowSettings] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempHours, setTempHours] = useState(5);

  // Calculate weekly progress
  const weeklyProgress = useMemo(() =>
    calculateWeeklyProgress(items, preferences, currentWeek),
    [items, preferences, currentWeek]
  );

  // Initialize temp settings when preferences change
  useEffect(() => {
    if (preferences) {
      setTempTitle(preferences.non_negotiable_title || 'Deep Work');
      setTempHours(preferences.non_negotiable_weekly_hours || 5);
    }
  }, [preferences]);

  const handleUpdateSettings = async () => {
    const updates = {
      non_negotiable_title: tempTitle,
      non_negotiable_weekly_hours: tempHours
    };

    try {
      await updatePreferences(updates);
      onPreferencesUpdate?.(updates);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to update non-negotiable settings:', error);
    }
  };



  // Handle enabling the feature
  const handleEnableFeature = async () => {
    try {
      const updates = {
        ...preferences,
        non_negotiable_enabled: true
      };
      await updatePreferences(updates);
      onPreferencesUpdate?.(updates);
    } catch (error) {
      console.error('Failed to enable non-negotiable tracking:', error);
    }
  };

  // Show enable option if the feature is not enabled
  if (!preferences?.non_negotiable_enabled) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-dashed">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Track weekly non-negotiable priority</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEnableFeature}
            className="h-auto px-2 py-1 text-xs"
          >
            Enable
          </Button>
        </div>
      </div>
    );
  }

  // If enabled but no title is set, show setup prompt
  if (!preferences?.non_negotiable_title) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 text-center">
          <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-muted-foreground mb-3">
            Set your weekly non-negotiable priority to track progress
          </p>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Set Non-Negotiable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Weekly Non-Negotiable</DialogTitle>
                <DialogDescription>
                  Define your most important weekly priority that gets protected time
                </DialogDescription>
              </DialogHeader>
              <NonNegotiableSettings
                title={tempTitle}
                hours={tempHours}
                onTitleChange={setTempTitle}
                onHoursChange={setTempHours}
                onSave={handleUpdateSettings}
                onCancel={() => setShowSettings(false)}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(weeklyProgress.status);
  const StatusIcon = statusConfig.icon;

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-3 w-3" />
            <span className="hidden sm:inline">Non-Negotiable</span>
            <Badge variant={weeklyProgress.status === 'behind' ? "destructive" : "default"} className="text-xs">
              {weeklyProgress.percentage}%
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <NonNegotiableContent
            weeklyProgress={weeklyProgress}
            preferences={preferences}
            statusConfig={statusConfig}
            onShowSettings={() => setShowSettings(true)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Non-Negotiable Tracker
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NonNegotiableContent
            weeklyProgress={weeklyProgress}
            preferences={preferences}
            statusConfig={statusConfig}
            onShowSettings={() => setShowSettings(true)}
          />
        </CardContent>
      </Card>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Non-Negotiable Settings</DialogTitle>
            <DialogDescription>
              Configure your weekly protected priority
            </DialogDescription>
          </DialogHeader>
          <NonNegotiableSettings
            title={tempTitle}
            hours={tempHours}
            onTitleChange={setTempTitle}
            onHoursChange={setTempHours}
            onSave={handleUpdateSettings}
            onCancel={() => setShowSettings(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function NonNegotiableContent({
  weeklyProgress,
  preferences,
  statusConfig,
  onShowSettings
}: {
  weeklyProgress: WeeklyProgress;
  preferences: UserAttentionPreferences;
  statusConfig: ReturnType<typeof getStatusConfig>;
  onShowSettings: () => void;
}) {
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className={`p-3 rounded-lg border ${statusConfig.color}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusConfig.iconColor}`} />
            <span className="font-medium">{preferences.non_negotiable_title}</span>
          </div>
          <Badge variant="outline">
            Week {getWeekNumber(new Date())}
          </Badge>
        </div>
        <p className="text-sm">{statusConfig.description}</p>
      </div>

      {/* Progress tracking */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Weekly Progress</span>
          <span className="text-sm text-muted-foreground">
            {Math.round(weeklyProgress.totalMinutes / 60 * 10) / 10}h / {weeklyProgress.targetMinutes / 60}h
          </span>
        </div>

        <Progress value={weeklyProgress.percentage} className="h-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{weeklyProgress.percentage}% complete</span>
          <span>
            {weeklyProgress.remainingMinutes > 0 ?
              `${Math.round(weeklyProgress.remainingMinutes / 60 * 10) / 10}h remaining` :
              'Target achieved!'
            }
          </span>
        </div>
      </div>

      {/* Weekly calendar view */}
      <div className="space-y-2">
        <span className="text-sm font-medium">This Week</span>
        <div className="grid grid-cols-7 gap-1">
          {weeklyProgress.weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-2 rounded text-center text-xs ${
                day.isToday ? 'bg-primary text-primary-foreground' :
                day.hasNonNegotiable ? 'bg-green-100 text-green-800' :
                day.isPast ? 'bg-gray-100 text-gray-500' :
                'bg-gray-50 text-gray-700'
              }`}
            >
              <div className="font-medium">
                {day.date.toLocaleDateString('en', { weekday: 'short' })[0]}
              </div>
              <div className="text-xs mt-1">
                {day.date.getDate()}
              </div>
              {day.hasNonNegotiable && (
                <div className="text-xs mt-1">
                  <Shield className="h-3 w-3 mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      {weeklyProgress.nonNegotiableItems.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Recent Sessions</span>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {weeklyProgress.nonNegotiableItems.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-gray-500">
                    {new Date(item.start_time).toLocaleDateString('en', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="h-3 w-3" />
                  {item.duration_minutes}m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current streak */}
      {weeklyProgress.currentStreak > 0 && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
          <TrendingUp className="h-4 w-4 text-orange-600" />
          <span className="text-orange-700">
            {weeklyProgress.currentStreak} week streak!
          </span>
        </div>
      )}
    </div>
  );
}

function NonNegotiableSettings({
  title,
  hours,
  onTitleChange,
  onHoursChange,
  onSave,
  onCancel
}: {
  title: string;
  hours: number;
  onTitleChange: (title: string) => void;
  onHoursChange: (hours: number) => void;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="non-negotiable-title">Priority Title</Label>
        <Input
          id="non-negotiable-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Deep Work, Research, Creative Time"
        />
        <p className="text-xs text-muted-foreground">
          What is your most important weekly priority that should be protected?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="weekly-hours">Weekly Hours Target</Label>
        <Input
          id="weekly-hours"
          type="number"
          min="1"
          max="40"
          value={hours}
          onChange={(e) => onHoursChange(parseInt(e.target.value) || 5)}
        />
        <p className="text-xs text-muted-foreground">
          Minimum hours per week dedicated to this priority (recommended: 5-10 hours)
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Not Now
          </Button>
        )}
        <Button onClick={onSave} className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function calculateWeeklyProgress(
  items: TimelineItem[],
  preferences: UserAttentionPreferences | null | undefined,
  currentWeek: Date
): WeeklyProgress {
  if (!preferences?.non_negotiable_title) {
    return {
      totalMinutes: 0,
      targetMinutes: 300, // 5 hours default
      percentage: 0,
      remainingMinutes: 300,
      status: 'behind',
      nonNegotiableItems: [],
      currentStreak: 0,
      weekDays: []
    };
  }

  const targetMinutes = (preferences.non_negotiable_weekly_hours || 5) * 60;

  // Calculate start and end of current week (Monday to Sunday)
  const weekStart = new Date(currentWeek);
  weekStart.setDate(currentWeek.getDate() - currentWeek.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Filter non-negotiable items for this week
  const nonNegotiableItems = items.filter(item =>
    item.is_non_negotiable &&
    new Date(item.start_time) >= weekStart &&
    new Date(item.start_time) <= weekEnd
  );

  // Calculate total minutes
  const totalMinutes = nonNegotiableItems.reduce((total, item) =>
    total + (item.duration_minutes || 0), 0
  );

  const percentage = Math.min(100, Math.round((totalMinutes / targetMinutes) * 100));
  const remainingMinutes = Math.max(0, targetMinutes - totalMinutes);

  // Determine status
  let status: WeeklyProgress['status'];
  if (percentage >= 100) status = 'complete';
  else if (percentage >= 80) status = 'ahead';
  else if (percentage >= 50) status = 'on-track';
  else status = 'behind';

  // Generate week days
  const weekDays: WeeklyDayProgress[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);

    const dayItems = nonNegotiableItems.filter(item => {
      const itemDate = new Date(item.start_time);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === date.getTime();
    });

    const dayMinutes = dayItems.reduce((total, item) =>
      total + (item.duration_minutes || 0), 0
    );

    weekDays.push({
      date,
      minutes: dayMinutes,
      hasNonNegotiable: dayItems.length > 0,
      isPast: date < today,
      isToday: date.getTime() === today.getTime()
    });
  }

  // Calculate current streak (simplified - could be enhanced to check actual consecutive weeks)
  const currentStreak = percentage >= 100 ? 1 : 0;

  return {
    totalMinutes,
    targetMinutes,
    percentage,
    remainingMinutes,
    status,
    nonNegotiableItems,
    currentStreak,
    weekDays
  };
}

function getWeekNumber(date: Date): number {
  const target = new Date(date);
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}