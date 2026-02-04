// OpenClaw Integration for AI Query Hub 2.0
// Phase 1: Complete Infrastructure Implementation

// Core OpenClaw Gateway Client
export {
  OpenClawClient,
  getOpenClawClient,
  isOpenClawEnabled,
  executeSkillWithFallback,
  type TimelineEvent,
  type UserCorrection,
  type OpenClawSkillParams,
  type OpenClawSkillResponse
} from './client';

// User Session & Workspace Management
export {
  OpenClawSessionManager,
  getSessionManager,
  getUserSession,
  updateUserLearning,
  type UserWorkspaceSession,
  type UserLearningProfile
} from './session-manager';

// Skill Execution Framework
export {
  OpenClawSkillExecutor,
  getSkillExecutor,
  extractTimelineFromText,
  optimizeSchedule,
  parseDocument,
  type SkillCategory,
  type TimelineExtractionParams,
  type TimelineExtractionResponse,
  type ScheduleOptimizationParams,
  type ScheduleOptimizationResponse,
  type DocumentParsingParams,
  type DocumentParsingResponse,
  type LearningAnalysisParams,
  type LearningAnalysisResponse,
  type SkillDefinition
} from './skill-executor';

// Authentication Bridge
export {
  OpenClawAuthBridge,
  getAuthBridge,
  useOpenClawAuth,
  initializeOpenClawAuth,
  type AuthState,
  type SecurityContext
} from './auth-bridge';

// Phase 2: Proactive Intelligence (New in v2.0)
export {
  TimelineIntelligenceEngine,
  getTimelineIntelligenceEngine,
  startTimelineIntelligence,
  getTimelineInsights,
  type TimelineAnalysis,
  type ProactiveAction
} from './timeline-intelligence';

export {
  OpenClawProactiveAssistant,
  getProactiveAssistant,
  startProactiveAssistant,
  useProactiveAssistant,
  type AssistantCapability,
  type AssistantAction,
  type UserPattern
} from './proactive-assistant';

// Version information
export const OPENCLAW_INTEGRATION_VERSION = '2.0.0';
export const SUPPORTED_SKILL_CATEGORIES = [
  'timeline-extraction',
  'schedule-optimization',
  'document-parsing',
  'learning-analysis',
  'pattern-recognition',
  'task-classification',
  'content-analysis',
  'workflow-automation'
] as const;