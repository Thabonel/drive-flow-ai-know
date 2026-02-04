// OpenClaw Skill Execution Framework for AI Query Hub
// Provides type-safe interfaces and validation for community skills
import {
  getOpenClawClient,
  OpenClawSkillParams,
  TimelineEvent,
  UserCorrection
} from './client';
import { getUserSession, UserLearningProfile } from './session-manager';

// Skill Categories and Types
export type SkillCategory =
  | 'timeline-extraction'
  | 'schedule-optimization'
  | 'document-parsing'
  | 'learning-analysis'
  | 'pattern-recognition'
  | 'task-classification'
  | 'content-analysis'
  | 'workflow-automation';

// Timeline Extraction Skills
export interface TimelineExtractionParams extends OpenClawSkillParams {
  text: string;
  outputFormat: 'aiqueryhub_timeline' | 'ical' | 'json';
  learningEnabled?: boolean;
  userProfile?: Partial<UserLearningProfile>;
  contextHints?: {
    projectType?: string;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    estimationStyle?: 'conservative' | 'aggressive' | 'realistic';
  };
}

export interface TimelineExtractionResponse {
  events: TimelineEvent[];
  confidence: number;
  extractedPatterns: {
    recurring?: boolean;
    dependencies?: Array<{ from: string; to: string }>;
    priorities?: Record<string, string>;
    estimationQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  };
  suggestions: {
    optimizations?: string[];
    warnings?: string[];
    alternativeSchedules?: TimelineEvent[][];
  };
  metadata: {
    processingTime: number;
    skillsUsed: string[];
    learningApplied: boolean;
  };
}

// Schedule Optimization Skills
export interface ScheduleOptimizationParams extends OpenClawSkillParams {
  events: TimelineEvent[];
  constraints: {
    workingHours: { start: string; end: string };
    breaks: { duration: number; frequency: number };
    bufferTime: number;
    maxContextSwitches?: number;
  };
  optimization: 'minimize_time' | 'maximize_focus' | 'balance_workload' | 'minimize_stress';
  userPreferences?: {
    peakHours?: string[];
    avoidTimes?: string[];
    taskGrouping?: boolean;
  };
}

export interface ScheduleOptimizationResponse {
  optimizedSchedule: TimelineEvent[];
  improvements: {
    timesSaved: number; // minutes
    focusBlocksCreated: number;
    contextSwitchesReduced: number;
    stressReduction: number; // 0-1 scale
  };
  rationale: string[];
  alternativeOptions: TimelineEvent[][];
}

// Document Parsing Skills
export interface DocumentParsingParams extends OpenClawSkillParams {
  content: string;
  contentType: 'html' | 'markdown' | 'plain' | 'pdf' | 'docx';
  extractionGoals: Array<'tasks' | 'schedules' | 'priorities' | 'deadlines' | 'dependencies'>;
  contextFormat?: 'project_plan' | 'meeting_notes' | 'email' | 'document' | 'chat';
}

export interface DocumentParsingResponse {
  extractedData: {
    tasks?: Array<{ title: string; description?: string; priority?: string }>;
    schedules?: TimelineEvent[];
    deadlines?: Array<{ item: string; date: Date; importance: string }>;
    dependencies?: Array<{ prerequisite: string; dependent: string }>;
  };
  confidence: number;
  parsingQuality: 'excellent' | 'good' | 'fair' | 'poor';
  suggestions: string[];
}

// Learning Analysis Skills
export interface LearningAnalysisParams extends OpenClawSkillParams {
  corrections: UserCorrection[];
  timeframe: 'day' | 'week' | 'month' | 'quarter';
  analysisType: 'patterns' | 'accuracy' | 'preferences' | 'improvements';
}

export interface LearningAnalysisResponse {
  insights: {
    patterns: Array<{ pattern: string; frequency: number; confidence: number }>;
    accuracyTrends: { improving: boolean; rate: number; areas: string[] };
    preferences: Record<string, number>; // preference -> strength
  };
  recommendations: Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'easy' | 'moderate' | 'complex';
  }>;
  nextLearningFocus: string[];
}

