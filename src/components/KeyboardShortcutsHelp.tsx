/**
 * Keyboard Shortcuts Help Overlay
 *
 * Displays available keyboard shortcuts during presentation mode.
 * Triggered by pressing '?' key.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
      { keys: ['N'], description: 'Toggle speaker notes' },
      { keys: ['S'], description: 'Open settings' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  {
    title: 'Control',
    shortcuts: [
      { keys: ['Esc'], description: 'Exit presentation' },
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
      { keys: ['S'], description: 'Open settings' },
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

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  mode,
}: KeyboardShortcutsHelpProps) {
  const shortcuts = mode === 'presenter' ? PRESENTER_SHORTCUTS : PRESENTATION_SHORTCUTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick reference for presentation controls
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcuts.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1.5">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-xs text-muted-foreground mx-1">or</span>
                          )}
                          <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono font-medium">
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

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> or click outside to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
