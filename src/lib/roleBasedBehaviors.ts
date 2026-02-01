// Role-based behavior patterns for attention system
import {
  RoleMode,
  AttentionType,
  ROLE_MODES,
  ATTENTION_TYPES
} from './attentionTypes';
import { TimelineItem } from './timelineUtils';

export interface FocusBlock {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  attentionType: AttentionType;
  items: TimelineItem[];
}

export interface RoleBehaviorSuggestion {
  type: 'warning' | 'suggestion' | 'optimization';
  title: string;
  description: string;
  actionable?: boolean;
  severity?: 'low' | 'medium' | 'high';
}

export interface RoleBehaviorAnalysis {
  suggestions: RoleBehaviorSuggestion[];
  focusBlocks: FocusBlock[];
  contextSwitches: number;
  roleCompatibilityScore: number; // 0-100
}

// Maker Mode Behaviors
export const MakerModeBehaviors = {
  // Minimum duration for Create events (90 minutes)
  MIN_CREATE_DURATION: 90,

  // Maximum context switches per day
  MAX_CONTEXT_SWITCHES: 3,

  // Peak hours protection (Create events should be in peak hours)
  PROTECT_PEAK_HOURS: true,

  // Focus block minimum duration (2 hours)
  MIN_FOCUS_BLOCK_DURATION: 120,

  /**
   * Analyze timeline items for Maker mode optimization
   */
  analyzeTimeline(items: TimelineItem[]): RoleBehaviorAnalysis {
    const suggestions: RoleBehaviorSuggestion[] = [];
    const focusBlocks = this.identifyFocusBlocks(items);
    const contextSwitches = this.calculateContextSwitches(items);

    // Check for fragmented focus blocks
    const fragmentedBlocks = focusBlocks.filter((block: FocusBlock) =>
      block.attentionType === ATTENTION_TYPES.CREATE &&
      block.durationMinutes < this.MIN_FOCUS_BLOCK_DURATION
    );

    if (fragmentedBlocks.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Fragmented Deep Work',
        description: `${fragmentedBlocks.length} Create blocks are shorter than 2 hours. Consider consolidating for deeper focus.`,
        severity: 'high',
        actionable: true
      });
    }

    // Check for excessive context switching
    if (contextSwitches > this.MAX_CONTEXT_SWITCHES) {
      suggestions.push({
        type: 'warning',
        title: 'Excessive Context Switching',
        description: `${contextSwitches} context switches detected. Makers work best with fewer than ${this.MAX_CONTEXT_SWITCHES} switches per day.`,
        severity: 'medium',
        actionable: true
      });
    }

    // Check for Create events that are too short
    const shortCreateEvents = items.filter(item =>
      item.attention_type === ATTENTION_TYPES.CREATE &&
      item.duration_minutes &&
      item.duration_minutes < this.MIN_CREATE_DURATION
    );

    if (shortCreateEvents.length > 0) {
      suggestions.push({
        type: 'suggestion',
        title: 'Extend Create Sessions',
        description: `${shortCreateEvents.length} Create events are shorter than 90 minutes. Consider extending for better flow.`,
        severity: 'low',
        actionable: true
      });
    }

    // Check for interruptions during focus blocks
    const interruptedBlocks = this.findInterruptedFocusBlocks(items, focusBlocks);
    if (interruptedBlocks.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Focus Block Interruptions',
        description: `${interruptedBlocks.length} focus blocks have interrupting meetings. Consider rescheduling to protect deep work.`,
        severity: 'high',
        actionable: true
      });
    }

    const roleCompatibilityScore = this.calculateMakerCompatibility(items, suggestions);

    return {
      suggestions,
      focusBlocks,
      contextSwitches,
      roleCompatibilityScore
    };
  },

  /**
   * Get duration suggestion for new event based on attention type
   */
  suggestDuration(attentionType: AttentionType, defaultDuration: number): number {
    switch (attentionType) {
      case ATTENTION_TYPES.CREATE:
        return Math.max(defaultDuration, this.MIN_CREATE_DURATION);
      case ATTENTION_TYPES.REVIEW:
        return Math.max(defaultDuration, 45); // Minimum 45 min for reviews
      default:
        return defaultDuration;
    }
  },

  /**
   * Check if scheduling this event would create problems
   */
  validateNewEvent(
    newEvent: { start_time: string; duration_minutes: number; attention_type: AttentionType },
    existingItems: TimelineItem[]
  ): RoleBehaviorSuggestion[] {
    const warnings: RoleBehaviorSuggestion[] = [];

    // Check if this would fragment an existing focus block
    const eventStart = new Date(newEvent.start_time);
    const eventEnd = new Date(eventStart.getTime() + newEvent.duration_minutes * 60000);

    const conflictingFocusBlocks = this.identifyFocusBlocks(existingItems).filter((block: FocusBlock) => {
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);

      return (
        block.attentionType === ATTENTION_TYPES.CREATE &&
        block.durationMinutes >= this.MIN_FOCUS_BLOCK_DURATION &&
        ((eventStart >= blockStart && eventStart < blockEnd) ||
         (eventEnd > blockStart && eventEnd <= blockEnd))
      );
    });

    if (conflictingFocusBlocks.length > 0) {
      warnings.push({
        type: 'warning',
        title: 'Focus Block Fragmentation',
        description: 'This event would interrupt an existing focus block. Consider rescheduling to protect deep work time.',
        severity: 'high',
        actionable: true
      });
    }

    // Suggest minimum duration for Create events
    if (newEvent.attention_type === ATTENTION_TYPES.CREATE &&
        newEvent.duration_minutes < this.MIN_CREATE_DURATION) {
      warnings.push({
        type: 'suggestion',
        title: 'Extend Create Session',
        description: `Consider extending this Create session to at least ${this.MIN_CREATE_DURATION} minutes for better flow state.`,
        severity: 'low',
        actionable: true
      });
    }

    return warnings;
  },

  /**
   * Calculate compatibility score for Maker mode (0-100)
   */
  calculateMakerCompatibility(items: TimelineItem[], suggestions: RoleBehaviorSuggestion[]): number {
    let score = 100;

    // Penalize for high-severity warnings
    const highSeverityWarnings = suggestions.filter(s => s.severity === 'high').length;
    score -= (highSeverityWarnings * 25);

    // Penalize for medium-severity warnings
    const mediumSeverityWarnings = suggestions.filter(s => s.severity === 'medium').length;
    score -= (mediumSeverityWarnings * 15);

    // Penalize for low-severity suggestions
    const lowSeveritySuggestions = suggestions.filter(s => s.severity === 'low').length;
    score -= (lowSeveritySuggestions * 5);

    // Bonus for good Create time allocation
    const createMinutes = items
      .filter(item => item.attention_type === ATTENTION_TYPES.CREATE)
      .reduce((total, item) => total + (item.duration_minutes || 0), 0);

    if (createMinutes >= 240) score += 10; // 4+ hours of Create time
    else if (createMinutes >= 120) score += 5; // 2+ hours of Create time

    return Math.max(0, Math.min(100, score));
  },

  identifyFocusBlocks(items: TimelineItem[]): FocusBlock[] {
    // Sort items by start time
    const sortedItems = [...items].sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const focusBlocks: FocusBlock[] = [];

    for (const item of sortedItems) {
      if (!item.attention_type || !item.duration_minutes) continue;

      const startTime = new Date(item.start_time);
      const endTime = new Date(startTime.getTime() + item.duration_minutes * 60000);

      focusBlocks.push({
        startTime: item.start_time,
        endTime: endTime.toISOString(),
        durationMinutes: item.duration_minutes,
        attentionType: item.attention_type as AttentionType,
        items: [item]
      });
    }

    return focusBlocks;
  },

  calculateContextSwitches(items: TimelineItem[]): number {
    if (items.length <= 1) return 0;

    // Sort items by start time
    const sortedItems = [...items]
      .filter(item => item.attention_type)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    let switches = 0;
    for (let i = 1; i < sortedItems.length; i++) {
      if (sortedItems[i].attention_type !== sortedItems[i - 1].attention_type) {
        switches++;
      }
    }

    return switches;
  },

  findInterruptedFocusBlocks(items: TimelineItem[], focusBlocks: FocusBlock[]): FocusBlock[] {
    return focusBlocks.filter(block => {
      if (block.attentionType !== ATTENTION_TYPES.CREATE) return false;

      // Check if any non-Create events overlap with this block
      const blockStart = new Date(block.startTime).getTime();
      const blockEnd = new Date(block.endTime).getTime();

      return items.some(item => {
        if (item.attention_type === ATTENTION_TYPES.CREATE) return false;
        if (!item.duration_minutes) return false;

        const itemStart = new Date(item.start_time).getTime();
        const itemEnd = itemStart + (item.duration_minutes * 60000);

        // Check for overlap
        return (itemStart < blockEnd && itemEnd > blockStart);
      });
    });
  }
};

