// Allowed origins for CORS - configured via environment variable
// Set ALLOWED_ORIGINS as comma-separated list in Supabase secrets
// Example: "https://aiqueryhub.com,https://app.aiqueryhub.com"

// Default allowed origins for development
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://[::]:8080',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Check if CORS is configured for production
const isProductionCorsConfigured = (): boolean => {
  return !!Deno.env.get('ALLOWED_ORIGINS');
};

const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');

  if (envOrigins) {
    // Production: use configured origins + dev origins for flexibility
    return [...DEFAULT_DEV_ORIGINS, ...envOrigins.split(',').map(o => o.trim())];
  }

  // Development only: return default origins
  return DEFAULT_DEV_ORIGINS;
};

// Check if origin is allowed
export const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;

  // If ALLOWED_ORIGINS is not configured, allow all origins (backwards compatible)
  // This ensures existing deployments don't break
  if (!isProductionCorsConfigured()) {
    // Log warning in production environments
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      console.warn(
        'SECURITY WARNING: CORS is not configured. Set ALLOWED_ORIGINS env variable ' +
        'with your production domains to restrict cross-origin requests. ' +
        `Allowing origin: ${origin}`
      );
    }
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};

// Get CORS headers for a specific origin
export const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // If origin is allowed, reflect it back; otherwise use empty string
  const allowedOrigin = isOriginAllowed(origin) ? (origin || '*') : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

// Legacy export for backwards compatibility - prefer getCorsHeaders(origin)
// WARNING: This is deprecated and will be removed in future versions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to handle OPTIONS preflight requests
export const handleCorsPreflightRequest = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
};