// Skill Registry for Discovery and Validation
export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  description: string;
  version: string;
  requiredParams: string[];
  optionalParams: string[];
  outputSchema: any;
  examples: Array<{
    input: any;
    output: any;
    description: string;
  }>;
  performance: {
    averageExecutionTime: number; // milliseconds
    successRate: number; // 0-1
    lastTested: Date;
  };
}

// Core Skill Execution Framework
export class OpenClawSkillExecutor {
  private client = getOpenClawClient();
  private skillRegistry: Map<string, SkillDefinition> = new Map();
  private performanceMetrics: Map<string, {
    totalExecutions: number;
    successCount: number;
    averageTime: number;
    lastExecution: Date
  }> = new Map();

  constructor() {
    this.initializeSkillRegistry();
  }

  // Initialize skill registry with known skills
  private initializeSkillRegistry() {
    // Timeline extraction skills
    this.registerSkill({
      name: 'timeline-extraction',
      category: 'timeline-extraction',
      description: 'Extract timeline events from natural language text',
      version: '1.0.0',
      requiredParams: ['text', 'outputFormat'],
      optionalParams: ['learningEnabled', 'userProfile', 'contextHints'],
      outputSchema: {
        events: 'TimelineEvent[]',
        confidence: 'number',
        extractedPatterns: 'object',
        suggestions: 'object',
        metadata: 'object'
      },
      examples: [{
        input: { text: 'Team meeting every Monday at 9am for 1 hour', outputFormat: 'aiqueryhub_timeline' },
        output: { events: [/* example event */], confidence: 0.95 },
        description: 'Extract recurring meeting from text'
      }],
      performance: {
        averageExecutionTime: 2500,
        successRate: 0.94,
        lastTested: new Date()
      }
    });

    // Additional skills can be registered dynamically
    this.registerSkill({
      name: 'schedule-optimization',
      category: 'schedule-optimization',
      description: 'Optimize timeline events for better productivity',
      version: '1.0.0',
      requiredParams: ['events', 'constraints', 'optimization'],
      optionalParams: ['userPreferences'],
      outputSchema: {
        optimizedSchedule: 'TimelineEvent[]',
        improvements: 'object',
        rationale: 'string[]',
        alternativeOptions: 'TimelineEvent[][]'
      },
      examples: [{
        input: { events: [], constraints: {}, optimization: 'maximize_focus' },
        output: { optimizedSchedule: [], improvements: {} },
        description: 'Optimize schedule for focus blocks'
      }],
      performance: {
        averageExecutionTime: 3500,
        successRate: 0.91,
        lastTested: new Date()
      }
    });
  }

  // Register a new skill
  registerSkill(skill: SkillDefinition) {
    this.skillRegistry.set(skill.name, skill);
    console.log(`Registered OpenClaw skill: ${skill.name} (${skill.category})`);
  }

  // Get skill definition
  getSkillDefinition(skillName: string): SkillDefinition | undefined {
    return this.skillRegistry.get(skillName);
  }

  // List available skills by category
  getSkillsByCategory(category?: SkillCategory): SkillDefinition[] {
    const skills = Array.from(this.skillRegistry.values());
    return category ? skills.filter(skill => skill.category === category) : skills;
  }

  // Execute timeline extraction with validation
  async executeTimelineExtraction(params: TimelineExtractionParams): Promise<TimelineExtractionResponse> {
    const startTime = Date.now();

    try {
      // Get user session for learning context
      const session = await getUserSession();
      if (session && params.learningEnabled) {
        params.userProfile = session.learningProfile;
      }

      // Execute skill
      const response = await this.client.executeSkill('timeline-extraction', params);

      // Validate response
      if (!response.success) {
        throw new Error(response.error || 'Timeline extraction failed');
      }

      // Parse and validate response data
      const result = this.validateTimelineExtractionResponse(response.data);

      // Update performance metrics
      this.updatePerformanceMetrics('timeline-extraction', true, Date.now() - startTime);

      return result;

    } catch (error) {
      this.updatePerformanceMetrics('timeline-extraction', false, Date.now() - startTime);
      console.error('Timeline extraction failed:', error);
      throw error;
    }
  }

  // Execute schedule optimization with validation
  async executeScheduleOptimization(params: ScheduleOptimizationParams): Promise<ScheduleOptimizationResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.executeSkill('schedule-optimization', params);