// Marker Mode Behaviors
export const MarkerModeBehaviors = {
  // Maximum decision events per day
  MAX_DAILY_DECISIONS: 5,

  // Minimum batch size for decision clustering
  MIN_DECISION_BATCH_SIZE: 2,

  // Maximum time between decisions in a batch (2 hours)
  MAX_BATCH_TIME_GAP: 120,

  /**
   * Analyze timeline items for Marker mode optimization
   */
  analyzeTimeline(items: TimelineItem[]): RoleBehaviorAnalysis {
    const suggestions: RoleBehaviorSuggestion[] = [];
    const focusBlocks = this.identifyDecisionBlocks(items);
    const contextSwitches = MakerModeBehaviors.calculateContextSwitches(items);

    // Check for decision fatigue
    const decisionEvents = items.filter(item => item.attention_type === ATTENTION_TYPES.DECIDE);
    if (decisionEvents.length > this.MAX_DAILY_DECISIONS) {
      suggestions.push({
        type: 'warning',
        title: 'Decision Fatigue Risk',
        description: `${decisionEvents.length} decision events scheduled. Consider reducing to ${this.MAX_DAILY_DECISIONS} or fewer to avoid fatigue.`,
        severity: 'high',
        actionable: true
      });
    }

    // Check for isolated decision events (suggest batching)
    const isolatedDecisions = this.findIsolatedDecisions(items);
    if (isolatedDecisions.length > 0) {
      suggestions.push({
        type: 'suggestion',
        title: 'Batch Decision Events',
        description: `${isolatedDecisions.length} isolated decision events found. Consider clustering for better decision quality.`,
        severity: 'medium',
        actionable: true
      });
    }

    // Check for review events before major decisions
    const decisionsWithoutReview = this.findDecisionsWithoutReview(items);
    if (decisionsWithoutReview.length > 0) {
      suggestions.push({
        type: 'suggestion',
        title: 'Add Review Before Decisions',
        description: `${decisionsWithoutReview.length} major decisions lack preceding review time. Consider adding research/review blocks.`,
        severity: 'low',
        actionable: true
      });
    }

    const roleCompatibilityScore = this.calculateMarkerCompatibility(items, suggestions);

    return {
      suggestions,
      focusBlocks,
      contextSwitches,
      roleCompatibilityScore
    };
  },

  /**
   * Suggest grouping decisions together
   */
  suggestDecisionBatching(
    newDecisionEvent: { start_time: string; duration_minutes: number },
    existingItems: TimelineItem[]
  ): RoleBehaviorSuggestion[] {
    const suggestions: RoleBehaviorSuggestion[] = [];
    const newEventStart = new Date(newDecisionEvent.start_time);

    // Find nearby decision events within batch time gap
    const nearbyDecisions = existingItems.filter(item => {
      if (item.attention_type !== ATTENTION_TYPES.DECIDE) return false;

      const itemStart = new Date(item.start_time);
      const timeDiff = Math.abs(newEventStart.getTime() - itemStart.getTime()) / (1000 * 60); // minutes

      return timeDiff <= this.MAX_BATCH_TIME_GAP;
    });

    if (nearbyDecisions.length > 0) {
      suggestions.push({
        type: 'suggestion',
        title: 'Decision Batching Opportunity',
        description: `Consider moving this decision near ${nearbyDecisions.length} other decision event(s) for better batching.`,
        severity: 'low',
        actionable: true
      });
    }

    return suggestions;
  },

  calculateMarkerCompatibility(items: TimelineItem[], suggestions: RoleBehaviorSuggestion[]): number {
    let score = 100;

    // Penalize for decision fatigue
    const decisionCount = items.filter(item => item.attention_type === ATTENTION_TYPES.DECIDE).length;
    if (decisionCount > this.MAX_DAILY_DECISIONS) {
      score -= (decisionCount - this.MAX_DAILY_DECISIONS) * 20;
    }

    // Penalize for suggestions
    score -= suggestions.filter(s => s.severity === 'high').length * 25;
    score -= suggestions.filter(s => s.severity === 'medium').length * 15;
    score -= suggestions.filter(s => s.severity === 'low').length * 5;

    // Bonus for good decision clustering
    const decisionBatches = this.findDecisionBatches(items);
    score += decisionBatches.length * 5;

    return Math.max(0, Math.min(100, score));
  },

  identifyDecisionBlocks(items: TimelineItem[]): FocusBlock[] {
    return items
      .filter(item => item.attention_type === ATTENTION_TYPES.DECIDE && item.duration_minutes)
      .map(item => {
        const startTime = new Date(item.start_time);
        const endTime = new Date(startTime.getTime() + item.duration_minutes! * 60000);

        return {
          startTime: item.start_time,
          endTime: endTime.toISOString(),
          durationMinutes: item.duration_minutes!,
          attentionType: item.attention_type as AttentionType,
          items: [item]
        };
      });
  },

  findIsolatedDecisions(items: TimelineItem[]): TimelineItem[] {
    const decisionEvents = items.filter(item => item.attention_type === ATTENTION_TYPES.DECIDE);

    return decisionEvents.filter(decision => {
      const decisionStart = new Date(decision.start_time);

      // Check if there are other decisions within batch time gap
      const nearbyDecisions = decisionEvents.filter(other => {
        if (other.id === decision.id) return false;

        const otherStart = new Date(other.start_time);
        const timeDiff = Math.abs(decisionStart.getTime() - otherStart.getTime()) / (1000 * 60);

        return timeDiff <= this.MAX_BATCH_TIME_GAP;
      });

      return nearbyDecisions.length === 0;
    });
  },

  findDecisionsWithoutReview(items: TimelineItem[]): TimelineItem[] {
    const decisionEvents = items.filter(item => item.attention_type === ATTENTION_TYPES.DECIDE);

    return decisionEvents.filter(decision => {
      const decisionStart = new Date(decision.start_time);

      // Look for Review events in the 4 hours before this decision
      const reviewWindow = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      const windowStart = new Date(decisionStart.getTime() - reviewWindow);

      const precedingReviews = items.filter(item => {
        if (item.attention_type !== ATTENTION_TYPES.REVIEW) return false;

        const itemStart = new Date(item.start_time);
        return itemStart >= windowStart && itemStart < decisionStart;
      });

      return precedingReviews.length === 0;
    });
  },

  findDecisionBatches(items: TimelineItem[]): FocusBlock[] {
    const decisionEvents = items
      .filter(item => item.attention_type === ATTENTION_TYPES.DECIDE)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const batches: FocusBlock[] = [];
    let currentBatch: TimelineItem[] = [];
    let batchStart: string | null = null;
    let lastEventEnd: number = 0;

    for (const event of decisionEvents) {
      const eventStart = new Date(event.start_time).getTime();

      if (currentBatch.length === 0) {
        // Start new batch
        currentBatch = [event];
        batchStart = event.start_time;
        lastEventEnd = eventStart + (event.duration_minutes || 30) * 60000;
      } else {
        // Check if this event is within batch time gap
        const gap = (eventStart - lastEventEnd) / (1000 * 60); // minutes

        if (gap <= this.MAX_BATCH_TIME_GAP) {
          // Add to current batch
          currentBatch.push(event);
          lastEventEnd = eventStart + (event.duration_minutes || 30) * 60000;
        } else {
          // Close current batch if it has enough events
          if (currentBatch.length >= this.MIN_DECISION_BATCH_SIZE && batchStart) {
            batches.push({
              startTime: batchStart,
              endTime: new Date(lastEventEnd).toISOString(),
              durationMinutes: (lastEventEnd - new Date(batchStart).getTime()) / (1000 * 60),
              attentionType: ATTENTION_TYPES.DECIDE,
              items: currentBatch
            });
          }

          // Start new batch
          currentBatch = [event];
          batchStart = event.start_time;
          lastEventEnd = eventStart + (event.duration_minutes || 30) * 60000;
        }
      }
    }

    // Close final batch
    if (currentBatch.length >= this.MIN_DECISION_BATCH_SIZE && batchStart) {
      batches.push({
        startTime: batchStart,
        endTime: new Date(lastEventEnd).toISOString(),
        durationMinutes: (lastEventEnd - new Date(batchStart).getTime()) / (1000 * 60),
        attentionType: ATTENTION_TYPES.DECIDE,
        items: currentBatch
      });
    }

    return batches;
  }
};

