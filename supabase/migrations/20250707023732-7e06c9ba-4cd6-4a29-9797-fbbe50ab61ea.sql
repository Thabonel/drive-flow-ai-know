-- Fix the user_google_tokens table to have proper unique constraint
-- and add proper refresh token handling

-- First, add a unique constraint on user_id if it doesn't exist
ALTER TABLE public.user_google_tokens 
ADD CONSTRAINT user_google_tokens_user_id_unique UNIQUE (user_id);

-- Update the policy to be more explicit about conflict resolution
-- (The upsert will work better with this unique constraint)