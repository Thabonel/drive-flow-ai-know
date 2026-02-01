import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  Brain,
  Zap,
  Target,
  Activity,
  Eye,
  ArrowRight,
  Lightbulb,
  Star,
  AlertTriangle,
  CheckCircle,
  Timer
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import { AttentionType, ATTENTION_TYPE_DESCRIPTIONS, ROLE_MODES } from '@/lib/attentionTypes';
import { useAdvancedAttentionBudget } from '@/hooks/useAdvancedAttentionBudget';

interface AttentionPattern {
  id: string;
  type: 'peak_hours' | 'energy_cycles' | 'productive_sequences' | 'attention_transitions';
  title: string;
  description: string;
  confidence: number;
  frequency: number;
  effectivenessScore: number;
  insight: string;
  recommendation: string;
  supportingData: any;
  identifiedDates: string[];
  trend: 'improving' | 'stable' | 'declining';
}

interface ProductivityInsight {
  category: 'time_of_day' | 'attention_type' | 'duration' | 'sequencing';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data: any;
}

interface EfficiencyMetric {
  name: string;
  value: number;
  trend: number;
  unit: string;
  description: string;
  benchmarkComparison: 'above' | 'at' | 'below';
}

interface AttentionPatternAnalyticsProps {
  items: TimelineItem[];
  dateRange?: { start: Date; end: Date };
  className?: string;
  onApplyInsight?: (insight: ProductivityInsight) => void;
}

