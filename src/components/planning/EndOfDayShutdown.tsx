import { useState, useEffect } from 'react';
import { useDailyPlanning } from '@/hooks/useDailyPlanning';
import { useTimeline } from '@/hooks/useTimeline';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PartyPopper,
  Moon,
  CheckCircle,
  ArrowRight,
  Trophy,
  Heart,
  TrendingUp,
  Calendar,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EndOfDayShutdownProps {
  open: boolean;
  onClose: () => void;
}

export function EndOfDayShutdown({ open, onClose }: EndOfDayShutdownProps) {
  const { createShutdownSession, streak } = useDailyPlanning();
  const { items } = useTimeline();

  const [currentStep, setCurrentStep] = useState(0);
  const [wins, setWins] = useState<string[]>(['']);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [movedToTomorrow, setMovedToTomorrow] = useState<string[]>([]);

  // Calculate today's stats
  const today = new Date().toDateString();
  const todayItems = items.filter(item => {
    const itemDate = new Date(item.start_time).toDateString();
    return itemDate === today;
  });

  const completedItems = todayItems.filter(item => item.status === 'completed');
  const completionRate = todayItems.length > 0
    ? Math.round((completedItems.length / todayItems.length) * 100)
    : 0;

  const totalMinutes = completedItems.reduce((sum, item) => sum + item.duration_minutes, 0);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setWins(['']);
      setChallenges([]);
      setMovedToTomorrow([]);
    }
  }, [open]);

  const handleComplete = async () => {
    await createShutdownSession({
      tasksCompleted: completedItems.length,
      tasksTotal: todayItems.length,
      minutesWorked: totalMinutes,
      movedToTomorrow,
      wins: wins.filter(w => w.trim()),
      challenges: challenges.filter(c => c.trim()),
    });

    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF69B4'],
    });

    setCurrentStep(3);

    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const addWin = () => {
    if (wins.length < 5) {
      setWins([...wins, '']);
    }
  };

  const updateWin = (index: number, value: string) => {
    const newWins = [...wins];
    newWins[index] = value;
    setWins(newWins);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-3xl font-bold mb-2">Today's Accomplishments</h2>
              <p className="text-muted-foreground">Let's celebrate what you achieved!</p>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Completion Stats */}
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold text-primary">
                      {completedItems.length}
                    </div>
                    <div className="text-lg">
                      {completedItems.length === 0
                        ? 'No tasks completed'
                        : completedItems.length === 1
                        ? 'task completed 🎉'
                        : 'tasks completed 🎉'}
                    </div>

                    {todayItems.length > 0 && (
                      <>
                        <Progress value={completionRate} className="h-3" />
                        <p className="text-sm text-muted-foreground">
                          {completionRate}% of today's tasks ({completedItems.length} of {todayItems.length})
                        </p>
                      </>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {Math.round((totalMinutes / 60) * 10) / 10}h
                      </p>
                      <p className="text-sm text-muted-foreground">Time Spent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {todayItems.filter(item => item.is_meeting).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Meetings</p>
                    </div>
                  </div>

                  {/* Encouragement based on performance */}
                  {completionRate >= 80 && (
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        🌟 Outstanding! You crushed today!
                      </p>
                    </div>
                  )}

                  {completionRate >= 50 && completionRate < 80 && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        💪 Solid work! You made real progress!
                      </p>
                    </div>
                  )}

                  {completionRate < 50 && completionRate > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg text-center">
                      <p className="font-semibold text-purple-700 dark:text-purple-300">
                        ✨ Every step forward counts! Tomorrow is a new opportunity!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => setCurrentStep(1)} className="w-full" size="lg">
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-pink-500" />
              <h2 className="text-3xl font-bold mb-2">What Went Well?</h2>
              <p className="text-muted-foreground">Capture your wins, big and small</p>
            </div>

            <div className="space-y-4">
              {wins.map((win, index) => (
                <div key={index} className="space-y-2">
                  <Label>Win #{index + 1}</Label>
                  <Input
                    value={win}
                    onChange={(e) => updateWin(index, e.target.value)}
                    placeholder="I finished the presentation..."
                    className="text-base"
                  />
                </div>
              ))}

              {wins.length < 5 && (
                <Button variant="outline" onClick={addWin} className="w-full">
                  + Add Another Win
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(2)} className="flex-1">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        const incompleteTasks = todayItems.filter(item => item.status !== 'completed');

        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-blue-500" />
              <h2 className="text-3xl font-bold mb-2">Prepare for Tomorrow</h2>
              <p className="text-muted-foreground">What should move to tomorrow?</p>
            </div>

            {incompleteTasks.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select tasks to reschedule for tomorrow:
                </p>
                {incompleteTasks.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all ${
                      movedToTomorrow.includes(item.id)
                        ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : ''
                    }`}
                    onClick={() => {
                      if (movedToTomorrow.includes(item.id)) {
                        setMovedToTomorrow(movedToTomorrow.filter(id => id !== item.id));
                      } else {
                        setMovedToTomorrow([...movedToTomorrow, item.id]);
                      }
                    }}
                  >
                    <CardContent className="py-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.duration_minutes} min
                      </p>
                    </CardContent>
                  </Card>
                ))}
                <p className="text-sm text-muted-foreground text-center">
                  {movedToTomorrow.length} task{movedToTomorrow.length !== 1 ? 's' : ''} will move to tomorrow
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>All tasks completed! 🎉</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button onClick={handleComplete} className="flex-1 gap-2">
                <Moon className="h-4 w-4" />
                Finish Day
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6 py-8">
            <PartyPopper className="h-20 w-20 mx-auto text-yellow-500" />

            <div>
              <h2 className="text-4xl font-bold mb-2">Great Work Today! 🎉</h2>
              <p className="text-lg text-muted-foreground">Rest well, tomorrow is another opportunity</p>
            </div>

            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-6xl font-bold text-primary">
                    {completedItems.length}
                  </div>
                  <p className="text-lg">tasks completed today</p>

                  {streak && streak.current_streak > 0 && (
                    <div className="flex items-center justify-center gap-2 pt-4 border-t">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {streak.current_streak} day planning streak!
                      </span>
                    </div>
                  )}

                  {wins.filter(w => w.trim()).length > 0 && (
                    <div className="pt-4 border-t text-left">
                      <p className="font-semibold mb-2">Today's wins:</p>
                      <ul className="space-y-1">
                        {wins.filter(w => w.trim()).slice(0, 3).map((win, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <span>{win}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              See you tomorrow! 👋
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="min-h-[500px]">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
