-- Migration: Expand agent_memory memory_type constraint to include creative_output
-- This fixes a constraint violation when the creative sub-agent tries to store output

-- Drop the old constraint and add an expanded one
ALTER TABLE agent_memory DROP CONSTRAINT IF EXISTS agent_memory_memory_type_check;
ALTER TABLE agent_memory ADD CONSTRAINT agent_memory_memory_type_check
  CHECK (memory_type IN ('goal', 'checkpoint', 'action_log', 'briefing', 'insight', 'creative_output'));

-- Add a comment explaining the memory types
COMMENT ON COLUMN agent_memory.memory_type IS 'Type of memory: goal, checkpoint, action_log, briefing, insight, creative_output';
