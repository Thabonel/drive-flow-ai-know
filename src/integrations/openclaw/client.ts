// OpenClaw Gateway Client for AI Query Hub
// Provides access to 3,000+ community skills with local-first processing
import { supabase } from '@/integrations/supabase/client';

// OpenClaw Gateway Configuration
const OPENCLAW_GATEWAY_URL = 'ws://127.0.0.1:18789';
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const SKILL_TIMEOUT = 30000; // 30 seconds

// Types for OpenClaw Integration
export interface OpenClawSkillParams {
  [key: string]: any;
}

export interface OpenClawSkillResponse {
  success: boolean;
  data?: any;
  error?: string;
  skillName: string;
  executionTime?: number;
  confidence?: number;
}

export interface TimelineEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  type?: 'task' | 'meeting' | 'block' | 'routine';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UserCorrection {
  originalEvent: TimelineEvent;
  correctedEvent: TimelineEvent;
  correctionType: 'timing' | 'duration' | 'title' | 'priority' | 'delete' | 'split';
  timestamp: Date;
  userNote?: string;
}

// Core OpenClaw Gateway Client
export class OpenClawClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  private reconnectInterval = RECONNECT_INTERVAL;
  private pendingRequests = new Map<string, {
    resolve: (value: OpenClawSkillResponse) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }>();
  private userId: string | null = null;
  private workspaceId: string | null = null;

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication and user context
  private async initializeAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
        this.workspaceId = `workspace_${user.id}`;
      }
    } catch (error) {
      console.warn('Failed to initialize OpenClaw auth:', error);
    }
  }

  // Connect to OpenClaw Gateway
  async connect(): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(OPENCLAW_GATEWAY_URL);

        this.ws.onopen = () => {
          console.log('OpenClaw Gateway connected');
          this.reconnectAttempts = 0;
          this.setupWorkspace();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('OpenClaw Gateway disconnected');
          this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
          console.error('OpenClaw Gateway error:', error);
          resolve(false);
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected()) {
            console.warn('OpenClaw Gateway connection timeout');
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        console.error('Failed to connect to OpenClaw Gateway:', error);
        resolve(false);
      }
    });
  }

  // Check if WebSocket is connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Setup isolated workspace for user
  private async setupWorkspace() {
    if (!this.userId || !this.workspaceId) {
      await this.initializeAuth();
    }

    const setupMessage = {
      type: 'setup_workspace',
      workspaceId: this.workspaceId,
      userId: this.userId,
      timestamp: Date.now()
    };

    this.sendMessage(setupMessage);
  }

  // Handle WebSocket messages
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);

      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const { resolve, timeout } = this.pendingRequests.get(message.requestId)!;
        clearTimeout(timeout);
        this.pendingRequests.delete(message.requestId);

        resolve({
          success: message.success || false,
          data: message.data,
          error: message.error,
          skillName: message.skillName,
          executionTime: message.executionTime,
          confidence: message.confidence
        });
      } else if (message.type === 'workspace_ready') {
        console.log('OpenClaw workspace initialized:', message.workspaceId);
      } else if (message.type === 'error') {
        console.error('OpenClaw Gateway error:', message.error);
      }
    } catch (error) {
      console.error('Failed to parse OpenClaw message:', error);
    }
  }

  // Handle disconnection and reconnection
  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect to OpenClaw Gateway (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached. OpenClaw Gateway unavailable.');
      // Clear pending requests
      this.pendingRequests.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error('OpenClaw Gateway disconnected'));
      });
      this.pendingRequests.clear();
    }
  }

  // Send message to OpenClaw Gateway
  private sendMessage(message: any) {
    if (this.isConnected() && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('OpenClaw Gateway not connected');
    }
  }

  // Execute a skill with parameters
  async executeSkill(skillName: string, params: OpenClawSkillParams = {}): Promise<OpenClawSkillResponse> {
    if (!this.isConnected()) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Unable to connect to OpenClaw Gateway');
      }
    }

    const requestId = `skill_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const message = {
      type: 'execute_skill',
      requestId,
      skillName,
      params: {
        ...params,
        workspaceId: this.workspaceId,
        userId: this.userId
      },
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Skill execution timeout: ${skillName}`));
      }, SKILL_TIMEOUT);

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.sendMessage(message);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  // Update learning based on user corrections
  async updateLearning(corrections: UserCorrection[]): Promise<void> {
    try {
      const response = await this.executeSkill('learning-update', {
        corrections,
        userProfile: {
          userId: this.userId,
          workspaceId: this.workspaceId
        }
      });

      if (!response.success) {
        console.error('Failed to update learning:', response.error);
      }
    } catch (error) {
      console.error('Learning update failed:', error);
      // Don't throw - learning updates should be non-blocking
    }
  }

  // Get user learning profile
  async getUserLearningProfile(): Promise<any> {
    try {
      const response = await this.executeSkill('get-user-profile', {
        userId: this.userId
      });

      return response.success ? response.data : {};
    } catch (error) {
      console.warn('Failed to get user learning profile:', error);
      return {};
    }
  }

  // Disconnect from gateway
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }

  // Check if OpenClaw is available (health check)
  static async isAvailable(): Promise<boolean> {
    try {
      const testSocket = new WebSocket(OPENCLAW_GATEWAY_URL);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testSocket.close();
          resolve(false);
        }, 5000);

        testSocket.onopen = () => {
          clearTimeout(timeout);
          testSocket.close();
          resolve(true);
        };

        testSocket.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance for application-wide use
let globalOpenClawClient: OpenClawClient | null = null;

// Get or create OpenClaw client instance
export function getOpenClawClient(): OpenClawClient {
  if (!globalOpenClawClient) {
    globalOpenClawClient = new OpenClawClient();
  }
  return globalOpenClawClient;
}

// Check if OpenClaw integration is enabled
export function isOpenClawEnabled(): boolean {
  return localStorage.getItem('openclaw-enabled') === 'true' ||
         import.meta.env.VITE_ENABLE_OPENCLAW === 'true';
}

// Fallback function for when OpenClaw is unavailable
export async function executeSkillWithFallback(
  skillName: string,
  params: OpenClawSkillParams,
  fallbackHandler?: () => Promise<any>
): Promise<OpenClawSkillResponse> {

  if (!isOpenClawEnabled()) {
    throw new Error('OpenClaw integration is disabled');
  }

  const client = getOpenClawClient();

  try {
    return await client.executeSkill(skillName, params);
  } catch (error) {
    console.warn(`OpenClaw skill '${skillName}' failed, attempting fallback:`, error);

    if (fallbackHandler) {
      try {
        const fallbackResult = await fallbackHandler();
        return {
          success: true,
          data: fallbackResult,
          skillName,
          error: undefined
        };
      } catch (fallbackError) {
        console.error(`Fallback for skill '${skillName}' also failed:`, fallbackError);
        return {
          success: false,
          data: undefined,
          error: `Skill and fallback failed: ${error.message}`,
          skillName
        };
      }
    }

    return {
      success: false,
      data: undefined,
      error: error.message,
      skillName
    };
  }
}

// All types are exported inline above