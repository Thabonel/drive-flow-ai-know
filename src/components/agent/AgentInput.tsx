import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { DictationButton } from '@/components/DictationButton';

interface AgentInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AgentInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type a command...',
}: AgentInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    onSubmit(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const charCount = input.length;
  const maxChars = 2000;
  const isNearLimit = charCount > maxChars * 0.9;

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t flex-shrink-0 bg-background">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="resize-none border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[80px]"
          rows={3}
          disabled={disabled}
          maxLength={maxChars}
        />
        <div className="flex flex-col gap-2 justify-end">
          <DictationButton
            onTranscription={(text) => setInput(prev => prev ? prev + ' ' + text : text)}
          />
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            className="h-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {charCount > 0 && (
        <div className={`text-xs mt-2 text-right ${isNearLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {charCount} / {maxChars} characters
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2">
        💡 Tip: Press Cmd/Ctrl+Enter to submit
      </div>
    </form>
  );
}
