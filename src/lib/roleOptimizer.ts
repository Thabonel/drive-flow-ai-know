// Role-Based Optimization Engine
// Provides intelligent scheduling and optimization based on user's role and zone context

import {
  TimelineItem,
  AttentionType,
  RoleMode,
  ZoneContext,
  UserAttentionPreferences,
} from '@/lib/timelineUtils';
import {
  ATTENTION_TYPES,
  ROLE_MODES,
  ZONE_CONTEXTS,
  ROLE_MODE_DESCRIPTIONS,
  ZONE_CONTEXT_DESCRIPTIONS,
  calculateContextSwitchCost,
  getAttentionTypeCompatibility,
} from '@/lib/attentionTypes';

export interface RoleOptimizationRules {
  maker: {
    minFocusBlock: number; // 90-120 minutes
    maxMeetings: number; // 3 per day
    maxContextSwitches: number; // 3 per 4 hours
    protectedHours: string[]; // peak energy times
    fragmentationThreshold: number; // warn if blocks too small
  };
  marker: {
    maxDecisionBlocks: number; // 2 per day
    decisionBatchGap: number; // max 120 minutes between
    reviewWindowSize: number; // 30-45 minutes
    batchThreshold: number; // min 3 similar decisions
    decisionFatigueLimit: number; // decisions per hour
  };
  multiplier: {
    connectionBlockSize: number; // 15-30 minutes
    maxPersonalCreateTime: number; // 120 minutes total
    minTeamTime: number; // 3 hours per day
    routingEfficiency: number; // requests handled per hour
    delegationThreshold: number; // tasks longer than 60 minutes
  };
}

export interface RoleFitScore {
  score: number; // 0-100
  breakdown: {
    timeAllocation: number;
    attentionBalance: number;
    contextSwitching: number;
    energyAlignment: number;
  };
  recommendations: string[];
  warnings: string[];
}

export interface OptimizationSuggestion {
  type: 'schedule' | 'batch' | 'delegate' | 'reschedule' | 'protect' | 'split' | 'merge';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  itemIds: string[];
  suggestedTime?: string;
  suggestedDuration?: number;
  reasoning: string;
}

export interface RoleTemplate {
  id: string;
  title: string;
  description: string;
  attentionType: AttentionType;
  suggestedDuration: number; // in minutes
  priority: number;
  isNonNegotiable?: boolean;
  tags?: string[];
  roleSpecific: {
    [ROLE_MODES.MAKER]: {
      preferredTimeSlots: string[];
      bufferTime: number;
      focusIntensity: 'high' | 'medium' | 'low';
    };
    [ROLE_MODES.MARKER]: {
      batchingGroup: string;
      decisionComplexity: 'simple' | 'complex' | 'strategic';
      reviewRequired: boolean;
    };
    [ROLE_MODES.MULTIPLIER]: {
      delegationPotential: 'high' | 'medium' | 'low';
      collaborationLevel: 'individual' | 'team' | 'cross-team';
      enablementFactor: number; // 1-5 scale
    };
  };
  zoneAdjustments: {
    [ZONE_CONTEXTS.WARTIME]: {
      durationMultiplier: number;
      priorityBoost: number;
      protectionLevel: 'strict' | 'moderate' | 'flexible';
    };
    [ZONE_CONTEXTS.PEACETIME]: {
      explorationTime: number;
      relationshipFocus: number;
      learningOpportunity: boolean;
    };
  };
}

// Role optimization rules configuration
export const ROLE_OPTIMIZATION_RULES: RoleOptimizationRules = {
  maker: {
    minFocusBlock: 90, // minimum 90 minutes for deep work
    maxMeetings: 3, // max 3 meetings per day
    maxContextSwitches: 3, // max 3 context switches per 4-hour period
    protectedHours: ['09:00-12:00', '14:00-17:00'], // peak focus hours
    fragmentationThreshold: 60, // warn if focus blocks under 60 minutes
  },
  marker: {
    maxDecisionBlocks: 2, // max 2 decision blocks per day
    decisionBatchGap: 120, // max 120 minutes between decision batches
    reviewWindowSize: 45, // 30-45 minute decision windows
    batchThreshold: 3, // batch at least 3 similar decisions
    decisionFatigueLimit: 5, // max 5 decisions per hour
  },
  multiplier: {
    connectionBlockSize: 30, // optimal 15-30 minute connection blocks
    maxPersonalCreateTime: 120, // max 2 hours personal create time
    minTeamTime: 180, // min 3 hours team-facing time
    routingEfficiency: 8, // handle 8 requests per hour
    delegationThreshold: 60, // delegate tasks longer than 60 minutes
  },
};

