import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Zap as ScatterIcon, TrendingUp, Download, Share, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
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

interface DocumentVisualizationPanelProps {
  documentId: string;
  documentContent: string;
  spreadsheetData?: any;
  onClose?: () => void;
}

export const DocumentVisualizationPanel: React.FC<DocumentVisualizationPanelProps> = ({
  documentId,
  documentContent,
  spreadsheetData,
  onClose
}) => {
  const [analysis, setAnalysis] = useState<ChartAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedChart, setSelectedChart] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    analyzeDocument();
  }, [documentId, documentContent]);

  const analyzeDocument = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-for-charts', {
        body: {
          documentContent,
          spreadsheetData,
          requestedChartTypes: ['bar', 'line', 'pie', 'scatter', 'area']
        }
      });

      if (error) throw error;

      setAnalysis(data);
      toast({
        title: 'Analysis Complete',
        description: `Found ${data.charts.length} visualization opportunities`,
      });
    } catch (error: any) {
      console.error('Chart analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze document for charts',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportChart = (chartIndex: number) => {
    const chart = analysis?.charts[chartIndex];
    if (!chart) return;

    const exportData = {
      chart,
      documentId,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Chart Exported',
      description: 'Chart configuration saved successfully',
    });
  };

  const renderChart = (chart: ChartConfiguration) => {
    const chartConfig = {
      [chart.config.xKey || 'x']: {
        label: chart.config.xKey || 'X Axis',
        color: 'hsl(var(--chart-1))',
      },
      [chart.config.yKey || 'y']: {
        label: chart.config.yKey || 'Y Axis',
        color: 'hsl(var(--chart-2))',
      },
      [chart.config.nameKey || 'name']: {
        label: chart.config.nameKey || 'Category',
        color: 'hsl(var(--chart-3))',
      },
      [chart.config.valueKey || 'value']: {
        label: chart.config.valueKey || 'Value',
        color: 'hsl(var(--chart-4))',
      },
    };

    switch (chart.type) {
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.config.xKey} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey={chart.config.yKey} 
                fill="var(--color-bar)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        );

      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.config.xKey} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey={chart.config.yKey} 
                stroke="var(--color-line)" 
                strokeWidth={2}
                dot={{ fill: "var(--color-line)" }}
              />
            </LineChart>
          </ChartContainer>
        );

      case 'pie':
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey={chart.config.valueKey || chart.config.yKey}
                nameKey={chart.config.nameKey || chart.config.xKey}
              >
                {chart.data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chart.config.colors?.[index % chart.config.colors.length] || `hsl(var(--chart-${(index % 5) + 1}))`}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        );

      case 'scatter':
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ScatterChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.config.xKey} />
              <YAxis dataKey={chart.config.yKey} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Scatter fill="var(--color-scatter)" />
            </ScatterChart>
          </ChartContainer>
        );

      case 'area':
        return (
          <ChartContainer config={chartConfig} className="h-[400px]">
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.config.xKey} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey={chart.config.yKey} 
                stroke="var(--color-area)" 
                fill="var(--color-area)" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        );

      default:
        return <div className="h-[400px] flex items-center justify-center text-muted-foreground">Unsupported chart type</div>;
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return BarChart3;
      case 'line': return LineChartIcon;
      case 'pie': return PieChartIcon;
      case 'scatter': return ScatterIcon;
      case 'area': return TrendingUp;
      default: return BarChart3;
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse" />
            Analyzing Document for Visualizations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={33} className="animate-pulse" />
          <div className="text-sm text-muted-foreground">
            AI is analyzing your document to identify visualization opportunities...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || analysis.charts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            No Visualizations Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              No suitable data for visualization was found in this document.
            </div>
            <Button onClick={analyzeDocument} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Re-analyze
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Document Visualizations
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{analysis.charts.length} charts</Badge>
              <Button
                onClick={() => exportChart(selectedChart)}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="ghost" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Quality Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Data Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completeness</span>
                <span>{Math.round(analysis.dataQuality.completeness * 100)}%</span>
              </div>
              <Progress value={analysis.dataQuality.completeness * 100} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Consistency</span>
                <span>{Math.round(analysis.dataQuality.consistency * 100)}%</span>
              </div>
              <Progress value={analysis.dataQuality.consistency * 100} />
            </div>
          </div>
          {analysis.dataQuality.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {analysis.dataQuality.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs value={selectedChart.toString()} onValueChange={(value) => setSelectedChart(parseInt(value))}>
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {analysis.charts.map((chart, index) => {
            const IconComponent = getChartIcon(chart.type);
            return (
              <TabsTrigger key={index} value={index.toString()} className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                <span className="truncate">{chart.title}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(chart.confidence * 100)}%
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {analysis.charts.map((chart, index) => (
          <TabsContent key={index} value={index.toString()}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {React.createElement(getChartIcon(chart.type), { className: "h-5 w-5" })}
                      {chart.title}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">{chart.description}</p>
                  </div>
                  <Badge variant={chart.confidence > 0.8 ? "default" : chart.confidence > 0.6 ? "secondary" : "outline"}>
                    {Math.round(chart.confidence * 100)}% confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {renderChart(chart)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};