import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  RoleMode,
  ZoneContext,
  ROLE_MODES,
  ZONE_CONTEXTS,
  ROLE_MODE_DESCRIPTIONS,
  ZONE_CONTEXT_DESCRIPTIONS,
  getRoleDefaults,
} from '@/lib/attentionTypes';
import { useTimelineContext } from '@/contexts/TimelineContext';
import { RoleFitScoreCard } from './RoleFitScoreCard';
import { WeekTemplateGenerator } from './WeekTemplateGenerator';

interface WeeklyCalibrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  weekStartDate?: string;
}

interface CalibrationStep {
  number: number;
  title: string;
  description: string;
  completed: boolean;
}

interface CalibrationData {
  id?: string;
  role_selected: RoleMode;
  zone_selected: ZoneContext;
  non_negotiable: string;
  weekly_hours_planned: number;
  constraints: string[];
  attention_budget: Record<string, number>;
  role_fit_score?: number;
  template_generated?: any;
  manual_adjustments?: any;
}

const CALIBRATION_STEPS: CalibrationStep[] = [
  { number: 1, title: 'Role Selection', description: 'Choose your primary role for this week', completed: false },
  { number: 2, title: 'Zone Assessment', description: 'Evaluate business context and intensity', completed: false },
  { number: 3, title: 'Non-Negotiable Priority', description: 'Define your most important outcome', completed: false },
  { number: 4, title: 'Constraint Input', description: 'Note fixed commitments and limitations', completed: false },
  { number: 5, title: 'Template Generation', description: 'AI generates optimized week structure', completed: false },
  { number: 6, title: 'Manual Adjustment', description: 'Customize the generated template', completed: false },
  { number: 7, title: 'Commitment', description: 'Confirm your weekly plan and goals', completed: false },
];

