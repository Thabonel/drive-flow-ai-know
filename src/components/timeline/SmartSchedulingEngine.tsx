import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Brain,
  Lightbulb,
  Calendar,
  Clock,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Sparkles,
  Timer,
  Shuffle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { TimelineItem } from '@/lib/timelineUtils';
import { AttentionType, ATTENTION_TYPE_DESCRIPTIONS, ROLE_MODES } from '@/lib/attentionTypes';
import { useAdvancedAttentionBudget } from '@/hooks/useAdvancedAttentionBudget';

interface OptimizationSuggestion {
  id: string;
  type: 'reschedule' | 'batch' | 'extend' | 'split' | 'delegate' | 'skip';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  estimatedBenefit: string;
  targetItems: string[];
  suggestedChanges: {
    itemId: string;
    newStartTime?: string;
    newDuration?: number;
    newAttentionType?: AttentionType;
    reasoning: string;
  }[];
  metabolicCost: number;
  implementationComplexity: 'easy' | 'moderate' | 'complex';
}

interface SchedulingOpportunity {
  timeSlot: {
    start: string;
    end: string;
    duration: number;
  };
  suitableFor: AttentionType[];
  energyLevel: 'high' | 'medium' | 'low';
  conflictRisk: number;
  peakHoursBonus: boolean;
  utilizationScore: number;
}

interface OptimizationResult {
  originalScore: number;
  optimizedScore: number;
  improvement: number;
  appliedSuggestions: OptimizationSuggestion[];
  timesSaved: number;
  energyEfficiencyGain: number;
  contextSwitchReduction: number;
}

interface SmartSchedulingEngineProps {
  items: TimelineItem[];
  selectedDate?: Date;
  className?: string;
  onApplyOptimization?: (suggestions: OptimizationSuggestion[]) => void;
  onPreviewChanges?: (changes: any[]) => void;
}

