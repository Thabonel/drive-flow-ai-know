/**
 * Presentation Settings Component
 *
 * Dialog for configuring presentation mode behavior:
 * - Content auto-scroll (within slides)
 * - Slide auto-advance (between slides)
 * - Animation style selection
 * - Speed controls
 *
 * Settings persist in localStorage for cross-session consistency.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export interface PresentationSettingsData {
  // Content auto-scroll (scrolls within slides)
  contentAutoScrollEnabled: boolean;
  contentAutoScrollSpeed: 'slow' | 'medium' | 'fast'; // 50, 75, 100 px/s

  // Slide auto-advance (advances between slides)
  slideAutoAdvanceEnabled: boolean;
  slideAutoAdvanceSpeed: 'slow' | 'medium' | 'fast'; // 5s, 3s, 2s

  // Animation style
  animationStyle: 'none' | 'minimal' | 'standard' | 'expressive';

  // Frame count for expressive mode (2-5 frames per slide)
  frameCount: number;
}

export const DEFAULT_SETTINGS: PresentationSettingsData = {
  contentAutoScrollEnabled: false,
  contentAutoScrollSpeed: 'medium',
  slideAutoAdvanceEnabled: false,
  slideAutoAdvanceSpeed: 'medium',
  animationStyle: 'none',
  frameCount: 3,
};

interface PresentationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PresentationSettingsData;
  onSettingsChange: (settings: PresentationSettingsData) => void;
}

const SPEED_LABELS = {
  slow: 'Slow',
  medium: 'Medium',
  fast: 'Fast',
};

const CONTENT_SCROLL_SPEEDS = {
  slow: '50 px/s',
  medium: '75 px/s',
  fast: '100 px/s',
};

const SLIDE_ADVANCE_SPEEDS = {
  slow: '5 seconds',
  medium: '3 seconds',
  fast: '2 seconds',
};

const ANIMATION_STYLES = {
  none: {
    label: 'None',
    description: 'Static slides with no animation effects',
  },
  minimal: {
    label: 'Minimal',
    description: 'Subtle 400ms fade-in transitions for a clean, professional look',
  },
  standard: {
    label: 'Standard',
    description: 'Slide and scale effects with staggered timing for dynamic reveals',
  },
  expressive: {
    label: 'Expressive',
    description: 'AI-generated multi-frame animations that cycle automatically',
  },
};

export function PresentationSettings({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: PresentationSettingsProps) {
  const updateSetting = <K extends keyof PresentationSettingsData>(
    key: K,
    value: PresentationSettingsData[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const speedToSliderValue = (speed: 'slow' | 'medium' | 'fast'): number => {
    const map = { slow: 0, medium: 50, fast: 100 };
    return map[speed];
  };

  const sliderValueToSpeed = (value: number): 'slow' | 'medium' | 'fast' => {
    if (value <= 25) return 'slow';
    if (value <= 75) return 'medium';
    return 'fast';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Presentation Settings</DialogTitle>
          <DialogDescription>
            Configure auto-scroll, animations, and playback options for your presentation.
            <span className="block mt-2 text-xs">
              Tip: Hover your mouse during presentation to pause all auto features.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content Auto-Scroll Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="content-auto-scroll" className="text-base font-medium">
                  Content Auto-Scroll
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically scroll through long slide content
                </p>
              </div>
              <Switch
                id="content-auto-scroll"
                checked={settings.contentAutoScrollEnabled}
                onCheckedChange={(checked) =>
                  updateSetting('contentAutoScrollEnabled', checked)
                }
              />
            </div>

            {settings.contentAutoScrollEnabled && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Speed</span>
                  <span className="text-muted-foreground">
                    {SPEED_LABELS[settings.contentAutoScrollSpeed]} (
                    {CONTENT_SCROLL_SPEEDS[settings.contentAutoScrollSpeed]})
                  </span>
                </div>
                <Slider
                  value={[speedToSliderValue(settings.contentAutoScrollSpeed)]}
                  onValueChange={([value]) =>
                    updateSetting('contentAutoScrollSpeed', sliderValueToSpeed(value))
                  }
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Slide Auto-Advance Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="slide-auto-advance" className="text-base font-medium">
                  Slide Auto-Advance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically advance to next slide after a delay
                </p>
              </div>
              <Switch
                id="slide-auto-advance"
                checked={settings.slideAutoAdvanceEnabled}
                onCheckedChange={(checked) =>
                  updateSetting('slideAutoAdvanceEnabled', checked)
                }
              />
            </div>

            {settings.slideAutoAdvanceEnabled && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Delay</span>
                  <span className="text-muted-foreground">
                    {SLIDE_ADVANCE_SPEEDS[settings.slideAutoAdvanceSpeed]}
                  </span>
                </div>
                <Slider
                  value={[speedToSliderValue(settings.slideAutoAdvanceSpeed)]}
                  onValueChange={([value]) =>
                    updateSetting('slideAutoAdvanceSpeed', sliderValueToSpeed(value))
                  }
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span>2s</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Animation Style Section */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Animation Style</Label>
              <p className="text-sm text-muted-foreground">
                Visual transitions between and within slides
              </p>
            </div>

            <RadioGroup
              value={settings.animationStyle}
              onValueChange={(value) =>
                updateSetting('animationStyle', value as PresentationSettingsData['animationStyle'])
              }
              className="grid gap-3"
            >
              {(Object.entries(ANIMATION_STYLES) as [keyof typeof ANIMATION_STYLES, typeof ANIMATION_STYLES[keyof typeof ANIMATION_STYLES]][]).map(
                ([value, { label, description }]) => (
                  <div key={value} className="flex items-start space-x-3">
                    <RadioGroupItem value={value} id={`animation-${value}`} className="mt-1" />
                    <div className="space-y-0.5">
                      <Label htmlFor={`animation-${value}`} className="font-medium cursor-pointer">
                        {label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                )
              )}
            </RadioGroup>

            {/* Frame Count Slider - only shown for expressive mode */}
            {settings.animationStyle === 'expressive' && (
              <div className="pl-4 pt-4 space-y-2 border-t border-border/50 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Animation Frames</span>
                  <span className="text-muted-foreground font-mono">
                    {settings.frameCount} frames per slide
                  </span>
                </div>
                <Slider
                  value={[settings.frameCount]}
                  onValueChange={([value]) => updateSetting('frameCount', value)}
                  min={2}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2 (faster)</span>
                  <span>5 (detailed)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  More frames = smoother animation but longer generation time
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> during
          presentation to view all keyboard shortcuts
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PresentationSettings;