      if (!response.success) {
        throw new Error(response.error || 'Schedule optimization failed');
      }

      const result = this.validateScheduleOptimizationResponse(response.data);
      this.updatePerformanceMetrics('schedule-optimization', true, Date.now() - startTime);

      return result;

    } catch (error) {
      this.updatePerformanceMetrics('schedule-optimization', false, Date.now() - startTime);
      console.error('Schedule optimization failed:', error);
      throw error;
    }
  }

  // Execute document parsing with validation
  async executeDocumentParsing(params: DocumentParsingParams): Promise<DocumentParsingResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.executeSkill('document-parsing', params);

      if (!response.success) {
        throw new Error(response.error || 'Document parsing failed');
      }

      const result = this.validateDocumentParsingResponse(response.data);
      this.updatePerformanceMetrics('document-parsing', true, Date.now() - startTime);

      return result;

    } catch (error) {
      this.updatePerformanceMetrics('document-parsing', false, Date.now() - startTime);
      console.error('Document parsing failed:', error);
      throw error;
    }
  }

  // Execute learning analysis
  async executeLearningAnalysis(params: LearningAnalysisParams): Promise<LearningAnalysisResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.executeSkill('learning-analysis', params);

      if (!response.success) {
        throw new Error(response.error || 'Learning analysis failed');
      }

      const result = this.validateLearningAnalysisResponse(response.data);
      this.updatePerformanceMetrics('learning-analysis', true, Date.now() - startTime);

      return result;

    } catch (error) {
      this.updatePerformanceMetrics('learning-analysis', false, Date.now() - startTime);
      console.error('Learning analysis failed:', error);
      throw error;
    }
  }

  // Generic skill execution with basic validation
  async executeSkill(skillName: string, params: OpenClawSkillParams): Promise<any> {
    const skill = this.getSkillDefinition(skillName);
    if (!skill) {
      throw new Error(`Unknown skill: ${skillName}`);
    }

    // Validate required parameters
    const missingParams = skill.requiredParams.filter(param => !(param in params));
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    const startTime = Date.now();

    try {
      const response = await this.client.executeSkill(skillName, params);

      if (!response.success) {
        throw new Error(response.error || `Skill ${skillName} failed`);
      }

      this.updatePerformanceMetrics(skillName, true, Date.now() - startTime);
      return response.data;

    } catch (error) {
      this.updatePerformanceMetrics(skillName, false, Date.now() - startTime);
      throw error;
    }
  }

  // Validate timeline extraction response
  private validateTimelineExtractionResponse(data: any): TimelineExtractionResponse {
    if (!data.events || !Array.isArray(data.events)) {
      throw new Error('Invalid timeline extraction response: missing events array');
    }

    // Validate each event
    data.events.forEach((event: any, index: number) => {
      if (!event.title || !event.startTime) {
        throw new Error(`Invalid event at index ${index}: missing title or startTime`);
      }

      // Convert string dates to Date objects
      if (typeof event.startTime === 'string') {
        event.startTime = new Date(event.startTime);
      }
      if (event.endTime && typeof event.endTime === 'string') {
        event.endTime = new Date(event.endTime);
      }
    });

    return {
      events: data.events,
      confidence: data.confidence || 0,
      extractedPatterns: data.extractedPatterns || {},
      suggestions: data.suggestions || {},
      metadata: data.metadata || {}
    };
  }

  // Validate schedule optimization response
  private validateScheduleOptimizationResponse(data: any): ScheduleOptimizationResponse {
    if (!data.optimizedSchedule || !Array.isArray(data.optimizedSchedule)) {
      throw new Error('Invalid schedule optimization response: missing optimizedSchedule');
    }

    return {
      optimizedSchedule: data.optimizedSchedule,
      improvements: data.improvements || {},
      rationale: data.rationale || [],
      alternativeOptions: data.alternativeOptions || []
    };
  }

  // Validate document parsing response
  private validateDocumentParsingResponse(data: any): DocumentParsingResponse {
    return {
      extractedData: data.extractedData || {},
      confidence: data.confidence || 0,
      parsingQuality: data.parsingQuality || 'fair',
      suggestions: data.suggestions || []
    };
  }

  // Validate learning analysis response
  private validateLearningAnalysisResponse(data: any): LearningAnalysisResponse {
    return {
      insights: data.insights || { patterns: [], accuracyTrends: {}, preferences: {} },
      recommendations: data.recommendations || [],
      nextLearningFocus: data.nextLearningFocus || []
    };
  }

  // Update performance metrics for a skill
  private updatePerformanceMetrics(skillName: string, success: boolean, executionTime: number) {
    const current = this.performanceMetrics.get(skillName) || {
      totalExecutions: 0,
      successCount: 0,
      averageTime: 0,
      lastExecution: new Date()
    };

    current.totalExecutions += 1;
    if (success) {
      current.successCount += 1;
    }

    // Update rolling average execution time
    current.averageTime = (current.averageTime * (current.totalExecutions - 1) + executionTime) / current.totalExecutions;
    current.lastExecution = new Date();

    this.performanceMetrics.set(skillName, current);

    // Update skill registry performance data
    const skill = this.skillRegistry.get(skillName);
    if (skill) {
      skill.performance.averageExecutionTime = current.averageTime;
      skill.performance.successRate = current.successCount / current.totalExecutions;
      skill.performance.lastTested = current.lastExecution;
    }
  }

  // Get performance metrics for a skill
  getPerformanceMetrics(skillName: string): {
    totalExecutions: number;
    successCount: number;
    averageTime: number;
    lastExecution: Date;
  } | undefined {
    return this.performanceMetrics.get(skillName);
  }

  // Get overall system health
  getSystemHealth(): {
    totalSkills: number;
    averageSuccessRate: number;
    averageExecutionTime: number;
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const metrics = Array.from(this.performanceMetrics.values());

    if (metrics.length === 0) {
      return { totalSkills: 0, averageSuccessRate: 0, averageExecutionTime: 0, healthStatus: 'poor' };
    }

    const avgSuccessRate = metrics.reduce((sum, m) => sum + (m.successCount / m.totalExecutions), 0) / metrics.length;
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.averageTime, 0) / metrics.length;

    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (avgSuccessRate > 0.95 && avgExecutionTime < 2000) healthStatus = 'excellent';
    else if (avgSuccessRate > 0.90 && avgExecutionTime < 5000) healthStatus = 'good';
    else if (avgSuccessRate > 0.80 && avgExecutionTime < 10000) healthStatus = 'fair';

    return {
      totalSkills: this.skillRegistry.size,
      averageSuccessRate: avgSuccessRate,
      averageExecutionTime: avgExecutionTime,
      healthStatus
    };
  }
}

