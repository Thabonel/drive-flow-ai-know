import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  MessageSquare,
  Star,
  Lightbulb,
  Bug,
  Heart,
  Send,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackData {
  type: 'rating' | 'feature-request' | 'bug-report' | 'general';
  rating?: number;
  category?: string;
  title?: string;
  description: string;
  email?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface FeedbackSystemProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: string;
  contextData?: {
    page?: string;
    feature?: string;
    userId?: string;
  };
}

const feedbackTypes = [
  {
    id: 'rating',
    label: 'Rate Experience',
    description: 'How was your experience?',
    icon: <Star className="h-5 w-5" />,
    color: 'bg-yellow-500'
  },
  {
    id: 'feature-request',
    label: 'Feature Request',
    description: 'Suggest a new feature',
    icon: <Lightbulb className="h-5 w-5" />,
    color: 'bg-blue-500'
  },
  {
    id: 'bug-report',
    label: 'Report Bug',
    description: 'Something not working?',
    icon: <Bug className="h-5 w-5" />,
    color: 'bg-red-500'
  },
  {
    id: 'general',
    label: 'General Feedback',
    description: 'Share your thoughts',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'bg-green-500'
  }
];

const categories = {
  'feature-request': [
    'AI Assistant',
    'Document Management',
    'Integrations',
    'Proactive Features',
    'User Interface',
    'Team Collaboration',
    'Performance',
    'Mobile Experience',
    'Other'
  ],
  'bug-report': [
    'AI Responses',
    'Document Upload',
    'User Interface',
    'Authentication',
    'Integrations',
    'Performance',
    'Mobile Issues',
    'Data Sync',
    'Other'
  ],
  'general': [
    'Usability',
    'Performance',
    'Design',
    'Documentation',
    'Support',
    'Pricing',
    'Features',
    'Overall Experience',
    'Other'
  ]
};

