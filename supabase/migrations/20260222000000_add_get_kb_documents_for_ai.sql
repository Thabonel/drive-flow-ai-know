-- Stored procedure to fetch knowledge base + documents for AI queries.
-- Bypasses RLS via SECURITY DEFINER, replacing the Supabase JS query builder
-- which silently returns empty results in Deno runtime.

CREATE OR REPLACE FUNCTION get_kb_documents_for_ai(
  p_knowledge_base_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kb RECORD;
  v_documents JSONB;
BEGIN
  -- Try personal KB first (owned by user)
  SELECT id, title, description, ai_generated_content, source_document_ids, user_id, team_id
  INTO v_kb
  FROM knowledge_bases
  WHERE id = p_knowledge_base_id
    AND user_id = p_user_id;

  -- If not found, try team KB (user is a member of the team)
  IF v_kb IS NULL THEN
    SELECT kb.id, kb.title, kb.description, kb.ai_generated_content, kb.source_document_ids, kb.user_id, kb.team_id
    INTO v_kb
    FROM knowledge_bases kb
    INNER JOIN team_members tm ON tm.team_id = kb.team_id
    WHERE kb.id = p_knowledge_base_id
      AND tm.user_id = p_user_id
      AND kb.visibility = 'team';
  END IF;

  -- Return NULL if not found (edge function handles gracefully)
  IF v_kb IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch documents referenced by the KB
  IF v_kb.source_document_ids IS NOT NULL AND array_length(v_kb.source_document_ids, 1) > 0 THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'title', d.title,
        'content', d.content,
        'ai_summary', d.ai_summary,
        'tags', d.tags,
        'file_type', d.file_type,
        'category', d.category,
        'sheet_data', d.sheet_data,
        'sheet_metadata', d.sheet_metadata
      )
    ), '[]'::jsonb)
    INTO v_documents
    FROM knowledge_documents d
    WHERE d.id = ANY(v_kb.source_document_ids);
  ELSE
    v_documents := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'kb_title', v_kb.title,
    'kb_description', v_kb.description,
    'ai_generated_content', v_kb.ai_generated_content,
    'documents', v_documents
  );
END;
$$;
