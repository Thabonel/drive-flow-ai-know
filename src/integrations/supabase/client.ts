// Supabase client configuration using environment variables
import { createClient } from '@supabase/supabase-js';

// Environment variable validation with graceful degradation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SAFETY CHECK: Prevent module loading cascade failures from missing environment variables
// Following the pattern from useGoogleCalendar.ts (lines 93-100)
const hasValidConfig = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasValidConfig) {
  console.warn('Supabase configuration incomplete. App will load with limited functionality:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    env: import.meta.env.MODE,
    message: 'Check environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  });
}

// Create client with either full or minimal configuration
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key-prevents-cascade-failure',
  hasValidConfig ? {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  } : {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: undefined // Disable storage to prevent localStorage errors
    }
  }
);

// Flag to indicate configuration status
export const isSupabaseConfigured = hasValidConfig;

// Import the supabase client like this:
// import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
//
// Use isSupabaseConfigured to conditionally enable features that require Supabase