export function FeedbackSystem({ isOpen, onClose, defaultType, contextData }: FeedbackSystemProps) {
  const [step, setStep] = useState(1);
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    type: (defaultType as any) || 'rating',
    description: '',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Rating stars state
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    if (defaultType) {
      setFeedbackData(prev => ({ ...prev, type: defaultType as any }));
    }
  }, [defaultType]);

  const handleTypeSelect = (type: string) => {
    setFeedbackData(prev => ({ ...prev, type: type as any }));
    setStep(2);
  };

  const handleRatingSelect = (rating: number) => {
    setFeedbackData(prev => ({ ...prev, rating }));
    if (rating >= 4) {
      // Good rating - can skip details or go to optional feedback
      setStep(3);
    } else {
      // Lower rating - encourage detailed feedback
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call - in production, this would call your feedback endpoint
      const payload = {
        ...feedbackData,
        timestamp: new Date().toISOString(),
        context: contextData,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // TODO: Replace with actual API call
      console.log('Feedback submitted:', payload);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsSubmitted(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Handle error (show error message to user)
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFeedbackData({
      type: 'rating',
      description: '',
      tags: []
    });
    setIsSubmitted(false);
    setHoveredRating(0);
  };

  const toggleTag = (tag: string) => {
    setFeedbackData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <CardTitle className="text-lg">Share Your Feedback</CardTitle>
                <CardDescription>Help us improve AI Query Hub</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              // Success state
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                <p className="text-muted-foreground">
                  Your feedback helps us build a better AI assistant for everyone.
                </p>
              </motion.div>
            ) : step === 1 ? (
              // Step 1: Type selection or rating
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {feedbackData.type === 'rating' ? (
                  <div className="text-center space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">How was your experience?</h3>
                      <p className="text-muted-foreground">Rate your overall experience with AI Query Hub</p>
                    </div>

                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleRatingSelect(rating)}
                          onMouseEnter={() => setHoveredRating(rating)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="p-1 rounded-full transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              rating <= (hoveredRating || feedbackData.rating || 0)
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-4">Or choose a specific feedback type:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {feedbackTypes.slice(1).map((type) => (
                          <button
                            key={type.id}
                            onClick={() => handleTypeSelect(type.id)}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            <div className={`${type.color} text-white p-2 rounded-lg`}>
                              {type.icon}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Type selection for non-rating feedback
                  <div className="grid grid-cols-1 gap-3">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors text-left ${
                          feedbackData.type === type.id ? 'border-accent bg-accent/5' : ''
                        }`}
                      >
                        <div className={`${type.color} text-white p-3 rounded-lg`}>
                          {type.icon}
                        </div>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : step === 2 ? (
              // Step 2: Details
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Category selection */}
                  {categories[feedbackData.type as keyof typeof categories] && (
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <RadioGroup
                        value={feedbackData.category}
                        onValueChange={(value) => setFeedbackData(prev => ({ ...prev, category: value }))}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {categories[feedbackData.type as keyof typeof categories]?.map((category) => (
                            <div key={category} className="flex items-center space-x-2">
                              <RadioGroupItem value={category} id={category} />
                              <Label htmlFor={category} className="text-sm">{category}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Title for feature requests and bug reports */}
                  {(feedbackData.type === 'feature-request' || feedbackData.type === 'bug-report') && (
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        {feedbackData.type === 'feature-request' ? 'Feature Title' : 'Bug Summary'}
                      </Label>
                      <Input
                        id="title"
                        placeholder={
                          feedbackData.type === 'feature-request'
                            ? "What feature would you like to see?"
                            : "Brief description of the issue"
                        }
                        value={feedbackData.title || ''}
                        onChange={(e) => setFeedbackData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {feedbackData.type === 'rating' && feedbackData.rating && feedbackData.rating < 4
                        ? 'How can we improve?'
                        : 'Details'
                      }
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={
                        feedbackData.type === 'feature-request'
                          ? "Describe the feature and how it would help you..."
                          : feedbackData.type === 'bug-report'
                          ? "What happened? What did you expect to happen?"
                          : "Share your thoughts, suggestions, or concerns..."
                      }
                      value={feedbackData.description}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, description: e.target.value }))}
                      required
                      rows={4}
                    />
                  </div>

                  {/* Priority for bug reports */}
                  {feedbackData.type === 'bug-report' && (
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <RadioGroup
                        value={feedbackData.priority}
                        onValueChange={(value) => setFeedbackData(prev => ({ ...prev, priority: value as any }))}
                      >
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="low" id="low" />
                            <Label htmlFor="low">Low</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <Label htmlFor="medium">Medium</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="high" />
                            <Label htmlFor="high">High</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Email for follow-up */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={feedbackData.email || ''}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll only use this to follow up on your feedback if needed.
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {['urgent', 'enhancement', 'mobile', 'integration', 'ui', 'performance'].map((tag) => (
                        <Badge
                          key={tag}
                          variant={feedbackData.tags?.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={!feedbackData.description.trim() || isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : (
              // Step 3: Additional feedback for good ratings
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center space-y-6"
              >
                <div>
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-yellow-500 fill-current" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Thanks for the {feedbackData.rating}-star rating!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    We're glad you're enjoying AI Query Hub. Want to share what you love most?
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    placeholder="What do you love about AI Query Hub? Any suggestions to make it even better?"
                    value={feedbackData.description}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Skip
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Feedback'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

// Feedback trigger button component
export function FeedbackButton({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-4 rounded-full shadow-lg z-40 ${className}`}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>

      <FeedbackSystem
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

// Context-specific feedback hooks
export function useFeedbackPrompts() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>();

  const promptForFeedback = (type?: string, delay = 0) => {
    setTimeout(() => {
      setFeedbackType(type);
      setShowFeedback(true);
    }, delay);
  };

  // Automatic feedback prompts based on user behavior
  useEffect(() => {
    // Prompt for rating after successful onboarding
    const onboardingCompleted = localStorage.getItem('onboarding-completed');
    const hasRated = localStorage.getItem('user-rating-given');

    if (onboardingCompleted && !hasRated) {
      promptForFeedback('rating', 30000); // 30 seconds after onboarding
    }

    // Prompt for feature feedback after using advanced features
    const advancedFeatureUsed = localStorage.getItem('advanced-feature-used');
    const hasGivenFeatureFeedback = localStorage.getItem('feature-feedback-given');

    if (advancedFeatureUsed && !hasGivenFeatureFeedback) {
      promptForFeedback('general', 60000); // 1 minute after using advanced features
    }
  }, []);

  return {
    showFeedback,
    feedbackType,
    setShowFeedback,
    promptForFeedback,
  };
}