// Feature Flag System for Timeline UX Improvements
// Enables safe rollout and rollback of enhancements

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

type FeatureFlagKey =
  | 'enhanced_timeline_manager'
  | 'interface_mode_controller'
  | 'responsive_timeline_header'
  | 'mobile_responsive_canvas'
  | 'accessibility_improvements'
  | 'performance_optimizations'
  | 'z_index_management';

interface FeatureFlag {
  key: FeatureFlagKey;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  requiresAuth?: boolean;
  dependencies?: FeatureFlagKey[];
}

// Feature flag configuration
const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlag> = {
  enhanced_timeline_manager: {
    key: 'enhanced_timeline_manager',
    name: 'Enhanced Timeline Manager',
    description: 'Use the new enhanced timeline manager with progressive disclosure',
    enabled: false, // Start disabled for safety
    rolloutPercentage: 0, // Gradual rollout: 0% → 5% → 25% → 100%
    requiresAuth: true,
  },

  interface_mode_controller: {
    key: 'interface_mode_controller',
    name: 'Interface Mode Controller',
    description: 'Progressive disclosure with beginner/intermediate/expert modes',
    enabled: true,
    rolloutPercentage: 100,
    requiresAuth: true,
    dependencies: ['enhanced_timeline_manager'],
  },

  responsive_timeline_header: {
    key: 'responsive_timeline_header',
    name: 'Responsive Timeline Header',
    description: 'Mobile-optimized header with intelligent button grouping',
    enabled: true,
    rolloutPercentage: 100,
    requiresAuth: true,
    dependencies: ['enhanced_timeline_manager', 'interface_mode_controller'],
  },

  mobile_responsive_canvas: {
    key: 'mobile_responsive_canvas',
    name: 'Mobile Responsive Canvas',
    description: 'Touch-friendly timeline canvas with gesture support',
    enabled: false,
    rolloutPercentage: 0,
    requiresAuth: true,
    dependencies: ['enhanced_timeline_manager'],
  },

  accessibility_improvements: {
    key: 'accessibility_improvements',
    name: 'Accessibility Improvements',
    description: 'WCAG 2.1 AA compliance with screen reader and keyboard support',
    enabled: false,
    rolloutPercentage: 0,
    requiresAuth: true,
  },

  performance_optimizations: {
    key: 'performance_optimizations',
    name: 'Performance Optimizations',
    description: 'Virtualization and smart loading for large datasets',
    enabled: false,
    rolloutPercentage: 0,
    requiresAuth: true,
  },

  z_index_management: {
    key: 'z_index_management',
    name: 'Enhanced Z-Index Management',
    description: 'Improved stacking context management for complex UIs',
    enabled: true,
    rolloutPercentage: 100,
  },
};

// User-based feature flag evaluation
class FeatureFlagService {
  private userId?: string;
  private userEmail?: string;
  private isAuthenticated: boolean = false;

  constructor() {
    // Initialize from current auth state
    this.updateUserContext();
  }

  updateUserContext(userId?: string, userEmail?: string, isAuthenticated: boolean = false) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.isAuthenticated = isAuthenticated;
  }

  /**
   * Check if a feature is enabled for the current user
   */
  isEnabled(flagKey: FeatureFlagKey): boolean {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) return false;

    // Check if feature is globally disabled
    if (!flag.enabled) return false;

    // Check authentication requirement
    if (flag.requiresAuth && !this.isAuthenticated) return false;

    // Check dependencies
    if (flag.dependencies) {
      for (const dependency of flag.dependencies) {
        if (!this.isEnabled(dependency)) return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    // Use consistent user-based hashing for stable rollout
    const userHash = this.getUserHash();
    const rolloutThreshold = (flag.rolloutPercentage / 100) * 100;

    return (userHash % 100) < rolloutThreshold;
  }

  /**
   * Get all enabled flags for current user
   */
  getEnabledFlags(): FeatureFlagKey[] {
    return Object.keys(FEATURE_FLAGS).filter(key =>
      this.isEnabled(key as FeatureFlagKey)
    ) as FeatureFlagKey[];
  }

  /**
   * Get flag configuration (for debugging/admin)
   */
  getFlagConfig(flagKey: FeatureFlagKey): FeatureFlag | undefined {
    return FEATURE_FLAGS[flagKey];
  }

  /**
   * Override flags for testing (localStorage-based)
   */
  setOverride(flagKey: FeatureFlagKey, enabled: boolean) {
    const overrides = this.getOverrides();
    overrides[flagKey] = enabled;
    localStorage.setItem('feature_flag_overrides', JSON.stringify(overrides));
  }

  /**
   * Clear flag override
   */
  clearOverride(flagKey: FeatureFlagKey) {
    const overrides = this.getOverrides();
    delete overrides[flagKey];
    localStorage.setItem('feature_flag_overrides', JSON.stringify(overrides));
  }

  /**
   * Check if user has local override for flag
   */
  hasOverride(flagKey: FeatureFlagKey): boolean {
    const overrides = this.getOverrides();
    return flagKey in overrides;
  }

  private getOverrides(): Record<string, boolean> {
    try {
      const stored = localStorage.getItem('feature_flag_overrides');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Generate consistent user hash for rollout
   */
  private getUserHash(): number {
    const identifier = this.userId || this.userEmail || 'anonymous';
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Global instance
export const featureFlagService = new FeatureFlagService();

// React hook for feature flags
export function useFeatureFlag(flagKey: FeatureFlagKey) {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Update user context when auth changes
    featureFlagService.updateUserContext(
      user?.id,
      user?.email,
      !!user
    );

    // Check if flag is enabled
    const enabled = featureFlagService.isEnabled(flagKey);
    setIsEnabled(enabled);
  }, [flagKey, user]);

  return {
    isEnabled,
    setOverride: (enabled: boolean) => featureFlagService.setOverride(flagKey, enabled),
    clearOverride: () => featureFlagService.clearOverride(flagKey),
    hasOverride: featureFlagService.hasOverride(flagKey),
  };
}

// Utility hook to check multiple flags
export function useFeatureFlags(flagKeys: FeatureFlagKey[]) {
  const { user } = useAuth();
  const [enabledFlags, setEnabledFlags] = useState<Set<FeatureFlagKey>>(new Set());

  useEffect(() => {
    featureFlagService.updateUserContext(
      user?.id,
      user?.email,
      !!user
    );

    const enabled = new Set<FeatureFlagKey>();
    flagKeys.forEach(key => {
      if (featureFlagService.isEnabled(key)) {
        enabled.add(key);
      }
    });

    setEnabledFlags(enabled);
  }, [flagKeys, user]);

  return enabledFlags;
}

// Component interface for conditional rendering (React components in separate files)
export interface FeatureGateProps {
  flag: FeatureFlagKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default featureFlagService;