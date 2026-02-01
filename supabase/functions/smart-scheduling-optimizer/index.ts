import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizationRequest {
  timelineItems: Array<{
    id: string;
    title: string;
    start_time: string;
    duration_minutes: number;
    attention_type?: string;
    priority?: number;
    is_non_negotiable?: boolean;
  }>;
  targetDate: string;
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
  constraints?: {
    preserveNonNegotiables?: boolean;
    maintainMeetingTimes?: boolean;
    respectBufferTimes?: boolean;
  };
}

interface SchedulingSuggestion {
  id: string;
  type: 'reschedule' | 'batch' | 'extend' | 'split' | 'delegate' | 'skip';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  estimatedBenefit: string;
  targetItems: string[];
  suggestedChanges: Array<{
    itemId: string;
    newStartTime?: string;
    newDuration?: number;
    newAttentionType?: string;
    reasoning: string;
  }>;
  metabolicCost: number;
  implementationComplexity: 'easy' | 'moderate' | 'complex';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const requestData: OptimizationRequest = await req.json();
    const { timelineItems, targetDate, optimizationLevel, constraints } = requestData;

    // Get user's attention preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_attention_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefsError || !preferences) {
      throw new Error('No attention preferences found');
    }

    // Generate optimization suggestions
    const suggestions = await generateOptimizationSuggestions(
      timelineItems,
      preferences,
      optimizationLevel,
      constraints
    );

    // Calculate optimization score
    const optimizationScore = calculateOptimizationScore(timelineItems, suggestions, preferences);

    // Store suggestions in database
    const { error: storageError } = await supabase
      .from('scheduling_suggestions')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (!storageError && suggestions.length > 0) {
      await supabase
        .from('scheduling_suggestions')
        .insert(
          suggestions.map(suggestion => ({
            user_id: user.id,
            suggestion_type: suggestion.type,
            target_item_id: suggestion.targetItems[0] || null,
            reasoning: suggestion.description,
            confidence_score: suggestion.confidence,
            potential_benefit: suggestion.estimatedBenefit,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h expiry
          }))
        );
    }

    return new Response(
      JSON.stringify({
        suggestions,
        optimizationScore,
        summary: {
          totalSuggestions: suggestions.length,
          highImpactSuggestions: suggestions.filter(s => s.impact === 'high' || s.impact === 'critical').length,
          averageConfidence: suggestions.length > 0 ?
            suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length : 0,
          estimatedTimeSaved: suggestions.reduce((sum, s) => sum + (s.metabolicCost || 0), 0),
          implementationEffort: calculateImplementationEffort(suggestions)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in smart scheduling optimizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function generateOptimizationSuggestions(
  items: OptimizationRequest['timelineItems'],
  preferences: any,
  level: OptimizationRequest['optimizationLevel'],
  constraints: OptimizationRequest['constraints'] = {}
): Promise<SchedulingSuggestion[]> {
  const suggestions: SchedulingSuggestion[] = [];

  // Sort items by start time
  const sortedItems = [...items].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // 1. Context Switching Optimization
  const contextSwitchSuggestions = analyzeContextSwitchOptimization(sortedItems, level);
  suggestions.push(...contextSwitchSuggestions);

  // 2. Peak Hours Optimization
  const peakHoursSuggestions = analyzePeakHoursOptimization(sortedItems, preferences, level);
  suggestions.push(...peakHoursSuggestions);

  // 3. Batching Opportunities
  const batchingSuggestions = analyzeBatchingOpportunities(sortedItems, level);
  suggestions.push(...batchingSuggestions);

  // 4. Duration Optimization
  const durationSuggestions = analyzeDurationOptimization(sortedItems, preferences, level);
  suggestions.push(...durationSuggestions);

  // 5. Energy Alignment
  const energySuggestions = analyzeEnergyAlignment(sortedItems, preferences, level);
  suggestions.push(...energySuggestions);

  // 6. Buffer Time Optimization
  const bufferSuggestions = analyzeBufferTimeOptimization(sortedItems, level);
  suggestions.push(...bufferSuggestions);

  // Filter and rank suggestions based on optimization level and constraints
  return filterAndRankSuggestions(suggestions, level, constraints);
}

function analyzeContextSwitchOptimization(
  items: OptimizationRequest['timelineItems'],
  level: OptimizationRequest['optimizationLevel']
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];
  const contextSwitches: Array<{ from: any; to: any; cost: number }> = [];

  // Identify expensive context switches
  for (let i = 1; i < items.length; i++) {
    const prevItem = items[i - 1];
    const currentItem = items[i];

    if (prevItem.attention_type && currentItem.attention_type &&
        prevItem.attention_type !== currentItem.attention_type) {
      const cost = calculateContextSwitchCost(prevItem.attention_type, currentItem.attention_type);

      if (cost >= (level === 'aggressive' ? 4 : level === 'balanced' ? 5 : 6)) {
        contextSwitches.push({ from: prevItem, to: currentItem, cost });
      }
    }
  }

  if (contextSwitches.length > 0) {
    // Group similar attention types for batching
    const attentionGroups = groupItemsByAttentionType(items);

    Object.entries(attentionGroups).forEach(([type, typeItems]) => {
      if (typeItems.length >= 2) {
        const scatteredness = calculateScatteredness(typeItems);

        if (scatteredness.totalGap > 60) { // More than 1 hour total gaps
          suggestions.push({
            id: `batch-${type}`,
            type: 'batch',
            title: `Batch ${type} activities`,
            description: `Group ${typeItems.length} ${type} tasks to reduce context switching (${scatteredness.totalGap}m total gaps)`,
            impact: typeItems.length >= 3 ? 'high' : 'medium',
            confidence: Math.min(0.9, scatteredness.totalGap / 240), // Higher confidence for more scattered tasks
            estimatedBenefit: `Reduce cognitive switching cost by ~${Math.round(contextSwitches.length * 2.5)} points, save ${Math.round(scatteredness.totalGap * 0.1)}m transition time`,
            targetItems: typeItems.map(item => item.id),
            suggestedChanges: generateBatchingChanges(typeItems),
            metabolicCost: Math.round(scatteredness.totalGap * 0.2),
            implementationComplexity: typeItems.length > 3 ? 'complex' : 'moderate'
          });
        }
      }
    });
  }

  return suggestions;
}

function analyzePeakHoursOptimization(
  items: OptimizationRequest['timelineItems'],
  preferences: any,
  level: OptimizationRequest['optimizationLevel']
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  if (!preferences.peak_hours_start || !preferences.peak_hours_end) {
    return suggestions;
  }

  const peakStart = parseInt(preferences.peak_hours_start.split(':')[0]);
  const peakEnd = parseInt(preferences.peak_hours_end.split(':')[0]);

  // Find high-attention work outside peak hours
  const misplacedHighAttentionWork = items.filter(item => {
    const itemHour = new Date(item.start_time).getHours();
    const isHighAttention = ['create', 'decide'].includes(item.attention_type || '');
    const isOutsidePeak = itemHour < peakStart || itemHour >= peakEnd;
    return isHighAttention && isOutsidePeak && !item.is_non_negotiable;
  });

  // Find low-attention work in peak hours
  const misplacedLowAttentionWork = items.filter(item => {
    const itemHour = new Date(item.start_time).getHours();
    const isLowAttention = ['connect', 'recover'].includes(item.attention_type || '');
    const isInPeak = itemHour >= peakStart && itemHour < peakEnd;
    return isLowAttention && isInPeak;
  });

  if (misplacedHighAttentionWork.length > 0) {
    const potentialImprovement = misplacedHighAttentionWork.length * 0.3; // 30% improvement estimate

    suggestions.push({
      id: 'optimize-peak-hours-high-attention',
      type: 'reschedule',
      title: 'Move high-attention work to peak hours',
      description: `${misplacedHighAttentionWork.length} Create/Decide tasks scheduled outside peak hours (${peakStart}:00-${peakEnd}:00)`,
      impact: misplacedHighAttentionWork.length >= 3 ? 'high' : 'medium',
      confidence: 0.85,
      estimatedBenefit: `Improve focus effectiveness by 25-40% for moved tasks`,
      targetItems: misplacedHighAttentionWork.map(item => item.id),
      suggestedChanges: generatePeakHoursOptimization(misplacedHighAttentionWork, peakStart, peakEnd),
      metabolicCost: misplacedHighAttentionWork.length * 5,
      implementationComplexity: misplacedHighAttentionWork.length > 2 ? 'moderate' : 'easy'
    });
  }

  if (misplacedLowAttentionWork.length > 0 && level !== 'conservative') {
    suggestions.push({
      id: 'free-up-peak-hours',
      type: 'reschedule',
      title: 'Free up peak hours for focused work',
      description: `${misplacedLowAttentionWork.length} Connect/Recover tasks could be moved from peak hours`,
      impact: 'medium',
      confidence: 0.7,
      estimatedBenefit: `Create ${misplacedLowAttentionWork.reduce((sum, item) => sum + item.duration_minutes, 0)}m of peak-hour capacity`,
      targetItems: misplacedLowAttentionWork.map(item => item.id),
      suggestedChanges: generatePeakHoursFreeing(misplacedLowAttentionWork, peakStart, peakEnd),
      metabolicCost: misplacedLowAttentionWork.length * 3,
      implementationComplexity: 'easy'
    });
  }

  return suggestions;
}

function analyzeBatchingOpportunities(
  items: OptimizationRequest['timelineItems'],
  level: OptimizationRequest['optimizationLevel']
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Look for similar tasks that could be batched
  const taskGroups = groupSimilarTasks(items);

  Object.entries(taskGroups).forEach(([groupKey, groupItems]) => {
    if (groupItems.length >= 2) {
      const totalDuration = groupItems.reduce((sum, item) => sum + item.duration_minutes, 0);
      const scatterAnalysis = calculateScatteredness(groupItems);

      if (scatterAnalysis.isScattered) {
        suggestions.push({
          id: `batch-similar-${groupKey}`,
          type: 'batch',
          title: `Batch similar ${groupKey} tasks`,
          description: `${groupItems.length} similar tasks scattered across the day (avg gap: ${Math.round(scatterAnalysis.averageGap)}m)`,
          impact: groupItems.length >= 4 ? 'high' : 'medium',
          confidence: Math.min(0.8, scatterAnalysis.totalGap / 180),
          estimatedBenefit: `Save ~${Math.round(scatterAnalysis.totalGap * 0.15)}m in setup/transition time`,
          targetItems: groupItems.map(item => item.id),
          suggestedChanges: generateSimilarTaskBatching(groupItems),
          metabolicCost: Math.round(totalDuration * 0.1),
          implementationComplexity: groupItems.length > 3 ? 'moderate' : 'easy'
        });
      }
    }
  });

  return suggestions;
}

function analyzeDurationOptimization(
  items: OptimizationRequest['timelineItems'],
  preferences: any,
  level: OptimizationRequest['optimizationLevel']
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Find tasks that could benefit from duration adjustment
  const shortCreateTasks = items.filter(item =>
    item.attention_type === 'create' &&
    item.duration_minutes < 90 &&
    !item.is_non_negotiable
  );

  const longConnectTasks = items.filter(item =>
    item.attention_type === 'connect' &&
    item.duration_minutes > 60
  );

  if (shortCreateTasks.length > 0 && preferences.current_role === 'maker') {
    suggestions.push({
      id: 'extend-create-blocks',
      type: 'extend',
      title: 'Extend creative work blocks',
      description: `${shortCreateTasks.length} Create tasks under 90min could benefit from extension`,
      impact: 'medium',
      confidence: 0.75,
      estimatedBenefit: `Achieve deeper focus states and reduce startup overhead`,
      targetItems: shortCreateTasks.map(item => item.id),
      suggestedChanges: shortCreateTasks.map(item => ({
        itemId: item.id,
        newDuration: Math.max(90, item.duration_minutes + 30),
        reasoning: 'Extended to minimum effective focus block duration'
      })),
      metabolicCost: shortCreateTasks.length * 8,
      implementationComplexity: 'moderate'
    });
  }

  if (longConnectTasks.length > 0 && level === 'aggressive') {
    suggestions.push({
      id: 'split-long-meetings',
      type: 'split',
      title: 'Split long connection blocks',
      description: `${longConnectTasks.length} Connect tasks over 60min could be more effective if split`,
      impact: 'low',
      confidence: 0.6,
      estimatedBenefit: `Improve attention quality and create scheduling flexibility`,
      targetItems: longConnectTasks.map(item => item.id),
      suggestedChanges: generateSplittingSuggestions(longConnectTasks),
      metabolicCost: longConnectTasks.length * 6,
      implementationComplexity: 'complex'
    });
  }

  return suggestions;
}

function analyzeEnergyAlignment(
  items: OptimizationRequest['timelineItems'],
  preferences: any,
  level: OptimizationRequest['optimizationLevel']
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Simple energy model - high energy in morning, low in late afternoon
  const energyMismatches = items.filter(item => {
    const hour = new Date(item.start_time).getHours();
    const isHighEnergyTask = ['create', 'decide'].includes(item.attention_type || '');
    const isLowEnergyTime = hour < 8 || hour > 16;
    const isHighEnergyTime = hour >= 9 && hour <= 12;

    const isLowEnergyTask = ['recover', 'review'].includes(item.attention_type || '');

    return (isHighEnergyTask && isLowEnergyTime) || (isLowEnergyTask && isHighEnergyTime);
  });

  if (energyMismatches.length > 0) {
    suggestions.push({
      id: 'align-energy-tasks',
      type: 'reschedule',
      title: 'Align tasks with energy patterns',
      description: `${energyMismatches.length} tasks could be better aligned with natural energy cycles`,
      impact: 'medium',
      confidence: 0.7,
      estimatedBenefit: `Improve task quality and reduce fatigue`,
      targetItems: energyMismatches.map(item => item.id),
      suggestedChanges: generateEnergyOptimization(energyMismatches),
      metabolicCost: energyMismatches.length * 4,
      implementationComplexity: 'easy'
    });
  }

  return suggestions;
}

function analyzeBufferTimeOptimization(
  items: OptimizationRequest['timelineItems'],
  level: OptimizationRequest['optimizationLevel']
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Find back-to-back tasks that need buffer time
  const needsBuffer: Array<{ before: any; after: any; gap: number }> = [];

  for (let i = 1; i < items.length; i++) {
    const prevItem = items[i - 1];
    const currentItem = items[i];

    const prevEnd = new Date(prevItem.start_time);
    prevEnd.setMinutes(prevEnd.getMinutes() + prevItem.duration_minutes);

    const gap = (new Date(currentItem.start_time).getTime() - prevEnd.getTime()) / (1000 * 60);

    const needsBufferForTypes =
      (prevItem.attention_type === 'create' && gap < 15) ||
      (currentItem.attention_type === 'create' && gap < 15) ||
      (prevItem.attention_type !== currentItem.attention_type && gap < 10);

    if (needsBufferForTypes) {
      needsBuffer.push({ before: prevItem, after: currentItem, gap });
    }
  }

  if (needsBuffer.length > 0) {
    suggestions.push({
      id: 'add-buffer-times',
      type: 'reschedule',
      title: 'Add buffer time between tasks',
      description: `${needsBuffer.length} task transitions need buffer time to prevent cognitive overload`,
      impact: 'medium',
      confidence: 0.8,
      estimatedBenefit: `Reduce transition stress and improve task quality`,
      targetItems: needsBuffer.map(nb => nb.after.id),
      suggestedChanges: generateBufferTimeChanges(needsBuffer),
      metabolicCost: needsBuffer.length * 3,
      implementationComplexity: 'easy'
    });
  }

  return suggestions;
}

// Helper functions

function calculateContextSwitchCost(fromType: string, toType: string): number {
  const costMatrix: Record<string, number> = {
    'create-connect': 8,
    'connect-create': 7,
    'decide-create': 6,
    'create-decide': 5,
    'review-create': 4,
    'create-review': 3
  };

  const key = `${fromType}-${toType}`;
  return costMatrix[key] || 2;
}

function groupItemsByAttentionType(items: OptimizationRequest['timelineItems']) {
  const groups: Record<string, any[]> = {};

  items.forEach(item => {
    if (item.attention_type) {
      if (!groups[item.attention_type]) {
        groups[item.attention_type] = [];
      }
      groups[item.attention_type].push(item);
    }
  });

  return groups;
}

function groupSimilarTasks(items: OptimizationRequest['timelineItems']) {
  const groups: Record<string, any[]> = {};

  items.forEach(item => {
    // Group by attention type and similar keywords in title
    const keywords = extractKeywords(item.title);
    const groupKey = `${item.attention_type}-${keywords.join('-')}`;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
  });

  return groups;
}

function extractKeywords(title: string): string[] {
  // Simple keyword extraction - in practice would use more sophisticated NLP
  const commonWords = ['meeting', 'review', 'call', 'write', 'plan', 'design', 'code'];
  const words = title.toLowerCase().split(/\W+/);
  return words.filter(word => commonWords.includes(word)).slice(0, 2);
}

function calculateScatteredness(items: any[]) {
  const sortedItems = [...items].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  let totalGap = 0;
  const gaps: number[] = [];

  for (let i = 1; i < sortedItems.length; i++) {
    const prevEnd = new Date(sortedItems[i-1].start_time);
    prevEnd.setMinutes(prevEnd.getMinutes() + sortedItems[i-1].duration_minutes);

    const currentStart = new Date(sortedItems[i].start_time);
    const gap = Math.max(0, (currentStart.getTime() - prevEnd.getTime()) / (1000 * 60));

    gaps.push(gap);
    totalGap += gap;
  }

  const averageGap = totalGap / Math.max(1, gaps.length);
  const isScattered = averageGap > 90; // More than 1.5 hours average gap

  return {
    totalGap,
    averageGap,
    isScattered,
    gaps
  };
}

function generateBatchingChanges(items: any[]) {
  const startTime = findOptimalBatchingTime(items);
  let currentTime = new Date(startTime);

  return items.map(item => {
    const change = {
      itemId: item.id,
      newStartTime: currentTime.toISOString(),
      reasoning: `Batched with similar ${item.attention_type} tasks to reduce context switching`
    };

    currentTime.setMinutes(currentTime.getMinutes() + item.duration_minutes + 10); // 10min buffer
    return change;
  });
}

function generatePeakHoursOptimization(items: any[], peakStart: number, peakEnd: number) {
  return items.map((item, index) => {
    const optimalHour = peakStart + (index % (peakEnd - peakStart));
    const newTime = new Date(item.start_time);
    newTime.setHours(optimalHour, 0, 0, 0);

    return {
      itemId: item.id,
      newStartTime: newTime.toISOString(),
      reasoning: `Moved to peak attention hours for optimal ${item.attention_type} performance`
    };
  });
}

function generatePeakHoursFreeing(items: any[], peakStart: number, peakEnd: number) {
  return items.map(item => {
    const newHour = new Date(item.start_time).getHours() < peakStart ?
      peakStart - 2 : peakEnd + 1;
    const newTime = new Date(item.start_time);
    newTime.setHours(newHour);

    return {
      itemId: item.id,
      newStartTime: newTime.toISOString(),
      reasoning: `Moved from peak hours to free up capacity for high-attention work`
    };
  });
}

function generateSimilarTaskBatching(items: any[]) {
  return generateBatchingChanges(items);
}

function generateSplittingSuggestions(items: any[]) {
  return items.flatMap(item => {
    const splitDuration = Math.floor(item.duration_minutes / 2);
    const secondPartTime = new Date(item.start_time);
    secondPartTime.setMinutes(secondPartTime.getMinutes() + splitDuration + 30); // 30min break

    return [
      {
        itemId: item.id,
        newDuration: splitDuration,
        reasoning: 'Split into focused segments with break for better engagement'
      },
      {
        itemId: `${item.id}-part2`,
        newStartTime: secondPartTime.toISOString(),
        newDuration: item.duration_minutes - splitDuration,
        reasoning: 'Second part of split session with recovery break'
      }
    ];
  });
}

function generateEnergyOptimization(items: any[]) {
  return items.map(item => {
    const currentHour = new Date(item.start_time).getHours();
    let optimalHour: number;

    switch (item.attention_type) {
      case 'create':
        optimalHour = 9;
        break;
      case 'decide':
        optimalHour = 10;
        break;
      case 'review':
        optimalHour = 14;
        break;
      case 'recover':
        optimalHour = 15;
        break;
      default:
        optimalHour = 11;
    }

    const newTime = new Date(item.start_time);
    newTime.setHours(optimalHour);

    return {
      itemId: item.id,
      newStartTime: newTime.toISOString(),
      reasoning: `Moved to optimal energy time for ${item.attention_type} work`
    };
  });
}

function generateBufferTimeChanges(needsBuffer: Array<{ before: any; after: any; gap: number }>) {
  return needsBuffer.map(nb => {
    const bufferTime = nb.before.attention_type === 'create' || nb.after.attention_type === 'create' ? 15 : 10;
    const adjustment = bufferTime - nb.gap;

    const newTime = new Date(nb.after.start_time);
    newTime.setMinutes(newTime.getMinutes() + adjustment);

    return {
      itemId: nb.after.id,
      newStartTime: newTime.toISOString(),
      reasoning: `Added ${adjustment}m buffer to reduce context switching stress`
    };
  });
}

function findOptimalBatchingTime(items: any[]): string {
  // Find the earliest reasonable time for batching these items
  const firstItem = items.reduce((earliest, item) =>
    new Date(item.start_time) < new Date(earliest.start_time) ? item : earliest
  );

  return firstItem.start_time;
}

function filterAndRankSuggestions(
  suggestions: SchedulingSuggestion[],
  level: OptimizationRequest['optimizationLevel'],
  constraints: OptimizationRequest['constraints'] = {}
): SchedulingSuggestion[] {
  // Filter based on optimization level
  let filtered = suggestions;

  if (level === 'conservative') {
    filtered = suggestions.filter(s =>
      s.implementationComplexity !== 'complex' &&
      s.confidence >= 0.7
    );
  } else if (level === 'balanced') {
    filtered = suggestions.filter(s => s.confidence >= 0.6);
  }

  // Apply constraints
  if (constraints.preserveNonNegotiables) {
    // Remove suggestions that affect non-negotiable items
    filtered = filtered.filter(s =>
      !s.targetItems.some(id => id.includes('non-negotiable'))
    );
  }

  // Rank by impact * confidence
  return filtered
    .sort((a, b) => {
      const aScore = getImpactScore(a.impact) * a.confidence;
      const bScore = getImpactScore(b.impact) * b.confidence;
      return bScore - aScore;
    })
    .slice(0, 10); // Return top 10 suggestions
}

function getImpactScore(impact: SchedulingSuggestion['impact']): number {
  const scores = { low: 1, medium: 2, high: 3, critical: 4 };
  return scores[impact];
}

function calculateOptimizationScore(
  items: OptimizationRequest['timelineItems'],
  suggestions: SchedulingSuggestion[],
  preferences: any
): number {
  let score = 100;

  // Penalize for context switches
  let contextSwitches = 0;
  for (let i = 1; i < items.length; i++) {
    if (items[i - 1].attention_type !== items[i].attention_type) {
      contextSwitches++;
    }
  }
  score -= contextSwitches * 3;

  // Penalize for peak hours misuse
  const peakHoursMisuse = items.filter(item => {
    const hour = new Date(item.start_time).getHours();
    const peakStart = preferences.peak_hours_start ? parseInt(preferences.peak_hours_start.split(':')[0]) : 9;
    const peakEnd = preferences.peak_hours_end ? parseInt(preferences.peak_hours_end.split(':')[0]) : 12;

    const isHighAttention = ['create', 'decide'].includes(item.attention_type || '');
    const isInPeak = hour >= peakStart && hour < peakEnd;

    return (isHighAttention && !isInPeak) || (!isHighAttention && isInPeak);
  });
  score -= peakHoursMisuse.length * 5;

  // Bonus for well-optimized areas
  const highImpactSuggestions = suggestions.filter(s => s.impact === 'high' || s.impact === 'critical');
  if (highImpactSuggestions.length === 0) score += 20;

  return Math.max(0, Math.min(100, score));
}

function calculateImplementationEffort(suggestions: SchedulingSuggestion[]): string {
  const complexityScores = { easy: 1, moderate: 2, complex: 3 };
  const totalComplexity = suggestions.reduce((sum, s) => sum + complexityScores[s.implementationComplexity], 0);
  const averageComplexity = totalComplexity / Math.max(1, suggestions.length);

  if (averageComplexity <= 1.5) return 'Low';
  if (averageComplexity <= 2.5) return 'Medium';
  return 'High';
}