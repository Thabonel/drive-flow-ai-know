import { useState } from 'react';
import { useAITimeIntelligence } from '@/hooks/useAITimeIntelligence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { TimeIntelligenceInsight } from '@/lib/ai/prompts/time-intelligence';

interface AITimeInsightsProps {
  compact?: boolean;
}

export function AITimeInsights({ compact = false }: AITimeInsightsProps) {
  const {
    insights,
    loading,
    analyzing,
    error,
    isConfigured,
    analyzePatterns,
    getBasicStats,
  } = useAITimeIntelligence();

  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());

  const stats = getBasicStats();

  const handleAnalyze = async () => {
    await analyzePatterns('all');
  };

  const getSeverityIcon = (severity: TimeIntelligenceInsight['severity']) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: TimeIntelligenceInsight['category']) => {
    switch (category) {
      case 'estimation':
        return <Clock className="h-4 w-4" />;
      case 'productivity':
        return <TrendingUp className="h-4 w-4" />;
      case 'patterns':
        return <Brain className="h-4 w-4" />;
      case 'recommendations':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLearningStatusColor = () => {
    switch (stats.learningStatus) {
      case 'expert':
        return 'text-green-600';
      case 'confident':
        return 'text-blue-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getLearningStatusMessage = () => {
    switch (stats.learningStatus) {
      case 'expert':
        return 'AI has extensive data for accurate insights';
      case 'confident':
        return 'AI is gaining confidence in patterns';
      default:
        return 'AI is still learning your patterns';
    }
  };

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Configure OpenAI to enable AI Time Intelligence
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <Badge variant="outline" className={getLearningStatusColor()}>
              {stats.learningStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.totalTasks === 0 ? (
            <p className="text-sm text-muted-foreground">
              Complete some tasks to start getting AI insights!
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tasks Analyzed</span>
                <span className="font-medium">{stats.totalTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Accuracy</span>
                <span className="font-medium">{stats.avgAccuracy}%</span>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || stats.totalTasks === 0}
                className="w-full gap-2"
                size="sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Generate Insights
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Time Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Learn from your patterns and improve time management
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || loading || stats.totalTasks === 0}
          className="gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyze Patterns
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className={getLearningStatusColor()}>
                {getLearningStatusMessage()}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimation Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgAccuracy}%</div>
            <Progress value={stats.avgAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Overrun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">
                {stats.avgOverrun > 0 ? '+' : ''}
                {stats.avgOverrun}m
              </div>
              {stats.avgOverrun > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.avgOverrun > 0 ? 'Tasks taking longer' : 'On track'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Insights</CardTitle>
            <CardDescription>{insights.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.insights.map((insight, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
              >
                {/* Insight Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(insight.category)}
                    <h4 className="font-semibold">{insight.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(insight.severity)}
                    <Badge variant="outline" className="text-xs capitalize">
                      {insight.category}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">{insight.description}</p>

                {/* Confidence */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <Progress value={insight.confidence * 100} className="w-24 h-2" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(insight.confidence * 100)}%
                  </span>
                </div>

                {/* Actionable Tip */}
                {insight.actionable_tip && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="tip" className="border-0">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center gap-2 text-primary">
                          <Sparkles className="h-3 w-3" />
                          <span>Actionable Tip</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm bg-muted/50 p-3 rounded">
                        {insight.actionable_tip}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No insights yet */}
      {stats.totalTasks === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground">
              Complete some tasks to start building your time intelligence profile.
              <br />
              The AI will learn your patterns and provide personalized insights.
            </p>
          </CardContent>
        </Card>
      )}

      {stats.totalTasks > 0 && !insights && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
            <h3 className="font-semibold text-lg mb-2">Ready for Analysis</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You have {stats.totalTasks} completed tasks.
              <br />
              Click "Analyze Patterns" to generate AI insights about your time management.
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2">
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyze Patterns
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
