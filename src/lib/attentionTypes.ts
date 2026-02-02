// 3-2-1 Attention System - Data Models and Types

// Core attention types
export const ATTENTION_TYPES = {
  CREATE: 'create',
  DECIDE: 'decide',
  CONNECT: 'connect',
  REVIEW: 'review',
  RECOVER: 'recover'
} as const;

export type AttentionType = typeof ATTENTION_TYPES[keyof typeof ATTENTION_TYPES];

// User attention preferences interface (matches database schema)
export interface UserAttentionPreferences {
  id: string;
  user_id: string;
  current_role: RoleMode;
  current_zone: ZoneContext;
  non_negotiable_title?: string | null;
  non_negotiable_weekly_hours: number;
  non_negotiable_enabled?: boolean;
  attention_budgets: {
    decide: number;
    context_switches: number;
    meetings: number;
  };
  peak_hours_start: string; // HH:MM format
  peak_hours_end: string; // HH:MM format
  created_at: string;
  updated_at: string;
}

// Role modes for productivity optimization
export const ROLE_MODES = {
  MAKER: 'maker',
  MARKER: 'marker',
  MULTIPLIER: 'multiplier'
} as const;

export type RoleMode = typeof ROLE_MODES[keyof typeof ROLE_MODES];

// Zone contexts for attention management
export const ZONE_CONTEXTS = {
  WARTIME: 'wartime',
  PEACETIME: 'peacetime'
} as const;

export type ZoneContext = typeof ZONE_CONTEXTS[keyof typeof ZONE_CONTEXTS];

// Trust levels for delegation
export const TRUST_LEVELS = {
  NEW: 'new',
  EXPERIENCED: 'experienced',
  EXPERT: 'expert'
} as const;

export type TrustLevel = typeof TRUST_LEVELS[keyof typeof TRUST_LEVELS];

// Attention type descriptions for UI
export const ATTENTION_TYPE_DESCRIPTIONS = {
  [ATTENTION_TYPES.CREATE]: {
    label: 'Create',
    description: 'Deep focus work requiring sustained attention',
    icon: '🎯',
    color: '#3b82f6',
    examples: ['Writing', 'Coding', 'Design', 'Analysis']
  },
  [ATTENTION_TYPES.DECIDE]: {
    label: 'Decide',
    description: 'Decision-making and problem-solving tasks',
    icon: '⚖️',
    color: '#f59e0b',
    examples: ['Planning', 'Evaluating options', 'Approvals', 'Strategy']
  },
  [ATTENTION_TYPES.CONNECT]: {
    label: 'Connect',
    description: 'Communication and collaboration activities',
    icon: '🤝',
    color: '#10b981',
    examples: ['Meetings', 'Calls', 'Networking', 'Presentations']
  },
  [ATTENTION_TYPES.REVIEW]: {
    label: 'Review',
    description: 'Assessment and quality control activities',
    icon: '🔍',
    color: '#8b5cf6',
    examples: ['Code review', 'Proofreading', 'Testing', 'Auditing']
  },
  [ATTENTION_TYPES.RECOVER]: {
    label: 'Recover',
    description: 'Low-attention activities for mental restoration',
    icon: '🌱',
    color: '#06b6d4',
    examples: ['Admin tasks', 'Email cleanup', 'Organizing', 'Breaks']
  }
} as const;

// Role mode descriptions and behaviors
export const ROLE_MODE_DESCRIPTIONS = {
  [ROLE_MODES.MAKER]: {
    label: 'Maker',
    description: 'Deep work mode - protect focus time and minimize interruptions',
    icon: '🛠️',
    color: '#3b82f6',
    behaviors: {
      preferredAttentionTypes: [ATTENTION_TYPES.CREATE, ATTENTION_TYPES.REVIEW],
      minimumFocusBlockMinutes: 120,
      maxMeetingsPerDay: 2,
      contextSwitchPenalty: 3,
      peakHoursProtection: true
    },
    tips: [
      'Schedule Create blocks during peak hours',
      'Batch meetings to minimize interruptions',
      'Use Recover time between intense Create sessions'
    ]
  },
  [ROLE_MODES.MARKER]: {
    label: 'Marker',
    description: 'Decision-focused mode - cluster choices and minimize decision fatigue',
    icon: '📋',
    color: '#f59e0b',
    behaviors: {
      preferredAttentionTypes: [ATTENTION_TYPES.DECIDE, ATTENTION_TYPES.REVIEW],
      maxDecisionsPerBlock: 5,
      decisionBatchingMinutes: 90,
      contextSwitchPenalty: 2,
      peakHoursProtection: false
    },
    tips: [
      'Group all Decide tasks into focused blocks',
      'Schedule decisions during high-energy times',
      'Build in Recover time after decision blocks'
    ]
  },
  [ROLE_MODES.MULTIPLIER]: {
    label: 'Multiplier',
    description: 'Delegation mode - enable others and manage strategic initiatives',
    icon: '🎯',
    color: '#10b981',
    behaviors: {
      preferredAttentionTypes: [ATTENTION_TYPES.CONNECT, ATTENTION_TYPES.DECIDE],
      maxDirectWorkPercentage: 30,
      delegationOpportunityThreshold: 60, // minutes
      contextSwitchPenalty: 1,
      peakHoursProtection: false
    },
    tips: [
      'Delegate tasks longer than 1 hour',
      'Focus on Connect activities to enable others',
      'Reserve Create time for strategic work only'
    ]
  }
} as const;

