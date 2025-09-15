import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useClaudeProcessor = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isProcessorOpen, setIsProcessorOpen] = useState(false);
  const { toast } = useToast();

  const openProcessor = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsProcessorOpen(true);
  };

  const closeProcessor = () => {
    setSelectedDocumentId(null);
    setIsProcessorOpen(false);
  };

  const processDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('claude-document-processor', {
        body: { documentId }
      });

      if (error) throw error;

      toast({
        title: 'Document Processed Successfully',
        description: `Claude MVP has analyzed the document and extracted valuable insights.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Processing Failed',
        description: `Failed to process document: ${error.message}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    selectedDocumentId,
    isProcessorOpen,
    openProcessor,
    closeProcessor,
    processDocument,
  };
};