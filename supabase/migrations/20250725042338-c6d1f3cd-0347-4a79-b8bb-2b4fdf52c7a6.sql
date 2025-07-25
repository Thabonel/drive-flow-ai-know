-- Fix search path security issues for database functions

-- Fix the main match_memories function used by the app
CREATE OR REPLACE FUNCTION public.match_memories(query_embedding vector, match_threshold double precision, match_count integer, filter_agent text, user_filter text)
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

-- Fix match_documents function
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, content text, metadata jsonb, embedding vector, similarity double precision)
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

-- Fix match_qa_documents function
CREATE OR REPLACE FUNCTION public.match_qa_documents(query_embedding vector, p_agent_id uuid DEFAULT NULL::uuid, p_collection_id uuid DEFAULT NULL::uuid, match_threshold double precision DEFAULT 0.78, match_count integer DEFAULT 5)
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