// Zone context descriptions and behaviors
export const ZONE_CONTEXT_DESCRIPTIONS = {
  [ZONE_CONTEXTS.WARTIME]: {
    label: 'Wartime',
    description: 'High-pressure mode with strict priorities and limited flexibility',
    icon: '⚔️',
    color: '#ef4444',
    behaviors: {
      nonNegotiableEnforcement: true,
      flexibilityFactor: 0.2,
      interruptionTolerance: 0.1,
      meetingLimitMultiplier: 0.5
    },
    tips: [
      'Ruthlessly protect non-negotiable time',
      'Defer all non-essential activities',
      'Minimize context switching'
    ]
  },
  [ZONE_CONTEXTS.PEACETIME]: {
    label: 'Peacetime',
    description: 'Balanced mode with room for exploration and collaboration',
    icon: '🕊️',
    color: '#10b981',
    behaviors: {
      nonNegotiableEnforcement: false,
      flexibilityFactor: 1.0,
      interruptionTolerance: 0.7,
      meetingLimitMultiplier: 1.0
    },
    tips: [
      'Explore new opportunities',
      'Build relationships through Connect time',
      'Invest in learning and development'
    ]
  }
} as const;

// Trust level descriptions for delegation
export const TRUST_LEVEL_DESCRIPTIONS = {
  [TRUST_LEVELS.NEW]: {
    label: 'New',
    description: 'First-time delegate requiring close guidance',
    icon: '🌱',
    color: '#f59e0b',
    followUpSchedule: {
      initialCheckMinutes: 60,
      regularCheckHours: 4,
      completionReviewRequired: true
    },
    tips: [
      'Work alongside delegate initially',
      'Provide detailed instructions and examples',
      'Check progress frequently'
    ]
  },
  [TRUST_LEVELS.EXPERIENCED]: {
    label: 'Experienced',
    description: 'Proven delegate needing periodic check-ins',
    icon: '📈',
    color: '#10b981',
    followUpSchedule: {
      initialCheckMinutes: 240,
      regularCheckHours: 24,
      completionReviewRequired: false
    },
    tips: [
      'Review steps and milestones together',
      'Schedule checkpoint meetings',
      'Focus on outcomes rather than process'
    ]
  },
  [TRUST_LEVELS.EXPERT]: {
    label: 'Expert',
    description: 'Trusted delegate requiring minimal oversight',
    icon: '⭐',
    color: '#8b5cf6',
    followUpSchedule: {
      initialCheckMinutes: 0,
      regularCheckHours: 72,
      completionReviewRequired: false
    },
    tips: [
      'Provide context and unblocking support',
      'Trust their process completely',
      'Focus on strategic alignment only'
    ]
  }
} as const;

// Default attention budgets by role
export const DEFAULT_ATTENTION_BUDGETS = {
  [ROLE_MODES.MAKER]: {
    decide: 1,
    context_switches: 2,
    meetings: 2
  },
  [ROLE_MODES.MARKER]: {
    decide: 4,
    context_switches: 3,
    meetings: 4
  },
  [ROLE_MODES.MULTIPLIER]: {
    decide: 3,
    context_switches: 5,
    meetings: 6
  }
} as const;

