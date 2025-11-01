-- ========================================================================
-- EXTEND ASSISTANT COLLABORATION SYSTEM
-- ========================================================================
-- This extends the existing assistant system (from migration 20251102000012)
-- with additional collaboration features

-- Timeline item notes/communication (NEW)
CREATE TABLE IF NOT EXISTS timeline_item_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Note content
  note_text TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (
    note_type IN ('general', 'fyi', 'needs_approval', 'urgent', 'handoff')
  ),

  -- Flags
  is_read BOOLEAN DEFAULT FALSE,
  requires_response BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,

  -- Targeting
  target_user_id UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily handoff notes (NEW)
CREATE TABLE IF NOT EXISTS daily_handoff_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- From/To
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Handoff details
  handoff_date DATE NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'daily' CHECK (
    shift_type IN ('daily', 'coverage', 'emergency')
  ),

  -- Content
  summary TEXT NOT NULL,
  action_items JSONB DEFAULT '[]'::jsonb,
  urgent_items JSONB DEFAULT '[]'::jsonb,
  important_contacts JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting briefings (NEW)
CREATE TABLE IF NOT EXISTS meeting_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Meeting
  meeting_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prepared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Briefing content
  briefing_title TEXT NOT NULL,
  executive_summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  attendees_info JSONB DEFAULT '[]'::jsonb,
  background_context TEXT,
  talking_points JSONB DEFAULT '[]'::jsonb,
  decisions_needed JSONB DEFAULT '[]'::jsonb,

  -- Documents
  document_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Template
  template_id UUID,

  -- Status
  is_distributed BOOLEAN DEFAULT FALSE,
  distributed_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES meeting_briefings(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Briefing templates (NEW)
CREATE TABLE IF NOT EXISTS briefing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template details
  template_name TEXT NOT NULL,
  meeting_type TEXT, -- 'board_meeting', 'investor_call', 'one_on_one', etc.

  -- Structure
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_points JSONB DEFAULT '[]'::jsonb,

  -- Settings
  is_shared BOOLEAN DEFAULT FALSE,
  auto_apply_for_meeting_types TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delegation queue (NEW)
CREATE TABLE IF NOT EXISTS delegation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Delegation
  delegator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Item
  item_type TEXT NOT NULL CHECK (
    item_type IN ('task', 'meeting', 'email', 'decision', 'research')
  ),
  item_id UUID,

  -- Details
  task_title TEXT NOT NULL,
  task_description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),

  -- Status
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'in_progress', 'completed', 'needs_review', 'approved', 'rejected')
  ),

  -- Completion
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI conflict detection (NEW)
CREATE TABLE IF NOT EXISTS ai_conflict_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conflict
  assistant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (
    conflict_type IN ('double_booking', 'cross_executive', 'overload', 'travel_conflict', 'focus_time_conflict')
  ),

  -- Affected items
  affected_timeline_items UUID[] DEFAULT ARRAY[]::UUID[],
  affected_executives UUID[] DEFAULT ARRAY[]::UUID[],

  -- Details
  conflict_description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  suggested_resolution TEXT,

  -- Status
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assistant coverage schedule (NEW)
CREATE TABLE IF NOT EXISTS assistant_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Coverage
  assistant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  covering_assistant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period
  coverage_start TIMESTAMPTZ NOT NULL,
  coverage_end TIMESTAMPTZ NOT NULL,

  -- Reason
  coverage_reason TEXT NOT NULL CHECK (
    coverage_reason IN ('vacation', 'sick_leave', 'training', 'other')
  ),
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  handoff_completed BOOLEAN DEFAULT FALSE,
  handoff_notes_id UUID REFERENCES daily_handoff_notes(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_timeline_notes_item ON timeline_item_notes(timeline_item_id);
CREATE INDEX IF NOT EXISTS idx_timeline_notes_author ON timeline_item_notes(author_user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_notes_unread ON timeline_item_notes(target_user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_handoff_notes_to ON daily_handoff_notes(to_user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_handoff_notes_date ON daily_handoff_notes(handoff_date DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_briefings_meeting ON meeting_briefings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_briefings_executive ON meeting_briefings(executive_id);
CREATE INDEX IF NOT EXISTS idx_meeting_briefings_unread ON meeting_briefings(executive_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_delegation_queue_delegate ON delegation_queue(delegate_user_id, status) WHERE status != 'approved';
CREATE INDEX IF NOT EXISTS idx_delegation_queue_delegator ON delegation_queue(delegator_user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conflicts_assistant ON ai_conflict_detections(assistant_user_id, is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_conflicts_severity ON ai_conflict_detections(severity, is_resolved) WHERE is_resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_assistant_coverage_active ON assistant_coverage(assistant_user_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE timeline_item_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_handoff_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conflict_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_coverage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Timeline notes
CREATE POLICY "Users can view notes on their items"
  ON timeline_item_notes FOR SELECT
  USING (
    author_user_id = auth.uid() OR
    target_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM timeline_items ti
      WHERE ti.id = timeline_item_id
      AND ti.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes"
  ON timeline_item_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Handoff notes
CREATE POLICY "Users can view their handoff notes"
  ON daily_handoff_notes FOR SELECT
  USING (
    from_user_id = auth.uid() OR
    to_user_id = auth.uid()
  );

CREATE POLICY "Users can create handoff notes"
  ON daily_handoff_notes FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- Meeting briefings
CREATE POLICY "Users can view their briefings"
  ON meeting_briefings FOR SELECT
  USING (
    executive_id = auth.uid() OR
    prepared_by_user_id = auth.uid()
  );

CREATE POLICY "Assistants can manage briefings"
  ON meeting_briefings FOR ALL
  USING (prepared_by_user_id = auth.uid());

-- Briefing templates
CREATE POLICY "Users can view their templates"
  ON briefing_templates FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_shared = TRUE
  );

CREATE POLICY "Users can manage their templates"
  ON briefing_templates FOR ALL
  USING (user_id = auth.uid());

-- Delegation queue
CREATE POLICY "Users can view their delegations"
  ON delegation_queue FOR SELECT
  USING (
    delegator_user_id = auth.uid() OR
    delegate_user_id = auth.uid()
  );

CREATE POLICY "Delegators can create delegations"
  ON delegation_queue FOR INSERT
  WITH CHECK (delegator_user_id = auth.uid());

CREATE POLICY "Delegates can update delegations"
  ON delegation_queue FOR UPDATE
  USING (delegate_user_id = auth.uid());

-- AI conflicts
CREATE POLICY "Assistants can view their conflicts"
  ON ai_conflict_detections FOR SELECT
  USING (assistant_user_id = auth.uid());

CREATE POLICY "System can create conflicts"
  ON ai_conflict_detections FOR INSERT
  WITH CHECK (TRUE);

-- Assistant coverage
CREATE POLICY "Users can view their coverage"
  ON assistant_coverage FOR SELECT
  USING (
    assistant_user_id = auth.uid() OR
    covering_assistant_user_id = auth.uid()
  );

CREATE POLICY "Assistants can manage their coverage"
  ON assistant_coverage FOR ALL
  USING (assistant_user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get assistant's executives (extends existing system)
CREATE OR REPLACE FUNCTION get_assistant_executives_extended(p_assistant_id UUID)
RETURNS TABLE (
  executive_id UUID,
  executive_email TEXT,
  is_primary BOOLEAN,
  unread_notes INTEGER,
  pending_delegations INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.executive_id,
    u.email as executive_email,
    FALSE as is_primary, -- Can be enhanced later
    (
      SELECT COUNT(*)::INTEGER
      FROM timeline_item_notes tin
      WHERE tin.target_user_id = p_assistant_id
      AND tin.is_read = FALSE
      AND EXISTS (
        SELECT 1 FROM timeline_items ti
        WHERE ti.id = tin.timeline_item_id
        AND ti.user_id = ar.executive_id
      )
    ) as unread_notes,
    (
      SELECT COUNT(*)::INTEGER
      FROM delegation_queue dq
      WHERE dq.delegate_user_id = p_assistant_id
      AND dq.status IN ('assigned', 'in_progress', 'needs_review')
    ) as pending_delegations
  FROM assistant_relationships ar
  JOIN auth.users u ON u.id = ar.executive_id
  WHERE ar.assistant_id = p_assistant_id
  AND ar.status = 'active'
  ORDER BY ar.accepted_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect conflicts across executives
CREATE OR REPLACE FUNCTION detect_cross_executive_conflicts(p_assistant_id UUID)
RETURNS TABLE (
  conflict_id UUID,
  conflict_type TEXT,
  executive_ids UUID[],
  timeline_item_ids UUID[],
  conflict_description TEXT,
  severity TEXT
) AS $$
BEGIN
  -- Find overlapping timeline items across multiple executives
  RETURN QUERY
  WITH assistant_executives AS (
    SELECT executive_id
    FROM assistant_relationships
    WHERE assistant_id = p_assistant_id
    AND status = 'active'
  ),
  timeline_overlaps AS (
    SELECT
      t1.id AS item1_id,
      t2.id AS item2_id,
      t1.user_id AS exec1_id,
      t2.user_id AS exec2_id,
      t1.start_time,
      t1.end_time
    FROM timeline_items t1
    JOIN timeline_items t2 ON (
      t1.start_time < t2.end_time AND
      t2.start_time < t1.end_time AND
      t1.id < t2.id
    )
    WHERE t1.user_id IN (SELECT executive_id FROM assistant_executives)
    AND t2.user_id IN (SELECT executive_id FROM assistant_executives)
    AND t1.user_id != t2.user_id
  )
  SELECT
    gen_random_uuid(),
    'cross_executive'::TEXT,
    ARRAY[exec1_id, exec2_id],
    ARRAY[item1_id, item2_id],
    'Overlapping commitments for multiple executives'::TEXT,
    'high'::TEXT
  FROM timeline_overlaps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create delegation
CREATE OR REPLACE FUNCTION create_delegation(
  p_delegate_user_id UUID,
  p_task_title TEXT,
  p_task_description TEXT,
  p_due_date TIMESTAMPTZ,
  p_priority TEXT
)
RETURNS UUID AS $$
DECLARE
  v_delegation_id UUID;
BEGIN
  INSERT INTO delegation_queue (
    delegator_user_id,
    delegate_user_id,
    item_type,
    task_title,
    task_description,
    due_date,
    priority
  ) VALUES (
    auth.uid(),
    p_delegate_user_id,
    'task',
    p_task_title,
    p_task_description,
    p_due_date,
    p_priority
  )
  RETURNING id INTO v_delegation_id;

  RETURN v_delegation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp trigger function (reuse from existing)
CREATE OR REPLACE FUNCTION update_extended_assistant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER timeline_notes_updated_at
  BEFORE UPDATE ON timeline_item_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_extended_assistant_updated_at();

CREATE TRIGGER handoff_notes_updated_at
  BEFORE UPDATE ON daily_handoff_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_extended_assistant_updated_at();

CREATE TRIGGER meeting_briefings_updated_at
  BEFORE UPDATE ON meeting_briefings
  FOR EACH ROW
  EXECUTE FUNCTION update_extended_assistant_updated_at();

CREATE TRIGGER delegation_queue_updated_at
  BEFORE UPDATE ON delegation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_extended_assistant_updated_at();

CREATE TRIGGER assistant_coverage_updated_at
  BEFORE UPDATE ON assistant_coverage
  FOR EACH ROW
  EXECUTE FUNCTION update_extended_assistant_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Extended assistant collaboration system migration completed!' AS status;

SELECT 'Created ' || COUNT(*) || ' new tables (expected: 7)' AS result
FROM information_schema.tables
WHERE table_name IN (
  'timeline_item_notes',
  'daily_handoff_notes',
  'meeting_briefings',
  'briefing_templates',
  'delegation_queue',
  'ai_conflict_detections',
  'assistant_coverage'
);