export class RoleOptimizer {
  private preferences: UserAttentionPreferences;
  private rules: RoleOptimizationRules;

  constructor(preferences: UserAttentionPreferences) {
    this.preferences = preferences;
    this.rules = ROLE_OPTIMIZATION_RULES;
  }

  /**
   * Calculate role fit score for a planned week
   */
  calculateRoleFitScore(plannedWeek: TimelineItem[]): RoleFitScore {
    const score: RoleFitScore = {
      score: 0,
      breakdown: {
        timeAllocation: 0,
        attentionBalance: 0,
        contextSwitching: 0,
        energyAlignment: 0,
      },
      recommendations: [],
      warnings: [],
    };

    const roleRules = this.rules[this.preferences.current_role];
    const zoneContext = ZONE_CONTEXT_DESCRIPTIONS[this.preferences.current_zone];

    // 1. Time Allocation Analysis
    score.breakdown.timeAllocation = this.analyzeTimeAllocation(plannedWeek);

    // 2. Attention Balance Analysis
    score.breakdown.attentionBalance = this.analyzeAttentionBalance(plannedWeek);

    // 3. Context Switching Analysis
    score.breakdown.contextSwitching = this.analyzeContextSwitching(plannedWeek);

    // 4. Energy Alignment Analysis
    score.breakdown.energyAlignment = this.analyzeEnergyAlignment(plannedWeek);

    // Calculate weighted score based on zone context
    const weights = this.getScoreWeights();
    score.score = Math.round(
      score.breakdown.timeAllocation * weights.timeAllocation +
      score.breakdown.attentionBalance * weights.attentionBalance +
      score.breakdown.contextSwitching * weights.contextSwitching +
      score.breakdown.energyAlignment * weights.energyAlignment
    );

    // Generate recommendations and warnings
    this.generateRecommendations(plannedWeek, score);

    return score;
  }

  /**
   * Generate optimization suggestions for timeline items
   */
  generateOptimizationSuggestions(items: TimelineItem[], targetDate?: Date): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const date = targetDate || new Date();
    const dateStr = date.toISOString().split('T')[0];

    // Filter items for target date
    const dayItems = items.filter(item => {
      const itemDate = new Date(item.start_time).toISOString().split('T')[0];
      return itemDate === dateStr;
    });

    // Role-specific optimization
    switch (this.preferences.current_role) {
      case ROLE_MODES.MAKER:
        suggestions.push(...this.generateMakerOptimizations(dayItems));
        break;
      case ROLE_MODES.MARKER:
        suggestions.push(...this.generateMarkerOptimizations(dayItems));
        break;
      case ROLE_MODES.MULTIPLIER:
        suggestions.push(...this.generateMultiplierOptimizations(dayItems));
        break;
    }

    // Universal optimizations
    suggestions.push(...this.generateUniversalOptimizations(dayItems));

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate smart templates based on current role and zone
   */
  generateSmartTemplates(): RoleTemplate[] {
    const baseTemplates = this.getBaseRoleTemplates();
    const smartTemplates: RoleTemplate[] = [];

    baseTemplates.forEach(template => {
      const smartTemplate = this.enhanceTemplateWithContext(template);
      smartTemplates.push(smartTemplate);
    });

    // Add dynamic templates based on recent patterns
    smartTemplates.push(...this.generateDynamicTemplates());

    return smartTemplates;
  }

  /**
   * Find optimal time slots for a given attention type and duration
   */
  findOptimalTimeSlot(
    attentionType: AttentionType,
    durationMinutes: number,
    date: Date,
    existingItems: TimelineItem[]
  ): { time: string; score: number; reasoning: string }[] {
    const slots: { time: string; score: number; reasoning: string }[] = [];
    const roleDesc = ROLE_MODE_DESCRIPTIONS[this.preferences.current_role];

    // Generate potential time slots throughout the day
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    const interval = 30; // 30-minute intervals

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, minute, 0, 0);
        const timeStr = slotTime.toISOString();

