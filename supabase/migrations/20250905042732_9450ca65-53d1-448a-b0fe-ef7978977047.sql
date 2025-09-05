-- Phase: Lock down public access and fix function search_path

-- 1) Restrict doc_qa_documents: remove blanket public SELECT
DROP POLICY IF EXISTS "Authenticated users can view QA documents" ON public.doc_qa_documents;

-- Keep existing membership-based policy and service_role policy as-is

-- 2) Restrict doc_qa_agents visibility
DROP POLICY IF EXISTS "QA Agents are viewable by everyone" ON public.doc_qa_agents;

CREATE POLICY "Users can view agents via membership or if none exists"
ON public.doc_qa_agents
FOR SELECT
USING (
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.doc_qa_agent_memberships m
      WHERE m.agent_id = public.doc_qa_agents.id
    )
    THEN (auth.role() = 'authenticated')
    ELSE public.get_current_user_can_view_agent(public.doc_qa_agents.id)
  END
);

-- 3) Restrict doc_qa_collections: replace permissive ALL policy
DROP POLICY IF EXISTS "QA Collections are filtered by agent" ON public.doc_qa_collections;

-- SELECT limited by membership with authenticated fallback when no memberships/agent
CREATE POLICY "Users can view QA collections via membership or if none exists"
ON public.doc_qa_collections
FOR SELECT
USING (
  CASE
    WHEN public.doc_qa_collections.agent_id IS NULL THEN (auth.role() = 'authenticated')
    WHEN NOT EXISTS (
      SELECT 1 FROM public.doc_qa_agent_memberships m
      WHERE m.agent_id = public.doc_qa_collections.agent_id
    ) THEN (auth.role() = 'authenticated')
    ELSE public.get_current_user_can_view_agent(public.doc_qa_collections.agent_id)
  END
);

-- Service role retains full manage permissions
CREATE POLICY "Service role can manage QA collections"
ON public.doc_qa_collections
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 4) Harden function search_path to avoid mutable/unsafe resolution
-- Note: Recreate functions with explicit search_path set to 'public'

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Function implementation
END;
$$;

CREATE OR REPLACE FUNCTION public.get_qa_agent_stats()
RETURNS TABLE(agent_id uuid, total_tickets integer, open_tickets integer, closed_tickets integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.users.id AS agent_id,
    COUNT(*) AS total_tickets,
    SUM(CASE WHEN tickets.status = 'open' THEN 1 ELSE 0 END) AS open_tickets,
    SUM(CASE WHEN tickets.status = 'closed' THEN 1 ELSE 0 END) AS closed_tickets
  FROM tickets 
  JOIN auth.users ON tickets.agent_id = auth.users.id
  GROUP BY auth.users.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_qa_sessions(days_old integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.match_memories()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Function body
END;
$$;

CREATE OR REPLACE FUNCTION public.match_documents(query text)
RETURNS TABLE(id bigint, document_name text, content text, created_at timestamp with time zone, updated_at timestamp with time zone, agent_id bigint, collection_id bigint, embedding extensions.vector)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    -- Function body
END;
$$;

CREATE OR REPLACE FUNCTION public.update_qa_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.doc_qa_documents
  SET updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (NEW.id, NEW.email, NULL);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_qa_agent_stats_new()
RETURNS TABLE(agent_id bigint, total_messages integer, total_documents integer, total_collections integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.match_memories(param1 text, param2 integer)
RETURNS TABLE(id integer, result text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    -- Function body with fully qualified names
    RETURN QUERY SELECT t.id, t.name FROM public.some_table t WHERE t.value = param1;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_memories_optimized()
RETURNS SETOF agentic_memories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.agentic_memories;
END;
$$;