export function WeeklyCalibrationWizard({
  isOpen,
  onClose,
  weekStartDate
}: WeeklyCalibrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<CalibrationStep[]>(CALIBRATION_STEPS);
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    role_selected: ROLE_MODES.MAKER,
    zone_selected: ZONE_CONTEXTS.PEACETIME,
    non_negotiable: '',
    weekly_hours_planned: 5,
    constraints: [],
    attention_budget: {},
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calibrationId, setCalibrationId] = useState<string>();

  const { toast } = useToast();
  const { attentionPreferences, updateAttentionPreferences } = useTimelineContext();

  const currentWeekStart = weekStartDate || getCurrentWeekStart();

  useEffect(() => {
    if (isOpen) {
      loadOrCreateCalibration();
    }
  }, [isOpen, currentWeekStart]);

  function getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  async function loadOrCreateCalibration() {
    setLoading(true);
    try {
      const response = await fetch('/functions/v1/weekly-calibration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_current',
          week_start_date: currentWeekStart
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.calibration) {
          loadExistingCalibration(data.calibration);
        } else {
          await startNewCalibration();
        }
      } else {
        await startNewCalibration();
      }
    } catch (error) {
      console.error('Error loading calibration:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calibration. Starting fresh.',
        variant: 'destructive',
      });
      await startNewCalibration();
    }
    setLoading(false);
  }

  function loadExistingCalibration(calibration: any) {
    setCalibrationId(calibration.id);
    setCalibrationData({
      role_selected: calibration.role_selected as RoleMode,
      zone_selected: calibration.zone_selected as ZoneContext,
      non_negotiable: calibration.non_negotiable || '',
      weekly_hours_planned: calibration.weekly_hours_planned || 5,
      constraints: [],
      attention_budget: calibration.attention_budget_planned || {},
      role_fit_score: calibration.role_fit_score,
    });

    // Update step completion based on calibration steps
    if (calibration.calibration_steps) {
      const completedSteps = calibration.calibration_steps.map((s: any) => s.step_number);
      setSteps(prev => prev.map(step => ({
        ...step,
        completed: completedSteps.includes(step.number)
      })));

      // Set current step to first incomplete step
      const nextIncomplete = steps.find((step, index) =>
        !completedSteps.includes(step.number)
      );
      if (nextIncomplete) {
        setCurrentStep(nextIncomplete.number);
      } else if (calibration.calibration_completed_at) {
        setCurrentStep(7); // Show final confirmation
      }
    }
  }

  async function startNewCalibration() {
    try {
      const response = await fetch('/functions/v1/weekly-calibration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          week_start_date: currentWeekStart
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalibrationId(data.calibration.id);

        // Initialize with current user preferences if available
        if (attentionPreferences) {
          setCalibrationData(prev => ({
            ...prev,
            role_selected: attentionPreferences.current_role as RoleMode,
            zone_selected: attentionPreferences.current_zone as ZoneContext,
            non_negotiable: attentionPreferences.non_negotiable_title || '',
            weekly_hours_planned: attentionPreferences.non_negotiable_weekly_hours || 5,
          }));
        }
      } else {
        throw new Error('Failed to start calibration');
      }
    } catch (error) {
      console.error('Error starting calibration:', error);
      toast({
        title: 'Error',
        description: 'Failed to start weekly calibration',
        variant: 'destructive',
      });
    }
  }

  async function saveCurrentStep() {
    if (!calibrationId) return;

    setSaving(true);
    try {
      const stepData = getStepData(currentStep);

      const response = await fetch('/functions/v1/weekly-calibration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save_step',
          week_start_date: currentWeekStart,
          step_number: currentStep,
          step_data: stepData,
          role_selected: calibrationData.role_selected,
          zone_selected: calibrationData.zone_selected,
        })
      });

      if (response.ok) {
        // Mark current step as completed
        setSteps(prev => prev.map(step =>
          step.number === currentStep ? { ...step, completed: true } : step
        ));

        // Update attention preferences for steps that affect them
        if (currentStep === 1 || currentStep === 2) {
          await updateAttentionPreferences({
            current_role: calibrationData.role_selected,
            current_zone: calibrationData.zone_selected,
            ...(currentStep === 3 && {
              non_negotiable_title: calibrationData.non_negotiable,
              non_negotiable_weekly_hours: calibrationData.weekly_hours_planned,
            })
          });
        }
      } else {
        throw new Error('Failed to save step');
      }
    } catch (error) {
      console.error('Error saving step:', error);
      toast({
        title: 'Error',
        description: 'Failed to save step progress',
        variant: 'destructive',
      });
    }
    setSaving(false);
  }

  function getStepData(stepNumber: number) {
    switch (stepNumber) {
      case 1:
        return { role_selected: calibrationData.role_selected };
      case 2:
        return { zone_selected: calibrationData.zone_selected };
      case 3:
        return {
          non_negotiable: calibrationData.non_negotiable,
          weekly_hours: calibrationData.weekly_hours_planned
        };
      case 4:
        return { constraints: calibrationData.constraints };
      case 5:
        return { template_generated: calibrationData.template_generated };
      case 6:
        return { manual_adjustments: calibrationData.manual_adjustments };
      case 7:
        return { attention_budget: calibrationData.attention_budget };
      default:
        return {};
    }
  }

  async function nextStep() {
    await saveCurrentStep();
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function completeCalibration() {
    setSaving(true);
    try {
      const response = await fetch('/functions/v1/weekly-calibration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'complete',
          week_start_date: currentWeekStart,
          role_selected: calibrationData.role_selected,
          zone_selected: calibrationData.zone_selected,
          step_data: {
            attention_budget: calibrationData.attention_budget,
            final_plan: calibrationData.manual_adjustments || calibrationData.template_generated
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalibrationData(prev => ({
          ...prev,
          role_fit_score: data.role_fit_score?.score
        }));

        toast({
          title: 'Calibration Complete!',
          description: `Your weekly plan is ready with a ${data.role_fit_score?.score}% role fit score.`,
        });

        onClose();
      } else {
        throw new Error('Failed to complete calibration');
      }
    } catch (error) {
      console.error('Error completing calibration:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete calibration',
        variant: 'destructive',
      });
    }
    setSaving(false);
  }

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return renderRoleSelectionStep();
      case 2:
        return renderZoneAssessmentStep();
      case 3:
        return renderNonNegotiableStep();
      case 4:
        return renderConstraintInputStep();
      case 5:
        return renderTemplateGenerationStep();
      case 6:
        return renderManualAdjustmentStep();
      case 7:
        return renderCommitmentStep();
      default:
        return null;
    }
  }

  function renderRoleSelectionStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">What's your primary role this week?</h3>
          <p className="text-muted-foreground">
            Your role determines how your calendar should be optimized for maximum effectiveness.
          </p>
        </div>

        <div className="grid gap-4">
          {Object.entries(ROLE_MODE_DESCRIPTIONS).map(([key, desc]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                calibrationData.role_selected === key
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setCalibrationData(prev => ({
                ...prev,
                role_selected: key as RoleMode
              }))}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{desc.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{desc.label}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{desc.description}</p>
                    <div className="space-y-1">
                      {desc.tips.map((tip, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          • {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                  {calibrationData.role_selected === key && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  function renderZoneAssessmentStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">What's your current business context?</h3>
          <p className="text-muted-foreground">
            Your zone affects how aggressively to protect time and handle interruptions.
          </p>
        </div>

        <div className="grid gap-4">
          {Object.entries(ZONE_CONTEXT_DESCRIPTIONS).map(([key, desc]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                calibrationData.zone_selected === key
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setCalibrationData(prev => ({
                ...prev,
                zone_selected: key as ZoneContext
              }))}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{desc.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{desc.label}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{desc.description}</p>
                    <div className="space-y-1">
                      {desc.tips.map((tip, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          • {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                  {calibrationData.zone_selected === key && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  function renderNonNegotiableStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">What's your ONE non-negotiable this week?</h3>
          <p className="text-muted-foreground">
            Your most important outcome that gets first claim on your peak energy hours.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="non-negotiable">Your non-negotiable priority</Label>
            <Input
              id="non-negotiable"
              placeholder="e.g., Ship v2.0 product release, Complete quarterly review..."
              value={calibrationData.non_negotiable}
              onChange={(e) => setCalibrationData(prev => ({
                ...prev,
                non_negotiable: e.target.value
              }))}
            />
          </div>

          <div>
            <Label htmlFor="weekly-hours">Minimum weekly hours needed</Label>
            <div className="space-y-2">
              <Slider
                value={[calibrationData.weekly_hours_planned]}
                onValueChange={(value) => setCalibrationData(prev => ({
                  ...prev,
                  weekly_hours_planned: value[0]
                }))}
                max={40}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1 hour</span>
                <span className="font-medium">{calibrationData.weekly_hours_planned} hours</span>
                <span>40 hours</span>
              </div>
            </div>
          </div>

          {calibrationData.weekly_hours_planned > 20 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>High commitment detected:</strong> {calibrationData.weekly_hours_planned} hours is significant.
                Consider if this can be broken into smaller deliverables or if other priorities should be deferred.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderConstraintInputStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">What are your fixed constraints?</h3>
          <p className="text-muted-foreground">
            Note any unmovable commitments, deadlines, or limitations for this week.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="constraints">Fixed commitments and constraints</Label>
            <Textarea
              id="constraints"
              placeholder="e.g., Board meeting Tuesday 2-4pm, Team off-site Thursday, Client deadline Friday..."
              value={calibrationData.constraints.join('\n')}
              onChange={(e) => setCalibrationData(prev => ({
                ...prev,
                constraints: e.target.value.split('\n').filter(c => c.trim())
              }))}
              rows={4}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Constraint Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>• <strong>Fixed meetings:</strong> Board meetings, external commitments</div>
              <div>• <strong>Deadlines:</strong> External deliverables, regulatory requirements</div>
              <div>• <strong>Travel:</strong> Off-sites, conferences, client visits</div>
              <div>• <strong>Personal:</strong> Family commitments, medical appointments</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderTemplateGenerationStep() {
    return (
      <WeekTemplateGenerator
        roleMode={calibrationData.role_selected}
        zoneContext={calibrationData.zone_selected}
        nonNegotiable={calibrationData.non_negotiable}
        weeklyHours={calibrationData.weekly_hours_planned}
        constraints={calibrationData.constraints}
        onTemplateGenerated={(template) => {
          setCalibrationData(prev => ({
            ...prev,
            template_generated: template
          }));
        }}
      />
    );
  }

  function renderManualAdjustmentStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Customize Your Week</h3>
          <p className="text-muted-foreground">
            Review and adjust the generated template to fit your specific needs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generated Template</CardTitle>
            <CardDescription>Based on your {calibrationData.role_selected} role in {calibrationData.zone_selected} context</CardDescription>
          </CardHeader>
          <CardContent>
            {calibrationData.template_generated ? (
              <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                {JSON.stringify(calibrationData.template_generated, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No template generated yet. Go back to step 5.</p>
            )}
          </CardContent>
        </Card>

        <div>
          <Label htmlFor="adjustments">Manual Adjustments</Label>
          <Textarea
            id="adjustments"
            placeholder="Note any changes you want to make to the generated template..."
            value={calibrationData.manual_adjustments || ''}
            onChange={(e) => setCalibrationData(prev => ({
              ...prev,
              manual_adjustments: e.target.value
            }))}
            rows={3}
          />
        </div>
      </div>
    );
  }

  function renderCommitmentStep() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Confirm Your Weekly Plan</h3>
          <p className="text-muted-foreground">
            Review your calibration and commit to the plan for optimal productivity.
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="secondary">{calibrationData.role_selected}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone:</span>
                <Badge variant="secondary">{calibrationData.zone_selected}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Non-negotiable:</span>
                <span className="text-right max-w-xs">{calibrationData.non_negotiable}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Planned hours:</span>
                <span>{calibrationData.weekly_hours_planned}h</span>
              </div>
            </CardContent>
          </Card>

          {calibrationData.role_fit_score && (
            <RoleFitScoreCard
              score={calibrationData.role_fit_score}
              roleMode={calibrationData.role_selected}
              weekStartDate={currentWeekStart}
            />
          )}

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                By confirming, you commit to following this plan and will receive Monday morning
                check-ins to help you stay on track.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p>Loading calibration...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Weekly Calibration - Week of {currentWeekStart}</DialogTitle>
          <div className="flex items-center space-x-2">
            <Progress value={(currentStep / 7) * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 7
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderStepContent()}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          <div className="flex space-x-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.number === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.completed ? '✓' : step.number}
              </div>
            ))}
          </div>

          {currentStep === 7 ? (
            <Button
              onClick={completeCalibration}
              disabled={saving}
            >
              {saving ? 'Completing...' : 'Complete Calibration'}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Next'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}