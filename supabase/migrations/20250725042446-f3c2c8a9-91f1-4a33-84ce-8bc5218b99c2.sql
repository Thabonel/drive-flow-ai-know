-- Fix search path security issues for non-vector functions

-- Fix get_qa_agent_stats function
CREATE OR REPLACE FUNCTION public.get_qa_agent_stats(p_agent_id uuid)
RETURNS TABLE(total_documents bigint, total_collections bigint, total_sessions bigint, total_messages bigint, avg_session_length double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

-- Fix get_qa_agent_stats_new function
CREATE OR REPLACE FUNCTION public.get_qa_agent_stats_new()
RETURNS TABLE(agent_id bigint, total_messages integer, total_documents integer, total_collections integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    public.doc_qa_agents.id AS agent_id,
    COUNT(public.doc_qa_chat_messages.id) AS total_messages,
    COUNT(public.doc_qa_documents.id) AS total_documents,
    COUNT(public.doc_qa_collections.id) AS total_collections
  FROM public.doc_qa_agents
  LEFT JOIN public.doc_qa_chat_messages ON public.doc_qa_agents.id = public.doc_qa_chat_messages.agent_id
  LEFT JOIN public.doc_qa_documents ON public.doc_qa_agents.id = public.doc_qa_documents.agent_id
  LEFT JOIN public.doc_qa_collections ON public.doc_qa_agents.id = public.doc_qa_collections.agent_id
  GROUP BY public.doc_qa_agents.id;
END;
$function$;

-- Fix cleanup_old_qa_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_old_qa_sessions(days_old integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM public.doc_qa_chat_sessions 
        WHERE created_at < NOW() - INTERVAL '30 days' RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$function$;

-- Fix update_qa_updated_at_column function  
CREATE OR REPLACE FUNCTION public.update_qa_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.doc_qa_documents
  SET updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, NEW.email, NULL);
  RETURN NEW;
END;
$function$;

-- Fix match_memories_optimized function
CREATE OR REPLACE FUNCTION public.match_memories_optimized()
RETURNS SETOF public.agentic_memories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    RETURN QUERY SELECT * FROM public.agentic_memories;
END;
$function$;