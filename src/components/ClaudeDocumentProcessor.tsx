import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Loader2, Sparkles, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ClaudeDocumentProcessorProps {
  documentId: string;
  documentTitle: string;
  documentType: string;
  onProcessingComplete?: () => void;
}

interface ProcessingResult {
  title: string;
  category: string;
  summary: string;
  insights: {
    keyPoints: string[];
    actionItems: string[];
    metrics: string[];
    recommendations: string[];
  };
  extractedData?: {
    tables: any[];
    figures: any;
    calculations: any;
    patterns: any[];
  };
}

export const ClaudeDocumentProcessor = ({ 
  documentId, 
  documentTitle, 
  documentType,
  onProcessingComplete 
}: ClaudeDocumentProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processDocument = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('claude-document-processor', {
        body: { documentId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResult(data.analysis);
      toast({
        title: 'Document Processed!',
        description: `Claude MVP has analyzed "${data.analysis.title}" and extracted key insights.`,
      });
      
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
      
      onProcessingComplete?.();
    },
    onError: (error: any) => {
      console.error('Error processing document:', error);
      toast({
        title: 'Processing Failed',
        description: `Failed to process document: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleProcess = () => {
    setIsProcessing(true);
    processDocument.mutate();
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
    if (type.includes('chart')) return <BarChart3 className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Claude MVP Document Processor
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            {getDocumentIcon(documentType)}
            <div>
              <p className="font-medium">{documentTitle}</p>
              <p className="text-sm text-muted-foreground">
                {documentType.toUpperCase()} • Ready for Claude MVP analysis
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex items-center space-x-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span>{isProcessing ? 'Processing...' : 'Process with Claude'}</span>
          </Button>
        </div>

        {result && (
          <div className="space-y-4 mt-6">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-lg mb-2">{result.title}</h3>
              <Badge variant="outline" className="mb-3">{result.category}</Badge>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>

            {result.insights && (
              <div className="grid md:grid-cols-2 gap-4">
                {result.insights.keyPoints?.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Key Points</h4>
                    <ul className="text-sm space-y-1">
                      {result.insights.keyPoints.map((point, i) => (
                        <li key={i} className="text-blue-700 dark:text-blue-300">• {point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.insights.actionItems?.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Action Items</h4>
                    <ul className="text-sm space-y-1">
                      {result.insights.actionItems.map((item, i) => (
                        <li key={i} className="text-green-700 dark:text-green-300">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.insights.metrics?.length > 0 && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Key Metrics</h4>
                    <ul className="text-sm space-y-1">
                      {result.insights.metrics.map((metric, i) => (
                        <li key={i} className="text-purple-700 dark:text-purple-300">• {metric}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.insights.recommendations?.length > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {result.insights.recommendations.map((rec, i) => (
                        <li key={i} className="text-orange-700 dark:text-orange-300">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.extractedData && (Object.keys(result.extractedData).some(key => 
              Array.isArray(result.extractedData![key]) ? result.extractedData![key].length > 0 : 
              typeof result.extractedData![key] === 'object' ? Object.keys(result.extractedData![key]).length > 0 : false
            )) && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Extracted Data & Analysis
                </h4>
                <div className="text-sm text-muted-foreground">
                  <p>Claude MVP has extracted structured data from this document including tables, figures, and patterns.</p>
                  <p className="mt-2">
                    <Badge variant="secondary" className="mr-2">Advanced Processing Complete</Badge>
                    Data is now integrated into your knowledge base.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded">
          <p className="flex items-center">
            <Sparkles className="h-3 w-3 mr-1" />
            <strong>Claude MVP</strong> uses advanced AI to extract insights from PDFs, spreadsheets, and documents with superior accuracy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};