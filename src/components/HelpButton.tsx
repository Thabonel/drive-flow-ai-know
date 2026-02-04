// Enhanced help button component for timeline and calendar explanations
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Calendar, Clock, Target, Eye, Zap } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpButtonProps {
  title: string;
  description: string;
  tips?: string[];
  variant?: 'icon' | 'button';
  size?: 'sm' | 'default' | 'lg';
}

export function HelpButton({
  title,
  description,
  tips = [],
  variant = 'icon',
  size = 'default'
}: HelpButtonProps) {

  const triggerButton = variant === 'icon' ? (
    <Button
      variant="outline"
      size="icon"
      className={`
        ${size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'}
        hover:bg-primary/10 transition-all duration-200
      `}
    >
      <HelpCircle className={`
        ${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}
      `} />
    </Button>
  ) : (
    <Button variant="outline" size={size} className="gap-2">
      <HelpCircle className="h-4 w-4" />
      Help
    </Button>
  );

  // Enhanced tips with icons
  const enhancedTips = tips.map(tip => {
    if (tip.includes('🌊') || tip.includes('flow')) return { icon: Clock, text: tip };
    if (tip.includes('✨') || tip.includes('click') || tip.includes('Create')) return { icon: Target, text: tip };
    if (tip.includes('🎯') || tip.includes('AI') || tip.includes('Plan')) return { icon: Zap, text: tip };
    if (tip.includes('📊') || tip.includes('budget') || tip.includes('Monitor')) return { icon: Eye, text: tip };
    if (tip.includes('🔄') || tip.includes('sync') || tip.includes('Calendar')) return { icon: Calendar, text: tip };
    return { icon: Target, text: tip };
  });

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              {triggerButton}
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>How this works</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Learn how this feature works and get helpful tips
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Main description */}
            <div className="space-y-3">
              <p className="text-base leading-relaxed text-foreground">
                {description}
              </p>
            </div>

            {/* Tips section */}
            {enhancedTips.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Quick Tips
                </h4>
                <div className="space-y-3">
                  {enhancedTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-muted">
                      <tip.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm leading-relaxed">
                        {tip.text.replace(/[🌊🎯✨📊🔄🔐]/g, '').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional context for timeline-specific help */}
            {title.toLowerCase().includes('timeline') && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Understanding the Timeline
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The red NOW line shows the current moment. Items to the left are in the past, items to the right are planned for the future.
                  Overdue items turn red and pulse to catch your attention.
                </p>
              </div>
            )}

            {/* Additional context for calendar-specific help */}
            {title.toLowerCase().includes('calendar') && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Understanding the Calendar
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Switch between day, week, and month views to see your schedule at different scales.
                  Events show their duration and can be moved by dragging them to new time slots.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}