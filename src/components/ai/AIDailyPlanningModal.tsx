import { useState, useEffect } from 'react';
import { useAIDailyPlanning, PlanningStep } from '@/hooks/useAIDailyPlanning';
import { useTemplateApplication } from '@/hooks/useTemplateApplication';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Sparkles, Calendar as CalendarIcon, Brain, Clock, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AIDailyPlanningModalProps {
  open: boolean;
  onClose: () => void;
  onPlanApplied?: () => void;
}

export function AIDailyPlanningModal({ open, onClose, onPlanApplied }: AIDailyPlanningModalProps) {
  const { step, plan, error, isConfigured, generateOptimalPlan, reset } = useAIDailyPlanning();
  const { applyTemplate, applying } = useTemplateApplication();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(true);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setShowDatePicker(true);
    }
  }, [open, reset]);

  const handleGenerate = async () => {
    setShowDatePicker(false);
    await generateOptimalPlan(selectedDate);
  };

  const handleApplyPlan = async () => {
    if (!plan) return;

    // Convert AI plan to timeline items
    const result = await applyTemplate(
      {
        id: 'ai-generated',
        user_id: null,
        name: 'AI Generated Plan',
        description: plan.summary,
        is_default: false,
        is_system: false,
        template_blocks: plan.blocks.map(block => ({
          start_time: block.start_time,
          duration_minutes: block.duration_minutes,
          title: block.title,
          type: block.type,
          color: block.color,
          is_flexible: block.is_flexible,
        })),
        usage_count: 0,
        last_used_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        targetDate: selectedDate,
        clearExisting: false,
        skipMeetings: true,
      }
    );

    if (result.success) {
      onPlanApplied?.();
      onClose();
    }
  };

  const getStepProgress = (): number => {
    switch (step) {
      case PlanningStep.IDLE:
        return 0;
      case PlanningStep.FETCHING_CALENDAR:
        return 25;
      case PlanningStep.ANALYZING_SCHEDULE:
        return 50;
      case PlanningStep.GENERATING_PLAN:
        return 75;
      case PlanningStep.COMPLETE:
        return 100;
      case PlanningStep.ERROR:
        return 0;
      default:
        return 0;
    }
  };

  const getStepMessage = (): string => {
    switch (step) {
      case PlanningStep.FETCHING_CALENDAR:
        return 'Analyzing your calendar...';
      case PlanningStep.ANALYZING_SCHEDULE:
        return 'Identifying priorities...';
      case PlanningStep.GENERATING_PLAN:
        return 'Optimizing schedule...';
      case PlanningStep.COMPLETE:
        return 'Review and confirm';
      case PlanningStep.ERROR:
        return 'Something went wrong';
      default:
        return 'Ready to plan your perfect day';
    }
  };

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">OpenAI Not Configured</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Please add your OpenAI API key to the environment variables to use AI planning features.
              </p>
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-4 py-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              {step !== PlanningStep.IDLE && step !== PlanningStep.ERROR && (
                <div className="absolute -inset-2 rounded-full border-4 border-purple-300 animate-ping opacity-75" />
              )}
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              Let AI Plan Your Perfect Day
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </h1>
            <p className="text-muted-foreground mt-2">
              {getStepMessage()}
            </p>
          </div>

          {/* Progress Bar */}
          {step !== PlanningStep.IDLE && step !== PlanningStep.ERROR && (
            <div className="max-w-md mx-auto">
              <Progress value={getStepProgress()} className="h-2" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Date Selection */}
          {showDatePicker && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Choose a Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="mx-auto"
                  />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    size="lg"
                    className="w-full max-w-md gap-2"
                  >
                    <Brain className="h-5 w-5" />
                    Generate AI Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading States */}
          {(step === PlanningStep.FETCHING_CALENDAR ||
            step === PlanningStep.ANALYZING_SCHEDULE ||
            step === PlanningStep.GENERATING_PLAN) && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">{getStepMessage()}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This may take a few moments...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {step === PlanningStep.ERROR && error && (
            <Card className="border-destructive">
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                      <X className="h-8 w-8 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Planning Failed</h3>
                    <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  </div>
                  <Button variant="outline" onClick={handleGenerate}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Review */}
          {step === PlanningStep.COMPLETE && plan && (
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI's Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{plan.summary}</p>
                  <div className="flex gap-4 mt-4">
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {plan.total_work_hours.toFixed(1)}h work
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {plan.total_focus_hours.toFixed(1)}h focus
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {plan.total_break_minutes}min breaks
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Time Blocks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Planned Time Blocks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.blocks.map((block, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        'hover:shadow-sm transition-shadow'
                      )}
                    >
                      <div
                        className="w-1 h-full rounded"
                        style={{ backgroundColor: block.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{block.title}</span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {block.type}
                          </Badge>
                          {block.confidence && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {Math.round(block.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="font-mono">{block.start_time}</span>
                          <span>•</span>
                          <span>{block.duration_minutes} min</span>
                          {!block.is_flexible && (
                            <>
                              <span>•</span>
                              <span>Fixed</span>
                            </>
                          )}
                        </div>
                        {block.reasoning && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {block.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDatePicker(true)}>
                  Start Over
                </Button>
                <Button
                  onClick={handleApplyPlan}
                  disabled={applying}
                  size="lg"
                  className="gap-2"
                >
                  {applying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Apply to Timeline
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
