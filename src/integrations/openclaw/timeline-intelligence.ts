// OpenClaw Timeline Intelligence Engine
// Continuously observes timeline content and makes proactive scheduling decisions
import { getSkillExecutor } from './skill-executor';
import type { TimelineEvent } from './client';
import { getUserSession } from './session-manager';
import { getAuthBridge } from './auth-bridge';
import { supabase } from '@/integrations/supabase/client';

// Intelligence analysis results
export interface TimelineAnalysis {
  patterns: {
    workingHours: { start: string; end: string };
    peakProductivityTimes: string[];
    commonMeetingTimes: string[];
    averageTaskDurations: Record<string, number>;
    breakFrequency: number;
    contextSwitchTolerance: number;
  };
  opportunities: {
    bufferTimeNeeded: Array<{ afterEvent: string; duration: number; reason: string }>;
    conflictResolutions: Array<{ events: string[]; suggestion: string }>;
    focusBlockCreation: Array<{ suggestedTime: string; duration: number; reason: string }>;
    scheduleOptimizations: Array<{ type: string; description: string; impact: string }>;
  };
  proactiveActions: Array<{
    type: 'add_buffer' | 'resolve_conflict' | 'create_focus_block' | 'optimize_order' | 'suggest_reschedule';
    description: string;
    confidence: number;
    autoExecute: boolean;
    proposedChanges: TimelineEvent[];
  }>;
  insights: {
    overallHealth: 'excellent' | 'good' | 'needs_attention' | 'problematic';
    stressLevel: number; // 0-1
    productivityPotential: number; // 0-1
    learningRecommendations: string[];
  };
}

// Proactive action results
export interface ProactiveAction {
  id: string;
  type: string;
  description: string;
  executedAt: Date;
  confidence: number;
  userApproved?: boolean;
  results?: {
    eventsModified: number;
    timeOptimized: number; // minutes
    conflictsResolved: number;
    userSatisfaction?: number; // 0-1
  };
}

// Timeline Intelligence Engine - OpenClaw Controlled
export class TimelineIntelligenceEngine {
  private skillExecutor = getSkillExecutor();
  private authBridge = getAuthBridge();
  private analysisInterval: NodeJS.Timeout | null = null;
  private proactiveActionsEnabled = true;
  private lastAnalysis: TimelineAnalysis | null = null;
  private actionHistory: ProactiveAction[] = [];

