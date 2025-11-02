import { useState, useEffect } from 'react';
import { useDailyPlanning } from '@/hooks/useDailyPlanning';
import { useTimeline } from '@/hooks/useTimeline';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Calendar,
  CheckCircle,
  Target,
  Zap,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Flame,
  Clock,
  Star,
  PartyPopper,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyPlanningFlowProps {
  open: boolean;
  onClose: () => void;
  isQuickMode?: boolean;
}

enum PlanningStep {
  WELCOME = 0,
  REVIEW_YESTERDAY = 1,
  IMPORT_CALENDAR = 2,
  ADD_TASKS = 3,
  SET_PRIORITIES = 4,
  CHECK_WORKLOAD = 5,
  COMMIT = 6,
}

export function DailyPlanningFlow({ open, onClose, isQuickMode = false }: DailyPlanningFlowProps) {
  const {
    settings,
    streak,
    startPlanningSession,
    updatePlanningSession,
    completePlanningSession,
    getYesterdayStats,
  } = useDailyPlanning();

  const { items, refetchItems } = useTimeline();

  const [currentStep, setCurrentStep] = useState<PlanningStep>(PlanningStep.WELCOME);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step completion states
  const [yesterdayStats, setYesterdayStats] = useState({ completed: 0, total: 0 });
  const [calendarImported, setCalendarImported] = useState(false);
  const [priorityTasks, setPriorityTasks] = useState<string[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [workloadOk, setWorkloadOk] = useState(false);

  // Get steps to show based on settings and quick mode
  const getActiveSteps = () => {
    if (isQuickMode) {
      return [PlanningStep.WELCOME, PlanningStep.IMPORT_CALENDAR, PlanningStep.CHECK_WORKLOAD, PlanningStep.COMMIT];
    }

    const steps = [PlanningStep.WELCOME];
    if (settings?.review_yesterday) steps.push(PlanningStep.REVIEW_YESTERDAY);
    if (settings?.import_calendar) steps.push(PlanningStep.IMPORT_CALENDAR);
    steps.push(PlanningStep.ADD_TASKS);
    if (settings?.set_priorities) steps.push(PlanningStep.SET_PRIORITIES);
    if (settings?.check_workload) steps.push(PlanningStep.CHECK_WORKLOAD);
    steps.push(PlanningStep.COMMIT);

    return steps;
  };

  const activeSteps = getActiveSteps();
  const currentStepIndex = activeSteps.indexOf(currentStep);
  const totalSteps = activeSteps.length;
  const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;

  // Initialize session
  useEffect(() => {
    if (open && !sessionId) {
      initializeSession();
    }
  }, [open]);

  const initializeSession = async () => {
    const session = await startPlanningSession(isQuickMode);
    if (session) {
      setSessionId(session.id);
    }

    // Fetch yesterday's stats
    const stats = await getYesterdayStats();
    setYesterdayStats(stats);
  };

  const handleNext = async () => {
    // Update session with current step completion
    if (sessionId) {
      const updates: any = {};
      if (currentStep === PlanningStep.REVIEW_YESTERDAY) {
        updates.reviewed_yesterday = true;
        updates.yesterday_completed_count = yesterdayStats.completed;
        updates.yesterday_total_count = yesterdayStats.total;
      } else if (currentStep === PlanningStep.IMPORT_CALENDAR) {
        updates.imported_calendar = true;
      } else if (currentStep === PlanningStep.SET_PRIORITIES) {
        updates.set_priorities = true;
      } else if (currentStep === PlanningStep.CHECK_WORKLOAD) {
        updates.checked_workload = true;
      }

      if (Object.keys(updates).length > 0) {
        await updatePlanningSession(updates);
      }
    }

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < activeSteps.length) {
      setCurrentStep(activeSteps[nextStepIndex]);
    }
  };

  const handleBack = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(activeSteps[prevStepIndex]);
    }
  };

  const handleComplete = async () => {
    await completePlanningSession(priorityTasks, totalMinutes);

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onClose();
      resetState();
    }, 2000);
  };

  const handleSkipStep = () => {
    handleNext();
  };

  const resetState = () => {
    setCurrentStep(PlanningStep.WELCOME);
    setSessionId(null);
    setYesterdayStats({ completed: 0, total: 0 });
    setCalendarImported(false);
    setPriorityTasks([]);
    setTotalMinutes(0);
    setWorkloadOk(false);
  };

  // Calculate today's tasks
  const todayItems = items.filter((item) => {
    const itemDate = new Date(item.start_time).toDateString();
    const today = new Date().toDateString();
    return itemDate === today && item.status !== 'completed';
  });

  const calculateTotalMinutes = () => {
    return todayItems.reduce((sum, item) => sum + item.duration_minutes, 0);
  };

  useEffect(() => {
    setTotalMinutes(calculateTotalMinutes());
  }, [items]);

  const renderStep = () => {
    switch (currentStep) {
      case PlanningStep.WELCOME:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mx-auto flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white" />
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">
                Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}!
              </h2>
              <p className="text-lg text-muted-foreground">
                Let's plan your perfect day
              </p>
            </div>

            {streak && streak.current_streak > 0 && (
              <div className="flex items-center justify-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {streak.current_streak} day streak!
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {isQuickMode ? '2 minute' : `${settings?.duration_minutes || 15} minute`} planning session
              </span>
            </div>

            <Button onClick={handleNext} size="lg" className="gap-2 w-full max-w-xs mx-auto">
              Let's Start
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        );

      case PlanningStep.REVIEW_YESTERDAY:
        const completionRate =
          yesterdayStats.total > 0
            ? Math.round((yesterdayStats.completed / yesterdayStats.total) * 100)
            : 0;

        return (
          <div className="space-y-6">
            <div className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">Yesterday's Wins</h2>
              <p className="text-muted-foreground">Take a moment to celebrate your progress</p>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold text-primary">
                    {yesterdayStats.completed}
                  </div>
                  <div className="text-lg">
                    {yesterdayStats.completed === 0 ? (
                      <span className="text-muted-foreground">No tasks completed yesterday</span>
                    ) : yesterdayStats.completed === 1 ? (
                      <span>task completed!</span>
                    ) : (
                      <span>tasks completed!</span>
                    )}
                  </div>

                  {yesterdayStats.total > 0 && (
                    <>
                      <Progress value={completionRate} className="h-3" />
                      <p className="text-sm text-muted-foreground">
                        {completionRate}% completion rate ({yesterdayStats.completed} of {yesterdayStats.total})
                      </p>
                    </>
                  )}

                  {completionRate >= 80 && (
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Outstanding work! You're crushing it!
                      </p>
                    </div>
                  )}

                  {completionRate >= 50 && completionRate < 80 && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        Great progress! Keep up the momentum!
                      </p>
                    </div>
                  )}

                  {yesterdayStats.completed === 0 && yesterdayStats.total === 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                      <p className="font-semibold text-purple-700 dark:text-purple-300">
                        Fresh start! Today is a new opportunity!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case PlanningStep.IMPORT_CALENDAR:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h2 className="text-2xl font-bold mb-2">Today's Calendar</h2>
              <p className="text-muted-foreground">Import your meetings and events</p>
            </div>

            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Your calendar events will be synced automatically if you have Google Calendar connected.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {todayItems.filter(item => item.is_meeting).length > 0 ? (
                <>
                  <p className="font-semibold">Today's meetings:</p>
                  {todayItems.filter(item => item.is_meeting).map((item) => (
                    <Card key={item.id}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.start_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            · {item.duration_minutes} min
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No calendar events found for today
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setCalendarImported(true);
                handleNext();
              }}
              className="w-full"
            >
              {todayItems.filter(item => item.is_meeting).length > 0 ? 'Looks Good' : 'Continue'}
            </Button>
          </div>
        );

      case PlanningStep.ADD_TASKS:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">Add Today's Tasks</h2>
              <p className="text-muted-foreground">What do you want to accomplish?</p>
            </div>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                You can add tasks directly in the Timeline Manager. This step is a reminder to think about your goals for today.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="font-semibold">Today's tasks ({todayItems.length}):</p>
              {todayItems.length > 0 ? (
                todayItems.slice(0, 5).map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.duration_minutes} min
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks planned yet. Add some in the Timeline Manager!
                </div>
              )}
              {todayItems.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ...and {todayItems.length - 5} more
                </p>
              )}
            </div>
          </div>
        );

      case PlanningStep.SET_PRIORITIES:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">Set Your Priorities</h2>
              <p className="text-muted-foreground">Pick your top 3 most important tasks</p>
            </div>

            <div className="space-y-3">
              {todayItems.slice(0, 8).map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all ${
                    priorityTasks.includes(item.id)
                      ? 'border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                      : ''
                  }`}
                  onClick={() => {
                    if (priorityTasks.includes(item.id)) {
                      setPriorityTasks(priorityTasks.filter((id) => id !== item.id));
                    } else if (priorityTasks.length < 3) {
                      setPriorityTasks([...priorityTasks, item.id]);
                    }
                  }}
                >
                  <CardContent className="py-3 flex items-center gap-3">
                    <Checkbox
                      checked={priorityTasks.includes(item.id)}
                      onCheckedChange={() => {}}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.duration_minutes} min
                      </p>
                    </div>
                    {priorityTasks.includes(item.id) && (
                      <Badge variant="default" className="bg-yellow-500">
                        Priority #{priorityTasks.indexOf(item.id) + 1}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {priorityTasks.length} of 3 priorities selected
            </div>
          </div>
        );

      case PlanningStep.CHECK_WORKLOAD:
        const hoursPlanned = Math.round((totalMinutes / 60) * 10) / 10;
        const isOverloaded = hoursPlanned > 8;
        const isReasonable = hoursPlanned >= 4 && hoursPlanned <= 8;

        return (
          <div className="space-y-6">
            <div className="text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-purple-500" />
              <h2 className="text-2xl font-bold mb-2">Workload Check</h2>
              <p className="text-muted-foreground">Make sure your day is realistic</p>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold text-primary">
                    {hoursPlanned}h
                  </div>
                  <div className="text-lg">Total planned time</div>

                  <Progress
                    value={Math.min((hoursPlanned / 10) * 100, 100)}
                    className="h-3"
                  />

                  {isOverloaded && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Your day might be too packed! Consider moving some tasks to tomorrow.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isReasonable && (
                    <Alert>
                      <AlertDescription>
                        Your workload looks balanced and achievable!
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isOverloaded && !isReasonable && hoursPlanned < 4 && (
                    <Alert>
                      <AlertDescription>
                        You have room for more! Consider adding important tasks.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{todayItems.length}</p>
                      <p className="text-sm text-muted-foreground">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {todayItems.filter(item => item.is_meeting).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Meetings</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                setWorkloadOk(true);
                handleNext();
              }}
              className="w-full"
            >
              {isOverloaded ? "I'll adjust later" : 'Looks Good!'}
            </Button>
          </div>
        );

      case PlanningStep.COMMIT:
        return (
          <div className="text-center space-y-6 py-8">
            <PartyPopper className="h-16 w-16 mx-auto text-primary" />

            <div>
              <h2 className="text-3xl font-bold mb-2">You're All Set!</h2>
              <p className="text-lg text-muted-foreground">Ready to crush your day</p>
            </div>

            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">{todayItems.length}</p>
                    <p className="text-sm text-muted-foreground">Tasks</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">{priorityTasks.length}</p>
                    <p className="text-sm text-muted-foreground">Priorities</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">{Math.round((totalMinutes / 60) * 10) / 10}h</p>
                    <p className="text-sm text-muted-foreground">Planned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {streak && (
              <div className="flex items-center justify-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-semibold">
                  This will be day {(streak.current_streak || 0) + 1} of your planning streak!
                </span>
              </div>
            )}

            <Button onClick={handleComplete} size="lg" className="gap-2 w-full max-w-xs mx-auto">
              <Sparkles className="h-4 w-4" />
              Commit to My Day
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>Daily Planning Flow</DialogTitle>
          <DialogDescription>
            Complete your daily planning ritual to organize your day
          </DialogDescription>
        </VisuallyHidden>

        {/* Progress bar */}
        <div className="space-y-2 mb-6">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            {isQuickMode && <Badge variant="outline">Quick Planning</Badge>}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">{renderStep()}</div>

        {/* Navigation */}
        {currentStep !== PlanningStep.WELCOME && currentStep !== PlanningStep.COMMIT && (
          <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkipStep}>
                Skip
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
