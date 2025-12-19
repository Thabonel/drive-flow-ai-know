import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Creating pitch_decks tables...');

    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
-- Create pitch_decks table
CREATE TABLE IF NOT EXISTS pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  topic TEXT,
  target_audience TEXT,
  style TEXT,
  number_of_slides INTEGER,
  deck_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  source_document_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pitch_decks_user_id ON pitch_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_share_token ON pitch_decks(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pitch_decks_created_at ON pitch_decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_is_archived ON pitch_decks(is_archived) WHERE is_archived = FALSE;

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

ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_deck_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pitch decks" ON pitch_decks;
CREATE POLICY "Users can view own pitch decks"
  ON pitch_decks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view public pitch decks" ON pitch_decks;
CREATE POLICY "Anyone can view public pitch decks"
  ON pitch_decks FOR SELECT TO anon, authenticated
  USING (is_public = TRUE AND share_token IS NOT NULL);

DROP POLICY IF EXISTS "Users can create pitch decks" ON pitch_decks;
CREATE POLICY "Users can create pitch decks"
  ON pitch_decks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own pitch decks" ON pitch_decks;
CREATE POLICY "Users can update own pitch decks"
  ON pitch_decks FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own pitch decks" ON pitch_decks;
CREATE POLICY "Users can delete own pitch decks"
  ON pitch_decks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own pitch deck revisions" ON pitch_deck_revisions;
CREATE POLICY "Users can view own pitch deck revisions"
  ON pitch_deck_revisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pitch_decks
    WHERE pitch_decks.id = pitch_deck_revisions.pitch_deck_id
    AND pitch_decks.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create pitch deck revisions" ON pitch_deck_revisions;
CREATE POLICY "Users can create pitch deck revisions"
  ON pitch_deck_revisions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pitch_decks
    WHERE pitch_decks.id = pitch_deck_revisions.pitch_deck_id
    AND pitch_decks.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION update_pitch_deck_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pitch_deck_updated_at ON pitch_decks;
CREATE TRIGGER set_pitch_deck_updated_at
  BEFORE UPDATE ON pitch_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_pitch_deck_updated_at();

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(9), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := substring(token, 1, 12);
    SELECT EXISTS(SELECT 1 FROM pitch_decks WHERE share_token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

GRANT ALL ON pitch_decks TO authenticated;
GRANT ALL ON pitch_deck_revisions TO authenticated;
GRANT SELECT ON pitch_decks TO anon;
      `
    });

    if (error) {
      throw error;
    }

    console.log('Pitch decks tables created successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Pitch decks tables created successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Setup error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
