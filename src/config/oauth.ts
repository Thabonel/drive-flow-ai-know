/**
 * Centralized OAuth configuration with environment detection
 * Addresses redirect_uri_mismatch errors across different deployment environments
 */

export interface OAuthEnvironment {
  name: 'development' | 'staging' | 'production';
  origin: string;
  googleClientId: string;
  redirectUri: string;
  debugEnabled: boolean;
}

export interface OAuthConfig {
  google: {
    client_id: string;
    redirect_uri: string;
  };
  microsoft: {
    client_id: string;
    tenant_id: string;
    redirect_uri: string;
  };
  dropbox: {
    client_id: string;
    redirect_uri: string;
  };
}

// Standard Google Client ID used across the application
const GOOGLE_CLIENT_ID = '1050361175911-2caa9uiuf4tmi5pvqlt0arl1h592hurm.apps.googleusercontent.com';

/**
 * Detect the current OAuth environment based on URL patterns
 */
export const detectOAuthEnvironment = (): OAuthEnvironment => {
  const origin = window.location.origin;

  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      name: 'development',
      origin,
      googleClientId: GOOGLE_CLIENT_ID,
      redirectUri: `${origin}/auth/google/callback`,
      debugEnabled: true,
    };
  }

  if (origin.includes('staging') || origin.includes('.netlify.app') || origin.includes('.vercel.app')) {
    return {
      name: 'staging',
      origin,
      googleClientId: GOOGLE_CLIENT_ID,
      redirectUri: `${origin}/auth/google/callback`,
      debugEnabled: true,
    };
  }

  // Production environment
  return {
    name: 'production',
    origin,
    googleClientId: GOOGLE_CLIENT_ID,
    redirectUri: `${origin}/auth/google/callback`,
    debugEnabled: false,
  };
};

/**
 * Get OAuth configuration for all providers with environment detection
 */
export const getOAuthConfig = (): OAuthConfig => {
  const env = detectOAuthEnvironment();

  // Debug logging for OAuth configuration (only in non-production)
  if (env.debugEnabled) {
    console.log('🔧 OAuth Configuration Debug:', {
      environment: env.name,
      origin: env.origin,
      googleClientId: env.googleClientId.substring(0, 20) + '...',
      redirectUri: env.redirectUri,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    google: {
      client_id: env.googleClientId,
      redirect_uri: env.redirectUri,
    },
    microsoft: {
      client_id: '',
      tenant_id: 'common',
      redirect_uri: `${env.origin}/auth/microsoft/callback`,
    },
    dropbox: {
      client_id: '',
      redirect_uri: `${env.origin}/auth/dropbox/callback`,
    },
  };
};

/**
 * Validate OAuth environment and log any potential issues
 */
export const validateOAuthEnvironment = (): { valid: boolean; issues: string[] } => {
  const env = detectOAuthEnvironment();
  const issues: string[] = [];

  // Check for common issues
  if (!env.origin.startsWith('https://') && env.name === 'production') {
    issues.push('Production environment should use HTTPS');
  }

  if (env.origin.includes('localhost') && env.name !== 'development') {
    issues.push('Localhost detected in non-development environment');
  }

  if (!env.googleClientId || env.googleClientId.length < 50) {
    issues.push('Invalid Google Client ID format');
  }

  const valid = issues.length === 0;

  if (env.debugEnabled) {
    console.log('🔍 OAuth Environment Validation:', {
      valid,
      issues: issues.length > 0 ? issues : 'No issues detected',
      environment: env.name,
    });
  }

  return { valid, issues };
};

