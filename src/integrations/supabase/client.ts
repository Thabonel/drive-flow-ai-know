// Supabase client configuration using environment variables
import { createClient } from '@supabase/supabase-js';

// Environment variable validation with graceful degradation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SAFETY: Create client with graceful degradation instead of throwing
let supabase: ReturnType<typeof createClient>;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase configuration incomplete. Using placeholder client to prevent cascade failures.');
  console.warn(`Missing: ${!SUPABASE_URL ? 'VITE_SUPABASE_URL' : ''} ${!SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : ''}`);
  console.warn('App will start but Supabase features will be unavailable until configuration is fixed.');

  // Create a placeholder client with minimal configuration
  supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY || 'placeholder-key',
    {
      realtime: {
        params: { timeout: 0 }
      },
      auth: { persistSession: false }
    }
  );
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export { supabase };