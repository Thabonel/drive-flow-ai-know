-- Fix missing RLS policies and security warnings

-- Enable RLS on tables that don't have it
ALTER TABLE public.memory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_qa_feedback ENABLE ROW LEVEL SECURITY;

-- Add proper RLS policies for memory_links
CREATE POLICY "Users can manage memory links for their memories" ON public.memory_links
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.agentic_memories am 
    WHERE am.id = memory_links.from_id AND am.user_id = auth.uid()
  )
);

-- Add proper RLS policies for pages
CREATE POLICY "Pages are viewable by everyone" ON public.pages
FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can manage pages" ON public.pages
FOR ALL USING (auth.role() = 'authenticated');

-- Add proper RLS policies for project_memory
CREATE POLICY "Users can view all project memory" ON public.project_memory
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage project memory" ON public.project_memory
FOR ALL USING (auth.role() = 'authenticated');

-- Add proper RLS policies for project_notes
CREATE POLICY "Users can view all project notes" ON public.project_notes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage project notes" ON public.project_notes
FOR ALL USING (auth.role() = 'authenticated');

-- Add proper RLS policies for doc_qa_feedback
CREATE POLICY "Users can create feedback" ON public.doc_qa_feedback
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view feedback" ON public.doc_qa_feedback
FOR SELECT USING (true);

-- Fix potentially weak policies by adding user-specific constraints where needed
-- Update agentic_memories to require user_id for non-service-role access
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.agentic_memories;
CREATE POLICY "Users can manage their own memories" ON public.agentic_memories
FOR ALL USING (
  auth.uid() = user_id OR auth.role() = 'service_role'
);

-- Ensure proper constraints on user-linked tables
ALTER TABLE public.agentic_memories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.google_drive_folders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.knowledge_bases ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.knowledge_documents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_google_tokens ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.saved_prompts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.sync_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ai_query_history ALTER COLUMN user_id SET NOT NULL;