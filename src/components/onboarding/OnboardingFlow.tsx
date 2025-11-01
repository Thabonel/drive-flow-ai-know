import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  Sparkles,
  Check,
  ArrowRight,
  Brain,
  Zap,
  Target
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { trackOnboarding, trackFunnelStep, FUNNELS } from '@/lib/analytics';

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to AI Query Hub',
    description: 'AI plans your perfect day in 30 seconds',
  },
  {
    id: 'calendar',
    title: 'Connect Your Calendar',
    description: 'So AI can understand your schedule',
  },
  {
    id: 'planning-time',
    title: 'Set Your Planning Time',
    description: 'When should AI prepare your daily brief?',
  },
  {
    id: 'ai-personality',
    title: 'Choose AI Personality',
    description: 'How should your AI assistant communicate?',
  },
  {
    id: 'first-plan',
    title: 'Try AI Planning',
    description: 'Let AI analyze your schedule right now',
  },
];

export function OnboardingFlow({ open, onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      trackFunnelStep('SIGNUP', 4); // onboarding_started
    }
  }, [open]);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = async () => {
    const stepId = STEPS[currentStep].id;

    // Track step completion
    trackOnboarding(stepId, true);
    setCompleted([...completed, stepId]);

    if (currentStep === STEPS.length - 1) {
      // Complete onboarding
      if (user) {
        await supabase
          .from('user_settings')
          .update({ onboarding_completed: true })
          .eq('user_id', user.id);
      }

      trackFunnelStep('SIGNUP', 5); // first_value
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    trackOnboarding(STEPS[currentStep].id, false);
    handleNext();
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    trackFunnelStep('AI_DAILY_PLANNING', 1); // first_plan_generated

    // Simulate AI planning
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsGenerating(false);
    handleNext();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {step.title}
            </DialogTitle>
            <Badge variant="secondary">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>
          <DialogDescription>{step.description}</DialogDescription>
          <Progress value={progress} className="mt-4" />
        </DialogHeader>

        <div className="py-6">
          {/* Welcome Step */}
          {step.id === 'welcome' && (
            <div className="space-y-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <Brain className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Let's Get You Started!</h3>
                <p className="text-muted-foreground">
                  We'll help you set up AI to manage your schedule perfectly.
                  This takes about 2 minutes.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <Calendar className="h-8 w-8 text-purple-500 mx-auto" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">Smart Scheduling</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <Sparkles className="h-8 w-8 text-blue-500 mx-auto" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">AI Daily Briefs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <Zap className="h-8 w-8 text-purple-500 mx-auto" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">Email to Tasks</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Calendar Connection Step */}
          {step.id === 'calendar' && (
            <div className="space-y-6">
              <div className="text-center">
                <Calendar className="h-16 w-16 mx-auto text-purple-500 mb-4" />
                <p className="text-muted-foreground">
                  Connect your calendar so AI can analyze your schedule and provide intelligent insights.
                </p>
              </div>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                  </svg>
                  Connect Google Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19.44 0H4.56A4.56 4.56 0 000 4.56v14.88A4.56 4.56 0 004.56 24h14.88A4.56 4.56 0 0024 19.44V4.56A4.56 4.56 0 0019.44 0z"/>
                  </svg>
                  Connect Microsoft Outlook
                </Button>
              </div>
            </div>
          )}

          {/* Planning Time Step */}
          {step.id === 'planning-time' && (
            <div className="space-y-6">
              <div className="text-center">
                <Clock className="h-16 w-16 mx-auto text-purple-500 mb-4" />
                <p className="text-muted-foreground">
                  When should AI generate your daily brief?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" onClick={handleNext}>
                  <span>6:00 AM</span>
                  <Check className="ml-2 h-4 w-4 opacity-0" />
                </Button>
                <Button variant="outline" size="lg" onClick={handleNext}>
                  <span>7:00 AM</span>
                  <Check className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={handleNext}>
                  <span>8:00 AM</span>
                  <Check className="ml-2 h-4 w-4 opacity-0" />
                </Button>
                <Button variant="outline" size="lg" onClick={handleNext}>
                  <span>9:00 AM</span>
                  <Check className="ml-2 h-4 w-4 opacity-0" />
                </Button>
              </div>
            </div>
          )}

          {/* AI Personality Step */}
          {step.id === 'ai-personality' && (
            <div className="space-y-6">
              <div className="text-center">
                <Brain className="h-16 w-16 mx-auto text-purple-500 mb-4" />
                <p className="text-muted-foreground">
                  How should your AI assistant communicate?
                </p>
              </div>
              <div className="space-y-3">
                <Card className="cursor-pointer hover:border-purple-500 transition-colors" onClick={handleNext}>
                  <CardHeader>
                    <CardTitle className="text-base">Professional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Formal, concise, business-focused communication
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-purple-500 transition-colors" onClick={handleNext}>
                  <CardHeader>
                    <CardTitle className="text-base">Friendly</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Warm, helpful, conversational tone with occasional emojis
                    </p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-purple-500 transition-colors" onClick={handleNext}>
                  <CardHeader>
                    <CardTitle className="text-base">Casual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Relaxed, informal, like chatting with a friend
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* First Plan Step */}
          {step.id === 'first-plan' && (
            <div className="space-y-6 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <Target className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Ready to See AI in Action?</h3>
                <p className="text-muted-foreground">
                  Let's generate your first AI daily brief based on your schedule.
                  This usually takes about 10 seconds.
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-500 to-blue-500"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                    AI is analyzing your schedule...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate My Daily Brief
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t pt-4">
          <Button variant="ghost" onClick={handleSkip} size="sm">
            Skip this step
          </Button>
          {step.id !== 'first-plan' && step.id !== 'ai-personality' && step.id !== 'planning-time' && (
            <Button onClick={handleNext}>
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
