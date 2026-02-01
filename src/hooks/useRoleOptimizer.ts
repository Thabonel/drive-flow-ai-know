import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RoleOptimizer,
  createRoleOptimizer,
  RoleFitScore,
  OptimizationSuggestion,
} from '@/lib/roleOptimizer';
import { UserAttentionPreferences, TimelineItem } from '@/lib/timelineUtils';
import { useTimelineContext } from '@/contexts/TimelineContext';

interface UseRoleOptimizerOptions {
  targetDate?: Date;
  includeWeeklyAnalysis?: boolean;
  autoRefresh?: boolean;
}

interface RoleOptimizerResult {
  optimizer: RoleOptimizer | null;
  roleFitScore: RoleFitScore | null;
  dailySuggestions: OptimizationSuggestion[];
  weeklySuggestions: OptimizationSuggestion[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  applyOptimization: (suggestion: OptimizationSuggestion) => Promise<void>;
  findOptimalTimeSlot: (attentionType: string, durationMinutes: number) => { time: string; score: number; reasoning: string }[];
}

export function useRoleOptimizer(options: UseRoleOptimizerOptions = {}): RoleOptimizerResult {
  const {
    targetDate = new Date(),
    includeWeeklyAnalysis = true,
    autoRefresh = true,
  } = options;

  const { items, attentionPreferences, updateItem, addItem } = useTimelineContext();

  const [roleFitScore, setRoleFitScore] = useState<RoleFitScore | null>(null);
  const [dailySuggestions, setDailySuggestions] = useState<OptimizationSuggestion[]>([]);
  const [weeklySuggestions, setWeeklySuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create optimizer instance
  const optimizer = useMemo(() => {
    if (!attentionPreferences) return null;
    return createRoleOptimizer(attentionPreferences);
  }, [attentionPreferences]);

  // Calculate optimization data
  const refresh = useCallback(async () => {
    if (!optimizer || !attentionPreferences) {
      setRoleFitScore(null);
      setDailySuggestions([]);
      setWeeklySuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate role fit score
      let weekItems: TimelineItem[] = [];

      if (includeWeeklyAnalysis) {
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        weekItems = items.filter(item => {
          const itemDate = new Date(item.start_time);
          return itemDate >= weekStart && itemDate <= weekEnd;
        });

        const score = optimizer.calculateRoleFitScore(weekItems);
        setRoleFitScore(score);
      }

      // Generate daily suggestions
      const dailySuggestionsList = optimizer.generateOptimizationSuggestions(items, targetDate);
      setDailySuggestions(dailySuggestionsList);

      // Generate weekly suggestions if enabled
      if (includeWeeklyAnalysis && weekItems.length > 0) {
        const weeklySuggestionsList = optimizer.generateOptimizationSuggestions(weekItems);
        setWeeklySuggestions(weeklySuggestionsList);
      }
    } catch (err) {
      console.error('Error in role optimization:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [optimizer, attentionPreferences, items, targetDate, includeWeeklyAnalysis]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    if (autoRefresh) {
      refresh();
    }
  }, [refresh, autoRefresh]);

  // Apply optimization suggestion
  const applyOptimization = useCallback(async (suggestion: OptimizationSuggestion) => {
    if (!optimizer || !attentionPreferences) {
      throw new Error('Role optimizer not initialized');
    }

    try {
      switch (suggestion.type) {
        case 'reschedule':
          // Find optimal time slots for affected items
          for (const itemId of suggestion.itemIds) {
            const item = items.find(i => i.id === itemId);
            if (item && item.attention_type) {
              const optimalSlots = optimizer.findOptimalTimeSlot(
                item.attention_type,
                item.duration_minutes,
                targetDate,
                items.filter(i => i.id !== itemId)
              );

              if (optimalSlots.length > 0) {
                await updateItem(itemId, {
                  start_time: optimalSlots[0].time,
                });
              }
            }
          }
          break;

        case 'batch':
          // Group similar items into a single time block
          const itemsToGroup = items.filter(item => suggestion.itemIds.includes(item.id));
          if (itemsToGroup.length > 0 && itemsToGroup[0].attention_type) {
            const totalDuration = itemsToGroup.reduce((sum, item) => sum + item.duration_minutes, 0);

            // Find optimal time for the batched session
            const optimalSlots = optimizer.findOptimalTimeSlot(
              itemsToGroup[0].attention_type,
              totalDuration,
              targetDate,
              items.filter(item => !suggestion.itemIds.includes(item.id))
            );

            if (optimalSlots.length > 0) {
              // Create a new batched item
              const newItem = await addItem(
                itemsToGroup[0].layer_id,
                `Batched ${itemsToGroup[0].attention_type} Session`,
                optimalSlots[0].time,
                totalDuration,
                itemsToGroup[0].color,
                {
                  attention_type: itemsToGroup[0].attention_type,
                  priority: Math.max(...itemsToGroup.map(item => item.priority || 1)),
                  notes: `Batched items: ${itemsToGroup.map(item => item.title).join(', ')}`,
                  tags: Array.from(new Set(itemsToGroup.flatMap(item => item.tags || []))),
                }
              );

              // Remove original items if batching was successful
              if (newItem) {
                for (const item of itemsToGroup) {
                  await updateItem(item.id, { status: 'completed' });
                }
              }
            }
          }
          break;

        case 'split':
          // Split large items into smaller chunks with recovery time
          for (const itemId of suggestion.itemIds) {
            const item = items.find(i => i.id === itemId);
            if (item && item.duration_minutes > 120) { // Split items longer than 2 hours
              const chunks = Math.ceil(item.duration_minutes / 90); // 90-minute chunks
              const chunkDuration = Math.floor(item.duration_minutes / chunks);

              for (let i = 0; i < chunks; i++) {
                const chunkStart = new Date(item.start_time);
                chunkStart.setMinutes(chunkStart.getMinutes() + (i * (chunkDuration + 15))); // 15-min buffer

                await addItem(
                  item.layer_id,
                  `${item.title} (Part ${i + 1}/${chunks})`,
                  chunkStart.toISOString(),
                  chunkDuration,
                  item.color,
                  {
                    attention_type: item.attention_type,
                    priority: item.priority,
                    notes: `Split from: ${item.title}`,
                    tags: item.tags,
                  }
                );
              }

              // Remove original item
              await updateItem(itemId, { status: 'completed' });
            }
          }
          break;

        case 'protect':
          // Mark items as non-negotiable
          for (const itemId of suggestion.itemIds) {
            await updateItem(itemId, {
              is_non_negotiable: true,
            });
          }
          break;

        case 'merge':
          // Merge fragmented items of same type
          const itemsToMerge = items.filter(item => suggestion.itemIds.includes(item.id));
          if (itemsToMerge.length > 1) {
            const totalDuration = itemsToMerge.reduce((sum, item) => sum + item.duration_minutes, 0);
            const earliestStart = itemsToMerge.reduce((earliest, item) => {
              const itemStart = new Date(item.start_time);
              return itemStart < earliest ? itemStart : earliest;
            }, new Date(itemsToMerge[0].start_time));

            // Create merged item
            const newItem = await addItem(
              itemsToMerge[0].layer_id,
              `Merged ${itemsToMerge[0].attention_type} Session`,
              earliestStart.toISOString(),
              totalDuration,
              itemsToMerge[0].color,
              {
                attention_type: itemsToMerge[0].attention_type,
                priority: Math.max(...itemsToMerge.map(item => item.priority || 1)),
                notes: `Merged items: ${itemsToMerge.map(item => item.title).join(', ')}`,
                tags: Array.from(new Set(itemsToMerge.flatMap(item => item.tags || []))),
              }
            );

            // Remove original items if merging was successful
            if (newItem) {
              for (const item of itemsToMerge) {
                await updateItem(item.id, { status: 'completed' });
              }
            }
          }
          break;

        case 'schedule':
          // Add recommended time blocks
          if (suggestion.suggestedDuration && suggestion.suggestedTime) {
            await addItem(
              'default',
              suggestion.title,
              suggestion.suggestedTime,
              suggestion.suggestedDuration,
              '#3b82f6',
              {
                notes: `Auto-scheduled: ${suggestion.description}`,
              }
            );
          }
          break;

        default:
          console.warn(`Unknown optimization type: ${suggestion.type}`);
      }

      // Refresh after applying optimization
      await refresh();
    } catch (err) {
      console.error('Error applying optimization:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply optimization');
      throw err;
    }
  }, [optimizer, attentionPreferences, items, targetDate, updateItem, addItem, refresh]);

  // Find optimal time slot helper
  const findOptimalTimeSlot = useCallback((
    attentionType: string,
    durationMinutes: number
  ): { time: string; score: number; reasoning: string }[] => {
    if (!optimizer) return [];

    try {
      return optimizer.findOptimalTimeSlot(
        attentionType as any,
        durationMinutes,
        targetDate,
        items
      );
    } catch (err) {
      console.error('Error finding optimal time slot:', err);
      return [];
    }
  }, [optimizer, targetDate, items]);

  return {
    optimizer,
    roleFitScore,
    dailySuggestions,
    weeklySuggestions,
    loading,
    error,
    refresh,
    applyOptimization,
    findOptimalTimeSlot,
  };
}

// Hook for specific role-based template optimization
export function useSmartTemplates(role?: string, zone?: string) {
  const { attentionPreferences } = useTimelineContext();
  const { optimizer } = useRoleOptimizer({ autoRefresh: false });

  const smartTemplates = useMemo(() => {
    if (!optimizer || !attentionPreferences) return [];

    try {
      return optimizer.generateSmartTemplates();
    } catch (err) {
      console.error('Error generating smart templates:', err);
      return [];
    }
  }, [optimizer, attentionPreferences, role, zone]);

  return smartTemplates;
}

// Hook for real-time role fit monitoring
export function useRoleFitMonitor(intervalMs: number = 60000) {
  const { roleFitScore, refresh } = useRoleOptimizer({ autoRefresh: false });
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [scoreTrend, setScoreTrend] = useState<'improving' | 'declining' | 'stable'>('stable');

  useEffect(() => {
    const interval = setInterval(async () => {
      await refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refresh, intervalMs]);

  useEffect(() => {
    if (roleFitScore && lastScore !== null) {
      const diff = roleFitScore.score - lastScore;
      if (Math.abs(diff) < 5) {
        setScoreTrend('stable');
      } else if (diff > 0) {
        setScoreTrend('improving');
      } else {
        setScoreTrend('declining');
      }
    }

    if (roleFitScore) {
      setLastScore(roleFitScore.score);
    }
  }, [roleFitScore, lastScore]);

  return {
    currentScore: roleFitScore?.score || null,
    lastScore,
    trend: scoreTrend,
    breakdown: roleFitScore?.breakdown || null,
  };
}