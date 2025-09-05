import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, HelpCircle } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['/'], description: 'Focus search input', category: 'Navigation' },
  { keys: ['Ctrl', 'K'], description: 'Focus AI query input', category: 'AI' },
  { keys: ['Ctrl', 'N'], description: 'Create new document', category: 'Documents' },
  { keys: ['Ctrl', 'Enter'], description: 'Submit AI query', category: 'AI' },
  { keys: ['Esc'], description: 'Close modals and dialogs', category: 'Navigation' },
];

const categories = Array.from(new Set(shortcuts.map(s => s.category)));

export const KeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      'Ctrl': '⌃',
      'Cmd': '⌘',
      'Alt': '⌥',
      'Shift': '⇧',
      'Enter': '↵',
      'Esc': '⎋',
    };
    
    return keyMap[key] || key;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          aria-label="View keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <Badge
                            key={keyIndex}
                            variant="outline"
                            className="text-xs px-2 py-1 font-mono"
                          >
                            {formatKey(key)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Shortcuts work when not focused on input fields. Press <kbd className="px-1 py-0.5 bg-muted rounded">?</kbd> to show this help.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};