// Multiplier Mode Behaviors
export const MultiplierModeBehaviors = {
  // Maximum personal Create time per day (encourage delegation)
  MAX_PERSONAL_CREATE_TIME: 120, // 2 hours

  // Minimum Connect time per day
  MIN_DAILY_CONNECT_TIME: 120, // 2 hours

  // Ideal delegation ratio (delegated work : personal work)
  IDEAL_DELEGATION_RATIO: 3.0,

  /**
   * Analyze timeline items for Multiplier mode optimization
   */
  analyzeTimeline(items: TimelineItem[]): RoleBehaviorAnalysis {
    const suggestions: RoleBehaviorSuggestion[] = [];
    const focusBlocks = this.identifyConnectionBlocks(items);
    const contextSwitches = MakerModeBehaviors.calculateContextSwitches(items);

    // Check for excessive personal Create time
    const personalCreateTime = items
      .filter(item => item.attention_type === ATTENTION_TYPES.CREATE)
      .reduce((total, item) => total + (item.duration_minutes || 0), 0);

    if (personalCreateTime > this.MAX_PERSONAL_CREATE_TIME) {
      suggestions.push({
        type: 'warning',
        title: 'Consider Delegating Create Work',
        description: `${personalCreateTime} minutes of Create work scheduled. Multipliers work best when delegating creation to others.`,
        severity: 'medium',
        actionable: true
      });
    }

    // Check for insufficient Connect time
    const connectTime = items
      .filter(item => item.attention_type === ATTENTION_TYPES.CONNECT)
      .reduce((total, item) => total + (item.duration_minutes || 0), 0);

    if (connectTime < this.MIN_DAILY_CONNECT_TIME) {
      suggestions.push({
        type: 'suggestion',
        title: 'Increase Team Connection Time',
        description: `Only ${connectTime} minutes of Connect time scheduled. Multipliers need at least ${this.MIN_DAILY_CONNECT_TIME} minutes for team enablement.`,
        severity: 'medium',
        actionable: true
      });
    }

    // Check for delegation opportunities
    const delegationOpportunities = this.identifyDelegationOpportunities(items);
    if (delegationOpportunities.length > 0) {
      suggestions.push({
        type: 'suggestion',
        title: 'Delegation Opportunities',
        description: `${delegationOpportunities.length} events could potentially be delegated. Consider empowering team members.`,
        severity: 'low',
        actionable: true
      });
    }

    // Check for context provision before delegated work
    const missingContextEvents = this.findDelegatedWorkWithoutContext(items);
    if (missingContextEvents.length > 0) {
      suggestions.push({
        type: 'suggestion',
        title: 'Add Context Sessions',
        description: `${missingContextEvents.length} delegated items lack preceding context/setup sessions.`,
        severity: 'low',
        actionable: true
      });
    }

    const roleCompatibilityScore = this.calculateMultiplierCompatibility(items, suggestions);

    return {
      suggestions,
      focusBlocks,
      contextSwitches,
      roleCompatibilityScore
    };
  },

  /**
   * Identify events suitable for delegation
   */
  identifyDelegationOpportunities(items: TimelineItem[]): TimelineItem[] {
    return items.filter(item => {
      // Create and Review tasks are often delegatable
      if (item.attention_type === ATTENTION_TYPES.CREATE ||
          item.attention_type === ATTENTION_TYPES.REVIEW) {

        // Don't suggest delegating non-negotiable items
        if (item.is_non_negotiable) return false;

        // Don't suggest delegating high-priority strategic work
        if (item.priority && item.priority >= 5) return false;

        // Tasks longer than 60 minutes are good delegation candidates
        return (item.duration_minutes || 0) >= 60;
      }

      return false;
    });
  },

  /**
   * Check if there's adequate context provision before delegated work
   */
  findDelegatedWorkWithoutContext(): TimelineItem[] {
    // This would integrate with delegation system when implemented
    // For now, return empty array
    return [];
  },

  calculateMultiplierCompatibility(items: TimelineItem[], suggestions: RoleBehaviorSuggestion[]): number {
    let score = 100;

    // Penalize excessive personal Create time
    const createTime = items
      .filter(item => item.attention_type === ATTENTION_TYPES.CREATE)
      .reduce((total, item) => total + (item.duration_minutes || 0), 0);

    if (createTime > this.MAX_PERSONAL_CREATE_TIME) {
      const excess = createTime - this.MAX_PERSONAL_CREATE_TIME;
      score -= Math.floor(excess / 30) * 10; // -10 points per 30 minutes over
    }

    // Bonus for adequate Connect time
    const connectTime = items
      .filter(item => item.attention_type === ATTENTION_TYPES.CONNECT)
      .reduce((total, item) => total + (item.duration_minutes || 0), 0);

    if (connectTime >= this.MIN_DAILY_CONNECT_TIME) {
      score += 15;
    }

    // Penalize for suggestions
    score -= suggestions.filter(s => s.severity === 'high').length * 25;
    score -= suggestions.filter(s => s.severity === 'medium').length * 15;
    score -= suggestions.filter(s => s.severity === 'low').length * 5;

    return Math.max(0, Math.min(100, score));
  },

  identifyConnectionBlocks(items: TimelineItem[]): FocusBlock[] {
    return items
      .filter(item => item.attention_type === ATTENTION_TYPES.CONNECT && item.duration_minutes)
      .map(item => {
        const startTime = new Date(item.start_time);
        const endTime = new Date(startTime.getTime() + item.duration_minutes! * 60000);

        return {
          startTime: item.start_time,
          endTime: endTime.toISOString(),
          durationMinutes: item.duration_minutes!,
          attentionType: item.attention_type as AttentionType,
          items: [item]
        };
      });
  }
};

