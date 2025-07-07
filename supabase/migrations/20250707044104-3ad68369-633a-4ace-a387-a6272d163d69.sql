-- Create table to store AI query history
CREATE TABLE public.ai_query_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  response_text TEXT,
  knowledge_base_id UUID,
  context_documents_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processing_time_ms INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.ai_query_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own AI queries" 
ON public.ai_query_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI queries" 
ON public.ai_query_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_ai_query_history_user_created ON public.ai_query_history(user_id, created_at DESC);