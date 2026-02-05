// OpenClaw Session Manager for AI Query Hub
// Manages user workspace isolation and session lifecycle
import { supabase } from '@/integrations/supabase/client';
import { getOpenClawClient, OpenClawClient, UserCorrection } from './client';

// Session and workspace types
export interface UserWorkspaceSession {
  workspaceId: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  learningProfile?: UserLearningProfile;
  metadata?: Record<string, any>;
}

export interface UserLearningProfile {
  userId: string;
  preferences: {
    workingHours: {
      start: string; // HH:mm format
      end: string;
    };
    timeZone: string;
    breakPreferences: {
      duration: number; // minutes
      frequency: number; // per day
    };
    focusBlocks: {
      preferredDuration: number; // minutes
      maxInterruptions: number;
    };
    meetingPreferences: {
      preferredTimes: string[];
      bufferTime: number; // minutes between meetings
    };
  };
  patterns: {
    averageTaskDuration: Record<string, number>; // task type -> minutes
    peakProductivityHours: string[];
    commonCorrections: UserCorrection[];
    schedulingAccuracy: {
      overestimation: number; // percentage
      underestimation: number;
    };
  };
  adaptations: {
    durationAdjustments: Record<string, number>; // task type -> multiplier
    timePreferenceWeights: Record<string, number>; // time slot -> preference weight
    contextSwitchPenalty: number;
  };
  lastUpdated: Date;
}

