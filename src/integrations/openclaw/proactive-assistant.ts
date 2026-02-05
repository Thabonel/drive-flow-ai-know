// OpenClaw Proactive Scheduling Assistant
// Orchestrates all OpenClaw intelligence for seamless user experience
import {
  getTimelineIntelligenceEngine,
  getTimelineInsights,
  type TimelineAnalysis
} from './timeline-intelligence';
import {
  extractTimelineFromText,
  getSkillExecutor,
  type TimelineExtractionResponse
} from './skill-executor';
import type { TimelineEvent } from './client';
import { useOpenClawAuth } from './auth-bridge';
import { getUserSession } from './session-manager';

// Proactive assistant capabilities
export interface AssistantCapability {
  name: string;
  description: string;
  confidence: number;
  enabled: boolean;
  lastUsed?: Date;
}

// Assistant action result
export interface AssistantAction {
  type: 'suggestion' | 'automatic' | 'improvement';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timeEstimate?: string;
  previewChanges?: TimelineEvent[];
}

// User interaction patterns detected by OpenClaw
export interface UserPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  suggestions: string[];
}

// Main Proactive Assistant class - OpenClaw Orchestrator
export class OpenClawProactiveAssistant {
  private intelligenceEngine = getTimelineIntelligenceEngine();
  private skillExecutor = getSkillExecutor();
  private isActive = false;
  private userPatterns: UserPattern[] = [];
  private capabilities: AssistantCapability[] = [];

  constructor() {
    this.initializeCapabilities();
  }

  // Initialize all OpenClaw capabilities
  private initializeCapabilities() {
    this.capabilities = [
      {
        name: 'Smart Schedule Parsing',
        description: 'Extract timeline events from natural language descriptions',
        confidence: 0.95,
        enabled: true
      },
      {
        name: 'Conflict Resolution',
        description: 'Automatically detect and resolve scheduling conflicts',
        confidence: 0.88,
        enabled: true
      },
      {
        name: 'Buffer Time Management',
        description: 'Add intelligent buffer times between events',
        confidence: 0.92,
        enabled: true
      },
      {
        name: 'Focus Block Creation',
        description: 'Create optimized focus blocks for deep work',
        confidence: 0.85,
        enabled: true
      },
      {
        name: 'Pattern Learning',
        description: 'Learn from your behavior to improve suggestions',
        confidence: 0.90,
        enabled: true
      },
      {
        name: 'Proactive Optimization',
        description: 'Continuously optimize your schedule for productivity',
        confidence: 0.83,
        enabled: true
      },
      {
        name: 'Context Awareness',
        description: 'Understand meeting types and adapt scheduling accordingly',
        confidence: 0.87,
        enabled: true
      },
      {
        name: 'Deadline Management',
        description: 'Automatically schedule prep work before deadlines',
        confidence: 0.91,
        enabled: true
      }
    ];
  }

  // Start the proactive assistant
  async start(): Promise<void> {
    if (this.isActive) return;

    console.log('🤖 Starting OpenClaw Proactive Scheduling Assistant...');

    try {
      // Initialize intelligence engine
      this.intelligenceEngine = getTimelineIntelligenceEngine();

      // Load user patterns
      await this.loadUserPatterns();

      this.isActive = true;

      console.log('✅ OpenClaw Assistant is now active and learning');

    } catch (error) {
      console.error('Failed to start proactive assistant:', error);
      throw error;
    }
  }

  // Process natural language input - Main smart input handler
  async processSmartInput(input: string, context?: {
    urgency?: 'low' | 'medium' | 'high';
    project?: string;
    timeframe?: string;
  }): Promise<{
    success: boolean;
    events: TimelineEvent[];
    confidence: number;
    suggestions: string[];
    improvements: AssistantAction[];
  }> {
    console.log('🧠 OpenClaw processing smart input:', input);

    try {
      // Use OpenClaw to extract timeline events with context
      const extraction = await extractTimelineFromText(input, {
        learningEnabled: true,
        contextHints: {
          projectType: context?.project || 'general',
          urgency: context?.urgency || 'medium',
          estimationStyle: 'realistic'
        }
      });

      // Get additional optimization suggestions
      const optimization = await this.skillExecutor.executeSkill('optimize-extracted-schedule', {
        events: extraction.events,
        originalInput: input,
        userContext: await this.getUserContext()
      });

      // Learn from this interaction
      await this.learnFromInteraction(input, extraction);

      // Generate improvement suggestions
      const improvements = await this.generateImprovements(extraction.events);

      return {
        success: true,
        events: extraction.events,
        confidence: extraction.confidence,
        suggestions: extraction.suggestions?.optimizations || [],
        improvements
      };

    } catch (error) {
      console.error('Smart input processing failed:', error);
      return {
        success: false,
        events: [],
        confidence: 0,
        suggestions: [`Error processing input: ${error.message}`],
        improvements: []
      };
    }
  }

