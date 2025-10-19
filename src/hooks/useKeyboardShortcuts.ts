import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or textareas
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();

        // For Ctrl shortcuts, accept either Ctrl (Windows/Linux) or Cmd (Mac)
        const modifierMatch = s.ctrlKey
          ? (event.ctrlKey || event.metaKey)
          : (s.metaKey ? event.metaKey : true);

        const shiftMatch = (s.shiftKey ?? false) === event.shiftKey;
        const altMatch = (s.altKey ?? false) === event.altKey;

        return keyMatch && modifierMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export const globalShortcuts: KeyboardShortcut[] = [
  {
    key: '/',
    action: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    description: 'Focus search'
  },
  {
    key: '?',
    action: () => {
      const helpButton = document.querySelector('[aria-label="View keyboard shortcuts"]') as HTMLButtonElement;
      if (helpButton) {
        helpButton.click();
      }
    },
    description: 'Show keyboard shortcuts'
  },
  {
    key: 'n',
    ctrlKey: true,
    action: () => {
      const createButton = document.querySelector('[data-create-document]') as HTMLButtonElement;
      if (createButton) {
        createButton.click();
      }
    },
    description: 'Create new document'
  },
  {
    key: 'k',
    ctrlKey: true,
    action: () => {
      const aiInput = document.querySelector('input[placeholder*="Ask about"]') as HTMLInputElement;
      if (aiInput) {
        aiInput.focus();
      }
    },
    description: 'Focus AI query'
  },
];