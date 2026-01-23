-- Migration: Add 'creative' to sub_agents agent_type constraint
-- Date: 2026-01-24
-- Purpose: Enable creative-sub-agent to be spawned by adding 'creative' to allowed agent types
-- Note: agent_tasks stores agent_type in structured_output JSONB, not as a direct column

-- Drop and recreate the CHECK constraint on sub_agents table
ALTER TABLE sub_agents DROP CONSTRAINT IF EXISTS sub_agents_agent_type_check;
ALTER TABLE sub_agents ADD CONSTRAINT sub_agents_agent_type_check
  CHECK (agent_type IN ('calendar', 'briefing', 'analysis', 'creative'));

-- Update table comment to reflect the new agent type
COMMENT ON TABLE sub_agents IS 'Individual sub-agents (calendar, briefing, analysis, creative) spawned by orchestrator';