/**
 * Get role-specific behavior analysis based on current role
 */
export function analyzeRoleBehavior(
  role: RoleMode,
  items: TimelineItem[]
): RoleBehaviorAnalysis {
  switch (role) {
    case ROLE_MODES.MAKER:
      return MakerModeBehaviors.analyzeTimeline(items);
    case ROLE_MODES.MARKER:
      return MarkerModeBehaviors.analyzeTimeline(items);
    case ROLE_MODES.MULTIPLIER:
      return MultiplierModeBehaviors.analyzeTimeline(items);
    default:
      return {
        suggestions: [],
        focusBlocks: [],
        contextSwitches: 0,
        roleCompatibilityScore: 100
      };
  }
}

/**
 * Get role-specific duration suggestions
 */
export function getRoleDurationSuggestion(
  role: RoleMode,
  attentionType: AttentionType,
  defaultDuration: number
): number {
  switch (role) {
    case ROLE_MODES.MAKER:
      return MakerModeBehaviors.suggestDuration(attentionType, defaultDuration);
    case ROLE_MODES.MARKER:
      // Markers prefer shorter, focused sessions
      return attentionType === ATTENTION_TYPES.DECIDE ?
        Math.min(defaultDuration, 60) : // Max 60 min for decisions
        defaultDuration;
    case ROLE_MODES.MULTIPLIER:
      // Multipliers prefer shorter blocks with more connection time
      return attentionType === ATTENTION_TYPES.CONNECT ?
        Math.max(defaultDuration, 30) : // Min 30 min for connections
        Math.min(defaultDuration, 90); // Max 90 min for other types
    default:
      return defaultDuration;
  }
}

/**
 * Validate new event against role-specific patterns
 */
export function validateNewEventForRole(
  role: RoleMode,
  newEvent: { start_time: string; duration_minutes: number; attention_type: AttentionType },
  existingItems: TimelineItem[]
): RoleBehaviorSuggestion[] {
  switch (role) {
    case ROLE_MODES.MAKER:
      return MakerModeBehaviors.validateNewEvent(newEvent, existingItems);
    case ROLE_MODES.MARKER:
      if (newEvent.attention_type === ATTENTION_TYPES.DECIDE) {
        return MarkerModeBehaviors.suggestDecisionBatching(newEvent, existingItems);
      }
      return [];
    case ROLE_MODES.MULTIPLIER:
      // Could add Multiplier-specific validation here
      return [];
    default:
      return [];
  }
}