-- Fix security linter issues for functions without search_path

-- Fix the log_token_access_attempt function
CREATE OR REPLACE FUNCTION public.log_token_access_attempt(
  p_user_id uuid,
  p_action text,
  p_success boolean,
  p_details text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access attempts for monitoring
  RAISE LOG 'Token access attempt - User: %, Action: %, Success: %, Details: %, Timestamp: %', 
    p_user_id, p_action, p_success, p_details, NOW();
END;
$$;

-- Update other functions that may be missing search_path
-- Check and update the match_qa_documents function
CREATE OR REPLACE FUNCTION public.match_qa_documents(query_embedding extensions.vector, p_agent_id uuid DEFAULT NULL::uuid, p_collection_id uuid DEFAULT NULL::uuid, match_threshold double precision DEFAULT 0.78, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, content text, metadata jsonb, document_name text, similarity double precision)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        d.document_name,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM doc_qa_documents d
    WHERE 
        (p_agent_id IS NULL OR d.agent_id = p_agent_id)
        AND (p_collection_id IS NULL OR d.collection_id = p_collection_id)
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update get_current_user_can_view_agent function
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

-- Update match_documents function
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding extensions.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, content text, metadata jsonb, embedding extensions.vector, similarity double precision)
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Update match_memories function
CREATE OR REPLACE FUNCTION public.match_memories(query_embedding extensions.vector, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, agent text, memory_type text, content text, metadata jsonb, similarity double precision)
LANGUAGE sql
SET search_path = public
AS $$
SELECT
    id,
    agent,
    memory_type,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
FROM agentic_memories
ORDER BY similarity DESC
LIMIT match_count;
$$;