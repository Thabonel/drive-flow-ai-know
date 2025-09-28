import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  data: any[];
  config: {
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
    colors?: string[];
  };
  description: string;
  confidence: number;
}

interface ChartAnalysisResponse {
  charts: ChartConfiguration[];
  insights: string[];
  dataQuality: {
    completeness: number;
    consistency: number;
    recommendations: string[];
  };
}

export const useDocumentVisualization = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ChartAnalysisResponse | null>(null);
  const { toast } = useToast();

  const analyzeDocumentForCharts = async (
    documentContent: string,
    spreadsheetData?: any,
    requestedChartTypes?: string[]
  ): Promise<ChartAnalysisResponse | null> => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-for-charts', {
        body: {
          documentContent,
          spreadsheetData,
          requestedChartTypes: requestedChartTypes || ['bar', 'line', 'pie', 'scatter', 'area']
        }
      });

      if (error) {
        throw new Error(error.message || 'Chart analysis failed');
      }

      setAnalysis(data);
      
      toast({
        title: 'Analysis Complete',
        description: `Found ${data.charts.length} visualization opportunities`,
      });

      return data;
    } catch (error: any) {
      console.error('Chart analysis error:', error);
      
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze document for charts',
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateImageFromChart = async (
    chartConfig: ChartConfiguration,
    prompt?: string
  ): Promise<string | null> => {
    try {
      const imagePrompt = prompt || `
        Create a professional data visualization image for a ${chartConfig.type} chart titled "${chartConfig.title}".
        Style: Clean, modern business chart with professional color scheme.
        Include: Clear labels, legend if needed, and professional formatting.
        Description: ${chartConfig.description}
      `;

      const { data, error } = await supabase.functions.invoke('generate-chart-image', {
        body: {
          chartConfig,
          prompt: imagePrompt
        }
      });

      if (error) {
        throw new Error(error.message || 'Image generation failed');
      }

      toast({
        title: 'Chart Image Generated',
        description: 'Successfully created visual representation',
      });

      return data.imageUrl;
    } catch (error: any) {
      console.error('Image generation error:', error);
      
      toast({
        title: 'Image Generation Failed',
        description: error.message || 'Failed to generate chart image',
        variant: 'destructive',
      });

      return null;
    }
  };

  const exportChartData = (chart: ChartConfiguration, format: 'json' | 'csv' = 'json') => {
    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'csv') {
        if (chart.data.length === 0) {
          throw new Error('No data to export');
        }

        const headers = Object.keys(chart.data[0]);
        const csvContent = [
          headers.join(','),
          ...chart.data.map(row => 
            headers.map(header => {
              const value = row[header];
              return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
          )
        ].join('\n');

        content = csvContent;
        mimeType = 'text/csv';
        extension = 'csv';
      } else {
        content = JSON.stringify({
          chart,
          exportedAt: new Date().toISOString(),
          format: 'recharts-config'
        }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Chart data exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export chart data',
        variant: 'destructive',
      });
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
  };

  return {
    isAnalyzing,
    analysis,
    analyzeDocumentForCharts,
    generateImageFromChart,
    exportChartData,
    clearAnalysis
  };
};