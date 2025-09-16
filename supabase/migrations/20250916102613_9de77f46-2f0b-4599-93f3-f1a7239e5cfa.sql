-- Fix security linter issues for functions without search_path (simplified)

-- Check if there are any tables with RLS enabled but no policies
-- First, let's see what tables might be missing policies

-- Fix only functions that don't have vector operations
CREATE OR REPLACE FUNCTION public.get_current_user_can_view_agent(p_agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.doc_qa_agent_memberships m
    where m.agent_id = p_agent_id
      and m.user_id = auth.uid()
  );
$$;

-- Update cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_qa_sessions(days_old integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM public.doc_qa_chat_sessions 
        WHERE created_at < NOW() - (days_old || ' days')::INTERVAL RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$;

-- Update get_qa_agent_stats function 
CREATE OR REPLACE FUNCTION public.get_qa_agent_stats(p_agent_id uuid)
RETURNS TABLE(total_documents bigint, total_collections bigint, total_sessions bigint, total_messages bigint, avg_session_length double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.doc_qa_documents WHERE agent_id = p_agent_id),
        (SELECT COUNT(*) FROM public.doc_qa_collections WHERE agent_id = p_agent_id),
        (SELECT COUNT(*) FROM public.doc_qa_chat_sessions WHERE agent_id = p_agent_id),
        (SELECT COUNT(*) FROM public.doc_qa_chat_messages WHERE agent_id = p_agent_id),
        (SELECT AVG(message_count) FROM (
            SELECT COUNT(*) as message_count 
            FROM public.doc_qa_chat_messages 
            WHERE agent_id = p_agent_id 
            GROUP BY session_id
        ) session_counts);
END;
$$;