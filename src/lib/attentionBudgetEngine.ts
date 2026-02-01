// Core attention budget engine with real-time warnings and optimization
import {
  AttentionType,
  ATTENTION_TYPES,
  ROLE_MODES,
  calculateContextSwitchCost
} from './attentionTypes';
import { TimelineItem } from './timelineUtils';

// Extended interface for budget engine that includes all attention type budgets
export interface UserAttentionPreferences {
  current_role: string;
  peak_hours_start: string;
  peak_hours_end: string;
  attention_budgets?: {
    [K in AttentionType]?: number;
  };
  context_switch_limit?: number;
}

export interface AttentionWarning {
  level: 'info' | 'warning' | 'critical' | 'blocking';
  type: 'budget_limit' | 'context_switch' | 'focus_fragmentation' | 'peak_hours' | 'decision_fatigue';
  title: string;
  description: string;
  suggestion?: string;
  actionable: boolean;
  severity: number; // 1-10 scale
  affectedItems?: string[]; // Timeline item IDs
  suggestedActions?: AttentionAction[];
}

export interface AttentionAction {
  id: string;
  label: string;
  description: string;
  type: 'reschedule' | 'batch' | 'delegate' | 'optimize' | 'skip';
  targetTime?: string;
  targetItems?: string[];
  confidence: number; // 0-1 scale
}

export interface BudgetViolation {
  attentionType: AttentionType;
  currentUsage: number;
  budgetLimit: number;
  usagePercentage: number;
  severity: 'approaching' | 'exceeded' | 'critical';
  projectedOverage?: number;
}

export interface ContextSwitchAnalysis {
  totalSwitches: number;
  budgetLimit: number;
  costScore: number; // 0-100 scale
  severity: 'optimal' | 'acceptable' | 'high' | 'excessive';
  switchPoints: {
    time: string;
    fromType: AttentionType;
    toType: AttentionType;
    cost: number;
  }[];
}

export interface PeakHoursAnalysis {
  peakHoursStart: string;
  peakHoursEnd: string;
  highAttentionInPeakHours: number; // percentage
  highAttentionOutsidePeakHours: number; // percentage
  misplacedItems: {
    item: TimelineItem;
    suggestedTime: string;
    reason: string;
  }[];
  optimizationScore: number; // 0-100 scale
}

export interface AttentionBudgetAnalysis {
  budgetViolations: BudgetViolation[];
  contextSwitchAnalysis: ContextSwitchAnalysis;
  peakHoursAnalysis: PeakHoursAnalysis;
  warnings: AttentionWarning[];
  overallScore: number; // 0-100 scale
  recommendations: string[];
}

// Warning thresholds by role
const ROLE_WARNING_THRESHOLDS = {
  [ROLE_MODES.MAKER]: {
    contextSwitches: { warning: 3, critical: 5 },
    decisionLimit: { warning: 2, critical: 4 },
    focusBlockMinDuration: 120, // 2 hours
    peakHoursMinUsage: 70 // % of Create work should be in peak hours
  },
  [ROLE_MODES.MARKER]: {
    contextSwitches: { warning: 5, critical: 8 },
    decisionLimit: { warning: 4, critical: 7 },
    decisionBatchMaxGap: 120, // 2 hours
    reviewBeforeDecisionHours: 4
  },
  [ROLE_MODES.MULTIPLIER]: {
    contextSwitches: { warning: 6, critical: 10 },
    personalCreateMaxTime: 120, // 2 hours
    connectMinTime: 120, // 2 hours minimum
    delegationOpportunityThreshold: 60 // minutes
  }
} as const;

// Zone-based adjustments (for future enhancement)
const ZONE_ADJUSTMENTS = {
  wartime: {
    contextSwitchTolerance: 0.8, // 20% stricter
    focusProtectionMultiplier: 1.5,
    urgencyBoost: 2
  },
  peacetime: {
    contextSwitchTolerance: 1.2, // 20% more lenient
    focusProtectionMultiplier: 0.8,
    urgencyBoost: 0.5
  }
} as const;

