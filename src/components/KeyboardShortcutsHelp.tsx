/**
 * Keyboard Shortcuts Help Overlay
 *
 * Displays available keyboard shortcuts and feature explanations
 * during presentation mode. Triggered by pressing '?' key.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'presentation' | 'presenter';
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

interface FeatureInfo {
  title: string;
  description: string;
}

const PRESENTATION_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['→', 'Space', 'Enter'], description: 'Next slide' },
      { keys: ['←'], description: 'Previous slide' },
      { keys: ['Home'], description: 'First slide' },
      { keys: ['End'], description: 'Last slide' },
    ],
  },
  {
    title: 'Display',
    shortcuts: [
      { keys: ['N'], description: 'Toggle speaker notes (split-screen)' },
      { keys: ['S'], description: 'Open presentation settings' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  {
    title: 'Control',
    shortcuts: [
      { keys: ['Esc'], description: 'Exit presentation' },
      { keys: ['Mouse Hover'], description: 'Pause auto-scroll/advance' },
    ],
  },
];

const PRESENTER_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['→', 'Space', 'PageDown'], description: 'Next slide' },
      { keys: ['←', 'PageUp'], description: 'Previous slide' },
      { keys: ['Home'], description: 'First slide' },
      { keys: ['End'], description: 'Last slide' },
    ],
  },
  {
    title: 'Display',
    shortcuts: [
      { keys: ['S'], description: 'Open presentation settings' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  {
    title: 'Control',
    shortcuts: [
      { keys: ['Esc'], description: 'Exit presenter view' },
    ],
  },
];

const FEATURE_INFO: FeatureInfo[] = [
  {
    title: 'Content Auto-Scroll',
    description: 'Automatically scrolls through long slide content at a readable pace. Enable in settings (S) and choose slow/medium/fast speed. Pauses when you hover your mouse.',
  },
  {
    title: 'Slide Auto-Advance',
    description: 'Automatically advances to the next slide after a set interval (2-5 seconds). Perfect for hands-free demos or kiosk mode. Pauses on mouse hover.',
  },
  {
    title: 'Animation Styles',
    description: 'Choose how slide content appears: None (static), Minimal (subtle fade), Standard (slide/scale effects), or Expressive (multi-frame AI animations).',
  },
  {
    title: 'Expressive Mode Frames',
    description: 'When set to Expressive, AI generates 2-5 animation frames per slide showing progressive visual build-up. Frames cycle automatically during presentation.',
  },
  {
    title: 'Progress Indicators',
    description: 'When auto features are enabled, visual indicators appear: a progress bar for content scroll and a circular countdown for slide advance.',
  },
];

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  mode,
}: KeyboardShortcutsHelpProps) {
  const shortcuts = mode === 'presenter' ? PRESENTER_SHORTCUTS : PRESENTATION_SHORTCUTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Presentation Help</DialogTitle>
          <DialogDescription>
            Keyboard shortcuts and feature guide
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Keyboard Shortcuts Section */}
          <div>
            <h2 className="text-base font-semibold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-5">
              {shortcuts.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </h3>
                  <div className="space-y-1.5">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-xs text-muted-foreground mx-1">or</span>
                              )}
                              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono font-medium whitespace-nowrap">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Features Section */}
          <div>
            <h2 className="text-base font-semibold mb-4">Presentation Features</h2>
            <div className="space-y-4">
              {FEATURE_INFO.map((feature, index) => (
                <div key={index} className="space-y-1">
                  <h3 className="text-sm font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">S</kbd> to open settings
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
