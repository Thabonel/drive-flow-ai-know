import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Sparkles, FileStack } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ConversionType = 'transcript' | 'ai_summary' | 'both';

interface ConvertToDocumentModalProps {
  conversationId: string;
  conversationTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentIds: string[]) => void;
}

export function ConvertToDocumentModal({
  conversationId,
  conversationTitle,
  isOpen,
  onClose,
  onSuccess,
}: ConvertToDocumentModalProps) {
  const [conversionType, setConversionType] = useState<ConversionType>('ai_summary');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    setIsConverting(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'convert-conversation-to-document',
        {
          body: {
            conversation_id: conversationId,
            conversion_type: conversionType,
          },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to convert conversation');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Conversion failed');
      }

      const docCount = data.documents_created || data.document_ids?.length || 1;
      const docText = docCount === 1 ? 'document' : 'documents';

      toast.success(`Created ${docCount} ${docText}`, {
        description: 'View in Documents page',
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/documents';
          },
        },
      });

      onSuccess(data.document_ids || []);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Conversion failed', {
        description: errorMessage,
      });
    } finally {
      setIsConverting(false);
    }
  };

  const conversionOptions = [
    {
      value: 'ai_summary' as ConversionType,
      label: 'AI-Generated Document',
      description: 'AI creates a standalone document (auto-detects best format)',
      icon: Sparkles,
      recommended: true,
    },
    {
      value: 'transcript' as ConversionType,
      label: 'Full Transcript',
      description: 'Complete conversation formatted as a readable document',
      icon: FileText,
    },
    {
      value: 'both' as ConversionType,
      label: 'Both',
      description: 'Creates two separate documents: transcript and AI summary',
      icon: FileStack,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Convert to Document
          </DialogTitle>
          <DialogDescription>
            Convert "{conversationTitle}" into a reusable knowledge document.
            The conversation will be removed from your archive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={conversionType}
            onValueChange={(value) => setConversionType(value as ConversionType)}
            className="space-y-3"
          >
            {conversionOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    conversionType === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setConversionType(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                      {option.recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Recommended
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isConverting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              'Convert'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
