import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { useAuth } from '@/hooks/useAuth';
import { Vibrate } from '@/lib/haptics';
import {
  AttentionType,
  RoleMode,
  ATTENTION_TYPES,
  ROLE_MODES,
  ROLE_MODE_DESCRIPTIONS,
  ATTENTION_TYPE_DESCRIPTIONS,
  UserAttentionPreferences
} from '@/lib/attentionTypes';
import {
  Settings,
  Target,
  Brain,
  Timer,
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Zap,
  TrendingUp,
  Lightbulb,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileCalibrationWizardProps {
  onComplete?: (preferences: UserAttentionPreferences) => void;
  className?: string;
  trigger?: React.ReactNode;
}

interface CalibrationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export function MobileCalibrationWizard({
  onComplete,
  className,
  trigger
}: MobileCalibrationWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [calibrationData, setCalibrationData] = useState<Partial<UserAttentionPreferences>>({
    current_role: ROLE_MODES.MAKER,
    current_zone: 'peacetime',
    attention_budgets: {
      create: 3,
      review: 4,
      admin: 2,
      context_switches: 3
    }
  });

  const { preferences, updatePreferences, loading } = useAttentionBudget();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Initialize with existing preferences
  useEffect(() => {
    if (preferences) {
      setCalibrationData(preferences);
    }
  }, [preferences]);

  const handleBudgetChange = (attentionType: AttentionType, value: number[]) => {
    setCalibrationData(prev => ({
      ...prev,
      attention_budgets: {
        ...prev.attention_budgets!,
        [attentionType]: value[0]
      }
    }));
    Vibrate.light();
  };

  const handleRoleChange = (role: RoleMode) => {
    setCalibrationData(prev => ({
      ...prev,
      current_role: role
    }));
    Vibrate.selection();
  };

  const handleComplete = async () => {
    try {
      const success = await updatePreferences(calibrationData);
      if (success) {
        onComplete?.(calibrationData as UserAttentionPreferences);
        setIsOpen(false);
        Vibrate.success();
        toast.success('Attention preferences calibrated successfully');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Calibration failed:', error);
      Vibrate.error();
      toast.error('Failed to save calibration. Please try again.');
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      Vibrate.light();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      Vibrate.light();
    }
  };

  const resetCalibration = () => {
    setCalibrationData({
      current_role: ROLE_MODES.MAKER,
      current_zone: 'peacetime',
      attention_budgets: {
        create: 3,
        review: 4,
        admin: 2,
        context_switches: 3
      }
    });
    setCurrentStep(0);
    Vibrate.warning();
    toast.info('Calibration reset to defaults');
  };

  // Role Selection Step
  const RoleSelectionStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Users className="h-16 w-16 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold">What's your primary role?</h3>
        <p className="text-sm text-muted-foreground mt-2">
          This affects your default attention budgets and suggested workflows
        </p>
      </div>

      <div className="grid gap-3">
        {Object.values(ROLE_MODES).map((role) => {
          const desc = ROLE_MODE_DESCRIPTIONS[role];
          const isSelected = calibrationData.current_role === role;

          return (
            <Card
              key={role}
              className={`
                cursor-pointer transition-all duration-200 border-2
                ${isSelected
                  ? 'border-primary shadow-neu-pressed bg-primary/5'
                  : 'border-transparent shadow-neu-flat hover:shadow-neu-raised'
                }
              `}
              onClick={() => handleRoleChange(role)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{desc.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{desc.label}</h4>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {desc.description}
                    </p>
                  </div>
                  {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Budget Configuration Step
  const BudgetConfigStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Target className="h-16 w-16 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold">Set Your Attention Budgets</h3>
        <p className="text-sm text-muted-foreground mt-2">
          How many tasks of each type can you handle effectively per day?
        </p>
      </div>

      <div className="space-y-6">
        {Object.values(ATTENTION_TYPES).map((type) => {
          const desc = ATTENTION_TYPE_DESCRIPTIONS[type];
          const currentValue = calibrationData.attention_budgets![type] || 3;
          const percentage = (currentValue / 10) * 100;

          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{desc.icon}</span>
                  <div>
                    <span className="font-medium text-sm">{desc.label}</span>
                    <p className="text-xs text-muted-foreground">{desc.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-sm font-bold">
                  {currentValue}
                </Badge>
              </div>

              <div className="px-2">
                <Slider
                  value={[currentValue]}
                  onValueChange={(value) => handleBudgetChange(type, value)}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 (Minimal)</span>
                  <span>10 (Heavy Load)</span>
                </div>
              </div>

              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}

        {/* Context Switching Budget */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <span className="font-medium text-sm">Context Switching Tolerance</span>
                <p className="text-xs text-muted-foreground">
                  How many attention type changes can you handle per day?
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm font-bold">
              {calibrationData.attention_budgets!.context_switches || 3}
            </Badge>
          </div>

          <div className="px-2">
            <Slider
              value={[calibrationData.attention_budgets!.context_switches || 3]}
              onValueChange={(value) =>
                setCalibrationData(prev => ({
                  ...prev,
                  attention_budgets: {
                    ...prev.attention_budgets!,
                    context_switches: value[0]
                  }
                }))
              }
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 (Low)</span>
              <span>10 (High)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Review and Tips Step
  const ReviewStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-semibold">Review Your Setup</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Your personalized attention management system is ready
        </p>
      </div>

      {/* Configuration Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Your Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Role Mode:</span>
            <Badge variant="default">
              {ROLE_MODE_DESCRIPTIONS[calibrationData.current_role!].label}
            </Badge>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Daily Budget Limits:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(calibrationData.attention_budgets!).map(([type, limit]) => {
                if (type === 'context_switches') return null;
                const desc = ATTENTION_TYPE_DESCRIPTIONS[type as AttentionType];
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>{desc.icon}</span>
                      {desc.label}
                    </span>
                    <span className="font-bold">{limit}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm">Context Switches:</span>
            <Badge variant="outline">
              {calibrationData.attention_budgets!.context_switches} max
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            Pro Tips for Mobile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-yellow-800">
          <div className="flex items-start gap-2">
            <span>•</span>
            <span>Use swipe gestures for quick task actions</span>
          </div>
          <div className="flex items-start gap-2">
            <span>•</span>
            <span>Long press for voice input on delegation</span>
          </div>
          <div className="flex items-start gap-2">
            <span>•</span>
            <span>Enable push notifications for budget warnings</span>
          </div>
          <div className="flex items-start gap-2">
            <span>•</span>
            <span>Pinch to zoom timeline view for better visibility</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const steps: CalibrationStep[] = [
    {
      id: 'role',
      title: 'Role Selection',
      description: 'Choose your primary working role',
      icon: <Users className="h-5 w-5" />,
      component: <RoleSelectionStep />
    },
    {
      id: 'budgets',
      title: 'Attention Budgets',
      description: 'Set your daily task limits',
      icon: <Target className="h-5 w-5" />,
      component: <BudgetConfigStep />
    },
    {
      id: 'review',
      title: 'Review & Finish',
      description: 'Confirm your settings',
      icon: <CheckCircle className="h-5 w-5" />,
      component: <ReviewStep />
    }
  ];

  if (!isMobile) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 rounded-xl shadow-neu-flat hover:shadow-neu-raised transition-all duration-150 ${className || ''}`}
    >
      <Settings className="h-4 w-4" />
      <span>Calibrate</span>
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Attention Calibration
              </SheetTitle>
              <SheetDescription>
                Personalize your attention management system
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetCalibration}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />

            {/* Step Indicators */}
            <div className="flex justify-between mt-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 ${
                    index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`
                      p-2 rounded-full border-2 transition-all duration-200
                      ${index <= currentStep
                        ? 'border-primary bg-primary text-white'
                        : 'border-muted-foreground/30'
                      }
                    `}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs text-center">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[calc(90vh-280px)]">
            <div className="pb-6">
              {currentStepData.component}
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-2 h-12 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex-1" />

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="gap-2 h-12 rounded-xl px-6"
              >
                <Zap className="h-4 w-4" />
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="gap-2 h-12 rounded-xl"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}