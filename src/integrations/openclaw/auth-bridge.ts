// OpenClaw Authentication Bridge for AI Query Hub
// Connects Supabase authentication with OpenClaw workspaces
import { supabase } from '@/integrations/supabase/client';
import { getOpenClawClient, isOpenClawEnabled } from './client';
import { getSessionManager, getUserSession } from './session-manager';

// Authentication state interface
export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    metadata?: Record<string, any>;
  } | null;
  workspace: {
    id: string;
    sessionId: string;
    isActive: boolean;
  } | null;
  permissions: {
    canUseOpenClaw: boolean;
    canAccessLearning: boolean;
    canModifySettings: boolean;
    maxSkillExecutions: number;
  };
}

// Enterprise security context
export interface SecurityContext {
  userId: string;
  organizationId?: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  rls_policies: {
    can_read_own_data: boolean;
    can_write_own_data: boolean;
    can_access_shared_data: boolean;
    can_manage_team_data: boolean;
  };
  audit_trail: {
    session_start: Date;
    last_activity: Date;
    actions_taken: number;
  };
}

// OpenClaw Authentication Bridge
export class OpenClawAuthBridge {
  private currentAuthState: AuthState | null = null;
  private securityContext: SecurityContext | null = null;
  private authChangeListeners: Array<(state: AuthState) => void> = [];
  private sessionManager = getSessionManager();
  private openClawClient = getOpenClawClient();

  constructor() {
    this.initializeAuthListener();
  }