// Workspace Manager Class
export class OpenClawSessionManager {
  private activeSessions = new Map<string, UserWorkspaceSession>();
  private client: OpenClawClient;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.client = getOpenClawClient();
    this.startSessionCleanup();
  }

  // Create or get existing session for user
  async getOrCreateSession(userId: string): Promise<UserWorkspaceSession> {
    // Check if user already has an active session
    const existingSession = Array.from(this.activeSessions.values())
      .find(session => session.userId === userId && session.isActive);

    if (existingSession) {
      // Update last activity
      existingSession.lastActivity = new Date();
      return existingSession;
    }

    // Create new session
    const sessionId = `session_${userId}_${Date.now()}`;
    const workspaceId = `workspace_${userId}`;

    // Load or initialize learning profile
    const learningProfile = await this.loadUserLearningProfile(userId);

    const session: UserWorkspaceSession = {
      workspaceId,
      userId,
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      learningProfile,
      metadata: {}
    };

    // Initialize workspace in OpenClaw
    await this.initializeWorkspace(session);

    // Store session
    this.activeSessions.set(sessionId, session);

    console.log(`Created new OpenClaw session for user ${userId}: ${sessionId}`);
    return session;
  }

  // Initialize workspace in OpenClaw with user profile
  private async initializeWorkspace(session: UserWorkspaceSession): Promise<void> {
    try {
      // Setup workspace with learning profile
      await this.client.executeSkill('initialize-workspace', {
        workspaceId: session.workspaceId,
        userId: session.userId,
        learningProfile: session.learningProfile,
        sessionMetadata: {
          sessionId: session.sessionId,
          createdAt: session.createdAt.toISOString()
        }
      });

      // Load user's historical patterns if available
      if (session.learningProfile?.patterns) {
        await this.client.executeSkill('load-user-patterns', {
          userId: session.userId,
          patterns: session.learningProfile.patterns
        });
      }

    } catch (error) {
      console.error('Failed to initialize OpenClaw workspace:', error);
      // Don't throw - allow session to continue with limited functionality
    }
  }

  // Load user learning profile from database
  private async loadUserLearningProfile(userId: string): Promise<UserLearningProfile> {
    try {
      // Try to load from Supabase first
      const { data: profile, error } = await supabase
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && profile) {
        return this.parseStoredProfile(profile);
      }

      // If no profile exists, create default one
      const defaultProfile = this.createDefaultProfile(userId);

      // Store default profile in database
      await this.saveUserLearningProfile(defaultProfile);

      return defaultProfile;

    } catch (error) {
      console.warn('Failed to load user learning profile, using defaults:', error);
      return this.createDefaultProfile(userId);
    }
  }

  // Create default learning profile for new users
  private createDefaultProfile(userId: string): UserLearningProfile {
    return {
      userId,
      preferences: {
        workingHours: {
          start: '09:00',
          end: '17:00'
        },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        breakPreferences: {
          duration: 15,
          frequency: 3
        },
        focusBlocks: {
          preferredDuration: 90,
          maxInterruptions: 2
        },
        meetingPreferences: {
          preferredTimes: ['10:00', '14:00', '15:00'],
          bufferTime: 15
        }
      },
      patterns: {
        averageTaskDuration: {
          'meeting': 60,
          'task': 45,
          'deep-work': 120,
          'email': 20,
          'planning': 30
        },
        peakProductivityHours: ['09:00', '10:00', '14:00', '15:00'],
        commonCorrections: [],
        schedulingAccuracy: {
          overestimation: 0,
          underestimation: 0
        }
      },
      adaptations: {
        durationAdjustments: {},
        timePreferenceWeights: {},
        contextSwitchPenalty: 0.2
      },
      lastUpdated: new Date()
    };
  }

  // Parse stored profile from database
  private parseStoredProfile(storedProfile: any): UserLearningProfile {
    return {
      userId: storedProfile.user_id,
      preferences: storedProfile.preferences || {},
      patterns: storedProfile.patterns || {},
      adaptations: storedProfile.adaptations || {},
      lastUpdated: new Date(storedProfile.updated_at)
    };
  }

  // Save learning profile to database
  async saveUserLearningProfile(profile: UserLearningProfile): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_learning_profiles')
        .upsert({
          user_id: profile.userId,
          preferences: profile.preferences,
          patterns: profile.patterns,
          adaptations: profile.adaptations,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Failed to save learning profile:', error);
      }
    } catch (error) {
      console.error('Database error saving learning profile:', error);
    }
  }

  // Update user learning profile based on corrections
  async updateLearningProfile(userId: string, corrections: UserCorrection[]): Promise<void> {
    const session = Array.from(this.activeSessions.values())
      .find(s => s.userId === userId && s.isActive);

    if (!session || !session.learningProfile) {
      console.warn('No active session found for learning update');
      return;
    }

    // Process corrections to update patterns
    corrections.forEach(correction => {
      this.processCorrection(session.learningProfile!, correction);
    });

    // Update OpenClaw with new learning data
    try {
      await this.client.updateLearning(corrections);
    } catch (error) {
      console.error('Failed to update OpenClaw learning:', error);
    }

    // Save updated profile
    await this.saveUserLearningProfile(session.learningProfile);

    console.log(`Updated learning profile for user ${userId} with ${corrections.length} corrections`);
  }

  // Process individual correction to update patterns
  private processCorrection(profile: UserLearningProfile, correction: UserCorrection): void {
    const { originalEvent, correctedEvent, correctionType } = correction;

    // Update average durations based on corrections
    if (correctionType === 'duration' && originalEvent.type && originalEvent.duration && correctedEvent.duration) {
      const taskType = originalEvent.type;
      const originalDuration = originalEvent.duration;
      const correctedDuration = correctedEvent.duration;

      // Calculate adjustment factor
      const adjustmentFactor = correctedDuration / originalDuration;

      // Update duration patterns
      if (!profile.patterns.averageTaskDuration[taskType]) {
        profile.patterns.averageTaskDuration[taskType] = correctedDuration;
      } else {
        // Weighted average with existing data
        const currentAvg = profile.patterns.averageTaskDuration[taskType];
        profile.patterns.averageTaskDuration[taskType] = (currentAvg * 0.8) + (correctedDuration * 0.2);
      }

      // Update adaptations
      profile.adaptations.durationAdjustments[taskType] = adjustmentFactor;
    }

    // Update time preferences based on timing corrections
    if (correctionType === 'timing') {
      const timeSlot = correctedEvent.startTime.toTimeString().substring(0, 5); // HH:mm

      if (!profile.adaptations.timePreferenceWeights[timeSlot]) {
        profile.adaptations.timePreferenceWeights[timeSlot] = 1.0;
      } else {
        profile.adaptations.timePreferenceWeights[timeSlot] += 0.1; // Increase preference
      }
    }

    // Track common corrections
    profile.patterns.commonCorrections.push(correction);

    // Keep only recent corrections (last 100)
    if (profile.patterns.commonCorrections.length > 100) {
      profile.patterns.commonCorrections = profile.patterns.commonCorrections.slice(-100);
    }

    profile.lastUpdated = new Date();
  }

  // Get active session for user
  getActiveSession(userId: string): UserWorkspaceSession | undefined {
    return Array.from(this.activeSessions.values())
      .find(session => session.userId === userId && session.isActive);
  }

  // End session for user
  async endSession(userId: string): Promise<void> {
    const session = this.getActiveSession(userId);
    if (!session) {
      return;
    }

    session.isActive = false;

    // Clean up OpenClaw workspace
    try {
      await this.client.executeSkill('cleanup-workspace', {
        workspaceId: session.workspaceId,
        sessionId: session.sessionId
      });
    } catch (error) {
      console.error('Failed to cleanup OpenClaw workspace:', error);
    }

    this.activeSessions.delete(session.sessionId);
    console.log(`Ended session for user ${userId}: ${session.sessionId}`);
  }

  // Start periodic cleanup of inactive sessions
  private startSessionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();

      Array.from(this.activeSessions.entries()).forEach(([sessionId, session]) => {
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime();

        if (timeSinceActivity > this.sessionTimeout) {
          console.log(`Cleaning up inactive session: ${sessionId}`);
          this.endSession(session.userId);
        }
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Get session statistics
  getSessionStats(): {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
  } {
    const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.isActive);
    const now = new Date();

    const avgDuration = activeSessions.length > 0
      ? activeSessions.reduce((sum, session) => {
          return sum + (now.getTime() - session.createdAt.getTime());
        }, 0) / activeSessions.length
      : 0;

    return {
      activeSessions: activeSessions.length,
      totalSessions: this.activeSessions.size,
      averageSessionDuration: avgDuration / (1000 * 60) // minutes
    };
  }

  // Cleanup all resources
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // End all active sessions
    Array.from(this.activeSessions.values()).forEach(session => {
      if (session.isActive) {
        this.endSession(session.userId);
      }
    });

    this.activeSessions.clear();
  }
}

// Singleton instance for application-wide use
let globalSessionManager: OpenClawSessionManager | null = null;

// Get or create session manager
export function getSessionManager(): OpenClawSessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new OpenClawSessionManager();
  }
  return globalSessionManager;
}

// Convenience function to get user session
export async function getUserSession(userId?: string): Promise<UserWorkspaceSession | null> {
  try {
    let targetUserId = userId;

    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return null;
    }

    const manager = getSessionManager();
    return await manager.getOrCreateSession(targetUserId);
  } catch (error) {
    console.error('Failed to get user session:', error);
    return null;
  }
}

// Convenience function to update learning
export async function updateUserLearning(corrections: UserCorrection[], userId?: string): Promise<void> {
  try {
    let targetUserId = userId;

    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      throw new Error('No user ID available');
    }

    const manager = getSessionManager();
    await manager.updateLearningProfile(targetUserId, corrections);
  } catch (error) {
    console.error('Failed to update user learning:', error);
    throw error;
  }
}