// Singleton instance
let globalSkillExecutor: OpenClawSkillExecutor | null = null;

// Get or create skill executor
export function getSkillExecutor(): OpenClawSkillExecutor {
  if (!globalSkillExecutor) {
    globalSkillExecutor = new OpenClawSkillExecutor();
  }
  return globalSkillExecutor;
}

// Convenience functions for common operations
export async function extractTimelineFromText(
  text: string,
  options: Partial<TimelineExtractionParams> = {}
): Promise<TimelineExtractionResponse> {
  const executor = getSkillExecutor();
  return executor.executeTimelineExtraction({
    text,
    outputFormat: 'aiqueryhub_timeline',
    learningEnabled: true,
    ...options
  });
}

export async function optimizeSchedule(
  events: TimelineEvent[],
  options: Partial<ScheduleOptimizationParams> = {}
): Promise<ScheduleOptimizationResponse> {
  const executor = getSkillExecutor();
  return executor.executeScheduleOptimization({
    events,
    constraints: {
      workingHours: { start: '09:00', end: '17:00' },
      breaks: { duration: 15, frequency: 3 },
      bufferTime: 15,
      ...options.constraints
    },
    optimization: 'maximize_focus',
    ...options
  });
}

export async function parseDocument(
  content: string,
  contentType: DocumentParsingParams['contentType'] = 'plain',
  goals: DocumentParsingParams['extractionGoals'] = ['tasks', 'schedules']
): Promise<DocumentParsingResponse> {
  const executor = getSkillExecutor();
  return executor.executeDocumentParsing({
    content,
    contentType,
    extractionGoals: goals
  });
}