/**
 * Analyze attention budget usage and generate warnings/recommendations
 */
export function analyzeAttentionBudget(
  items: TimelineItem[],
  preferences: UserAttentionPreferences,
  targetDate: Date = new Date()
): AttentionBudgetAnalysis {

  const todaysItems = items.filter(item => {
    const itemDate = new Date(item.start_time);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const itemDateStr = itemDate.toISOString().split('T')[0];
    return itemDateStr === targetDateStr;
  });

  // Calculate budget violations
  const budgetViolations = calculateBudgetViolations(todaysItems, preferences);

  // Analyze context switching
  const contextSwitchAnalysis = analyzeContextSwitches(todaysItems, preferences);

  // Analyze peak hours usage
  const peakHoursAnalysis = analyzePeakHoursUsage(todaysItems, preferences);

  // Generate warnings
  const warnings = generateWarnings(budgetViolations, contextSwitchAnalysis, peakHoursAnalysis, preferences);

  // Calculate overall optimization score
  const overallScore = calculateOverallScore(budgetViolations, contextSwitchAnalysis, peakHoursAnalysis);

  // Generate recommendations
  const recommendations = generateRecommendations(budgetViolations, contextSwitchAnalysis, peakHoursAnalysis, preferences);

  return {
    budgetViolations,
    contextSwitchAnalysis,
    peakHoursAnalysis,
    warnings,
    overallScore,
    recommendations
  };
}

/**
 * Check if adding a new event would violate attention budgets
 */
export function checkNewEventViolations(
  newEvent: { start_time: string; duration_minutes: number; attention_type: AttentionType },
  existingItems: TimelineItem[],
  preferences: UserAttentionPreferences
): AttentionWarning[] {

  const eventDate = new Date(newEvent.start_time);
  const todaysItems = existingItems.filter(item => {
    const itemDate = new Date(item.start_time);
    const eventDateStr = eventDate.toISOString().split('T')[0];
    const itemDateStr = itemDate.toISOString().split('T')[0];
    return itemDateStr === eventDateStr;
  });

  // Create simulated item for analysis
  const simulatedItem: Partial<TimelineItem> = {
    start_time: newEvent.start_time,
    duration_minutes: newEvent.duration_minutes,
    attention_type: newEvent.attention_type,
    id: 'simulated'
  };

  const itemsWithNew = [...todaysItems, simulatedItem as TimelineItem];
  const analysis = analyzeAttentionBudget(itemsWithNew, preferences, eventDate);

  // Filter warnings that are specifically caused by the new event
  return analysis.warnings.filter(warning =>
    warning.level === 'critical' || warning.level === 'blocking'
  );
}

function calculateBudgetViolations(
  items: TimelineItem[],
  preferences: UserAttentionPreferences
): BudgetViolation[] {

  const violations: BudgetViolation[] = [];
  const budgets = preferences.attention_budgets || {};

  // Check each attention type budget
  Object.values(ATTENTION_TYPES).forEach(attentionType => {
    const limit = budgets[attentionType] || getDefaultBudgetLimit(attentionType, preferences.current_role);
    if (limit <= 0) return;

    const usage = items
      .filter(item => item.attention_type === attentionType)
      .reduce((total, item) => total + (item.duration_minutes || 0), 0);

    const usagePercentage = (usage / limit) * 100;

    if (usagePercentage >= 80) { // Warning at 80%
      const severity = usagePercentage >= 150 ? 'critical' :
                      usagePercentage >= 100 ? 'exceeded' : 'approaching';

      violations.push({
        attentionType,
        currentUsage: usage,
        budgetLimit: limit,
        usagePercentage,
        severity,
        projectedOverage: usagePercentage > 100 ? usage - limit : undefined
      });
    }
  });

  return violations;
}

