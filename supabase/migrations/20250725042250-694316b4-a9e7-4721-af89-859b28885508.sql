-- Fix search path security issues for all database functions

-- Fix match_memories functions
CREATE OR REPLACE FUNCTION public.match_memories(query_embedding extensions.vector, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, agent text, memory_type text, content text, metadata jsonb, similarity double precision)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
SELECT
    id,
    agent,
    memory_type,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
FROM public.agentic_memories
ORDER BY similarity DESC
LIMIT match_count;
$function$;

CREATE OR REPLACE FUNCTION public.match_memories(query_embedding extensions.vector, match_threshold double precision, match_count integer, filter_agent text, user_filter text)
RETURNS TABLE(id uuid, agent text, memory_type text, content text, metadata json, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
select
  id,
  agent,
  memory_type,
  content,
  metadata,
  1 - (embedding <=> query_embedding) as similarity
from public.agentic_memories
where agent = filter_agent
and 1 - (embedding <=> query_embedding) > match_threshold
order by embedding <=> query_embedding
limit match_count;
$function$;

-- Fix match_documents functions
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding extensions.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, content text, metadata jsonb, embedding extensions.vector, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    embedding,
    1 - (public.doc_qa_documents.embedding <=> query_embedding) as similarity
  from public.doc_qa_documents
  where metadata @> filter
  order by public.doc_qa_documents.embedding <=> query_embedding
  limit match_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.match_documents(query text)
RETURNS TABLE(id bigint, document_name text, content text, created_at timestamp with time zone, updated_at timestamp with time zone, agent_id bigint, collection_id bigint, embedding extensions.vector)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Function body
    RETURN;
END;
$function$;

-- Fix match_qa_documents function
CREATE OR REPLACE FUNCTION public.match_qa_documents(query_embedding extensions.vector, p_agent_id uuid DEFAULT NULL::uuid, p_collection_id uuid DEFAULT NULL::uuid, match_threshold double precision DEFAULT 0.78, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, content text, metadata jsonb, document_name text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        d.document_name,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM public.doc_qa_documents d
    WHERE 
        (p_agent_id IS NULL OR d.agent_id = p_agent_id)
        AND (p_collection_id IS NULL OR d.collection_id = p_collection_id)
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$function$;

-- Fix get_qa_agent_stats functions
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
        WHERE created_at < NOW() - INTERVAL '%s days' RETURNING *
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