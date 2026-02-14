-- ============================================================================
-- FIX CONVERSATIONS TABLE COLUMN
-- ============================================================================
-- Created: 2025-02-15
-- Purpose: Add missing is_pinned column to existing conversations table
-- This fixes the index creation error for conversations table
-- ============================================================================

-- Add missing is_pinned column to conversations table if it doesn't exist
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add missing columns to conversations table if they don't exist
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS context_summary TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

-- Add constraints if they don't exist (will fail silently if they already exist)
DO $$
BEGIN
    -- Add type constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_type_check') THEN
        ALTER TABLE conversations ADD CONSTRAINT conversations_type_check
        CHECK (type IN ('general', 'planning', 'research', 'brainstorm'));
    END IF;

    -- Add status constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_status_check') THEN
        ALTER TABLE conversations ADD CONSTRAINT conversations_status_check
        CHECK (status IN ('active', 'archived', 'deleted'));
    END IF;
END $$;

-- Now create the indexes safely
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(user_id, is_pinned) WHERE is_pinned = TRUE;

-- Add comment for clarity
COMMENT ON COLUMN conversations.is_pinned IS 'Whether conversation is pinned by user for quick access';

SELECT 'Conversations table column fix completed!' as status;