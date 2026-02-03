import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Clock,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Settings,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Sunrise
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import {
  UserAttentionPreferences,
  ATTENTION_TYPE_DESCRIPTIONS,
  AttentionType
} from '@/lib/attentionTypes';
import { format, setHours, setMinutes } from 'date-fns';

interface PeakHoursOptimizerProps {
  items: TimelineItem[];
  preferences: UserAttentionPreferences | null;
  currentDate: Date;
  onOptimizeSchedule?: (optimizedItems: OptimizationSuggestion[]) => void;
  onUpdatePeakHours?: (startTime: string, endTime: string) => void;
  compact?: boolean;
  className?: string;
}

interface OptimizationSuggestion {
  item: TimelineItem;
  currentTime: string;
  suggestedTime: string;
  reason: string;
  impactScore: number;
  attentionType: AttentionType;
}

interface PeakHoursAnalysis {
  totalTasks: number;
  tasksInPeakHours: number;
  tasksOutsidePeakHours: number;
  peakHoursUtilization: number;
  misplacedHighAttentionTasks: OptimizationSuggestion[];
  peakHoursEffectiveness: number;
}

export function PeakHoursOptimizer({
  items,
  preferences,
  currentDate,
  onOptimizeSchedule,
  onUpdatePeakHours,
  compact = false,
  className = ''
}: PeakHoursOptimizerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');

  const analysis = useMemo((): PeakHoursAnalysis | null => {
    if (!preferences?.peak_hours_start || !preferences?.peak_hours_end) return null;

    const targetDate = currentDate.toISOString().split('T')[0];

    // Filter items for the target date
    const dayItems = items.filter(item => {
      const itemDate = new Date(item.start_time).toISOString().split('T')[0];
      return itemDate === targetDate;
    });

    if (dayItems.length === 0) return null;

    // Parse peak hours
    const [peakStartHour, peakStartMinute] = preferences.peak_hours_start.split(':').map(Number);
    const [peakEndHour, peakEndMinute] = preferences.peak_hours_end.split(':').map(Number);

    // Convert to minutes for easier comparison
    const peakStartMinutes = peakStartHour * 60 + peakStartMinute;
    const peakEndMinutes = peakEndHour * 60 + peakEndMinute;

    let tasksInPeakHours = 0;
    let tasksOutsidePeakHours = 0;
    const misplacedHighAttentionTasks: OptimizationSuggestion[] = [];

    dayItems.forEach(item => {
      const itemStart = new Date(item.start_time);
      const itemMinutes = itemStart.getHours() * 60 + itemStart.getMinutes();

      const isInPeakHours = itemMinutes >= peakStartMinutes && itemMinutes < peakEndMinutes;

      if (isInPeakHours) {
        tasksInPeakHours++;
      } else {
        tasksOutsidePeakHours++;

        // Check if this is a high-attention task that should be in peak hours
        if (item.attention_type && (item.attention_type === 'create' || item.attention_type === 'decide')) {
          const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[item.attention_type];

          // Calculate best time slot within peak hours
          const suggestedStart = setHours(setMinutes(currentDate, peakStartMinute), peakStartHour);

          // Calculate impact score based on attention type and current distance from peak
          const distanceFromPeak = Math.min(
            Math.abs(itemMinutes - peakStartMinutes),
            Math.abs(itemMinutes - peakEndMinutes)
          );
          const maxDistance = 12 * 60; // 12 hours
          const distanceScore = 1 - Math.min(distanceFromPeak, maxDistance) / maxDistance;
          const attentionWeight = item.attention_type === 'create' ? 0.9 : 0.7;
          const impactScore = Math.round(distanceScore * attentionWeight * 100);

          misplacedHighAttentionTasks.push({
            item,
            currentTime: format(itemStart, 'h:mm a'),
            suggestedTime: format(suggestedStart, 'h:mm a'),
            reason: `${attentionDesc.label} tasks perform better during peak hours`,
            impactScore,
            attentionType: item.attention_type
          });
        }
      }
    });

    // Calculate peak hours utilization (how much of peak hours is being used)
    const peakHoursDuration = (peakEndMinutes - peakStartMinutes) / 60; // in hours
    const totalTaskTime = dayItems
      .filter(item => {
        const itemStart = new Date(item.start_time);
        const itemMinutes = itemStart.getHours() * 60 + itemStart.getMinutes();
        return itemMinutes >= peakStartMinutes && itemMinutes < peakEndMinutes;
      })
      .reduce((total, item) => total + item.duration_minutes, 0) / 60; // in hours

    const peakHoursUtilization = Math.min(100, Math.round((totalTaskTime / peakHoursDuration) * 100));

    // Calculate effectiveness score based on what percentage of high-attention tasks are in peak hours
    const highAttentionTasks = dayItems.filter(item =>
      item.attention_type && (item.attention_type === 'create' || item.attention_type === 'decide')
    );
    const highAttentionInPeak = highAttentionTasks.filter(item => {
      const itemStart = new Date(item.start_time);
      const itemMinutes = itemStart.getHours() * 60 + itemStart.getMinutes();
      return itemMinutes >= peakStartMinutes && itemMinutes < peakEndMinutes;
    }).length;

    const peakHoursEffectiveness = highAttentionTasks.length > 0
      ? Math.round((highAttentionInPeak / highAttentionTasks.length) * 100)
      : 100;

    return {
      totalTasks: dayItems.length,
      tasksInPeakHours,
      tasksOutsidePeakHours,
      peakHoursUtilization,
      misplacedHighAttentionTasks: misplacedHighAttentionTasks.sort((a, b) => b.impactScore - a.impactScore),
      peakHoursEffectiveness
    };
  }, [items, preferences, currentDate]);

  // Initialize temp times with current preferences
  useMemo(() => {
    if (preferences?.peak_hours_start && preferences?.peak_hours_end) {
      setTempStartTime(preferences.peak_hours_start);
      setTempEndTime(preferences.peak_hours_end);
    }
  }, [preferences]);

  const handleSavePeakHours = () => {
    if (tempStartTime && tempEndTime && onUpdatePeakHours) {
      onUpdatePeakHours(tempStartTime, tempEndTime);
      setShowSettings(false);
    }
  };

  const handleOptimizeSelected = (suggestions: OptimizationSuggestion[]) => {
    if (onOptimizeSchedule) {
      onOptimizeSchedule(suggestions);
    }
  };

  if (!preferences) return null;

  // Show setup prompt if peak hours not configured
  if (!preferences.peak_hours_start || !preferences.peak_hours_end) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sunrise className="h-4 w-4" />
            Peak Hours Setup
          </CardTitle>
          <CardDescription className="text-xs">
            Configure your peak performance hours to optimize your schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Sunrise className="h-4 w-4" />
            <AlertDescription>
              Set your peak performance hours to get personalized scheduling recommendations.
              Most people are most productive for 3-4 hours per day.
            </AlertDescription>
          </Alert>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button className="mt-3" size="sm">
                <Settings className="h-3 w-3 mr-1" />
                Set Peak Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Peak Hours</DialogTitle>
                <DialogDescription>
                  When are you typically most focused and productive?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Time</label>
                    <input
                      type="time"
                      value={tempStartTime}
                      onChange={(e) => setTempStartTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Time</label>
                    <input
                      type="time"
                      value={tempEndTime}
                      onChange={(e) => setTempEndTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Tips for choosing peak hours:</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Most people are sharpest 2-4 hours after waking up</li>
                    <li>• Choose a 3-4 hour window when you feel most energized</li>
                    <li>• Consider when you have fewest interruptions</li>
                    <li>• This should be when you tackle your most demanding work</li>
                  </ul>
                </div>

                <Button onClick={handleSavePeakHours} className="w-full">
                  Save Peak Hours
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEffectivenessIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Peak Hours Overview */}
      <Card>
        <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Peak Hours Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                {preferences.peak_hours_start} - {preferences.peak_hours_end}
              </CardDescription>
            </div>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <Settings className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Peak Hours</DialogTitle>
                  <DialogDescription>
                    Adjust your peak performance hours
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Time</label>
                      <input
                        type="time"
                        value={tempStartTime}
                        onChange={(e) => setTempStartTime(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Time</label>
                      <input
                        type="time"
                        value={tempEndTime}
                        onChange={(e) => setTempEndTime(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSavePeakHours} className="w-full">
                    Update Peak Hours
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className={compact ? 'pt-0 space-y-3' : 'pt-0 space-y-4'}>
          {/* Effectiveness Score */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getEffectivenessIcon(analysis.peakHoursEffectiveness)}
                <span className="text-sm font-medium">Effectiveness</span>
              </div>
              <div className={`text-2xl font-bold ${getEffectivenessColor(analysis.peakHoursEffectiveness)}`}>
                {analysis.peakHoursEffectiveness}%
              </div>
              <div className="text-xs text-muted-foreground">
                High-attention tasks in peak hours
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Utilization</span>
              </div>
              <div className="space-y-1">
                <Progress value={analysis.peakHoursUtilization} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {analysis.peakHoursUtilization}% of peak hours scheduled
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="text-sm font-medium">{analysis.tasksInPeakHours}</div>
              <div className="text-xs text-muted-foreground">In Peak</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="text-sm font-medium">{analysis.tasksOutsidePeakHours}</div>
              <div className="text-xs text-muted-foreground">Outside Peak</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="text-sm font-medium">{analysis.misplacedHighAttentionTasks.length}</div>
              <div className="text-xs text-muted-foreground">Can Optimize</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      {analysis.misplacedHighAttentionTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Optimization Opportunities
            </CardTitle>
            <CardDescription className="text-xs">
              Move these tasks to peak hours for better performance
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 space-y-2">
            {analysis.misplacedHighAttentionTasks.slice(0, compact ? 2 : 4).map((suggestion) => {
              const attentionDesc = ATTENTION_TYPE_DESCRIPTIONS[suggestion.attentionType];

              return (
                <div
                  key={suggestion.item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{attentionDesc.icon}</span>
                      <span className="font-medium text-sm truncate">{suggestion.item.title}</span>
                      <Badge variant="outline" className="text-xs">
                        +{suggestion.impactScore}% impact
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>From {suggestion.currentTime}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>To {suggestion.suggestedTime}</span>
                    </div>

                    {!compact && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {suggestion.reason}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOptimizeSelected([suggestion])}
                    className="ml-3"
                  >
                    <Zap className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}

            {analysis.misplacedHighAttentionTasks.length > 1 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOptimizeSelected(analysis.misplacedHighAttentionTasks)}
                className="w-full mt-3"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Optimize All ({analysis.misplacedHighAttentionTasks.length} tasks)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {analysis.peakHoursEffectiveness >= 80 && analysis.misplacedHighAttentionTasks.length === 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Peak Hours Optimized!</h3>
                <p className="text-sm text-green-700">
                  Your high-attention tasks are well-aligned with your peak performance hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}