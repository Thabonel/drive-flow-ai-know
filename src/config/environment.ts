// Environment configuration for AI Query Hub
export const config = {
  environment: (import.meta.env.VITE_ENVIRONMENT || 'development') as 'development' | 'staging' | 'production',
  isDevelopment: import.meta.env.DEV,
  isStaging: import.meta.env.VITE_ENVIRONMENT === 'staging',
  isProduction: import.meta.env.VITE_ENVIRONMENT === 'production',

  // Supabase configuration handled in src/integrations/supabase/client.ts

  features: {
    // Enable experimental features only in staging
    enableBetaFeatures: import.meta.env.VITE_ENVIRONMENT === 'staging',
    // Enable debug logging in development and staging
    enableDebugLogging: import.meta.env.VITE_ENVIRONMENT !== 'production',
    // Enable analytics only in production
    enableAnalytics: import.meta.env.VITE_ENVIRONMENT === 'production',
  },

  branding: {
    // Different branding for staging
    siteName: import.meta.env.VITE_ENVIRONMENT === 'staging' ? 'AI Query Hub (Staging)' : 'AI Query Hub',
    showEnvironmentBanner: import.meta.env.VITE_ENVIRONMENT === 'staging',
  }
};

// Helper functions
export const log = (...args: any[]) => {
  if (config.features.enableDebugLogging) {
    console.log(`[${config.environment.toUpperCase()}]`, ...args);
  }
};

export const warn = (...args: any[]) => {
  if (config.features.enableDebugLogging) {
    console.warn(`[${config.environment.toUpperCase()}]`, ...args);
  }
};

export const error = (...args: any[]) => {
  console.error(`[${config.environment.toUpperCase()}]`, ...args);
};