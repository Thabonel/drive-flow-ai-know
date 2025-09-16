-- Drop the overly permissive existing policies on doc_qa_feedback
DROP POLICY IF EXISTS "Users can view feedback" ON public.doc_qa_feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON public.doc_qa_feedback;

-- Create secure policy for viewing feedback - users can only see feedback for their own messages
CREATE POLICY "Users can view feedback for their own sessions" 
ON public.doc_qa_feedback 
FOR SELECT 
USING (
  message_id IN (
    SELECT m.id 
    FROM public.doc_qa_chat_messages m
    JOIN public.doc_qa_chat_sessions s ON m.session_id = s.id
    WHERE s.user_id = current_setting('app.current_qa_user', true)
  )
  OR auth.role() = 'service_role'
);

-- Create secure policy for creating feedback - users can only create feedback for their own messages
CREATE POLICY "Users can create feedback for their own sessions" 
ON public.doc_qa_feedback 
FOR INSERT 
WITH CHECK (
  message_id IN (
    SELECT m.id 
    FROM public.doc_qa_chat_messages m
    JOIN public.doc_qa_chat_sessions s ON m.session_id = s.id
    WHERE s.user_id = current_setting('app.current_qa_user', true)
  )
  OR auth.role() = 'service_role'
);

-- Allow service role to manage feedback for administrative purposes
CREATE POLICY "Service role can manage all feedback" 
ON public.doc_qa_feedback 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');