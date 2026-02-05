import { HelpCircle, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface TimelinePhilosophyProps {
  mode?: 'standalone' | 'dialog';
  trigger?: 'button' | 'icon';
}

export function TimelinePhilosophy({
  mode = 'dialog',
  trigger = 'icon'
}: TimelinePhilosophyProps) {

  const philosophyContent = (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">
          How the Timeline & Calendar Work
        </h3>
        <p className="text-sm leading-relaxed">
          AI Query Hub provides two complementary views of your time: a <strong>Timeline Manager</strong> that
          visualizes time as a flowing river, and a <strong>Calendar View</strong> that displays your
          schedule in the familiar grid format you're used to.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-base text-primary">
          🕐 The Red NOW Line
        </h4>
        <p className="text-sm leading-relaxed">
          The most important feature is the <strong>prominent red NOW line</strong> that cuts across
          your timeline. This line represents the exact current moment and helps you stay grounded
          in the present. Tasks to the left are in the past, tasks to the right are planned for the future.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-base text-primary">
          📅 Timeline vs Calendar Views
        </h4>
        <p className="text-sm leading-relaxed">
          <strong>Timeline View</strong>: See time flowing horizontally like a river. Perfect for
          visualizing task flow, spotting bottlenecks, and understanding how work moves through time.
        </p>
        <p className="text-sm leading-relaxed">
          <strong>Calendar View</strong>: Traditional day/week/month grid layout. Ideal for scheduling
          meetings, blocking time for focused work, and seeing your schedule at a glance.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-base text-primary">
          🎨 Layers & Organization
        </h4>
        <p className="text-sm leading-relaxed">
          Create layers (Work, Personal, Health, etc.) to organize your items by context. Each layer
          has its own color and can be hidden or shown independently, helping you focus on specific
          areas of your life.
        </p>
      </div>

      <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
        <p className="text-sm font-medium text-center">
          <strong>The red NOW line keeps you grounded in reality while planning your future.</strong>
        </p>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground pt-2">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Real-time tracking</strong>: The NOW line moves with actual time</span>
        </div>
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Visual feedback</strong>: Overdue items pulse red to catch attention</span>
        </div>
      </div>
    </div>
  );

  // Standalone mode (for empty state)
  if (mode === 'standalone') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-8 px-6">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground italic">
              Learn how the timeline and calendar system works
            </p>
          </div>
          {philosophyContent}
        </CardContent>
      </Card>
    );
  }

  // Dialog mode (for header icon)
  const triggerButton = trigger === 'icon' ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title="Learn how the timeline and calendar work"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <HelpCircle className="h-4 w-4" />
      How It Works
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto pb-6">
        <DialogHeader>
          <DialogTitle>Timeline & Calendar Guide</DialogTitle>
          <DialogDescription className="sr-only">
            Learn how the timeline and calendar systems work
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4 pb-8">
          {philosophyContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