  // Get current assistant insights and recommendations
  async getInsights(): Promise<{
    timelineHealth: TimelineAnalysis | null;
    userPatterns: UserPattern[];
    recommendations: AssistantAction[];
    capabilities: AssistantCapability[];
  }> {
    try {
      const timelineHealth = await getTimelineInsights();
      const recommendations = await this.generateRecommendations();

      return {
        timelineHealth,
        userPatterns: this.userPatterns,
        recommendations,
        capabilities: this.capabilities
      };

    } catch (error) {
      console.error('Failed to get insights:', error);
      return {
        timelineHealth: null,
        userPatterns: [],
        recommendations: [],
        capabilities: this.capabilities
      };
    }
  }

  // Generate personalized recommendations based on OpenClaw analysis
  private async generateRecommendations(): Promise<AssistantAction[]> {
    const recommendations: AssistantAction[] = [];

    try {
      const insights = await getTimelineInsights();

      if (!insights) return recommendations;

      // Convert OpenClaw opportunities to user-friendly recommendations
      for (const opportunity of insights.opportunities.scheduleOptimizations) {
        recommendations.push({
          type: 'suggestion',
          title: this.getRecommendationTitle(opportunity.type),
          description: opportunity.description,
          confidence: 0.8, // Default confidence
          impact: this.getImpactLevel(opportunity.impact),
          timeEstimate: '2-5 minutes'
        });
      }

      // Add focus block suggestions
      for (const focusBlock of insights.opportunities.focusBlockCreation) {
        recommendations.push({
          type: 'improvement',
          title: '🎯 Create Focus Block',
          description: focusBlock.reason,
          confidence: 0.85,
          impact: 'high',
          timeEstimate: `${focusBlock.duration} minutes`
        });
      }

      // Add buffer time suggestions
      for (const buffer of insights.opportunities.bufferTimeNeeded) {
        recommendations.push({
          type: 'automatic',
          title: '⏰ Add Buffer Time',
          description: buffer.reason,
          confidence: 0.9,
          impact: 'medium',
          timeEstimate: `${buffer.duration} minutes`
        });
      }

    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }

    return recommendations;
  }

  // Generate improvements based on extracted events
  private async generateImprovements(events: TimelineEvent[]): Promise<AssistantAction[]> {
    const improvements: AssistantAction[] = [];

    try {
      // Use OpenClaw to analyze the events and suggest improvements
      const analysis = await this.skillExecutor.executeSkill('analyze-schedule-improvements', {
        events,
        userContext: await this.getUserContext()
      });

      if (analysis.success && analysis.data?.improvements) {
        for (const improvement of analysis.data.improvements) {
          improvements.push({
            type: improvement.type || 'suggestion',
            title: improvement.title,
            description: improvement.description,
            confidence: improvement.confidence || 0.7,
            impact: improvement.impact || 'medium',
            timeEstimate: improvement.timeEstimate,
            previewChanges: improvement.previewChanges
          });
        }
      }

    } catch (error) {
      console.error('Failed to generate improvements:', error);
    }

    return improvements;
  }