        // Check if slot is available
        if (this.isTimeSlotAvailable(timeStr, durationMinutes, existingItems)) {
          const score = this.calculateTimeSlotScore(
            timeStr,
            attentionType,
            durationMinutes,
            existingItems
          );
          const reasoning = this.generateSlotReasoning(timeStr, attentionType, score);

          slots.push({
            time: timeStr,
            score,
            reasoning,
          });
        }
      }
    }

    return slots.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  private analyzeTimeAllocation(items: TimelineItem[]): number {
    const rolePrefs = ROLE_MODE_DESCRIPTIONS[this.preferences.current_role].behaviors.preferredAttentionTypes;
    let totalTime = 0;
    let preferredTime = 0;

    items.forEach(item => {
      totalTime += item.duration_minutes;
      if (item.attention_type && rolePrefs.includes(item.attention_type)) {
        preferredTime += item.duration_minutes;
      }
    });

    if (totalTime === 0) return 100;

    const ratio = preferredTime / totalTime;
    return Math.min(100, ratio * 100);
  }

  private analyzeAttentionBalance(items: TimelineItem[]): number {
    const attentionCounts = new Map<AttentionType, number>();

    // Count items by attention type
    items.forEach(item => {
      if (item.attention_type) {
        attentionCounts.set(
          item.attention_type,
          (attentionCounts.get(item.attention_type) || 0) + 1
        );
      }
    });

    // Check balance based on role
    const roleRules = this.rules[this.preferences.current_role];
    let balanceScore = 100;

    // Role-specific balance checks
    switch (this.preferences.current_role) {
      case ROLE_MODES.MAKER:
        const createCount = attentionCounts.get(ATTENTION_TYPES.CREATE) || 0;
        const meetingCount = attentionCounts.get(ATTENTION_TYPES.CONNECT) || 0;
        if (meetingCount > roleRules.maxMeetings) {
          balanceScore -= 20 * (meetingCount - roleRules.maxMeetings);
        }
        break;
      case ROLE_MODES.MARKER:
        const decideCount = attentionCounts.get(ATTENTION_TYPES.DECIDE) || 0;
        if (decideCount > roleRules.maxDecisionBlocks) {
          balanceScore -= 25 * (decideCount - roleRules.maxDecisionBlocks);
        }
        break;
      case ROLE_MODES.MULTIPLIER:
        const connectCount = attentionCounts.get(ATTENTION_TYPES.CONNECT) || 0;
        if (connectCount < 3) {
          balanceScore -= 15 * (3 - connectCount);
        }
        break;
    }

    return Math.max(0, balanceScore);
  }

  private analyzeContextSwitching(items: TimelineItem[]): number {
    const sortedItems = items.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    let totalSwitchCost = 0;
    let switchCount = 0;

    for (let i = 1; i < sortedItems.length; i++) {
      const prevItem = sortedItems[i - 1];
      const currentItem = sortedItems[i];

      if (prevItem.attention_type && currentItem.attention_type) {
        const cost = calculateContextSwitchCost(
          prevItem.attention_type,
          currentItem.attention_type,
          this.preferences.current_role
        );
        totalSwitchCost += cost;
        switchCount++;
      }
    }

    if (switchCount === 0) return 100;

    const averageCost = totalSwitchCost / switchCount;
    const maxAllowedCost = this.rules[this.preferences.current_role].maxContextSwitches;

    return Math.max(0, 100 - (averageCost / maxAllowedCost) * 50);
  }

  private analyzeEnergyAlignment(items: TimelineItem[]): number {
    const peakStart = this.preferences.peak_hours_start;
    const peakEnd = this.preferences.peak_hours_end;

    let totalHighEnergyTime = 0;
    let optimalHighEnergyTime = 0;

    items.forEach(item => {
      const startTime = new Date(item.start_time);
      const startTimeStr = startTime.toTimeString().substr(0, 5);

      const isInPeakHours = startTimeStr >= peakStart && startTimeStr <= peakEnd;
      const requiresHighEnergy = item.attention_type === ATTENTION_TYPES.CREATE ||
                                 item.attention_type === ATTENTION_TYPES.DECIDE;

      if (requiresHighEnergy) {
        totalHighEnergyTime += item.duration_minutes;
        if (isInPeakHours) {
          optimalHighEnergyTime += item.duration_minutes;
        }
      }
    });

    if (totalHighEnergyTime === 0) return 100;

    const ratio = optimalHighEnergyTime / totalHighEnergyTime;
    return Math.min(100, ratio * 100);
  }

  private generateMakerOptimizations(items: TimelineItem[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const rules = this.rules.maker;

    // Check for focus block fragmentation
    const createItems = items.filter(item => item.attention_type === ATTENTION_TYPES.CREATE);
    const shortBlocks = createItems.filter(item => item.duration_minutes < rules.minFocusBlock);

    if (shortBlocks.length > 1) {
      suggestions.push({
        type: 'merge',
        priority: 'high',
        title: 'Merge Fragmented Focus Blocks',
        description: `Combine ${shortBlocks.length} short focus blocks into one ${rules.minFocusBlock}-minute session`,
        itemIds: shortBlocks.map(item => item.id),
        suggestedDuration: shortBlocks.reduce((sum, item) => sum + item.duration_minutes, 0),
        reasoning: 'Larger focus blocks reduce context switching and improve deep work effectiveness',
      });
    }

    // Check for meeting overload
    const meetings = items.filter(item => item.attention_type === ATTENTION_TYPES.CONNECT);
    if (meetings.length > rules.maxMeetings) {
      suggestions.push({
        type: 'reschedule',
        priority: 'medium',
        title: 'Reduce Meeting Load',
        description: `You have ${meetings.length} meetings scheduled (limit: ${rules.maxMeetings})`,
        itemIds: meetings.slice(rules.maxMeetings).map(item => item.id),
        reasoning: 'Too many meetings prevent deep work and cause attention fragmentation',
      });
    }

    return suggestions;
  }

  private generateMarkerOptimizations(items: TimelineItem[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const rules = this.rules.marker;

    // Check for decision batching opportunities
    const decisionItems = items.filter(item => item.attention_type === ATTENTION_TYPES.DECIDE);

    if (decisionItems.length >= rules.batchThreshold) {
      // Group similar decisions by tags or title similarity
      const batchGroups = this.groupSimilarDecisions(decisionItems);

      batchGroups.forEach(group => {
        if (group.length >= rules.batchThreshold) {
          suggestions.push({
            type: 'batch',
            priority: 'high',
            title: 'Batch Similar Decisions',
            description: `Combine ${group.length} similar decisions into one focused session`,
            itemIds: group.map(item => item.id),
            suggestedDuration: Math.min(rules.reviewWindowSize, group.length * 10),
            reasoning: 'Batching similar decisions reduces decision fatigue and improves consistency',
          });
        }
      });
    }

    // Check for decision fatigue risk
    const totalDecisionTime = decisionItems.reduce((sum, item) => sum + item.duration_minutes, 0);
    if (totalDecisionTime > rules.decisionFatigueLimit * 60) {
      suggestions.push({
        type: 'split',
        priority: 'medium',
        title: 'Prevent Decision Fatigue',
        description: 'Split decision-making across multiple sessions with recovery time',
        itemIds: decisionItems.map(item => item.id),
        reasoning: 'Extended decision-making leads to poorer choices and mental exhaustion',
      });
    }

    return suggestions;
  }

  private generateMultiplierOptimizations(items: TimelineItem[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const rules = this.rules.multiplier;

    // Check for delegation opportunities
    const longTasks = items.filter(item =>
      item.duration_minutes > rules.delegationThreshold &&
      item.attention_type === ATTENTION_TYPES.CREATE
    );

    if (longTasks.length > 0) {
      suggestions.push({
        type: 'delegate',
        priority: 'high',
        title: 'Delegation Opportunities',
        description: `${longTasks.length} tasks could be delegated to free up your time`,
        itemIds: longTasks.map(item => item.id),
        reasoning: 'Delegating execution work allows focus on strategic and enabling activities',
      });
    }

    // Check for insufficient team time
    const teamTime = items
      .filter(item => item.attention_type === ATTENTION_TYPES.CONNECT)
      .reduce((sum, item) => sum + item.duration_minutes, 0);

    if (teamTime < rules.minTeamTime) {
      suggestions.push({
        type: 'schedule',
        priority: 'medium',
        title: 'Increase Team Connection Time',
        description: `Schedule ${rules.minTeamTime - teamTime} more minutes of team-facing activities`,
        itemIds: [],
        reasoning: 'Multiplier effectiveness depends on enabling and connecting with team members',
      });
    }

    return suggestions;
  }

  private generateUniversalOptimizations(items: TimelineItem[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for missing recovery time
    const totalActiveTime = items.reduce((sum, item) => sum + item.duration_minutes, 0);
    const recoveryTime = items
      .filter(item => item.attention_type === ATTENTION_TYPES.RECOVER)
      .reduce((sum, item) => sum + item.duration_minutes, 0);

    if (totalActiveTime > 480 && recoveryTime < 60) { // 8+ hours active, less than 1 hour recovery
      suggestions.push({
        type: 'schedule',
        priority: 'medium',
        title: 'Add Recovery Time',
        description: 'Schedule breaks and low-attention activities to prevent burnout',
        itemIds: [],
        suggestedDuration: 60,
        reasoning: 'Regular recovery prevents attention fatigue and maintains peak performance',
      });
    }

    return suggestions;
  }

  private getBaseRoleTemplates(): RoleTemplate[] {
    // Base templates will be enhanced with smart context
    return [
      {
        id: 'smart-focus-block',
        title: 'Optimized Focus Block',
        description: 'Dynamically sized focus block based on current role and zone',
        attentionType: ATTENTION_TYPES.CREATE,
        suggestedDuration: this.getOptimalFocusDuration(),
        priority: 5,
        isNonNegotiable: true,
        roleSpecific: {
          [ROLE_MODES.MAKER]: {
            preferredTimeSlots: ['09:00', '14:00'],
            bufferTime: 15,
            focusIntensity: 'high',
          },
          [ROLE_MODES.MARKER]: {
            batchingGroup: 'strategic',
            decisionComplexity: 'complex',
            reviewRequired: true,
          },
          [ROLE_MODES.MULTIPLIER]: {
            delegationPotential: 'low',
            collaborationLevel: 'individual',
            enablementFactor: 1,
          },
        },
        zoneAdjustments: {
          [ZONE_CONTEXTS.WARTIME]: {
            durationMultiplier: 1.2,
            priorityBoost: 2,
            protectionLevel: 'strict',
          },
          [ZONE_CONTEXTS.PEACETIME]: {
            explorationTime: 30,
            relationshipFocus: 1,
            learningOpportunity: true,
          },
        },
      },
    ];
  }

  private enhanceTemplateWithContext(template: RoleTemplate): RoleTemplate {
    const role = this.preferences.current_role;
    const zone = this.preferences.current_zone;
    const roleSpec = template.roleSpecific[role];
    const zoneAdj = template.zoneAdjustments[zone];

    // Apply zone-based duration adjustments
    if (zone === ZONE_CONTEXTS.WARTIME) {
      template.suggestedDuration = Math.round(template.suggestedDuration * zoneAdj.durationMultiplier);
      template.priority = Math.min(5, template.priority + zoneAdj.priorityBoost);
    }

    // Apply role-specific enhancements
    if (role === ROLE_MODES.MAKER && roleSpec.focusIntensity === 'high') {
      template.isNonNegotiable = true;
      template.description += ' - Protected time for deep work';
    }

    return template;
  }

  private generateDynamicTemplates(): RoleTemplate[] {
    // Generate templates based on user patterns and current needs
    return [];
  }

  private getOptimalFocusDuration(): number {
    const rules = this.rules[this.preferences.current_role];
    const zone = this.preferences.current_zone;

    let baseDuration: number;
    switch (this.preferences.current_role) {
      case ROLE_MODES.MAKER:
        baseDuration = rules.minFocusBlock;
        break;
      case ROLE_MODES.MARKER:
        baseDuration = rules.reviewWindowSize;
        break;
      case ROLE_MODES.MULTIPLIER:
        baseDuration = rules.connectionBlockSize;
        break;
      default:
        baseDuration = 60;
    }

    // Apply zone adjustments
    if (zone === ZONE_CONTEXTS.WARTIME) {
      baseDuration *= 1.2; // 20% longer in wartime
    }

    return Math.round(baseDuration);
  }

  private groupSimilarDecisions(decisions: TimelineItem[]): TimelineItem[][] {
    const groups: TimelineItem[][] = [];
    const processed = new Set<string>();

    decisions.forEach(decision => {
      if (processed.has(decision.id)) return;

      const group = [decision];
      processed.add(decision.id);

      // Find similar decisions based on tags or title keywords
      decisions.forEach(other => {
        if (processed.has(other.id) || other.id === decision.id) return;

        if (this.areDecisionsSimilar(decision, other)) {
          group.push(other);
          processed.add(other.id);
        }
      });

      if (group.length >= 2) {
        groups.push(group);
      }
    });

    return groups;
  }

  private areDecisionsSimilar(a: TimelineItem, b: TimelineItem): boolean {
    // Check tag overlap
    const tagsA = a.tags || [];
    const tagsB = b.tags || [];
    const commonTags = tagsA.filter(tag => tagsB.includes(tag));

    if (commonTags.length > 0) return true;

    // Check title similarity (simple keyword matching)
    const wordsA = a.title.toLowerCase().split(' ');
    const wordsB = b.title.toLowerCase().split(' ');
    const commonWords = wordsA.filter(word =>
      word.length > 3 && wordsB.includes(word)
    );

    return commonWords.length >= 2;
  }

  private isTimeSlotAvailable(
    timeStr: string,
    durationMinutes: number,
    existingItems: TimelineItem[]
  ): boolean {
    const slotStart = new Date(timeStr);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    return !existingItems.some(item => {
      const itemStart = new Date(item.start_time);
      const itemEnd = new Date(itemStart.getTime() + item.duration_minutes * 60 * 1000);

      return (slotStart < itemEnd && slotEnd > itemStart);
    });
  }

  private calculateTimeSlotScore(
    timeStr: string,
    attentionType: AttentionType,
    durationMinutes: number,
    existingItems: TimelineItem[]
  ): number {
    let score = 50; // Base score

    const slotTime = new Date(timeStr);
    const hour = slotTime.getHours();
    const timeSlot = slotTime.toTimeString().substr(0, 5);

    // Peak hours bonus
    const peakStart = this.preferences.peak_hours_start;
    const peakEnd = this.preferences.peak_hours_end;
    if (timeSlot >= peakStart && timeSlot <= peakEnd) {
      if (attentionType === ATTENTION_TYPES.CREATE || attentionType === ATTENTION_TYPES.DECIDE) {
        score += 20;
      }
    }

    // Time of day preferences
    switch (attentionType) {
      case ATTENTION_TYPES.CREATE:
        if (hour >= 9 && hour <= 11) score += 15; // Morning focus bonus
        break;
      case ATTENTION_TYPES.CONNECT:
        if (hour >= 14 && hour <= 16) score += 10; // Afternoon collaboration bonus
        break;
      case ATTENTION_TYPES.RECOVER:
        if (hour >= 12 && hour <= 13) score += 15; // Lunch break bonus
        break;
    }

    // Context switching penalty
    const adjacentItems = this.getAdjacentItems(timeStr, durationMinutes, existingItems);
    adjacentItems.forEach(item => {
      if (item.attention_type && item.attention_type !== attentionType) {
        const switchCost = calculateContextSwitchCost(
          item.attention_type,
          attentionType,
          this.preferences.current_role
        );
        score -= switchCost * 3;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private getAdjacentItems(
    timeStr: string,
    durationMinutes: number,
    existingItems: TimelineItem[]
  ): TimelineItem[] {
    const slotStart = new Date(timeStr);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    const buffer = 30 * 60 * 1000; // 30 minute buffer

    return existingItems.filter(item => {
      const itemStart = new Date(item.start_time);
      const itemEnd = new Date(itemStart.getTime() + item.duration_minutes * 60 * 1000);

      // Check if item is adjacent (within buffer time)
      return (
        Math.abs(itemEnd.getTime() - slotStart.getTime()) <= buffer ||
        Math.abs(slotEnd.getTime() - itemStart.getTime()) <= buffer
      );
    });
  }

  private generateSlotReasoning(timeStr: string, attentionType: AttentionType, score: number): string {
    const hour = new Date(timeStr).getHours();
    const reasons: string[] = [];

    if (score > 80) {
      reasons.push('Optimal time slot');
    } else if (score > 60) {
      reasons.push('Good time slot');
    } else if (score > 40) {
      reasons.push('Acceptable time slot');
    } else {
      reasons.push('Suboptimal time slot');
    }

    // Add specific reasoning
    if (hour >= 9 && hour <= 11 && attentionType === ATTENTION_TYPES.CREATE) {
      reasons.push('Peak morning focus hours');
    }
    if (hour >= 14 && hour <= 16 && attentionType === ATTENTION_TYPES.CONNECT) {
      reasons.push('Optimal collaboration time');
    }

    return reasons.join(', ');
  }

  private getScoreWeights(): { [key: string]: number } {
    // Zone-based weighting
    if (this.preferences.current_zone === ZONE_CONTEXTS.WARTIME) {
      return {
        timeAllocation: 0.4,
        attentionBalance: 0.3,
        contextSwitching: 0.2,
        energyAlignment: 0.1,
      };
    } else {
      return {
        timeAllocation: 0.25,
        attentionBalance: 0.25,
        contextSwitching: 0.25,
        energyAlignment: 0.25,
      };
    }
  }

  private generateRecommendations(items: TimelineItem[], score: RoleFitScore): void {
    const role = this.preferences.current_role;
    const roleDesc = ROLE_MODE_DESCRIPTIONS[role];

    // Generate role-specific recommendations
    if (score.breakdown.timeAllocation < 70) {
      score.recommendations.push(
        `Increase time spent on ${roleDesc.behaviors.preferredAttentionTypes.join(' and ')} activities`
      );
    }

    if (score.breakdown.contextSwitching < 60) {
      score.recommendations.push('Reduce context switching by batching similar activities');
    }

    if (score.breakdown.energyAlignment < 60) {
      score.recommendations.push('Schedule high-energy work during peak hours');
    }

    // Generate warnings
    if (score.score < 50) {
      score.warnings.push('Current schedule significantly misaligned with role requirements');
    }

    if (score.breakdown.attentionBalance < 40) {
      score.warnings.push('Attention budget severely unbalanced for current role');
    }
  }
}

/**
 * Helper function to create a role optimizer instance
 */
export function createRoleOptimizer(preferences: UserAttentionPreferences): RoleOptimizer {
  return new RoleOptimizer(preferences);
}

/**
 * Helper function to get role-appropriate template suggestions
 */
export function getRoleTemplateDefaults(
  role: RoleMode,
  zone: ZoneContext
): Partial<RoleTemplate> {
  const roleRules = ROLE_OPTIMIZATION_RULES[role];
  const zoneContext = ZONE_CONTEXT_DESCRIPTIONS[zone];

  let duration: number;
  let intensity: 'high' | 'medium' | 'low' = 'medium';

  switch (role) {
    case ROLE_MODES.MAKER:
      duration = roleRules.minFocusBlock;
      intensity = 'high';
      break;
    case ROLE_MODES.MARKER:
      duration = roleRules.reviewWindowSize;
      intensity = 'medium';
      break;
    case ROLE_MODES.MULTIPLIER:
      duration = roleRules.connectionBlockSize;
      intensity = 'low';
      break;
    default:
      duration = 60;
  }

  // Apply zone adjustments
  if (zone === ZONE_CONTEXTS.WARTIME) {
    duration = Math.round(duration * 1.2);
    intensity = intensity === 'low' ? 'medium' : 'high';
  }

  return {
    suggestedDuration: duration,
    priority: zone === ZONE_CONTEXTS.WARTIME ? 4 : 3,
    isNonNegotiable: zone === ZONE_CONTEXTS.WARTIME && intensity === 'high',
  };
}