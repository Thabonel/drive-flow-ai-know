import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Info, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RoleMode, ROLE_MODE_DESCRIPTIONS } from '@/lib/attentionTypes';

interface RoleFitScoreCardProps {
  score?: number;
  roleMode: RoleMode;
  weekStartDate: string;
  className?: string;
  showRefresh?: boolean;
}

interface RoleFitBreakdown {
  role_alignment: number;
  attention_distribution: number;
  focus_protection: number;
  delegation_opportunities: number;
}

interface RoleFitScoreData {
  score: number;
  breakdown: RoleFitBreakdown;
  recommendations: string[];
  trend?: 'up' | 'down' | 'stable';
  previousWeekScore?: number;
}

export function RoleFitScoreCard({
  score: initialScore,
  roleMode,
  weekStartDate,
  className = '',
  showRefresh = false
}: RoleFitScoreCardProps) {
  const [scoreData, setScoreData] = useState<RoleFitScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialScore) {
      // If we have an initial score, use it temporarily
      setScoreData({
        score: initialScore,
        breakdown: {
          role_alignment: initialScore,
          attention_distribution: initialScore,
          focus_protection: initialScore,
          delegation_opportunities: initialScore,
        },
        recommendations: [],
      });
    }

    // Always fetch fresh data
    calculateScore();
  }, [roleMode, weekStartDate, initialScore]);

  async function calculateScore() {
    setLoading(true);
    try {
      const response = await fetch('/functions/v1/weekly-calibration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_score',
          week_start_date: weekStartDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.role_fit_score) {
          const newScoreData: RoleFitScoreData = {
            ...data.role_fit_score,
            trend: determineTrend(data.role_fit_score.score, scoreData?.score),
          };
          setScoreData(newScoreData);
        }
      } else {
        throw new Error('Failed to calculate role fit score');
      }
    } catch (error) {
      console.error('Error calculating role fit score:', error);
      if (!initialScore) {
        toast({
          title: 'Error',
          description: 'Failed to calculate role fit score',
          variant: 'destructive',
        });
      }
    }
    setLoading(false);
  }

  function determineTrend(currentScore: number, previousScore?: number): 'up' | 'down' | 'stable' {
    if (!previousScore) return 'stable';
    const diff = currentScore - previousScore;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 border-green-200 bg-green-50';
    if (score >= 60) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-red-600 border-red-200 bg-red-50';
  }

  function getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  function getProgressColor(value: number): string {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function getTrendIcon(trend?: string) {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  }

  if (!scoreData && !loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Role Fit Score</span>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Calculate how well your week aligns with {ROLE_MODE_DESCRIPTIONS[roleMode].label} mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={calculateScore} variant="outline" className="w-full">
            Calculate Score
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${scoreData?.score ? getScoreColor(scoreData.score) : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Role Fit Score</span>
          <div className="flex items-center space-x-2">
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={calculateScore}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {scoreData?.trend && getTrendIcon(scoreData.trend)}
          </div>
        </CardTitle>
        <CardDescription>
          Weekly compatibility with {ROLE_MODE_DESCRIPTIONS[roleMode].label} mode
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && !scoreData ? (
          <div className="text-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Calculating score...</p>
          </div>
        ) : scoreData ? (
          <>
            {/* Overall Score */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{scoreData.score}%</div>
              <Badge variant={scoreData.score >= 80 ? 'default' : scoreData.score >= 60 ? 'secondary' : 'destructive'}>
                {getScoreLabel(scoreData.score)}
              </Badge>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Score Breakdown</h4>

              <div className="space-y-3">
                {Object.entries(scoreData.breakdown).map(([metric, value]) => (
                  <div key={metric} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {metric.replace('_', ' ')}
                      </span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={value} className="h-2" />
                      <div
                        className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(value)}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {scoreData.recommendations && scoreData.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recommendations</h4>
                <div className="space-y-2">
                  {scoreData.recommendations.map((recommendation, index) => (
                    <div key={index} className="text-xs p-2 bg-muted rounded flex items-start space-x-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Explanation */}
            <div className="text-xs text-muted-foreground border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Role Alignment:</span> How well activities match your role
                </div>
                <div>
                  <span className="font-medium">Attention Distribution:</span> Variety of attention types
                </div>
                <div>
                  <span className="font-medium">Focus Protection:</span> Quality of deep work blocks
                </div>
                <div>
                  <span className="font-medium">Delegation Opportunities:</span> Potential for task delegation
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No timeline data available for scoring</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}