// Context switch cost calculator
export function calculateContextSwitchCost(
  fromType: AttentionType | null,
  toType: AttentionType,
  roleMode: RoleMode
): number {
  // No cost if no previous type
  if (!fromType) return 0;

  // No cost if same type
  if (fromType === toType) return 0;

  // Base costs by transition type
  const baseCosts: Record<string, number> = {
    [`${ATTENTION_TYPES.CREATE}-${ATTENTION_TYPES.DECIDE}`]: 3,
    [`${ATTENTION_TYPES.CREATE}-${ATTENTION_TYPES.CONNECT}`]: 4,
    [`${ATTENTION_TYPES.CREATE}-${ATTENTION_TYPES.REVIEW}`]: 1,
    [`${ATTENTION_TYPES.CREATE}-${ATTENTION_TYPES.RECOVER}`]: 1,
    [`${ATTENTION_TYPES.DECIDE}-${ATTENTION_TYPES.CREATE}`]: 2,
    [`${ATTENTION_TYPES.DECIDE}-${ATTENTION_TYPES.CONNECT}`]: 2,
    [`${ATTENTION_TYPES.DECIDE}-${ATTENTION_TYPES.REVIEW}`]: 1,
    [`${ATTENTION_TYPES.DECIDE}-${ATTENTION_TYPES.RECOVER}`]: 1,
    [`${ATTENTION_TYPES.CONNECT}-${ATTENTION_TYPES.CREATE}`]: 3,
    [`${ATTENTION_TYPES.CONNECT}-${ATTENTION_TYPES.DECIDE}`]: 2,
    [`${ATTENTION_TYPES.CONNECT}-${ATTENTION_TYPES.REVIEW}`]: 2,
    [`${ATTENTION_TYPES.CONNECT}-${ATTENTION_TYPES.RECOVER}`]: 1,
    [`${ATTENTION_TYPES.REVIEW}-${ATTENTION_TYPES.CREATE}`]: 2,
    [`${ATTENTION_TYPES.REVIEW}-${ATTENTION_TYPES.DECIDE}`]: 1,
    [`${ATTENTION_TYPES.REVIEW}-${ATTENTION_TYPES.CONNECT}`]: 2,
    [`${ATTENTION_TYPES.REVIEW}-${ATTENTION_TYPES.RECOVER}`]: 1,
    [`${ATTENTION_TYPES.RECOVER}-${ATTENTION_TYPES.CREATE}`]: 1,
    [`${ATTENTION_TYPES.RECOVER}-${ATTENTION_TYPES.DECIDE}`]: 1,
    [`${ATTENTION_TYPES.RECOVER}-${ATTENTION_TYPES.CONNECT}`]: 1,
    [`${ATTENTION_TYPES.RECOVER}-${ATTENTION_TYPES.REVIEW}`]: 1
  };

  const transitionKey = `${fromType}-${toType}`;
  const baseCost = baseCosts[transitionKey] || 2;

  // Apply role-specific penalties with fallback for invalid roleMode
  const roleDescription = ROLE_MODE_DESCRIPTIONS[roleMode];
  const rolePenalty = roleDescription?.behaviors?.contextSwitchPenalty ?? 2; // Default penalty if roleMode is invalid

  return Math.min(baseCost * rolePenalty, 10); // Cap at 10
}

// Attention type compatibility checker
export function getAttentionTypeCompatibility(
  attentionType: AttentionType,
  roleMode: RoleMode
): 'high' | 'medium' | 'low' {
  const roleDescription = ROLE_MODE_DESCRIPTIONS[roleMode];
  const preferred = roleDescription?.behaviors?.preferredAttentionTypes ?? [];

  if (preferred.includes(attentionType)) {
    return 'high';
  }

  // Special compatibility rules
  if (roleMode === ROLE_MODES.MULTIPLIER && attentionType === ATTENTION_TYPES.REVIEW) {
    return 'medium';
  }

  if (roleMode === ROLE_MODES.MAKER && attentionType === ATTENTION_TYPES.CONNECT) {
    return 'low';
  }

  return 'medium';
}

// Helper to get role-appropriate defaults
export function getRoleDefaults(roleMode: RoleMode): {
  attentionBudgets: typeof DEFAULT_ATTENTION_BUDGETS[RoleMode];
  peakHoursStart: string;
  peakHoursEnd: string;
} {
  const budgets = DEFAULT_ATTENTION_BUDGETS[roleMode];

  // Peak hours vary by role
  const peakHours = {
    [ROLE_MODES.MAKER]: { start: '09:00', end: '12:00' },
    [ROLE_MODES.MARKER]: { start: '10:00', end: '11:30' },
    [ROLE_MODES.MULTIPLIER]: { start: '14:00', end: '16:00' }
  };

  return {
    attentionBudgets: budgets,
    peakHoursStart: peakHours[roleMode].start,
    peakHoursEnd: peakHours[roleMode].end
  };
}

// Validation helpers
export function isValidAttentionType(type: string): type is AttentionType {
  return (Object.values(ATTENTION_TYPES) as string[]).includes(type);
}

export function isValidRoleMode(role: string): role is RoleMode {
  return (Object.values(ROLE_MODES) as string[]).includes(role);
}

export function isValidZoneContext(zone: string): zone is ZoneContext {
  return (Object.values(ZONE_CONTEXTS) as string[]).includes(zone);
}

export function isValidTrustLevel(level: string): level is TrustLevel {
  return (Object.values(TRUST_LEVELS) as string[]).includes(level);
}