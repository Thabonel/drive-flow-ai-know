import { useState, useEffect } from 'react';
import { useDailyPlanning } from '@/hooks/useDailyPlanning';
import { DailyPlanningFlow } from './DailyPlanningFlow';
import { EndOfDayShutdown } from './EndOfDayShutdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Moon, Clock } from 'lucide-react';

/**
 * Automatically triggers daily planning prompts
 * - Shows at user's set time or on first app visit
 * - Allows snoozing
 * - Triggers end-of-day shutdown
 */
export function DailyPlanningTrigger() {
  const {
    settings,
    planningNeeded,
    shutdownNeeded,
    todaySession,
  } = useDailyPlanning();

  const [showPrompt, setShowPrompt] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  const [showQuickPlanning, setShowQuickPlanning] = useState(false);
  const [showShutdown, setShowShutdown] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Check if planning is needed on mount and at intervals
  useEffect(() => {
    checkPlanningTrigger();

    // Check every 5 minutes
    const interval = setInterval(checkPlanningTrigger, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [planningNeeded, shutdownNeeded, settings, todaySession]);

  const checkPlanningTrigger = () => {
    if (!settings) return;

    // Don't show if user has dismissed or completed today
    if (promptDismissed || todaySession?.completed_at) {
      setShowPrompt(false);
      return;
    }

    // Check if planning is needed
    if (planningNeeded && settings.enable_notifications) {
      // Check if it's past the planning time
      const now = new Date();
      const [hours, minutes] = settings.planning_time.split(':').map(Number);
      const planningTime = new Date();
      planningTime.setHours(hours, minutes, 0, 0);

      // Show prompt if it's past planning time
      if (now >= planningTime) {
        setShowPrompt(true);
      }
    }
  };

  const handleSnooze = () => {
    setShowPrompt(false);
    setPromptDismissed(false);

    // Re-show after snooze duration
    const snoozeDuration = (settings?.snooze_duration_minutes || 15) * 60 * 1000;
    setTimeout(() => {
      if (!todaySession?.completed_at) {
        setShowPrompt(true);
      }
    }, snoozeDuration);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setPromptDismissed(true);
  };

  const handleStartPlanning = () => {
    setShowPrompt(false);
    setShowPlanning(true);
  };

  const handleStartQuickPlanning = () => {
    setShowPrompt(false);
    setShowQuickPlanning(true);
  };

  const handleStartShutdown = () => {
    setShowShutdown(true);
  };

  return (
    <>
      {/* Daily Planning Prompt */}
      {showPrompt && !todaySession?.completed_at && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <Alert className="border-2 border-primary shadow-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-purple-950/50">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-shrink-0">
                <h4 className="font-semibold text-sm text-foreground">Ready to plan your day?</h4>
              </div>

              <div className="flex items-center gap-2 flex-wrap flex-1">
                <Button onClick={handleStartPlanning} size="sm">
                  Full Planning ({settings?.duration_minutes || 15} min)
                </Button>

                {settings?.quick_planning_enabled && (
                  <Button
                    onClick={handleStartQuickPlanning}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Clock className="h-3 w-3" />
                    Quick (2 min)
                  </Button>
                )}

                <Button
                  onClick={handleSnooze}
                  variant="outline"
                  size="sm"
                >
                  Snooze {settings?.snooze_duration_minutes || 15}m
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* Shutdown Prompt */}
      {shutdownNeeded && settings?.enable_shutdown_ritual && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm px-4">
          <Alert className="border-2 border-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Moon className="h-5 w-5 text-primary-foreground" />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-semibold mb-1 text-slate-900 dark:text-slate-50">Time to wrap up!</h4>
                  <AlertDescription className="text-sm text-slate-700 dark:text-slate-300">
                    Reflect on today and prepare for tomorrow.
                  </AlertDescription>
                </div>

                <Button onClick={handleStartShutdown} size="sm" className="w-full gap-1.5">
                  <Moon className="h-3 w-3" />
                  Start Shutdown Ritual
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => {}}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* Modals */}
      <DailyPlanningFlow
        open={showPlanning}
        onClose={() => setShowPlanning(false)}
        isQuickMode={false}
      />

      <DailyPlanningFlow
        open={showQuickPlanning}
        onClose={() => setShowQuickPlanning(false)}
        isQuickMode={true}
      />

      <EndOfDayShutdown
        open={showShutdown}
        onClose={() => setShowShutdown(false)}
      />
    </>
  );
}
