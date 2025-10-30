/**
 * AI Goal Planner Component
 *
 * A comprehensive modal interface for AI-powered goal planning with:
 * - Stream-of-consciousness goal input
 * - Intelligent milestone and task generation
 * - Energy-aware scheduling
 * - Interactive plan refinement
 * - Timeline integration
 */

import { useState, useEffect } from "react";
import { useAIGoalPlanner, Timeframe } from "@/hooks/useAIGoalPlanner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Target, Calendar, CheckCircle2, Clock, AlertCircle, Sparkles, RefreshCw, Save, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TimelineGoal, GoalPriority, GoalStatus } from "@/lib/timelineUtils";

interface AIGoalPlannerProps {
  /** ID of the "Me" timeline for scheduling */
  meTimelineId: string;
  /** Callback when goal is successfully saved */
  onGoalSaved?: (goal: TimelineGoal) => void;
  /** Optional trigger button (if not provided, uses default) */
  trigger?: React.ReactNode;
}

interface PlanState {
  step: "input" | "generating" | "results" | "refining" | "scheduling";
  goalPrompt: string;
  timeframe: Timeframe;
  goalAnalysis?: any;
  milestones?: any[];
  tasks?: any[];
  scheduledTasks?: any[];
  error?: string;
}

export function AIGoalPlanner({ meTimelineId, onGoalSaved, trigger }: AIGoalPlannerProps) {
  const { toast } = useToast();
  const {
    analyzeGoal,
    createMilestones,
    generateTasks,
    intelligentScheduling,
    saveGoalPlan,
    isLoading,
    error: hookError,
  } = useAIGoalPlanner();

  const [open, setOpen] = useState(false);
  const [planState, setPlanState] = useState<PlanState>({
    step: "input",
    goalPrompt: "",
    timeframe: "month",
  });

  // Sync hook error to plan state
  useEffect(() => {
    if (hookError) {
      setPlanState(prev => ({ ...prev, error: hookError }));
    }
  }, [hookError]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPlanState({
        step: "input",
        goalPrompt: "",
        timeframe: "month",
      });
    }
  }, [open]);

  /**
   * Step 1: Generate goal plan (analysis + milestones + tasks)
   */
  const handleGeneratePlan = async () => {
    if (!planState.goalPrompt.trim()) {
      toast({
        title: "Goal Required",
        description: "Please describe your goal before generating a plan.",
        variant: "destructive",
      });
      return;
    }

    setPlanState(prev => ({ ...prev, step: "generating", error: undefined }));

    try {
      // Analyze goal
      const analysis = await analyzeGoal(planState.goalPrompt, planState.timeframe);
      if (!analysis) {
        throw new Error("Failed to analyze goal");
      }

      // Create milestones
      const milestones = await createMilestones(analysis, planState.timeframe);
      if (!milestones || milestones.length === 0) {
        throw new Error("Failed to create milestones");
      }

      // Generate tasks
      const tasks = await generateTasks(milestones, analysis.category);
      if (!tasks || tasks.length === 0) {
        throw new Error("Failed to generate tasks");
      }

      setPlanState(prev => ({
        ...prev,
        step: "results",
        goalAnalysis: analysis,
        milestones,
        tasks,
      }));

      toast({
        title: "Plan Generated",
        description: `Created ${milestones.length} milestones and ${tasks.length} tasks.`,
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      setPlanState(prev => ({
        ...prev,
        step: "input",
        error: error instanceof Error ? error.message : "Failed to generate plan",
      }));
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate plan",
        variant: "destructive",
      });
    }
  };

  /**
   * Step 2: Schedule tasks into timeline
   */
  const handleScheduleTasks = async () => {
    if (!planState.tasks || !planState.goalAnalysis) {
      return;
    }

    setPlanState(prev => ({ ...prev, step: "scheduling" }));

    try {
      const today = new Date();
      const targetDate = new Date(planState.goalAnalysis.targetDate);

      const scheduledTasks = await intelligentScheduling(
        planState.tasks,
        {
          startDate: today,
          endDate: targetDate,
          workHours: { start: 9, end: 17 },
          preferredDays: [1, 2, 3, 4, 5], // Monday-Friday
          maxWorkHoursPerDay: 8,
        },
        meTimelineId
      );

      setPlanState(prev => ({
        ...prev,
        step: "results",
        scheduledTasks,
      }));

      toast({
        title: "Tasks Scheduled",
        description: `${scheduledTasks.length} tasks scheduled into your timeline.`,
      });
    } catch (error) {
      console.error("Error scheduling tasks:", error);
      setPlanState(prev => ({
        ...prev,
        step: "results",
        error: error instanceof Error ? error.message : "Failed to schedule tasks",
      }));
      toast({
        title: "Scheduling Failed",
        description: error instanceof Error ? error.message : "Failed to schedule tasks",
        variant: "destructive",
      });
    }
  };

  /**
   * Step 3: Save the complete goal plan
   */
  const handleSavePlan = async () => {
    if (!planState.goalAnalysis || !planState.milestones || !planState.tasks) {
      return;
    }

    try {
      const goal = await saveGoalPlan(
        planState.goalAnalysis,
        planState.milestones,
        planState.tasks,
        planState.scheduledTasks || []
      );

      if (goal) {
        toast({
          title: "Goal Saved",
          description: `"${goal.title}" has been added to your goals.`,
        });

        onGoalSaved?.(goal);
        setOpen(false); // Close dialog
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save goal",
        variant: "destructive",
      });
    }
  };

  /**
   * Regenerate the plan with the same input
   */
  const handleRegenerate = () => {
    setPlanState(prev => ({
      ...prev,
      step: "input",
      goalAnalysis: undefined,
      milestones: undefined,
      tasks: undefined,
      scheduledTasks: undefined,
      error: undefined,
    }));
  };

  /**
   * Clear and start over
   */
  const handleStartOver = () => {
    setPlanState({
      step: "input",
      goalPrompt: "",
      timeframe: "month",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Goal Planner
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Goal Planner
          </DialogTitle>
          <DialogDescription>
            Describe your goal in natural language and let AI create a complete action plan.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* STEP 1: Input */}
          {planState.step === "input" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-prompt">What do you want to accomplish?</Label>
                <Textarea
                  id="goal-prompt"
                  placeholder="Example: I want to build a mobile app for tracking fitness goals. I have some coding experience but haven't built a mobile app before. I'd like to launch it in 3 months."
                  className="min-h-[200px] text-base"
                  value={planState.goalPrompt}
                  onChange={(e) =>
                    setPlanState(prev => ({ ...prev, goalPrompt: e.target.value }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Be as detailed as you'd like. Include your experience level, available time, and any constraints.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select
                  value={planState.timeframe}
                  onValueChange={(value: Timeframe) =>
                    setPlanState(prev => ({ ...prev, timeframe: value }))
                  }
                >
                  <SelectTrigger id="timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">1 Week</SelectItem>
                    <SelectItem value="month">1 Month</SelectItem>
                    <SelectItem value="quarter">3 Months</SelectItem>
                    <SelectItem value="year">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {planState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{planState.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isLoading || !planState.goalPrompt.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Generating */}
          {planState.step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Creating your action plan...</p>
                <p className="text-sm text-muted-foreground">
                  Analyzing goal, breaking into milestones, and generating tasks
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Results */}
          {planState.step === "results" && planState.goalAnalysis && (
            <div className="space-y-6">
              {/* Goal Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    AI's Interpretation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg">{planState.goalAnalysis.interpretedGoal}</h4>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={
                        planState.goalAnalysis.suggestedPriority === "critical" ? "destructive" :
                        planState.goalAnalysis.suggestedPriority === "high" ? "default" :
                        "secondary"
                      }>
                        {planState.goalAnalysis.suggestedPriority}
                      </Badge>
                      <Badge variant="outline">{planState.goalAnalysis.category}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {planState.goalAnalysis.estimatedHours}h
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(planState.goalAnalysis.targetDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">{planState.goalAnalysis.rationale}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Milestones */}
              {planState.milestones && planState.milestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Milestones ({planState.milestones.length})
                    </CardTitle>
                    <CardDescription>
                      Major phases of your goal, in sequence
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {planState.milestones.map((milestone, index) => (
                        <div key={index} className="flex gap-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold">{milestone.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                Week {milestone.weekNumber}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {milestone.estimatedHours}h estimated
                              {milestone.dependencies && milestone.dependencies.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Depends on: {milestone.dependencies.join(", ")}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks */}
              {planState.tasks && planState.tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4" />
                      Tasks ({planState.tasks.length})
                    </CardTitle>
                    <CardDescription>
                      Specific actions to complete. {planState.scheduledTasks ? "Scheduled into timeline." : "Ready to schedule."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {planState.tasks.map((task, index) => (
                        <div key={index} className="flex gap-2 p-2 border rounded text-sm hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {task.durationMinutes}min
                              </Badge>
                              {task.cognitiveLoad === "high" && (
                                <Badge variant="secondary" className="text-xs">High Focus</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  {!planState.scheduledTasks && (
                    <CardFooter>
                      <Button onClick={handleScheduleTasks} disabled={isLoading} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Scheduling...
                          </>
                        ) : (
                          <>
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule into Timeline
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              )}

              {/* Scheduled Tasks Preview */}
              {planState.scheduledTasks && planState.scheduledTasks.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Tasks Scheduled</AlertTitle>
                  <AlertDescription>
                    {planState.scheduledTasks.length} tasks have been intelligently scheduled into your timeline,
                    considering energy levels, dependencies, and work-life balance.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Display */}
              {planState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{planState.error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleStartOver} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Start Over
                </Button>
                <Button variant="outline" onClick={handleRegenerate} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleSavePlan}
                  disabled={isLoading}
                  className="flex-1 gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Goal & Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Scheduling (loading state) */}
          {planState.step === "scheduling" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Scheduling tasks...</p>
                <p className="text-sm text-muted-foreground">
                  Finding optimal time slots based on energy levels and dependencies
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
