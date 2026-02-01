// Supabase client configuration using environment variables
import { createClient } from '@supabase/supabase-js';

// Environment variable validation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL is required');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY is required');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});