function analyzeContextSwitches(
  items: TimelineItem[],
  preferences: UserAttentionPreferences
): ContextSwitchAnalysis {

  const sortedItems = items
    .filter(item => item.attention_type)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const switchPoints: ContextSwitchAnalysis['switchPoints'] = [];
  let totalCost = 0;

  for (let i = 1; i < sortedItems.length; i++) {
    const prev = sortedItems[i - 1];
    const curr = sortedItems[i];

    if (prev.attention_type !== curr.attention_type) {
      const cost = calculateContextSwitchCost(
        prev.attention_type as AttentionType,
        curr.attention_type as AttentionType,
        preferences.current_role || ROLE_MODES.MAKER
      );

      switchPoints.push({
        time: curr.start_time,
        fromType: prev.attention_type as AttentionType,
        toType: curr.attention_type as AttentionType,
        cost
      });

      totalCost += cost;
    }
  }

  const role = preferences.current_role || ROLE_MODES.MAKER;
  const thresholds = ROLE_WARNING_THRESHOLDS[role];
  const contextSwitchLimit = thresholds?.contextSwitches || { warning: 5, critical: 8 };

  const totalSwitches = switchPoints.length;

  // Role-specific optimal thresholds
  const optimalThreshold = role === ROLE_MODES.MAKER ? 1 : 2;

  const severity = totalSwitches >= contextSwitchLimit.critical ? 'excessive' :
                   totalSwitches >= contextSwitchLimit.warning ? 'high' :
                   totalSwitches <= optimalThreshold ? 'optimal' : 'acceptable';

  return {
    totalSwitches,
    budgetLimit: contextSwitchLimit.warning,
    costScore: Math.min(100, totalCost * 10), // Scale to 0-100
    severity,
    switchPoints
  };
}

function analyzePeakHoursUsage(
  items: TimelineItem[],
  preferences: UserAttentionPreferences
): PeakHoursAnalysis {

  const peakStart = preferences.peak_hours_start || '09:00';
  const peakEnd = preferences.peak_hours_end || '12:00';

  const [peakStartHour, peakStartMinute] = peakStart.split(':').map(Number);
  const [peakEndHour, peakEndMinute] = peakEnd.split(':').map(Number);

  const highAttentionTypes = [ATTENTION_TYPES.CREATE, ATTENTION_TYPES.DECIDE];

  let inPeakHours = 0;
  let outsidePeakHours = 0;
  const misplacedItems: PeakHoursAnalysis['misplacedItems'] = [];

  items
    .filter(item => item.attention_type && highAttentionTypes.includes(item.attention_type as typeof highAttentionTypes[number]))
    .forEach(item => {
      const itemTime = new Date(item.start_time);
      const itemHour = itemTime.getUTCHours();
      const itemMinute = itemTime.getUTCMinutes();

      const isInPeakHours = (
        itemHour > peakStartHour ||
        (itemHour === peakStartHour && itemMinute >= peakStartMinute)
      ) && (
        itemHour < peakEndHour ||
        (itemHour === peakEndHour && itemMinute <= peakEndMinute)
      );

      const duration = item.duration_minutes || 0;

      if (isInPeakHours) {
        inPeakHours += duration;
      } else {
        outsidePeakHours += duration;

        // Suggest moving to peak hours if possible
        const suggestedTime = new Date(itemTime);
        suggestedTime.setHours(peakStartHour, peakStartMinute, 0, 0);

        misplacedItems.push({
          item,
          suggestedTime: suggestedTime.toISOString(),
          reason: `${item.attention_type} work is more effective during peak attention hours`
        });
      }
    });

  const totalHighAttentionTime = inPeakHours + outsidePeakHours;
  const peakHoursPercentage = totalHighAttentionTime > 0 ?
    (inPeakHours / totalHighAttentionTime) * 100 : 100;

  const role = preferences.current_role || ROLE_MODES.MAKER;
  const thresholds = ROLE_WARNING_THRESHOLDS[role];
  const targetPercentage = (role === ROLE_MODES.MAKER && 'peakHoursMinUsage' in thresholds) ?
    thresholds.peakHoursMinUsage : 70;

  const optimizationScore = Math.min(100, (peakHoursPercentage / targetPercentage) * 100);

  return {
    peakHoursStart: peakStart,
    peakHoursEnd: peakEnd,
    highAttentionInPeakHours: peakHoursPercentage,
    highAttentionOutsidePeakHours: 100 - peakHoursPercentage,
    misplacedItems: misplacedItems.slice(0, 3), // Limit suggestions
    optimizationScore
  };
}

