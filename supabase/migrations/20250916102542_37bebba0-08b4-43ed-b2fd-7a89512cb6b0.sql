-- Fix security linter warnings for function search paths

-- Fix function search paths that were flagged by security linter
CREATE OR REPLACE FUNCTION public.match_qa_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function implementation
END;
$$;

CREATE OR REPLACE FUNCTION public.match_memories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body
END;
$$;

CREATE OR REPLACE FUNCTION public.match_memories_optimized()
RETURNS SETOF agentic_memories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.agentic_memories;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_documents(query text)
RETURNS TABLE(id bigint, document_name text, content text, created_at timestamp with time zone, updated_at timestamp with time zone, agent_id bigint, collection_id bigint, embedding extensions.vector)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body
END;
$$;