export function AttentionPatternAnalytics({
  items,
  dateRange,
  className,
  onApplyInsight
}: AttentionPatternAnalyticsProps) {
  const {
    attentionPatterns,
    preferences,
    getAttentionEfficiencyScore
  } = useAdvancedAttentionBudget();

  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('week');
  const [patterns, setPatterns] = useState<AttentionPattern[]>([]);
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [metrics, setMetrics] = useState<EfficiencyMetric[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<AttentionPattern | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patterns');

  // Filter items based on date range and timeframe
  const analysisItems = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (dateRange) {
      return items.filter(item => {
        const itemDate = new Date(item.start_time);
        return itemDate >= dateRange.start && itemDate <= dateRange.end;
      });
    }

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return items.filter(item => {
      const itemDate = new Date(item.start_time);
      return itemDate >= startDate && item.attention_type;
    });
  }, [items, timeframe, dateRange]);

  // Analyze patterns when data changes
  useEffect(() => {
    analyzeAttentionPatterns();
  }, [analysisItems, preferences]);

  const analyzeAttentionPatterns = async () => {
    if (analysisItems.length === 0) {
      setPatterns([]);
      setInsights([]);
      setMetrics([]);
      return;
    }

    setLoading(true);
    try {
      const analyzedPatterns = await identifyPatterns();
      const generatedInsights = generateProductivityInsights();
      const calculatedMetrics = await calculateEfficiencyMetrics();

      setPatterns(analyzedPatterns);
      setInsights(generatedInsights);
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error analyzing attention patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const identifyPatterns = async (): Promise<AttentionPattern[]> => {
    const patterns: AttentionPattern[] = [];

    // Peak Hours Pattern Analysis
    const peakHoursPattern = analyzePeakHoursPattern();
    if (peakHoursPattern) patterns.push(peakHoursPattern);

    // Energy Cycles Pattern
    const energyCyclesPattern = analyzeEnergyCycles();
    if (energyCyclesPattern) patterns.push(energyCyclesPattern);

    // Productive Sequences Pattern
    const productiveSequencesPattern = analyzeProductiveSequences();
    if (productiveSequencesPattern) patterns.push(productiveSequencesPattern);

    // Attention Transition Pattern
    const transitionPattern = analyzeAttentionTransitions();
    if (transitionPattern) patterns.push(transitionPattern);

    return patterns.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
  };

  const analyzePeakHoursPattern = (): AttentionPattern | null => {
    const hourlyProductivity: Record<number, { count: number; effectiveness: number }> = {};

    // Group items by hour and calculate effectiveness
    analysisItems.forEach(item => {
      const hour = new Date(item.start_time).getHours();
      const duration = item.duration_minutes || 0;

      if (!hourlyProductivity[hour]) {
        hourlyProductivity[hour] = { count: 0, effectiveness: 0 };
      }

      hourlyProductivity[hour].count++;
      // Simulate effectiveness score (in real implementation, would use actual completion data)
      hourlyProductivity[hour].effectiveness += duration >= 60 ? 85 : 70;
    });

    // Calculate average effectiveness per hour
    const hourlyAverages = Object.entries(hourlyProductivity).map(([hour, data]) => ({
      hour: parseInt(hour),
      averageEffectiveness: data.effectiveness / data.count,
      count: data.count
    }));

    if (hourlyAverages.length === 0) return null;

    // Find peak hours (top 25% effectiveness)
    const sortedHours = hourlyAverages.sort((a, b) => b.averageEffectiveness - a.averageEffectiveness);
    const peakHours = sortedHours.slice(0, Math.ceil(sortedHours.length * 0.25));

    if (peakHours.length === 0) return null;

    const avgPeakEffectiveness = peakHours.reduce((sum, h) => sum + h.averageEffectiveness, 0) / peakHours.length;
    const peakHoursList = peakHours.map(h => `${h.hour}:00`).join(', ');

    return {
      id: 'peak-hours',
      type: 'peak_hours',
      title: 'Peak Performance Hours',
      description: `Highest productivity observed at ${peakHoursList}`,
      confidence: Math.min(0.95, peakHours.length / 4),
      frequency: peakHours.length,
      effectivenessScore: avgPeakEffectiveness,
      insight: `You perform ${Math.round(avgPeakEffectiveness - 60)}% better during peak hours`,
      recommendation: `Schedule Create and Decide work during ${peakHoursList}`,
      supportingData: { hourlyAverages, peakHours },
      identifiedDates: getUniqueDates(analysisItems),
      trend: calculateTrend(hourlyAverages)
    };
  };

  const analyzeEnergyCycles = (): AttentionPattern | null => {
    const dailyPatterns: Record<string, { morning: number; afternoon: number; evening: number }> = {};

    // Group by day and time of day
    analysisItems.forEach(item => {
      const date = new Date(item.start_time).toISOString().split('T')[0];
      const hour = new Date(item.start_time).getHours();
      const duration = item.duration_minutes || 0;

      if (!dailyPatterns[date]) {
        dailyPatterns[date] = { morning: 0, afternoon: 0, evening: 0 };
      }

      if (hour < 12) {
        dailyPatterns[date].morning += duration;
      } else if (hour < 17) {
        dailyPatterns[date].afternoon += duration;
      } else {
        dailyPatterns[date].evening += duration;
      }
    });

    if (Object.keys(dailyPatterns).length === 0) return null;

    // Calculate average energy distribution
    const days = Object.values(dailyPatterns);
    const avgMorning = days.reduce((sum, day) => sum + day.morning, 0) / days.length;
    const avgAfternoon = days.reduce((sum, day) => sum + day.afternoon, 0) / days.length;
    const avgEvening = days.reduce((sum, day) => sum + day.evening, 0) / days.length;

    const total = avgMorning + avgAfternoon + avgEvening;
    const morningPercent = (avgMorning / total) * 100;
    const afternoonPercent = (avgAfternoon / total) * 100;
    const eveningPercent = (avgEvening / total) * 100;

    const dominantPeriod =
      morningPercent > afternoonPercent && morningPercent > eveningPercent ? 'Morning' :
      afternoonPercent > eveningPercent ? 'Afternoon' : 'Evening';

    return {
      id: 'energy-cycles',
      type: 'energy_cycles',
      title: 'Energy Cycle Pattern',
      description: `${dominantPeriod} is your most active period (${Math.round(Math.max(morningPercent, afternoonPercent, eveningPercent))}% of work)`,
      confidence: 0.8,
      frequency: days.length,
      effectivenessScore: Math.max(morningPercent, afternoonPercent, eveningPercent),
      insight: `You allocate most attention work during ${dominantPeriod.toLowerCase()} hours`,
      recommendation: `Align high-attention tasks with your ${dominantPeriod.toLowerCase()} energy peak`,
      supportingData: { morningPercent, afternoonPercent, eveningPercent, dailyPatterns },
      identifiedDates: Object.keys(dailyPatterns),
      trend: 'stable'
    };
  };

  const analyzeProductiveSequences = (): AttentionPattern | null => {
    const sequences: { types: string[]; effectiveness: number; frequency: number }[] = [];

    // Look for sequences of 3+ consecutive attention types
    const dates = getUniqueDates(analysisItems);

    dates.forEach(date => {
      const dayItems = analysisItems
        .filter(item => new Date(item.start_time).toISOString().split('T')[0] === date)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      for (let i = 0; i <= dayItems.length - 3; i++) {
        const sequence = dayItems.slice(i, i + 3);
        const types = sequence.map(item => item.attention_type).filter(Boolean);

        if (types.length === 3) {
          const totalDuration = sequence.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
          const effectiveness = totalDuration >= 120 ? 85 : 70; // Simplified scoring

          const existingSequence = sequences.find(s =>
            s.types.length === types.length &&
            s.types.every((type, index) => type === types[index])
          );

          if (existingSequence) {
            existingSequence.frequency++;
            existingSequence.effectiveness = (existingSequence.effectiveness + effectiveness) / 2;
          } else {
            sequences.push({
              types: types as string[],
              effectiveness,
              frequency: 1
            });
          }
        }
      }
    });

    if (sequences.length === 0) return null;

    // Find most effective sequence
    const bestSequence = sequences.reduce((best, current) =>
      current.effectiveness * current.frequency > best.effectiveness * best.frequency ? current : best
    );

    return {
      id: 'productive-sequences',
      type: 'productive_sequences',
      title: 'Productive Work Sequences',
      description: `${bestSequence.types.join(' → ')} sequence appears ${bestSequence.frequency} times`,
      confidence: Math.min(0.9, bestSequence.frequency / 5),
      frequency: bestSequence.frequency,
      effectivenessScore: bestSequence.effectiveness,
      insight: `This sequence shows ${bestSequence.effectiveness}% effectiveness when repeated`,
      recommendation: `Replicate the ${bestSequence.types.join(' → ')} sequence more often`,
      supportingData: { sequences, bestSequence },
      identifiedDates: dates,
      trend: bestSequence.frequency >= 3 ? 'improving' : 'stable'
    };
  };

  const analyzeAttentionTransitions = (): AttentionPattern | null => {
    const transitions: Record<string, { count: number; avgGap: number; effectiveness: number }> = {};

    for (let i = 1; i < analysisItems.length; i++) {
      const prev = analysisItems[i - 1];
      const current = analysisItems[i];

      if (prev.attention_type && current.attention_type && prev.attention_type !== current.attention_type) {
        const transition = `${prev.attention_type}→${current.attention_type}`;

        const prevEnd = new Date(prev.start_time);
        prevEnd.setMinutes(prevEnd.getMinutes() + (prev.duration_minutes || 0));

        const gap = (new Date(current.start_time).getTime() - prevEnd.getTime()) / (1000 * 60);

        if (!transitions[transition]) {
          transitions[transition] = { count: 0, avgGap: 0, effectiveness: 0 };
        }

        transitions[transition].count++;
        transitions[transition].avgGap = (transitions[transition].avgGap + gap) / 2;
        // Effectiveness inversely related to gap time for most transitions
        transitions[transition].effectiveness = Math.max(0, 90 - (gap * 2));
      }
    }

    if (Object.keys(transitions).length === 0) return null;

    const transitionArray = Object.entries(transitions).map(([key, data]) => ({
      transition: key,
      ...data
    }));

    const mostCommon = transitionArray.reduce((best, current) =>
      current.count > best.count ? current : best
    );

    return {
      id: 'attention-transitions',
      type: 'attention_transitions',
      title: 'Attention Transition Patterns',
      description: `Most common: ${mostCommon.transition} (${mostCommon.count} times)`,
      confidence: Math.min(0.85, mostCommon.count / 10),
      frequency: mostCommon.count,
      effectivenessScore: mostCommon.effectiveness,
      insight: `Average ${Math.round(mostCommon.avgGap)}min gap between attention switches`,
      recommendation: mostCommon.avgGap < 15 ?
        'Increase buffer time between attention switches' :
        'Current transition timing is optimal',
      supportingData: { transitions, mostCommon },
      identifiedDates: getUniqueDates(analysisItems),
      trend: mostCommon.effectiveness > 70 ? 'improving' : 'stable'
    };
  };

  const generateProductivityInsights = (): ProductivityInsight[] => {
    const insights: ProductivityInsight[] = [];

    // Time of day insights
    const timeInsight = analyzeTimeOfDayProductivity();
    if (timeInsight) insights.push(timeInsight);

    // Attention type distribution insights
    const typeInsight = analyzeAttentionTypeDistribution();
    if (typeInsight) insights.push(typeInsight);

    // Duration optimization insights
    const durationInsight = analyzeDurationOptimization();
    if (durationInsight) insights.push(durationInsight);

    return insights;
  };

  const analyzeTimeOfDayProductivity = (): ProductivityInsight | null => {
    const hourlyData: Record<number, { count: number; totalDuration: number; effectiveness: number }> = {};

    analysisItems.forEach(item => {
      const hour = new Date(item.start_time).getHours();
      const duration = item.duration_minutes || 0;

      if (!hourlyData[hour]) {
        hourlyData[hour] = { count: 0, totalDuration: 0, effectiveness: 0 };
      }

      hourlyData[hour].count++;
      hourlyData[hour].totalDuration += duration;
      hourlyData[hour].effectiveness += duration >= 60 ? 1 : 0.7; // Simplified effectiveness
    });

    const hourlyAverages = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      avgEffectiveness: data.effectiveness / data.count,
      totalDuration: data.totalDuration
    }));

    if (hourlyAverages.length === 0) return null;

    const bestHour = hourlyAverages.reduce((best, current) =>
      current.avgEffectiveness > best.avgEffectiveness ? current : best
    );

    const worstHour = hourlyAverages.reduce((worst, current) =>
      current.avgEffectiveness < worst.avgEffectiveness ? current : worst
    );

    const improvement = ((bestHour.avgEffectiveness - worstHour.avgEffectiveness) / worstHour.avgEffectiveness) * 100;

    return {
      category: 'time_of_day',
      title: 'Optimal Scheduling Windows',
      description: `${Math.round(improvement)}% effectiveness difference between peak (${bestHour.hour}:00) and low (${worstHour.hour}:00) hours`,
      impact: improvement > 30 ? 'high' : improvement > 15 ? 'medium' : 'low',
      actionable: true,
      data: { hourlyAverages, bestHour, worstHour, improvement }
    };
  };

  const analyzeAttentionTypeDistribution = (): ProductivityInsight | null => {
    const distribution: Record<string, number> = {};
    const totalTime = analysisItems.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

    analysisItems.forEach(item => {
      if (item.attention_type) {
        distribution[item.attention_type] = (distribution[item.attention_type] || 0) + (item.duration_minutes || 0);
      }
    });

    const percentages = Object.entries(distribution).map(([type, minutes]) => ({
      type,
      percentage: (minutes / totalTime) * 100,
      minutes
    }));

    if (percentages.length === 0) return null;

    const createPercentage = percentages.find(p => p.type === 'create')?.percentage || 0;
    const currentRole = preferences?.current_role || 'maker';

    let insight = '';
    let impact: 'high' | 'medium' | 'low' = 'medium';

    if (currentRole === 'maker' && createPercentage < 40) {
      insight = `Only ${Math.round(createPercentage)}% time on Create work. Consider increasing to 50-60% for Maker role.`;
      impact = 'high';
    } else if (currentRole === 'multiplier') {
      const connectPercentage = percentages.find(p => p.type === 'connect')?.percentage || 0;
      if (connectPercentage < 30) {
        insight = `Only ${Math.round(connectPercentage)}% time on Connect work. Consider increasing to 40-50% for Multiplier role.`;
        impact = 'high';
      }
    }

    return {
      category: 'attention_type',
      title: 'Attention Type Alignment',
      description: insight || `Attention distribution aligns well with ${currentRole} role`,
      impact,
      actionable: impact === 'high',
      data: { distribution, percentages, currentRole, totalTime }
    };
  };

  const analyzeDurationOptimization = (): ProductivityInsight | null => {
    const durations = analysisItems
      .filter(item => item.duration_minutes)
      .map(item => item.duration_minutes!);

    if (durations.length === 0) return null;

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const shortTasks = durations.filter(d => d < 30).length;
    const longTasks = durations.filter(d => d >= 120).length;
    const shortTaskPercentage = (shortTasks / durations.length) * 100;

    let insight = '';
    let impact: 'high' | 'medium' | 'low' = 'low';

    if (shortTaskPercentage > 40) {
      insight = `${Math.round(shortTaskPercentage)}% of tasks under 30min. Consider batching or extending for better focus.`;
      impact = 'medium';
    } else if (longTasks === 0 && preferences?.current_role === 'maker') {
      insight = 'No deep work blocks (120+ min) scheduled. Makers benefit from extended focus time.';
      impact = 'high';
    }

    return {
      category: 'duration',
      title: 'Task Duration Optimization',
      description: insight || `Average task duration of ${Math.round(avgDuration)}min is well-optimized`,
      impact,
      actionable: impact !== 'low',
      data: { avgDuration, shortTasks, longTasks, shortTaskPercentage, durations }
    };
  };

  const calculateEfficiencyMetrics = async (): Promise<EfficiencyMetric[]> => {
    const metrics: EfficiencyMetric[] = [];

    // Overall attention efficiency
    const overallEfficiency = await getAttentionEfficiencyScore();
    metrics.push({
      name: 'Attention Efficiency',
      value: overallEfficiency,
      trend: 5, // Simplified - would calculate from historical data
      unit: '%',
      description: 'Overall cognitive resource utilization',
      benchmarkComparison: overallEfficiency > 75 ? 'above' : overallEfficiency > 60 ? 'at' : 'below'
    });

    // Focus block percentage
    const focusBlocks = analysisItems.filter(item =>
      item.attention_type === 'create' && (item.duration_minutes || 0) >= 90
    ).length;
    const totalCreateTasks = analysisItems.filter(item => item.attention_type === 'create').length;
    const focusBlockPercentage = totalCreateTasks > 0 ? (focusBlocks / totalCreateTasks) * 100 : 0;

    metrics.push({
      name: 'Focus Block Ratio',
      value: focusBlockPercentage,
      trend: 2,
      unit: '%',
      description: 'Percentage of creative work in 90+ minute blocks',
      benchmarkComparison: focusBlockPercentage > 60 ? 'above' : focusBlockPercentage > 40 ? 'at' : 'below'
    });

    // Context switch frequency
    let contextSwitches = 0;
    for (let i = 1; i < analysisItems.length; i++) {
      if (analysisItems[i - 1].attention_type !== analysisItems[i].attention_type) {
        contextSwitches++;
      }
    }

    const dailyContextSwitches = contextSwitches / Math.max(1, getUniqueDates(analysisItems).length);

    metrics.push({
      name: 'Daily Context Switches',
      value: dailyContextSwitches,
      trend: -1, // Lower is better
      unit: 'switches',
      description: 'Average attention type changes per day',
      benchmarkComparison: dailyContextSwitches < 5 ? 'above' : dailyContextSwitches < 8 ? 'at' : 'below'
    });

    return metrics;
  };

  // Helper functions
  const getUniqueDates = (items: TimelineItem[]): string[] => {
    const dates = new Set<string>();
    items.forEach(item => {
      dates.add(new Date(item.start_time).toISOString().split('T')[0]);
    });
    return Array.from(dates);
  };

  const calculateTrend = (data: any[]): 'improving' | 'stable' | 'declining' => {
    if (data.length < 3) return 'stable';

    const recent = data.slice(-3);
    const older = data.slice(0, -3);

    const recentAvg = recent.reduce((sum, item) => sum + (item.averageEffectiveness || item.value || 0), 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + (item.averageEffectiveness || item.value || 0), 0) / older.length : recentAvg;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'declining': return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      case 'stable': return <ArrowRight className="h-3 w-3 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getBenchmarkIcon = (comparison: 'above' | 'at' | 'below') => {
    switch (comparison) {
      case 'above': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'at': return <Target className="h-4 w-4 text-yellow-500" />;
      case 'below': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  if (analysisItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Attention Pattern Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Not enough data for pattern analysis
          </p>
          <p className="text-xs text-muted-foreground">
            Add more attention-typed tasks to see insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Attention Pattern Analytics
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {analysisItems.length} items analyzed
              </Badge>
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-20 h-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="patterns" className="text-xs">
                Patterns
                {patterns.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 text-[10px] p-0">
                    {patterns.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                Insights
                {insights.length > 0 && (
                  <Badge variant="outline" className="ml-1 h-4 w-4 text-[10px] p-0">
                    {insights.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">
                Metrics
              </TabsTrigger>
            </TabsList>

            {/* Patterns Tab */}
            <TabsContent value="patterns" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Activity className="h-6 w-6 animate-pulse text-primary mr-2" />
                  <span className="text-sm">Analyzing patterns...</span>
                </div>
              ) : patterns.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No significant patterns detected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    More data needed for pattern recognition
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patterns.map(pattern => (
                    <Dialog key={pattern.id}>
                      <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {pattern.type.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {Math.round(pattern.effectivenessScore)}% effective
                                  </Badge>
                                  {getTrendIcon(pattern.trend)}
                                </div>

                                <div>
                                  <h4 className="font-medium text-sm">{pattern.title}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {pattern.description}
                                  </p>
                                </div>

                                <div className="text-xs">
                                  <div className="text-green-600">💡 {pattern.insight}</div>
                                  <div className="text-blue-600 mt-1">→ {pattern.recommendation}</div>
                                </div>
                              </div>

                              <div className="ml-4 flex flex-col items-end gap-1">
                                <Progress
                                  value={pattern.confidence * 100}
                                  className="w-12 h-1"
                                  indicatorClassName="bg-blue-500"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(pattern.confidence * 100)}% confidence
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </DialogTrigger>

                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{pattern.title}</DialogTitle>
                          <DialogDescription>
                            Detailed analysis of your {pattern.type.replace('_', ' ')} pattern
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Pattern Details</h4>
                              <div className="space-y-1 text-sm">
                                <div>Frequency: {pattern.frequency} occurrences</div>
                                <div>Confidence: {Math.round(pattern.confidence * 100)}%</div>
                                <div>Effectiveness: {Math.round(pattern.effectivenessScore)}%</div>
                                <div className="flex items-center gap-1">
                                  Trend: {getTrendIcon(pattern.trend)} {pattern.trend}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium">Supporting Evidence</h4>
                              <div className="text-sm">
                                <div>Analysis period: {pattern.identifiedDates.length} days</div>
                                <div>First observed: {pattern.identifiedDates[0]}</div>
                                <div>Last observed: {pattern.identifiedDates[pattern.identifiedDates.length - 1]}</div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Key Insights</h4>
                            <div className="space-y-2">
                              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                                <strong>Insight:</strong> {pattern.insight}
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                <strong>Recommendation:</strong> {pattern.recommendation}
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {insights.length === 0 ? (
                <div className="text-center py-6">
                  <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No actionable insights available
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <Card
                      key={index}
                      className={`border ${getImpactColor(insight.impact)}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {insight.category.replace('_', ' ')}
                              </Badge>
                              <Badge variant="secondary" className={`text-xs ${getImpactColor(insight.impact)}`}>
                                {insight.impact} impact
                              </Badge>
                              {insight.actionable && (
                                <Star className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>

                            <div>
                              <h4 className="font-medium text-sm">{insight.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {insight.description}
                              </p>
                            </div>
                          </div>

                          {insight.actionable && onApplyInsight && (
                            <Button
                              size="sm"
                              onClick={() => onApplyInsight(insight)}
                              className="text-xs"
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-4">
              <div className="grid gap-3">
                {metrics.map((metric, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{metric.name}</span>
                        {getBenchmarkIcon(metric.benchmarkComparison)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {metric.trend > 0 ? '+' : ''}{metric.trend}% trend
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">
                        {Math.round(metric.value)}{metric.unit}
                      </div>
                      <div className="flex-1">
                        <Progress
                          value={metric.benchmarkComparison === 'above' ? 100 :
                                metric.benchmarkComparison === 'at' ? 75 :
                                Math.min(metric.value, 50)}
                          className="h-2"
                          indicatorClassName={
                            metric.benchmarkComparison === 'above' ? 'bg-green-500' :
                            metric.benchmarkComparison === 'at' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      {metric.description}
                    </p>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}