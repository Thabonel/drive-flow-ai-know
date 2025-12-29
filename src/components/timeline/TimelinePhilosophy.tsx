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
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">
          Design Over Discipline
        </h3>
        <p className="text-sm leading-relaxed">
          Success isn't about willpower—it's about <strong>Forcing Functions</strong>.
          Willpower is a biological fuel tank that empties every day, but a well-designed
          system is infinite.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-relaxed">
          This timeline is built to help you <strong>stop fighting your biology</strong> and
          start outsourcing your decisions. By restricting your work to a hard "time-box,"
          you create a <strong>"sink the ships"</strong> moment where retreat is no longer
          an option.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-relaxed">
          This runs on an <strong>If-Then Algorithm</strong>: by locking in a specific time
          and place, you remove the mental drama of daily debate. You don't have to find the
          motivation to work—you just execute the code.
        </p>
      </div>

      <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
        <p className="text-sm font-medium text-center">
          <strong>Build the right systems, and the systems will build the right you.</strong>
        </p>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground pt-2">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Time-boxing</strong>: Hard deadlines create urgency</span>
        </div>
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>If-Then</strong>: Remove decision fatigue with pre-planned actions</span>
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
              See the philosophy behind the system
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
      title="See the philosophy behind the timeline"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <HelpCircle className="h-4 w-4" />
      Philosophy
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto pb-6">
        <DialogHeader>
          <DialogTitle>Timeline Philosophy</DialogTitle>
          <DialogDescription className="sr-only">
            Learn about the design philosophy behind the timeline system
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4 pb-8">
          {philosophyContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