  // Observation frequencies
  private readonly ANALYSIS_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly PROACTIVE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private readonly LEARNING_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startIntelligenceLoop();
  }

  // Start the main intelligence loop - OpenClaw continuously observes and acts
  private startIntelligenceLoop() {
    // Continuous timeline analysis
    this.analysisInterval = setInterval(async () => {
      try {
        await this.performTimelineAnalysis();

        if (this.proactiveActionsEnabled) {
          await this.executeProactiveActions();
        }

        // Update learning periodically
        if (this.shouldUpdateLearning()) {
          await this.updateLearningProfiles();
        }

      } catch (error) {
        console.error('Timeline intelligence error:', error);
      }
    }, this.ANALYSIS_INTERVAL);

    console.log('OpenClaw Timeline Intelligence Engine started');
  }

  // Core analysis - OpenClaw examines current timeline state
  async performTimelineAnalysis(): Promise<TimelineAnalysis | null> {
    const authState = this.authBridge.getCurrentAuthState();

    if (!authState?.isAuthenticated || !authState.permissions.canUseOpenClaw) {
      return null;
    }

    try {
      // Get current timeline events
      const events = await this.getCurrentTimelineEvents();

      if (events.length === 0) {
        return null;
      }

      // Get user session for context
      const session = await getUserSession(authState.user!.id);

      // OpenClaw analyzes the timeline comprehensively
      const analysis = await this.skillExecutor.executeSkill('comprehensive-timeline-analysis', {
        events,
        userProfile: session?.learningProfile,
        analysisDepth: 'proactive_assistant',
        includeOptimizations: true,
        includeProactiveActions: true
      });

      const timelineAnalysis: TimelineAnalysis = {
        patterns: analysis.patterns || {},
        opportunities: analysis.opportunities || {
          bufferTimeNeeded: [],
          conflictResolutions: [],
          focusBlockCreation: [],
          scheduleOptimizations: []
        },
        proactiveActions: analysis.proactiveActions || [],
        insights: analysis.insights || {
          overallHealth: 'good',
          stressLevel: 0.3,
          productivityPotential: 0.7,
          learningRecommendations: []
        }
      };

      this.lastAnalysis = timelineAnalysis;

      // Store analysis for learning
      await this.storeAnalysisResults(timelineAnalysis);

      console.log('OpenClaw timeline analysis complete:', {
        opportunities: timelineAnalysis.opportunities,
        proactiveActions: timelineAnalysis.proactiveActions.length,
        overallHealth: timelineAnalysis.insights.overallHealth
      });

      return timelineAnalysis;

    } catch (error) {
      console.error('Timeline analysis failed:', error);
      return null;
    }
  }

  // Execute proactive actions - OpenClaw takes autonomous actions
  private async executeProactiveActions(): Promise<void> {
    if (!this.lastAnalysis?.proactiveActions?.length) {
      return;
    }

    const authState = this.authBridge.getCurrentAuthState();

    for (const action of this.lastAnalysis.proactiveActions) {
      // Only auto-execute high-confidence actions
      if (action.autoExecute && action.confidence > 0.8) {
        try {
          console.log(`OpenClaw executing proactive action: ${action.description}`);

          const result = await this.executeAction(action);

          if (result.success) {
            // Log successful proactive action
            await this.logProactiveAction({
              id: `action_${Date.now()}`,
              type: action.type,
              description: action.description,
              executedAt: new Date(),
              confidence: action.confidence,
              results: result.results
            });

            // Update timeline with changes
            if (action.proposedChanges?.length) {
              await this.applyTimelineChanges(action.proposedChanges);
            }

            console.log(`✅ Proactive action completed: ${action.description}`);
          }

        } catch (error) {
          console.error(`❌ Proactive action failed: ${action.description}`, error);
        }
      } else if (action.confidence > 0.6) {
        // Medium confidence actions become suggestions
        await this.createProactiveSuggestion(action);
      }
    }
  }

  // Execute a specific proactive action via OpenClaw
  private async executeAction(action: TimelineAnalysis['proactiveActions'][0]) {
    try {
      const result = await this.skillExecutor.executeSkill(`execute-${action.type}`, {
        description: action.description,
        proposedChanges: action.proposedChanges,
        confidence: action.confidence,
        userContext: await this.getUserContext()
      });

      return {
        success: result.success || false,
        results: result.data?.results || {}
      };

    } catch (error) {
      console.error('Action execution failed:', error);
      return { success: false, results: {} };
    }
  }

  // Get current timeline events from database
  private async getCurrentTimelineEvents(): Promise<TimelineEvent[]> {
    try {
      const authState = this.authBridge.getCurrentAuthState();

      if (!authState?.user?.id) {
        return [];
      }

      // Get events from next 14 days for analysis
      const startDate = new Date();
      const endDate = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000));

      const { data: timelineItems, error } = await supabase
        .from('timeline_items')
        .select('*')
        .eq('user_id', authState.user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (error) {
        console.error('Failed to fetch timeline events:', error);
        return [];
      }

      // Convert database items to TimelineEvent format
      return (timelineItems || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        startTime: new Date(item.start_time),
        endTime: item.end_time ? new Date(item.end_time) : undefined,
        duration: item.duration_minutes,
        type: item.type || 'task',
        priority: item.priority || 'medium',
        tags: item.tags || [],
        metadata: item.metadata || {}
      }));

    } catch (error) {
      console.error('Error fetching timeline events:', error);
      return [];
    }
  }

  // Apply timeline changes from proactive actions
  private async applyTimelineChanges(changes: TimelineEvent[]): Promise<void> {
    const authState = this.authBridge.getCurrentAuthState();

    if (!authState?.user?.id) {
      return;
    }

    for (const event of changes) {
      try {
        if (event.id) {
          // Update existing event
          await supabase
            .from('timeline_items')
            .update({
              title: event.title,
              description: event.description,
              start_time: event.startTime.toISOString(),
              end_time: event.endTime?.toISOString(),
              duration_minutes: event.duration,
              type: event.type,
              priority: event.priority,
              tags: event.tags,
              metadata: {
                ...event.metadata,
                proactivelyModified: true,
                lastModifiedBy: 'openclaw'
              }
            })
            .eq('id', event.id)
            .eq('user_id', authState.user.id);
        } else {
          // Create new event
          await supabase
            .from('timeline_items')
            .insert({
              user_id: authState.user.id,
              title: event.title,
              description: event.description,
              start_time: event.startTime.toISOString(),
              end_time: event.endTime?.toISOString(),
              duration_minutes: event.duration,
              type: event.type,
              priority: event.priority,
              tags: event.tags,
              metadata: {
                ...event.metadata,
                proactivelyCreated: true,
                createdBy: 'openclaw'
              }
            });
        }
      } catch (error) {
        console.error('Failed to apply timeline change:', error);
      }
    }
  }

  // Create suggestion for medium-confidence actions
  private async createProactiveSuggestion(action: TimelineAnalysis['proactiveActions'][0]): Promise<void> {
    // Store suggestion for user review
    const authState = this.authBridge.getCurrentAuthState();

    if (!authState?.user?.id) {
      return;
    }

    try {
      await supabase
        .from('proactive_suggestions')
        .insert({
          user_id: authState.user.id,
          type: action.type,
          description: action.description,
          confidence: action.confidence,
          proposed_changes: action.proposedChanges,
          created_at: new Date().toISOString(),
          status: 'pending'
        });

      console.log(`💡 Created proactive suggestion: ${action.description}`);

    } catch (error) {
      console.error('Failed to create suggestion:', error);
    }
  }

  // Get user context for OpenClaw decision making
  private async getUserContext(): Promise<any> {
    const authState = this.authBridge.getCurrentAuthState();

    if (!authState?.user?.id) {
      return {};
    }

    const session = await getUserSession(authState.user.id);

    return {
      userId: authState.user.id,
      learningProfile: session?.learningProfile,
      recentActions: this.actionHistory.slice(-10),
      preferences: await this.getUserPreferences(),
      currentTimeContext: {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: new Date(),
        workingHours: session?.learningProfile?.preferences?.workingHours
      }
    };
  }

  // Get user preferences from database
  private async getUserPreferences(): Promise<any> {
    const authState = this.authBridge.getCurrentAuthState();

    if (!authState?.user?.id) {
      return {};
    }

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', authState.user.id)
        .single();

      return settings || {};
    } catch (error) {
      return {};
    }
  }

  // Store analysis results for learning
  private async storeAnalysisResults(analysis: TimelineAnalysis): Promise<void> {
    const authState = this.authBridge.getCurrentAuthState();

    if (!authState?.user?.id) {
      return;
    }

    try {
      await supabase
        .from('timeline_analysis_history')
        .insert({
          user_id: authState.user.id,
          analysis_data: analysis,
          analysis_timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store analysis results:', error);
    }
  }

  // Log proactive action for learning
  private async logProactiveAction(action: ProactiveAction): Promise<void> {
    this.actionHistory.push(action);

    // Keep only last 50 actions in memory
    if (this.actionHistory.length > 50) {
      this.actionHistory = this.actionHistory.slice(-50);
    }

    // Store in database
    const authState = this.authBridge.getCurrentAuthState();

    if (authState?.user?.id) {
      try {
        await supabase
          .from('proactive_actions_log')
          .insert({
            user_id: authState.user.id,
            action_type: action.type,
            description: action.description,
            confidence: action.confidence,
            executed_at: action.executedAt.toISOString(),
            results: action.results
          });
      } catch (error) {
        console.error('Failed to log proactive action:', error);
      }
    }
  }

  // Update learning profiles based on recent actions and feedback
  private async updateLearningProfiles(): Promise<void> {
    const recentActions = this.actionHistory.slice(-20);

    if (recentActions.length === 0) {
      return;
    }

    try {
      const learningUpdate = await this.skillExecutor.executeSkill('update-learning-from-actions', {
        recentActions,
        analysisHistory: this.lastAnalysis,
        userContext: await this.getUserContext()
      });

      if (learningUpdate.success) {
        console.log('✅ Learning profiles updated based on proactive actions');
      }

    } catch (error) {
      console.error('Failed to update learning profiles:', error);
    }
  }

  // Check if learning should be updated
  private shouldUpdateLearning(): boolean {
    // Update learning every hour or after significant actions
    const significantActions = this.actionHistory.filter(action =>
      action.confidence > 0.8 && action.results?.userSatisfaction !== undefined
    ).length;

    return significantActions >= 3;
  }

  // Get current analysis results
  getCurrentAnalysis(): TimelineAnalysis | null {
    return this.lastAnalysis;
  }

  // Get recent proactive actions
  getRecentActions(limit = 10): ProactiveAction[] {
    return this.actionHistory.slice(-limit);
  }

  // Enable/disable proactive actions
  setProactiveActionsEnabled(enabled: boolean) {
    this.proactiveActionsEnabled = enabled;
    console.log(`Proactive actions ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Manually trigger analysis (for testing or immediate needs)
  async triggerAnalysis(): Promise<TimelineAnalysis | null> {
    console.log('Manually triggering timeline analysis...');
    return await this.performTimelineAnalysis();
  }

  // Clean up resources
  destroy() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    console.log('Timeline Intelligence Engine stopped');
  }
}

// Singleton instance - OpenClaw intelligence running continuously
let globalTimelineIntelligence: TimelineIntelligenceEngine | null = null;

// Get or create timeline intelligence engine
export function getTimelineIntelligenceEngine(): TimelineIntelligenceEngine {
  if (!globalTimelineIntelligence) {
    globalTimelineIntelligence = new TimelineIntelligenceEngine();
  }
  return globalTimelineIntelligence;
}

// Start timeline intelligence (call once at app startup)
export function startTimelineIntelligence() {
  return getTimelineIntelligenceEngine();
}

// Get current timeline health and insights
export async function getTimelineInsights(): Promise<TimelineAnalysis | null> {
  const engine = getTimelineIntelligenceEngine();
  return engine.getCurrentAnalysis() || await engine.triggerAnalysis();
}