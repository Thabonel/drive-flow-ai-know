import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageCircle, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';

export function FeedbackWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide your feedback',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user.id,
        feedback_type: feedbackType,
        rating: rating ? parseInt(rating) : null,
        message: message.trim(),
        user_agent: navigator.userAgent,
        url: window.location.href,
      });

      if (error) throw error;

      analytics.track('Feedback Submitted', {
        type: feedbackType,
        rating,
        has_message: message.length > 0,
      });

      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted.',
      });

      setOpen(false);
      setRating('');
      setFeedbackType('general');
      setMessage('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, ideas, or reporting issues.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>What type of feedback is this?</Label>
            <RadioGroup value={feedbackType} onValueChange={setFeedbackType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general" className="font-normal cursor-pointer">
                  General feedback
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bug" id="bug" />
                <Label htmlFor="bug" className="font-normal cursor-pointer">
                  Bug report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feature" id="feature" />
                <Label htmlFor="feature" className="font-normal cursor-pointer">
                  Feature request
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ai" id="ai" />
                <Label htmlFor="ai" className="font-normal cursor-pointer">
                  AI feature feedback
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>How would you rate your experience? (optional)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value.toString())}
                  className={`p-2 rounded-full transition-colors ${
                    rating === value.toString()
                      ? 'bg-yellow-100 dark:bg-yellow-900'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      parseInt(rating) >= value
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Your feedback</Label>
            <Textarea
              id="message"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