  // Learn from user interactions
  private async learnFromInteraction(input: string, result: TimelineExtractionResponse): Promise<void> {
    try {
      // Extract patterns from the interaction
      const patterns = await this.skillExecutor.executeSkill('extract-user-patterns', {
        input,
        extractedEvents: result.events,
        confidence: result.confidence,
        timestamp: new Date()
      });

      if (patterns.success && patterns.data?.patterns) {
        // Update user patterns
        for (const pattern of patterns.data.patterns) {
          const existingPattern = this.userPatterns.find(p => p.pattern === pattern.pattern);

          if (existingPattern) {
            existingPattern.frequency += 1;
            existingPattern.lastSeen = new Date();
            existingPattern.confidence = Math.max(existingPattern.confidence, pattern.confidence);
          } else {
            this.userPatterns.push({
              pattern: pattern.pattern,
              frequency: 1,
              confidence: pattern.confidence,
              lastSeen: new Date(),
              suggestions: pattern.suggestions || []
            });
          }
        }

        // Keep only recent and frequent patterns
        this.userPatterns = this.userPatterns
          .filter(p => p.frequency > 1 || p.confidence > 0.8)
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 50);
      }

    } catch (error) {
      console.error('Failed to learn from interaction:', error);
    }
  }

  // Load user patterns from previous sessions
  private async loadUserPatterns(): Promise<void> {
    try {
      const session = await getUserSession();

      if (session?.learningProfile?.patterns) {
        // Convert stored patterns to current format
        this.userPatterns = Object.entries(session.learningProfile.patterns.averageTaskDuration)
          .map(([pattern, duration]) => ({
            pattern,
            frequency: 5, // Assume established patterns have been seen multiple times
            confidence: 0.8,
            lastSeen: session.learningProfile!.lastUpdated,
            suggestions: [`Typical duration: ${duration} minutes`]
          }));
      }

    } catch (error) {
      console.error('Failed to load user patterns:', error);
    }
  }

  // Get user context for OpenClaw decision making
  private async getUserContext(): Promise<any> {
    try {
      const session = await getUserSession();

      return {
        patterns: this.userPatterns,
        preferences: session?.learningProfile?.preferences,
        capabilities: this.capabilities,
        assistantActive: this.isActive
      };

    } catch (error) {
      console.error('Failed to get user context:', error);
      return {};
    }
  }

  // Helper methods
  private getRecommendationTitle(type: string): string {
    const titles: Record<string, string> = {
      'schedule_optimization': '📋 Optimize Schedule Order',
      'time_management': '⏰ Improve Time Management',
      'productivity': '🚀 Boost Productivity',
      'focus_improvement': '🎯 Enhance Focus',
      'conflict_resolution': '🔄 Resolve Conflicts'
    };
    return titles[type] || '💡 Smart Suggestion';
  }

  private getImpactLevel(impact: string): 'low' | 'medium' | 'high' {
    if (impact.includes('high') || impact.includes('significant')) return 'high';
    if (impact.includes('medium') || impact.includes('moderate')) return 'medium';
    return 'low';
  }

  // Get assistant status
  getStatus(): {
    active: boolean;
    capabilities: number;
    patterns: number;
    lastAnalysis: Date | null;
  } {
    return {
      active: this.isActive,
      capabilities: this.capabilities.filter(c => c.enabled).length,
      patterns: this.userPatterns.length,
      lastAnalysis: this.intelligenceEngine.getCurrentAnalysis() ? new Date() : null
    };
  }

  // Stop the assistant
  stop(): void {
    this.isActive = false;
    console.log('🤖 OpenClaw Assistant stopped');
  }
}

// Singleton instance
let globalProactiveAssistant: OpenClawProactiveAssistant | null = null;

// Get or create proactive assistant
export function getProactiveAssistant(): OpenClawProactiveAssistant {
  if (!globalProactiveAssistant) {
    globalProactiveAssistant = new OpenClawProactiveAssistant();
  }
  return globalProactiveAssistant;
}

// Start the proactive assistant (call once at app startup)
export async function startProactiveAssistant(): Promise<OpenClawProactiveAssistant> {
  const assistant = getProactiveAssistant();
  await assistant.start();
  return assistant;
}

// React hook for using the proactive assistant
export function useProactiveAssistant() {
  const assistant = getProactiveAssistant();
  const { authState } = useOpenClawAuth();

  return {
    assistant,
    isActive: assistant.getStatus().active,
    canUse: authState?.permissions?.canUseOpenClaw || false,
    processInput: (input: string, context?: any) => assistant.processSmartInput(input, context),
    getInsights: () => assistant.getInsights(),
    status: assistant.getStatus()
  };
}