-- Enable Row Level Security on project_memory table
ALTER TABLE public.project_memory ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own project memory data
CREATE POLICY "Users can manage their own project memory" 
ON public.project_memory 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also make user_id NOT NULL since it's critical for security
-- First update any existing NULL user_id records to a safe default or remove them
DELETE FROM public.project_memory WHERE user_id IS NULL;

-- Then make the column NOT NULL to prevent future security issues
ALTER TABLE public.project_memory ALTER COLUMN user_id SET NOT NULL;