// Analytics Service - Mixpanel/Amplitude Integration
// Install with: npm install mixpanel-browser

import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || '';
const IS_PRODUCTION = import.meta.env.PROD;

// Initialize Mixpanel
if (MIXPANEL_TOKEN && IS_PRODUCTION) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: !IS_PRODUCTION,
    track_pageview: true,
    persistence: 'localStorage',
  });
}

interface UserProperties {
  email?: string;
  name?: string;
  plan?: string;
  signupDate?: string;
  lastActive?: string;
}

interface EventProperties {
  [key: string]: any;
}

class Analytics {
  // Identify user
  identify(userId: string, properties?: UserProperties) {
    if (!MIXPANEL_TOKEN) return;

    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
    }
  }

  // Track event
  track(eventName: string, properties?: EventProperties) {
    if (!MIXPANEL_TOKEN) {
      console.log(`[Analytics] ${eventName}`, properties);
      return;
    }

    mixpanel.track(eventName, properties);
  }

  // Page view
  page(pageName: string, properties?: EventProperties) {
    this.track('Page Viewed', {
      page: pageName,
      ...properties,
    });
  }

  // User properties
  setUserProperties(properties: UserProperties) {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.people.set(properties);
  }

  // Increment property
  increment(property: string, value: number = 1) {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.people.increment(property, value);
  }

  // Reset on logout
  reset() {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.reset();
  }
}

// Singleton instance
export const analytics = new Analytics();

// Predefined event tracking functions

export const trackAIFeature = (
  featureName: string,
  properties?: {
    tokens?: number;
    duration?: number;
    model?: string;
    success?: boolean;
    confidence?: number;
  }
) => {
  analytics.track('AI Feature Used', {
    feature: featureName,
    ...properties,
  });

  // Increment usage count
  analytics.increment(`ai_${featureName}_count`);
};

export const trackTimeToValue = (action: string, durationMs: number) => {
  analytics.track('Time to Value', {
    action,
    duration_ms: durationMs,
    duration_seconds: Math.round(durationMs / 1000),
  });
};

export const trackUpgrade = (fromPlan: string, toPlan: string, method: string) => {
  analytics.track('Upgrade Completed', {
    from_plan: fromPlan,
    to_plan: toPlan,
    method, // 'prompt', 'pricing_page', 'usage_limit'
  });
};

export const trackConversion = (
  funnelName: string,
  step: string,
  properties?: EventProperties
) => {
  analytics.track('Funnel Step', {
    funnel: funnelName,
    step,
    ...properties,
  });
};

export const trackFeatureAdoption = (
  featureName: string,
  isFirstTime: boolean
) => {
  analytics.track('Feature Adopted', {
    feature: featureName,
    is_first_time: isFirstTime,
  });

  if (isFirstTime) {
    analytics.setUserProperties({
      [`first_used_${featureName}`]: new Date().toISOString(),
    });
  }
};

export const trackUsageLimit = (
  limitType: string,
  current: number,
  max: number,
  action: 'warning' | 'blocked' | 'upgraded'
) => {
  analytics.track('Usage Limit Event', {
    limit_type: limitType,
    current_usage: current,
    max_usage: max,
    percentage: Math.round((current / max) * 100),
    action,
  });
};

export const trackOnboarding = (step: string, completed: boolean) => {
  analytics.track('Onboarding Step', {
    step,
    completed,
  });
};

export const trackDocument = (
  action: 'upload' | 'delete' | 'view' | 'query',
  properties?: {
    documentType?: string;
    fileSize?: number;
    source?: string;
  }
) => {
  analytics.track('Document Action', {
    action,
    ...properties,
  });
};

export const trackTimeline = (
  action: 'create' | 'update' | 'delete' | 'view',
  itemType?: string,
  properties?: EventProperties
) => {
  analytics.track('Timeline Action', {
    action,
    item_type: itemType,
    ...properties,
  });
};

export const trackAssistant = (
  action: 'invite' | 'accept' | 'remove' | 'action_performed',
  properties?: EventProperties
) => {
  analytics.track('Assistant Action', {
    action,
    ...properties,
  });
};

// Track AI features driving upgrades
export const trackAIUpgradeDriver = (featureName: string, triggeredUpgrade: boolean) => {
  analytics.track('AI Upgrade Driver', {
    feature: featureName,
    triggered_upgrade: triggeredUpgrade,
  });
};

// Conversion funnels
export const FUNNELS = {
  SIGNUP: {
    name: 'Signup Funnel',
    steps: ['landing_viewed', 'signup_started', 'email_entered', 'account_created', 'onboarding_started', 'first_value'],
  },
  AI_DAILY_PLANNING: {
    name: 'AI Daily Planning',
    steps: ['feature_discovered', 'first_plan_generated', 'plan_accepted', 'became_daily_user'],
  },
  UPGRADE: {
    name: 'Upgrade Funnel',
    steps: ['limit_reached', 'pricing_viewed', 'plan_selected', 'payment_entered', 'upgraded'],
  },
  DOCUMENT_UPLOAD: {
    name: 'Document Upload',
    steps: ['upload_started', 'file_selected', 'upload_completed', 'first_query'],
  },
};

// Helper to track funnel step
export const trackFunnelStep = (funnelKey: keyof typeof FUNNELS, stepIndex: number, properties?: EventProperties) => {
  const funnel = FUNNELS[funnelKey];
  const step = funnel.steps[stepIndex];

  if (step) {
    trackConversion(funnel.name, step, properties);
  }
};

export default analytics;
