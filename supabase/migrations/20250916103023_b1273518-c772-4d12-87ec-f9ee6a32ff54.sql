-- Fix remaining security linter warnings from the enhanced Google token security migration

-- Fix any functions that might be missing search_path from the previous migration
-- Update the trigger function to have proper search_path
CREATE OR REPLACE FUNCTION public.trigger_cleanup_google_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Run cleanup occasionally (1% chance on each token operation)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_expired_google_data();
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure cleanup function has proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_google_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove expired tokens
  DELETE FROM public.user_google_tokens 
  WHERE expires_at < NOW() - interval '7 days';
  
  -- Clean up old audit logs (keep 90 days)
  DELETE FROM public.google_token_audit_log 
  WHERE created_at < NOW() - interval '90 days';
  
  -- Clean up old rate limit records
  DELETE FROM public.google_token_rate_limit 
  WHERE window_start < NOW() - interval '7 days';
  
  RAISE LOG 'Cleaned up expired Google authentication data at %', NOW();
END;
$$;