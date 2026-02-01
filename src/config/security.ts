// Security Configuration
// Centralized security headers and CSP policies

export interface CSPConfig {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'font-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'object-src': string[];
  'frame-ancestors': string[];
  directives: string[];
}

// Content Security Policy configurations
export const CSP_POLICIES = {
  // Development CSP - More permissive for HMR and debugging
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "data:", "https:"],
    'connect-src': [
      "'self'",
      "ws:",
      "wss:",
      "https://*.supabase.co",
      "https://api.anthropic.com",
      "https://openrouter.ai",
      "https://api.openai.com"
    ],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    directives: ["upgrade-insecure-requests"]
  } as CSPConfig,

  // Production CSP - Stricter security policies
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "https://cdn.jsdelivr.net"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "data:", "https:"],
    'connect-src': [
      "'self'",
      "https://*.supabase.co",
      "https://api.anthropic.com",
      "https://openrouter.ai",
      "https://api.openai.com"
    ],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    directives: ["upgrade-insecure-requests"]
  } as CSPConfig
};

// Convert CSP config to header string
export function buildCSPHeader(config: CSPConfig): string {
  const policies: string[] = [];

  // Add directive policies
  Object.entries(config).forEach(([directive, sources]) => {
    if (directive === 'directives') return;
    if (Array.isArray(sources) && sources.length > 0) {
      policies.push(`${directive} ${sources.join(' ')}`);
    }
  });

  // Add standalone directives
  if (config.directives && config.directives.length > 0) {
    policies.push(...config.directives);
  }

  return policies.join('; ');
}

// Additional security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ].join(', ')
};

// Get CSP header for environment
export function getCSPHeader(environment: 'development' | 'production' = 'development'): string {
  const config = CSP_POLICIES[environment];
  return buildCSPHeader(config);
}

// CSP violation report structure
export interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}