function generateWarnings(
  budgetViolations: BudgetViolation[],
  contextSwitchAnalysis: ContextSwitchAnalysis,
  peakHoursAnalysis: PeakHoursAnalysis,
  preferences: UserAttentionPreferences
): AttentionWarning[] {

  const warnings: AttentionWarning[] = [];

  // Budget violation warnings
  budgetViolations.forEach(violation => {
    const level = violation.severity === 'critical' ? 'blocking' :
                  violation.severity === 'exceeded' ? 'critical' : 'warning';

    warnings.push({
      level,
      type: 'budget_limit',
      title: `${violation.attentionType.toUpperCase()} Budget ${violation.severity === 'exceeded' ? 'Exceeded' : 'Warning'}`,
      description: `${Math.round(violation.usagePercentage)}% of daily ${violation.attentionType} budget used (${Math.round(violation.currentUsage / 60 * 10) / 10}h of ${Math.round(violation.budgetLimit / 60 * 10) / 10}h limit)`,
      suggestion: violation.severity === 'exceeded' ?
        'Consider delegating or rescheduling some tasks' :
        'Monitor remaining tasks to avoid exceeding budget',
      actionable: true,
      severity: Math.round(violation.usagePercentage / 10)
    });
  });

  // Context switch warnings
  if (contextSwitchAnalysis.severity === 'high' || contextSwitchAnalysis.severity === 'excessive') {
    warnings.push({
      level: contextSwitchAnalysis.severity === 'excessive' ? 'critical' : 'warning',
      type: 'context_switch',
      title: 'Excessive Context Switching',
      description: `${contextSwitchAnalysis.totalSwitches} attention switches detected (limit: ${contextSwitchAnalysis.budgetLimit})`,
      suggestion: 'Consider batching similar types of work together',
      actionable: true,
      severity: contextSwitchAnalysis.severity === 'excessive' ? 8 : 6,
      suggestedActions: [{
        id: 'batch-similar',
        label: 'Batch Similar Work',
        description: 'Group similar attention types together to reduce switching',
        type: 'batch',
        confidence: 0.8
      }]
    });
  }

  // Peak hours optimization warnings
  if (peakHoursAnalysis.optimizationScore < 60 && peakHoursAnalysis.misplacedItems.length > 0) {
    warnings.push({
      level: 'info',
      type: 'peak_hours',
      title: 'Peak Hours Optimization',
      description: `Only ${Math.round(peakHoursAnalysis.highAttentionInPeakHours)}% of high-attention work scheduled during peak hours`,
      suggestion: `Move Create/Decide work to ${peakHoursAnalysis.peakHoursStart}-${peakHoursAnalysis.peakHoursEnd} for better performance`,
      actionable: true,
      severity: 4,
      affectedItems: peakHoursAnalysis.misplacedItems.map(item => item.item.id || ''),
      suggestedActions: peakHoursAnalysis.misplacedItems.map((misplaced, index) => ({
        id: `move-to-peak-${index}`,
        label: `Move to ${new Date(misplaced.suggestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        description: misplaced.reason,
        type: 'reschedule',
        targetTime: misplaced.suggestedTime,
        targetItems: [misplaced.item.id || ''],
        confidence: 0.7
      }))
    });
  }

  // Decision fatigue warning for Marker mode
  if (preferences.current_role === ROLE_MODES.MARKER) {
    const decisionEvents = budgetViolations.find(v => v.attentionType === ATTENTION_TYPES.DECIDE);
    if (decisionEvents && decisionEvents.currentUsage > 180) { // 3+ hours of decisions
      warnings.push({
        level: 'warning',
        type: 'decision_fatigue',
        title: 'Decision Fatigue Risk',
        description: `${Math.round(decisionEvents.currentUsage / 60 * 10) / 10}h of decision work scheduled`,
        suggestion: 'Consider batching decisions or delegating some choices',
        actionable: true,
        severity: 6
      });
    }
  }

  return warnings.sort((a, b) => b.severity - a.severity);
}

function calculateOverallScore(
  budgetViolations: BudgetViolation[],
  contextSwitchAnalysis: ContextSwitchAnalysis,
  peakHoursAnalysis: PeakHoursAnalysis
): number {

  let score = 100;

  // Penalize budget violations
  budgetViolations.forEach(violation => {
    const penalty = violation.severity === 'critical' ? 30 :
                   violation.severity === 'exceeded' ? 20 : 10;
    score -= penalty;
  });

  // Penalize excessive context switching
  const switchPenalty = Math.max(0, (contextSwitchAnalysis.totalSwitches - 3) * 5);
  score -= switchPenalty;

  // Bonus for good peak hours usage
  if (peakHoursAnalysis.optimizationScore >= 80) {
    score += 10;
  } else if (peakHoursAnalysis.optimizationScore < 40) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function generateRecommendations(
  budgetViolations: BudgetViolation[],
  contextSwitchAnalysis: ContextSwitchAnalysis,
  peakHoursAnalysis: PeakHoursAnalysis,
  preferences: UserAttentionPreferences
): string[] {

  const recommendations: string[] = [];

  if (budgetViolations.length > 0) {
    recommendations.push('Consider delegating or rescheduling some tasks to stay within attention budgets');
  }

  if (contextSwitchAnalysis.severity === 'high' || contextSwitchAnalysis.severity === 'excessive') {
    recommendations.push('Batch similar types of work together to reduce context switching costs');
  }

  if (peakHoursAnalysis.optimizationScore < 60) {
    recommendations.push(`Schedule Create and Decide work during peak hours (${peakHoursAnalysis.peakHoursStart}-${peakHoursAnalysis.peakHoursEnd})`);
  }

  if (preferences.current_role === ROLE_MODES.MULTIPLIER) {
    recommendations.push('Focus on Connect events and delegation to multiply team effectiveness');
  }

  if (preferences.current_role === ROLE_MODES.MAKER && contextSwitchAnalysis.totalSwitches > 3) {
    recommendations.push('Protect focus blocks by minimizing interruptions and context switches');
  }

  return recommendations;
}

function getDefaultBudgetLimit(attentionType: AttentionType, role?: string): number {
  // Default daily limits in minutes
  const defaults: Record<AttentionType, number> = {
    [ATTENTION_TYPES.CREATE]: 240, // 4 hours
    [ATTENTION_TYPES.DECIDE]: 120, // 2 hours
    [ATTENTION_TYPES.CONNECT]: 180, // 3 hours
    [ATTENTION_TYPES.REVIEW]: 120, // 2 hours
    [ATTENTION_TYPES.RECOVER]: 60   // 1 hour
  };

  // Role-specific adjustments
  if (role === ROLE_MODES.MAKER && attentionType === ATTENTION_TYPES.CREATE) {
    return 360; // 6 hours for Makers
  }

  if (role === ROLE_MODES.MULTIPLIER && attentionType === ATTENTION_TYPES.CONNECT) {
    return 240; // 4 hours for Multipliers
  }

  return defaults[attentionType] || 120;
}