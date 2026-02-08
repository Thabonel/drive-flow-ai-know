import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, ArrowRight, ArrowLeft, CheckCircle, Upload, MessageSquare, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Your Living AI Assistant!',
      description: 'Let\'s get you set up in just a few minutes',
      icon: <Zap className="h-8 w-8 text-accent" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            Hi there! 👋 Welcome to <strong>AI Query Hub</strong> - your autonomous, proactive AI assistant.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">What makes this special?</h4>
            <ul className="space-y-1 text-sm">
              <li>• <strong>Proactive assistance</strong> - I reach out to help before you ask</li>
              <li>• <strong>30+ day memory</strong> - I remember our entire conversation history</li>
              <li>• <strong>Document intelligence</strong> - Upload files and ask questions about them</li>
              <li>• <strong>Multi-channel access</strong> - Web, Telegram, and Slack integration</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Let's take a quick tour to get you started!
          </p>
        </div>
      )
    },
    {
      id: 'chat',
      title: 'Start with a Simple Chat',
      description: 'Try asking me anything to see how I work',
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      content: (
        <div className="space-y-4">
          <p>Let's start with a simple conversation. Try asking me something like:</p>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="bg-background p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="font-medium">"Hello! What can you help me with?"</p>
            </div>
            <div className="bg-background p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="font-medium">"Tell me about the weather today"</p>
            </div>
            <div className="bg-background p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
              <p className="font-medium">"How do I upload documents?"</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Click any example above to try it, or type your own question in the chat below.
          </p>
        </div>
      ),
      action: {
        label: 'I\'ve tried chatting!',
        onClick: () => setCompletedSteps(prev => new Set([...prev, 1]))
      }
    },
    {
      id: 'documents',
      title: 'Upload Your First Document',
      description: 'Transform any document into searchable knowledge',
      icon: <Upload className="h-8 w-8 text-accent" />,
      content: (
        <div className="space-y-4">
          <p>One of my superpowers is understanding your documents. I can:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-muted p-3 rounded-lg">
              <h5 className="font-semibold">📄 Read & Summarize</h5>
              <p>PDFs, Word docs, text files</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h5 className="font-semibold">🔍 Smart Search</h5>
              <p>Find info by meaning, not keywords</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h5 className="font-semibold">💡 Extract Insights</h5>
              <p>Key points, action items, summaries</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h5 className="font-semibold">❓ Answer Questions</h5>
              <p>Ask anything about your content</p>
            </div>
          </div>
          <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
            <p className="font-medium text-accent-foreground">💡 Pro Tip:</p>
            <p className="text-sm">Start with a meeting note, report, or any document you reference often.</p>
          </div>
        </div>
      ),
      action: {
        label: 'I\'ve uploaded a document!',
        onClick: () => setCompletedSteps(prev => new Set([...prev, 2]))
      }
    },
    {
      id: 'proactive',
      title: 'Enable Proactive Assistance',
      description: 'Let me help you before you even ask',
      icon: <Zap className="h-8 w-8 text-accent" />,
      content: (
        <div className="space-y-4">
          <p>This is where I become truly <em>living</em>. I can proactively help by:</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="bg-accent text-accent-foreground rounded-full p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <h5 className="font-semibold">Smart Check-ins</h5>
                <p className="text-sm">I analyze your patterns and reach out when you might need help</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="bg-accent text-accent-foreground rounded-full p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <h5 className="font-semibold">Deadline Reminders</h5>
                <p className="text-sm">Never miss important dates or commitments</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="bg-accent text-accent-foreground rounded-full p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <h5 className="font-semibold">Autonomous Sessions</h5>
                <p className="text-sm">With your permission, I can take actions for up to 2 hours</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-accent/10">
            <Zap className="h-3 w-3 mr-1" />
            This happens automatically every 30 minutes
          </Badge>
        </div>
      )
    },
    {
      id: 'integrations',
      title: 'Connect Your Favorite Apps',
      description: 'Access me from anywhere you work',
      icon: <Settings className="h-8 w-8 text-accent" />,
      content: (
        <div className="space-y-4">
          <p>Take me with you wherever you work:</p>
          <div className="grid gap-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="bg-blue-500 text-white rounded-lg p-2">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold">Telegram Bot</h5>
                <p className="text-sm text-muted-foreground">Mobile-first AI assistant on your phone</p>
              </div>
              <Badge variant="outline">Personal</Badge>
            </div>
            <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="bg-purple-500 text-white rounded-lg p-2">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold">Slack Integration</h5>
                <p className="text-sm text-muted-foreground">Team collaboration with AI assistance</p>
              </div>
              <Badge variant="outline">Team</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You can connect these integrations anytime from Settings → Integrations
          </p>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Your Living AI Assistant is ready to transform your productivity',
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
              🎉 Welcome to the future of AI assistance!
            </h4>
            <p className="text-green-600 dark:text-green-400 text-sm">
              Your AI assistant is now ready to help you stay productive, organized, and ahead of your tasks.
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="font-semibold">Quick reminders:</h5>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                I remember our conversations for 30+ days
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Upload documents anytime for instant intelligence
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                I'll check in proactively when you need help
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Connect Telegram/Slack for multi-channel access
              </li>
            </ul>
          </div>

          <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
            <p className="font-medium text-accent-foreground">Need help anytime?</p>
            <p className="text-sm">Just ask me "How do I..." or click the Help button below.</p>
          </div>
        </div>
      )
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const canGoNext = completedSteps.has(currentStep) || currentStep === 0 || currentStep >= 3;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
      setCurrentStep(stepIndex);
    }
  };

  // Auto-complete certain steps
  useEffect(() => {
    if (currentStep === 0) {
      // Auto-complete welcome step after 3 seconds
      const timer = setTimeout(() => {
        setCompletedSteps(prev => new Set([...prev, 0]));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Getting Started</CardTitle>
              <CardDescription>
                Step {currentStep + 1} of {steps.length}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-2" />

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors ${
                  index === currentStep
                    ? 'border-accent bg-accent text-accent-foreground'
                    : index < currentStep || completedSteps.has(index)
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-muted-foreground/30 text-muted-foreground'
                } ${
                  index <= currentStep || completedSteps.has(index - 1)
                    ? 'cursor-pointer hover:scale-110'
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                {index < currentStep || completedSteps.has(index) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-4">
                {steps[currentStep].icon}
                <div>
                  <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
                  <p className="text-muted-foreground">{steps[currentStep].description}</p>
                </div>
              </div>

              {steps[currentStep].content}

              {steps[currentStep].action && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={steps[currentStep].action!.onClick}
                    disabled={completedSteps.has(currentStep)}
                  >
                    {completedSteps.has(currentStep) ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completed!
                      </>
                    ) : (
                      steps[currentStep].action!.label
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <div className="p-6 pt-0 flex justify-between items-center border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Skip for now
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canGoNext && currentStep < 3}
            >
              {isLastStep ? 'Get Started!' : 'Next'}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('onboarding-completed');
    if (!completed) {
      // Show onboarding for new users after a short delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setHasCompletedOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  };

  const restartOnboarding = () => {
    localStorage.removeItem('onboarding-completed');
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    hasCompletedOnboarding,
    setShowOnboarding,
    completeOnboarding,
    restartOnboarding,
  };
}