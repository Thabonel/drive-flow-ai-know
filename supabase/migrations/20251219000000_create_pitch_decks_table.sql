-- Create pitch_decks table for storing generated pitch decks
CREATE TABLE IF NOT EXISTS pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,

  -- Configuration used to generate the deck
  topic TEXT,
  target_audience TEXT,
  style TEXT,
  number_of_slides INTEGER,

  -- The actual deck content (JSONB for flexibility)
  deck_data JSONB NOT NULL,

  -- Metadata
  version INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,

  -- Source documents used
  source_document_ids UUID[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,

  -- Soft delete
  is_archived BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pitch_decks_user_id ON pitch_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_share_token ON pitch_decks(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pitch_decks_created_at ON pitch_decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_is_archived ON pitch_decks(is_archived) WHERE is_archived = FALSE;

-- Create pitch_deck_revisions table for revision history
CREATE TABLE IF NOT EXISTS pitch_deck_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_deck_id UUID NOT NULL REFERENCES pitch_decks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  deck_data JSONB NOT NULL,
  revision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pitch_deck_revisions_pitch_deck_id ON pitch_deck_revisions(pitch_deck_id);
CREATE INDEX IF NOT EXISTS idx_pitch_deck_revisions_version ON pitch_deck_revisions(pitch_deck_id, version DESC);

-- Enable Row Level Security
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_deck_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pitch_decks

-- Users can view their own pitch decks
CREATE POLICY "Users can view own pitch decks"
  ON pitch_decks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view public pitch decks via share token
CREATE POLICY "Anyone can view public pitch decks"
  ON pitch_decks
  FOR SELECT
  TO anon, authenticated
  USING (is_public = TRUE AND share_token IS NOT NULL);

-- Users can insert their own pitch decks
CREATE POLICY "Users can create pitch decks"
  ON pitch_decks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pitch decks
CREATE POLICY "Users can update own pitch decks"
  ON pitch_decks
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own pitch decks
CREATE POLICY "Users can delete own pitch decks"
  ON pitch_decks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for pitch_deck_revisions

-- Users can view revisions of their own pitch decks
CREATE POLICY "Users can view own pitch deck revisions"
  ON pitch_deck_revisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pitch_decks
      WHERE pitch_decks.id = pitch_deck_revisions.pitch_deck_id
      AND pitch_decks.user_id = auth.uid()
    )
  );

-- Users can insert revisions for their own pitch decks
CREATE POLICY "Users can create pitch deck revisions"
  ON pitch_deck_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pitch_decks
      WHERE pitch_decks.id = pitch_deck_revisions.pitch_deck_id
      AND pitch_decks.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pitch_deck_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_pitch_deck_updated_at
  BEFORE UPDATE ON pitch_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_pitch_deck_updated_at();

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 12-character token
    token := encode(gen_random_bytes(9), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := substring(token, 1, 12);

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM pitch_decks WHERE share_token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON pitch_decks TO authenticated;
GRANT ALL ON pitch_deck_revisions TO authenticated;
GRANT SELECT ON pitch_decks TO anon;