export function SmartSchedulingEngine({
  items,
  selectedDate = new Date(),
  className,
  onApplyOptimization,
  onPreviewChanges
}: SmartSchedulingEngineProps) {
  const {
    preferences,
    generateSmartSuggestions,
    schedulingSuggestions,
    getOptimalSchedulingTimes,
    getPredictiveBudgetForecast
  } = useAdvancedAttentionBudget();

  const [optimizationLevel, setOptimizationLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [opportunities, setOpportunities] = useState<SchedulingOpportunity[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('suggestions');

  // Filter items for selected date
  const dayItems = useMemo(() => {
    const targetDate = selectedDate.toDateString();
    return items
      .filter(item => {
        const itemDate = new Date(item.start_time).toDateString();
        return itemDate === targetDate;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [items, selectedDate]);

  // Generate optimization suggestions when items change
  useEffect(() => {
    generateOptimizationSuggestions();
  }, [dayItems, preferences, optimizationLevel]);

  // Identify scheduling opportunities
  useEffect(() => {
    identifySchedulingOpportunities();
  }, [dayItems, preferences]);

  const generateOptimizationSuggestions = async () => {
    if (!preferences || dayItems.length === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const generatedSuggestions = await analyzeScheduleOptimizations();
      setSuggestions(generatedSuggestions);
    } catch (error) {
      console.error('Error generating optimization suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeScheduleOptimizations = async (): Promise<OptimizationSuggestion[]> => {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze context switching opportunities
    const contextSwitchSuggestions = analyzeContextSwitching();
    suggestions.push(...contextSwitchSuggestions);

    // Analyze peak hours optimization
    const peakHoursSuggestions = analyzePeakHoursOptimization();
    suggestions.push(...peakHoursSuggestions);

    // Analyze batching opportunities
    const batchingSuggestions = analyzeBatchingOpportunities();
    suggestions.push(...batchingSuggestions);

    // Analyze energy optimization
    const energySuggestions = analyzeEnergyOptimization();
    suggestions.push(...energySuggestions);

    // Sort by impact and confidence
    return suggestions.sort((a, b) => {
      const aScore = getImpactScore(a.impact) * a.confidence;
      const bScore = getImpactScore(b.impact) * b.confidence;
      return bScore - aScore;
    });
  };

  const analyzeContextSwitching = (): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const switches: { from: TimelineItem; to: TimelineItem; cost: number }[] = [];

    // Identify expensive context switches
    for (let i = 1; i < dayItems.length; i++) {
      const prevItem = dayItems[i - 1];
      const currentItem = dayItems[i];

      if (prevItem.attention_type !== currentItem.attention_type) {
        const cost = calculateSwitchCost(
          prevItem.attention_type as AttentionType,
          currentItem.attention_type as AttentionType
        );

        if (cost > 5) {
          switches.push({ from: prevItem, to: currentItem, cost });
        }
      }
    }

    // Generate batching suggestions for expensive switches
    if (switches.length > 0) {
      const groupableTypes = findGroupableTypes();

      Object.entries(groupableTypes).forEach(([type, items]) => {
        if (items.length >= 2) {
          suggestions.push({
            id: `batch-${type}`,
            type: 'batch',
            title: `Batch ${type} activities`,
            description: `Group ${items.length} ${type} tasks together to reduce context switching`,
            impact: items.length >= 3 ? 'high' : 'medium',
            confidence: 0.85,
            estimatedBenefit: `Reduce cognitive switching cost by ~${Math.round(switches.length * 2.5)} points`,
            targetItems: items.map(item => item.id),
            suggestedChanges: generateBatchingChanges(items),
            metabolicCost: 15, // Cost to implement
            implementationComplexity: 'moderate'
          });
        }
      });
    }

    return suggestions;
  };

  const analyzePeakHoursOptimization = (): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    if (!preferences?.peak_hours_start || !preferences?.peak_hours_end) return suggestions;

    const peakStart = parseInt(preferences.peak_hours_start.split(':')[0]);
    const peakEnd = parseInt(preferences.peak_hours_end.split(':')[0]);

    const highAttentionOutsidePeak = dayItems.filter(item => {
      const itemHour = new Date(item.start_time).getHours();
      const isHighAttention = ['create', 'decide'].includes(item.attention_type || '');
      const isOutsidePeak = itemHour < peakStart || itemHour >= peakEnd;
      return isHighAttention && isOutsidePeak;
    });

    if (highAttentionOutsidePeak.length > 0) {
      const availablePeakSlots = findAvailableTimeSlots(
        peakStart,
        peakEnd,
        highAttentionOutsidePeak.reduce((sum, item) => sum + (item.duration_minutes || 0), 0)
      );

      if (availablePeakSlots.length > 0) {
        suggestions.push({
          id: 'optimize-peak-hours',
          type: 'reschedule',
          title: 'Optimize for peak attention hours',
          description: `Move ${highAttentionOutsidePeak.length} high-attention tasks to peak hours`,
          impact: 'high',
          confidence: 0.9,
          estimatedBenefit: `Improve focus effectiveness by 25-40%`,
          targetItems: highAttentionOutsidePeak.map(item => item.id),
          suggestedChanges: generatePeakHoursChanges(highAttentionOutsidePeak, availablePeakSlots),
          metabolicCost: 20,
          implementationComplexity: 'moderate'
        });
      }
    }

    return suggestions;
  };

  const analyzeBatchingOpportunities = (): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for scattered similar tasks
    const tasksByType = groupItemsByAttentionType();

    Object.entries(tasksByType).forEach(([type, tasks]) => {
      if (tasks.length >= 3) {
        const scatterAnalysis = analyzeScattering(tasks);

        if (scatterAnalysis.isScattered) {
          suggestions.push({
            id: `batch-scattered-${type}`,
            type: 'batch',
            title: `Consolidate scattered ${type} work`,
            description: `${tasks.length} ${type} tasks are scattered throughout the day`,
            impact: scatterAnalysis.severity,
            confidence: 0.8,
            estimatedBenefit: `Save ~${scatterAnalysis.potentialTimeSaved}m in transition time`,
            targetItems: tasks.map(task => task.id),
            suggestedChanges: generateConsolidationChanges(tasks),
            metabolicCost: 25,
            implementationComplexity: 'complex'
          });
        }
      }
    });

    return suggestions;
  };

  const analyzeEnergyOptimization = (): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for energy mismatches (high-energy work at low-energy times)
    const energyMismatches = identifyEnergyMismatches();

    if (energyMismatches.length > 0) {
      suggestions.push({
        id: 'optimize-energy-alignment',
        type: 'reschedule',
        title: 'Align tasks with energy levels',
        description: `${energyMismatches.length} tasks could be better aligned with natural energy patterns`,
        impact: 'medium',
        confidence: 0.75,
        estimatedBenefit: `Improve task completion quality and reduce fatigue`,
        targetItems: energyMismatches.map(item => item.id),
        suggestedChanges: generateEnergyOptimizationChanges(energyMismatches),
        metabolicCost: 18,
        implementationComplexity: 'easy'
      });
    }

    return suggestions;
  };

  const identifySchedulingOpportunities = () => {
    const opportunities: SchedulingOpportunity[] = [];
    const workingHours = { start: 8, end: 18 }; // 8 AM to 6 PM

    // Find gaps in the schedule
    const gaps = findScheduleGaps();

    gaps.forEach(gap => {
      if (gap.duration >= 30) { // Minimum 30 minutes
        const gapStart = new Date(gap.start);
        const gapHour = gapStart.getHours();

        // Determine energy level based on time
        let energyLevel: 'high' | 'medium' | 'low' = 'medium';
        if (preferences?.peak_hours_start && preferences?.peak_hours_end) {
          const peakStart = parseInt(preferences.peak_hours_start.split(':')[0]);
          const peakEnd = parseInt(preferences.peak_hours_end.split(':')[0]);

          if (gapHour >= peakStart && gapHour < peakEnd) {
            energyLevel = 'high';
          } else if (gapHour < 9 || gapHour > 16) {
            energyLevel = 'low';
          }
        }

        // Determine suitable attention types
        const suitableFor: AttentionType[] = [];
        if (energyLevel === 'high') {
          suitableFor.push('create', 'decide');
        }
        if (gap.duration >= 60) {
          suitableFor.push('review');
        }
        suitableFor.push('connect', 'recover');

        opportunities.push({
          timeSlot: gap,
          suitableFor,
          energyLevel,
          conflictRisk: calculateConflictRisk(gap),
          peakHoursBonus: energyLevel === 'high',
          utilizationScore: calculateUtilizationScore(gap, energyLevel)
        });
      }
    });

    setOpportunities(opportunities.sort((a, b) => b.utilizationScore - a.utilizationScore));
  };

  // Helper functions
  const calculateSwitchCost = (fromType: AttentionType, toType: AttentionType): number => {
    const costMatrix = {
      'create-connect': 8,
      'connect-create': 7,
      'decide-create': 6,
      'create-decide': 5,
      'review-create': 4,
      'create-review': 3
    };

    const key = `${fromType}-${toType}`;
    return costMatrix[key as keyof typeof costMatrix] || 2;
  };

  const findGroupableTypes = () => {
    const groups: Record<string, TimelineItem[]> = {};

    dayItems.forEach(item => {
      if (item.attention_type) {
        if (!groups[item.attention_type]) {
          groups[item.attention_type] = [];
        }
        groups[item.attention_type].push(item);
      }
    });

    return groups;
  };

  const generateBatchingChanges = (items: TimelineItem[]) => {
    // Find optimal time slot for batching
    const totalDuration = items.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
    const optimalTime = findOptimalTimeSlot(totalDuration, items[0].attention_type as AttentionType);

    return items.map((item, index) => ({
      itemId: item.id,
      newStartTime: new Date(
        new Date(optimalTime).getTime() + (index * (item.duration_minutes || 0) * 60000)
      ).toISOString(),
      reasoning: `Batched with similar ${item.attention_type} tasks to reduce context switching`
    }));
  };

  const groupItemsByAttentionType = () => {
    const groups: Record<string, TimelineItem[]> = {};

    dayItems.forEach(item => {
      if (item.attention_type) {
        if (!groups[item.attention_type]) {
          groups[item.attention_type] = [];
        }
        groups[item.attention_type].push(item);
      }
    });

    return groups;
  };

  const analyzeScattering = (tasks: TimelineItem[]) => {
    // Calculate time gaps between similar tasks
    const sortedTasks = [...tasks].sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    let totalGap = 0;
    for (let i = 1; i < sortedTasks.length; i++) {
      const prevEnd = new Date(sortedTasks[i-1].start_time);
      prevEnd.setMinutes(prevEnd.getMinutes() + (sortedTasks[i-1].duration_minutes || 0));

      const currentStart = new Date(sortedTasks[i].start_time);
      const gap = (currentStart.getTime() - prevEnd.getTime()) / (1000 * 60);
      totalGap += Math.max(0, gap);
    }

    const averageGap = totalGap / Math.max(1, sortedTasks.length - 1);
    const isScattered = averageGap > 120; // More than 2 hours average gap

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (averageGap > 240) severity = 'high';
    else if (averageGap > 120) severity = 'medium';

    return {
      isScattered,
      severity,
      averageGap,
      totalGap,
      potentialTimeSaved: Math.round(totalGap * 0.1) // 10% of gap time could be saved
    };
  };

  const generateConsolidationChanges = (tasks: TimelineItem[]) => {
    const optimalStartTime = findOptimalConsolidationTime(tasks);
    let currentTime = new Date(optimalStartTime);

    return tasks.map(task => {
      const changes = {
        itemId: task.id,
        newStartTime: currentTime.toISOString(),
        reasoning: `Consolidated with other ${task.attention_type} tasks for better focus`
      };

      currentTime.setMinutes(currentTime.getMinutes() + (task.duration_minutes || 0) + 10); // 10min buffer
      return changes;
    });
  };

  const identifyEnergyMismatches = (): TimelineItem[] => {
    // This is a simplified version - in practice would use more sophisticated energy modeling
    return dayItems.filter(item => {
      const itemHour = new Date(item.start_time).getHours();
      const isHighEnergyTask = ['create', 'decide'].includes(item.attention_type || '');
      const isLowEnergyTime = itemHour < 8 || itemHour > 16;

      return isHighEnergyTask && isLowEnergyTime;
    });
  };

  const generateEnergyOptimizationChanges = (items: TimelineItem[]) => {
    return items.map(item => {
      const optimalTime = findOptimalEnergyTime(item.attention_type as AttentionType);
      return {
        itemId: item.id,
        newStartTime: optimalTime,
        reasoning: `Moved to optimal energy time for ${item.attention_type} work`
      };
    });
  };

  const findScheduleGaps = () => {
    const gaps: { start: string; end: string; duration: number }[] = [];

    for (let i = 0; i < dayItems.length - 1; i++) {
      const currentEnd = new Date(dayItems[i].start_time);
      currentEnd.setMinutes(currentEnd.getMinutes() + (dayItems[i].duration_minutes || 0));

      const nextStart = new Date(dayItems[i + 1].start_time);
      const gapDuration = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

      if (gapDuration > 15) { // Gaps larger than 15 minutes
        gaps.push({
          start: currentEnd.toISOString(),
          end: nextStart.toISOString(),
          duration: gapDuration
        });
      }
    }

    return gaps;
  };

  const findOptimalTimeSlot = (duration: number, attentionType: AttentionType): string => {
    // Find best available time slot for the given attention type
    if (preferences?.peak_hours_start && ['create', 'decide'].includes(attentionType)) {
      return `${selectedDate.toISOString().split('T')[0]}T${preferences.peak_hours_start}:00`;
    }

    return `${selectedDate.toISOString().split('T')[0]}T10:00:00`;
  };

  const findOptimalConsolidationTime = (tasks: TimelineItem[]): string => {
    // Find the best time to consolidate all tasks
    const attentionType = tasks[0].attention_type as AttentionType;
    return findOptimalTimeSlot(
      tasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0),
      attentionType
    );
  };

  const findOptimalEnergyTime = (attentionType: AttentionType): string => {
    const energyOptimalHours = {
      'create': 9,
      'decide': 10,
      'review': 14,
      'connect': 11,
      'recover': 15
    };

    const optimalHour = energyOptimalHours[attentionType] || 10;
    return `${selectedDate.toISOString().split('T')[0]}T${optimalHour.toString().padStart(2, '0')}:00:00`;
  };

  const calculateConflictRisk = (gap: { start: string; end: string; duration: number }): number => {
    // Calculate risk of scheduling conflicts - simplified implementation
    const gapHour = new Date(gap.start).getHours();

    // Higher risk during meeting-heavy hours
    if (gapHour >= 9 && gapHour <= 11) return 0.7;
    if (gapHour >= 14 && gapHour <= 16) return 0.6;

    return 0.3;
  };

  const calculateUtilizationScore = (
    gap: { start: string; end: string; duration: number },
    energyLevel: 'high' | 'medium' | 'low'
  ): number => {
    let score = gap.duration; // Base score on duration

    // Bonus for high energy times
    if (energyLevel === 'high') score += 30;
    else if (energyLevel === 'medium') score += 15;

    // Bonus for longer blocks
    if (gap.duration >= 120) score += 20;
    else if (gap.duration >= 60) score += 10;

    return score;
  };

  const findAvailableTimeSlots = (startHour: number, endHour: number, totalDuration: number) => {
    // Find available slots in peak hours - simplified implementation
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        start: `${selectedDate.toISOString().split('T')[0]}T${hour.toString().padStart(2, '0')}:00:00`,
        duration: 60
      });
    }
    return slots;
  };

  const generatePeakHoursChanges = (items: TimelineItem[], availableSlots: any[]) => {
    return items.map((item, index) => ({
      itemId: item.id,
      newStartTime: availableSlots[index % availableSlots.length]?.start || item.start_time,
      reasoning: 'Moved to peak attention hours for better focus and productivity'
    }));
  };

  const getImpactScore = (impact: OptimizationSuggestion['impact']): number => {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[impact];
  };

  const getImpactColor = (impact: OptimizationSuggestion['impact']) => {
    const colors = {
      low: 'text-blue-600 bg-blue-50 border-blue-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[impact];
  };

  const getComplexityIcon = (complexity: OptimizationSuggestion['implementationComplexity']) => {
    const icons = {
      easy: <CheckCircle className="h-4 w-4 text-green-500" />,
      moderate: <Clock className="h-4 w-4 text-yellow-500" />,
      complex: <AlertTriangle className="h-4 w-4 text-red-500" />
    };
    return icons[complexity];
  };

  const handleSuggestionToggle = (suggestionId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(suggestionId)) {
      newSelected.delete(suggestionId);
    } else {
      newSelected.add(suggestionId);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleApplySelected = () => {
    const selected = suggestions.filter(s => selectedSuggestions.has(s.id));
    if (onApplyOptimization) {
      onApplyOptimization(selected);
    }
  };

  const handlePreviewSelected = () => {
    const selected = suggestions.filter(s => selectedSuggestions.has(s.id));
    const changes = selected.flatMap(s => s.suggestedChanges);
    if (onPreviewChanges) {
      onPreviewChanges(changes);
    }
    setPreviewMode(true);
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Smart Scheduling Engine
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {suggestions.length} suggestions
              </Badge>
              <Select value={optimizationLevel} onValueChange={(value: any) => setOptimizationLevel(value)}>
                <SelectTrigger className="w-24 h-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateOptimizationSuggestions}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="suggestions" className="text-xs">
                Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 text-[10px] p-0">
                    {suggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="text-xs">
                Opportunities
                {opportunities.length > 0 && (
                  <Badge variant="outline" className="ml-1 h-4 w-4 text-[10px] p-0">
                    {opportunities.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Brain className="h-6 w-6 animate-pulse text-primary mr-2" />
                  <span className="text-sm">Analyzing optimization opportunities...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No optimization suggestions available
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your schedule is already well-optimized
                  </p>
                </div>
              ) : (
                <>
                  {/* Selection Controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {selectedSuggestions.size} of {suggestions.length} selected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewSelected}
                        disabled={selectedSuggestions.size === 0}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplySelected}
                        disabled={selectedSuggestions.size === 0}
                        className="text-xs"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Apply Selected
                      </Button>
                    </div>
                  </div>

                  {/* Suggestions List */}
                  <div className="space-y-3">
                    {suggestions.map(suggestion => (
                      <Card
                        key={suggestion.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedSuggestions.has(suggestion.id)
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleSuggestionToggle(suggestion.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.type}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getImpactColor(suggestion.impact)}`}
                                >
                                  {suggestion.impact} impact
                                </Badge>
                                <div className="flex items-center gap-1">
                                  {getComplexityIcon(suggestion.implementationComplexity)}
                                  <span className="text-xs text-muted-foreground">
                                    {suggestion.implementationComplexity}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-sm">{suggestion.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {suggestion.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-4">
                                  <span className="text-green-600">
                                    💡 {suggestion.estimatedBenefit}
                                  </span>
                                  <span className="text-muted-foreground">
                                    Confidence: {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {suggestion.targetItems.length} item{suggestion.targetItems.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="ml-4 flex items-center">
                              <Progress
                                value={suggestion.confidence * 100}
                                className="w-16 h-2"
                                indicatorClassName={
                                  suggestion.confidence >= 0.8 ? 'bg-green-500' :
                                  suggestion.confidence >= 0.6 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Opportunities Tab */}
            <TabsContent value="opportunities" className="space-y-4">
              {opportunities.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No scheduling opportunities available
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your schedule is fully optimized
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.map((opportunity, index) => (
                    <Card key={index} className="border border-green-200 bg-green-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">
                              {new Date(opportunity.timeSlot.start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} - {new Date(opportunity.timeSlot.end).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {opportunity.timeSlot.duration}m
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Energy Level:</span>
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                opportunity.energyLevel === 'high' ? 'bg-green-500' :
                                opportunity.energyLevel === 'medium' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} />
                              <span className="capitalize">{opportunity.energyLevel}</span>
                              {opportunity.peakHoursBonus && (
                                <Badge variant="secondary" className="text-[10px] h-4">
                                  Peak
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Suitable For:</span>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {opportunity.suitableFor.map(type => (
                                <Badge key={type} variant="outline" className="text-[10px] h-4">
                                  {ATTENTION_TYPE_DESCRIPTIONS[type]?.icon} {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <Progress
                            value={opportunity.utilizationScore}
                            className="h-1"
                            indicatorClassName="bg-green-500"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Utilization Score: {Math.round(opportunity.utilizationScore)}</span>
                            <span>Risk: {Math.round(opportunity.conflictRisk * 100)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Optimization Potential</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {suggestions.length > 0 ?
                      Math.round(suggestions.reduce((sum, s) => sum + getImpactScore(s.impact) * s.confidence, 0) / suggestions.length * 25) :
                      85
                    }%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Schedule optimization score
                  </p>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Time Savings</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {suggestions.reduce((sum, s) => sum + (s.metabolicCost || 0), 0) / 5}m
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Potential daily savings
                  </p>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Optimization Categories</h4>
                {['Context Switching', 'Peak Hours', 'Task Batching', 'Energy Alignment'].map((category, index) => {
                  const value = Math.random() * 100; // Placeholder data
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{category}</span>
                        <span>{Math.round(value)}%</span>
                      </div>
                      <Progress
                        value={value}
                        className="h-1"
                        indicatorClassName={
                          value >= 80 ? 'bg-green-500' :
                          value >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}