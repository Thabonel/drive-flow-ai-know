// Timeline page component

import React, { useState, useEffect } from 'react';
import { TimelineWithDnd } from '@/components/timeline/TimelineWithDnd';
import { useDailyPlanning } from '@/hooks/useDailyPlanning';
import { useAuth } from '@/hooks/useAuth';
import { DailyPlanningFlow } from '@/components/planning/DailyPlanningFlow';
import { EndOfDayShutdown } from '@/components/planning/EndOfDayShutdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Moon, Clock } from 'lucide-react';

export default function Timeline() {
  const { user } = useAuth();
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
    <div className="container mx-auto py-6 space-y-4">
      {/* User Greeting */}
      <p className="text-muted-foreground text-lg">Hey {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>

      {/* Combined Planning & Shutdown Prompt */}
      {(showPrompt && !todaySession?.completed_at) || (shutdownNeeded && settings?.enable_shutdown_ritual) ? (
        <Alert className="border-2 border-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
          <div className="flex items-start gap-4">
            {/* Left side: Shutdown content or Planning prompt */}
            <div className="flex-1 space-y-3">
              {shutdownNeeded && settings?.enable_shutdown_ritual ? (
                <>
                  <div>
                    <h4 className="font-semibold mb-1 text-black dark:text-slate-50">Time to wrap up!</h4>
                    <AlertDescription className="text-sm text-gray-800 dark:text-slate-300">
                      Reflect on today and prepare for tomorrow.
                    </AlertDescription>
                  </div>
                  <Button onClick={handleStartShutdown} size="sm">
                    Start Shutdown Ritual
                  </Button>
                </>
              ) : (
                <div className="flex-shrink-0">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-50">Ready to plan your day?</h4>
                </div>
              )}
            </div>

            {/* Right side: Planning buttons */}
            {showPrompt && !todaySession?.completed_at && (
              <div className="flex flex-col gap-2">
                <Button onClick={handleStartPlanning} size="sm" className="w-full">
                  Full Planning ({settings?.duration_minutes || 15} min)
                </Button>

                {settings?.quick_planning_enabled && (
                  <Button
                    onClick={handleStartQuickPlanning}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 w-full"
                  >
                    <Clock className="h-3 w-3" />
                    Quick (2 min)
                  </Button>
                )}

                <Button
                  onClick={handleSnooze}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Snooze {settings?.snooze_duration_minutes || 15}m
                </Button>
              </div>
            )}

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={showPrompt ? handleDismiss : () => {}}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ) : null}

      {/* Main Timeline Content */}
      <TimelineWithDnd />

      {/* Planning Modals */}
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
    </div>
  );
}