  // Initialize Supabase auth state listener
  private initializeAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        await this.handleSignIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        await this.handleSignOut();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await this.handleTokenRefresh(session.user);
      }
    });

    // Initialize current state
    this.initializeCurrentState();
  }

  // Initialize current authentication state
  private async initializeCurrentState() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await this.handleSignIn(user);
      } else {
        this.currentAuthState = {
          isAuthenticated: false,
          user: null,
          workspace: null,
          permissions: {
            canUseOpenClaw: false,
            canAccessLearning: false,
            canModifySettings: false,
            maxSkillExecutions: 0
          }
        };
        this.notifyAuthChange();
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }

  // Handle user sign in
  private async handleSignIn(user: any) {
    try {
      // Load user profile and permissions
      const userProfile = await this.loadUserProfile(user.id);
      const permissions = await this.loadUserPermissions(user.id);
      const securityContext = await this.createSecurityContext(user, userProfile);

      this.securityContext = securityContext;

      // Initialize OpenClaw session if enabled
      let workspaceInfo = null;
      if (isOpenClawEnabled() && permissions.canUseOpenClaw) {
        try {
          const session = await this.sessionManager.getOrCreateSession(user.id);
          workspaceInfo = {
            id: session.workspaceId,
            sessionId: session.sessionId,
            isActive: session.isActive
          };

          // Log workspace creation for audit trail
          await this.logSecurityEvent(user.id, 'workspace_created', {
            workspaceId: session.workspaceId,
            sessionId: session.sessionId
          });

        } catch (error) {
          console.error('Failed to create OpenClaw workspace:', error);
          // Continue without OpenClaw - degrade gracefully
        }
      }

      // Update auth state
      this.currentAuthState = {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: userProfile.role || 'user',
          metadata: userProfile.metadata
        },
        workspace: workspaceInfo,
        permissions
      };

      // Notify listeners
      this.notifyAuthChange();

      console.log(`User authenticated: ${user.email} (OpenClaw: ${!!workspaceInfo})`);

    } catch (error) {
      console.error('Failed to handle sign in:', error);
      // Fallback to basic auth state without OpenClaw
      this.currentAuthState = {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: 'user',
          metadata: {}
        },
        workspace: null,
        permissions: {
          canUseOpenClaw: false,
          canAccessLearning: false,
          canModifySettings: false,
          maxSkillExecutions: 0
        }
      };
      this.notifyAuthChange();
    }
  }

  // Handle user sign out
  private async handleSignOut() {
    if (this.currentAuthState?.user?.id) {
      // End OpenClaw session
      try {
        await this.sessionManager.endSession(this.currentAuthState.user.id);

        // Log sign out for audit trail
        await this.logSecurityEvent(this.currentAuthState.user.id, 'sign_out', {
          sessionDuration: Date.now() - (this.securityContext?.audit_trail?.session_start?.getTime() || Date.now())
        });

      } catch (error) {
        console.error('Failed to cleanup OpenClaw session:', error);
      }
    }

    // Reset state
    this.currentAuthState = {
      isAuthenticated: false,
      user: null,
      workspace: null,
      permissions: {
        canUseOpenClaw: false,
        canAccessLearning: false,
        canModifySettings: false,
        maxSkillExecutions: 0
      }
    };
    this.securityContext = null;

    this.notifyAuthChange();
    console.log('User signed out');
  }

  // Handle token refresh
  private async handleTokenRefresh(user: any) {
    if (this.currentAuthState?.user?.id === user.id) {
      // Update last activity in security context
      if (this.securityContext) {
        this.securityContext.audit_trail.last_activity = new Date();
      }

      // Verify OpenClaw session is still valid
      if (this.currentAuthState.workspace?.isActive) {
        const session = await getUserSession(user.id);
        if (!session || !session.isActive) {
          // Recreate session if needed
          try {
            const newSession = await this.sessionManager.getOrCreateSession(user.id);
            if (this.currentAuthState.workspace) {
              this.currentAuthState.workspace = {
                id: newSession.workspaceId,
                sessionId: newSession.sessionId,
                isActive: newSession.isActive
              };
            }
          } catch (error) {
            console.error('Failed to recreate OpenClaw session:', error);
          }
        }
      }
    }
  }

  // Load user profile from database
  private async loadUserProfile(userId: string): Promise<any> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Error loading user profile:', error);
      }

      return profile || { role: 'user', metadata: {} };
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return { role: 'user', metadata: {} };
    }
  }

  // Load user permissions based on role and subscription
  private async loadUserPermissions(userId: string): Promise<AuthState['permissions']> {
    try {
      // Check user subscription and role
      const { data: settings } = await supabase
        .from('user_settings')
        .select('subscription_tier, features_enabled')
        .eq('user_id', userId)
        .single();

      // Default permissions for free tier
      let permissions = {
        canUseOpenClaw: false,
        canAccessLearning: false,
        canModifySettings: true,
        maxSkillExecutions: 0
      };

      // Enhance permissions based on subscription
      if (settings?.subscription_tier) {
        switch (settings.subscription_tier) {
          case 'pro':
            permissions = {
              canUseOpenClaw: true,
              canAccessLearning: true,
              canModifySettings: true,
              maxSkillExecutions: 1000
            };
            break;
          case 'enterprise':
            permissions = {
              canUseOpenClaw: true,
              canAccessLearning: true,
              canModifySettings: true,
              maxSkillExecutions: -1 // unlimited
            };
            break;
          case 'basic':
            permissions = {
              canUseOpenClaw: true,
              canAccessLearning: false,
              canModifySettings: true,
              maxSkillExecutions: 100
            };
            break;
        }
      }

      // Override with feature flags if present
      if (settings?.features_enabled?.openclaw_enabled === false) {
        permissions.canUseOpenClaw = false;
      }

      return permissions;

    } catch (error) {
      console.error('Failed to load user permissions:', error);
      // Return minimal permissions on error
      return {
        canUseOpenClaw: false,
        canAccessLearning: false,
        canModifySettings: false,
        maxSkillExecutions: 0
      };
    }
  }

  // Create security context for RLS and audit
  private async createSecurityContext(user: any, profile: any): Promise<SecurityContext> {
    // Determine user role and organization
    const role = profile.role || 'user';
    const organizationId = profile.organization_id;

    // Load RLS policies for user
    const rls_policies = {
      can_read_own_data: true,
      can_write_own_data: true,
      can_access_shared_data: role !== 'viewer',
      can_manage_team_data: ['admin', 'manager'].includes(role)
    };

    // Set permissions based on role
    const permissions = [];
    if (role === 'admin') {
      permissions.push('admin:all', 'manage:users', 'manage:settings');
    } else if (role === 'manager') {
      permissions.push('manage:team', 'view:analytics');
    } else {
      permissions.push('view:own', 'edit:own');
    }

    return {
      userId: user.id,
      organizationId,
      role,
      permissions,
      rls_policies,
      audit_trail: {
        session_start: new Date(),
        last_activity: new Date(),
        actions_taken: 0
      }
    };
  }

  // Log security event for audit trail
  private async logSecurityEvent(userId: string, event: string, metadata: any) {
    try {
      await supabase
        .from('security_audit_log')
        .insert({
          user_id: userId,
          event_type: event,
          event_data: metadata,
          timestamp: new Date().toISOString(),
          ip_address: '127.0.0.1', // Would get from request in real implementation
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failures shouldn't break functionality
    }
  }

  // Get current authentication state
  getCurrentAuthState(): AuthState | null {
    return this.currentAuthState;
  }

  // Get security context
  getSecurityContext(): SecurityContext | null {
    return this.securityContext;
  }

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    return this.securityContext?.permissions.includes(permission) || false;
  }

  // Check if user can perform action based on RLS
  canAccessData(dataUserId: string, action: 'read' | 'write'): boolean {
    if (!this.securityContext) return false;

    const { userId, rls_policies } = this.securityContext;

    // Own data access
    if (dataUserId === userId) {
      return action === 'read' ? rls_policies.can_read_own_data : rls_policies.can_write_own_data;
    }

    // Shared data access (team/organization)
    if (action === 'read') {
      return rls_policies.can_access_shared_data;
    } else {
      return rls_policies.can_manage_team_data;
    }
  }

  // Execute skill with permission check
  async executeSkillWithAuth(skillName: string, params: any): Promise<any> {
    const authState = this.getCurrentAuthState();

    if (!authState?.isAuthenticated) {
      throw new Error('User not authenticated');
    }

    if (!authState.permissions.canUseOpenClaw) {
      throw new Error('OpenClaw access not permitted');
    }

    // Check execution limits
    if (authState.permissions.maxSkillExecutions > 0) {
      // Would check usage limits here in production
      // For now, just log the execution
      await this.logSecurityEvent(authState.user!.id, 'skill_executed', {
        skillName,
        workspaceId: authState.workspace?.id
      });
    }

    // Increment action counter
    if (this.securityContext) {
      this.securityContext.audit_trail.actions_taken += 1;
      this.securityContext.audit_trail.last_activity = new Date();
    }

    // Execute skill
    try {
      return await this.openClawClient.executeSkill(skillName, {
        ...params,
        userId: authState.user!.id,
        securityContext: this.securityContext
      });
    } catch (error) {
      await this.logSecurityEvent(authState.user!.id, 'skill_execution_failed', {
        skillName,
        error: error.message
      });
      throw error;
    }
  }

  // Add auth change listener
  onAuthChange(listener: (state: AuthState) => void) {
    this.authChangeListeners.push(listener);

    // Immediately call with current state
    if (this.currentAuthState) {
      listener(this.currentAuthState);
    }

    // Return unsubscribe function
    return () => {
      const index = this.authChangeListeners.indexOf(listener);
      if (index > -1) {
        this.authChangeListeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of auth state change
  private notifyAuthChange() {
    if (this.currentAuthState) {
      this.authChangeListeners.forEach(listener => {
        try {
          listener(this.currentAuthState!);
        } catch (error) {
          console.error('Auth change listener error:', error);
        }
      });
    }
  }

  // Cleanup resources
  destroy() {
    this.authChangeListeners.length = 0;
    // Supabase auth listener cleanup would go here if needed
  }
}

// Singleton instance
let globalAuthBridge: OpenClawAuthBridge | null = null;

// Get or create auth bridge
export function getAuthBridge(): OpenClawAuthBridge {
  if (!globalAuthBridge) {
    globalAuthBridge = new OpenClawAuthBridge();
  }
  return globalAuthBridge;
}

// Convenience hooks for React components
export function useOpenClawAuth() {
  const authBridge = getAuthBridge();
  return {
    authState: authBridge.getCurrentAuthState(),
    securityContext: authBridge.getSecurityContext(),
    hasPermission: (permission: string) => authBridge.hasPermission(permission),
    canAccessData: (userId: string, action: 'read' | 'write') => authBridge.canAccessData(userId, action),
    executeSkill: (skillName: string, params: any) => authBridge.executeSkillWithAuth(skillName, params),
    onAuthChange: (listener: (state: AuthState) => void) => authBridge.onAuthChange(listener)
  };
}

// Initialize auth bridge (call once at app startup)
export function initializeOpenClawAuth() {
  return getAuthBridge();
}

// Types are exported inline above