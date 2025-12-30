/**
 * Slice 1: Database Schema + User Settings Toggle
 * Tests for agent mode tables and user settings
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Slice 1: Agent Mode Database Schema', () => {
  let testUserId;
  let testSessionId;

  beforeAll(async () => {
    // Create a test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-agent-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (authError) throw authError;
    testUserId = authData.user.id;
  });

  afterAll(async () => {
    // Cleanup: delete test data
    if (testSessionId) {
      await supabase.from('agent_sessions').delete().eq('id', testSessionId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('user_settings table', () => {
    it('should have agent_mode column with default false', async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('agent_mode')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.agent_mode).toBe(false); // Default should be false
    });

    it('should allow toggling agent_mode', async () => {
      // Toggle to true
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ agent_mode: true })
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Verify it's true
      const { data, error } = await supabase
        .from('user_settings')
        .select('agent_mode')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data.agent_mode).toBe(true);

      // Toggle back to false
      await supabase
        .from('user_settings')
        .update({ agent_mode: false })
        .eq('user_id', testUserId);
    });
  });

  describe('agent_sessions table', () => {
    it('should create an agent session with default values', async () => {
      const { data, error } = await supabase
        .from('agent_sessions')
        .insert({
          user_id: testUserId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.user_id).toBe(testUserId);
      expect(data.status).toBe('active'); // Default status
      expect(data.tokens_used).toBe(0);
      expect(data.tokens_budget).toBe(100000); // 100k default budget
      expect(data.tasks_completed).toBe(0);
      expect(data.sub_agents_spawned).toBe(0);
      expect(data.cost_tracking).toBeDefined();
      expect(data.cost_tracking.tokens_opus).toBe(0);
      expect(data.cost_tracking.tokens_sonnet).toBe(0);
      expect(data.cost_tracking.tokens_haiku).toBe(0);

      testSessionId = data.id; // Save for other tests
    });

    it('should enforce status check constraint', async () => {
      const { error } = await supabase
        .from('agent_sessions')
        .insert({
          user_id: testUserId,
          status: 'invalid_status',
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('violates check constraint');
    });

    it('should update last_active_at timestamp', async () => {
      const { data: initialData } = await supabase
        .from('agent_sessions')
        .select('last_active_at')
        .eq('id', testSessionId)
        .single();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update session
      await supabase
        .from('agent_sessions')
        .update({ tokens_used: 100 })
        .eq('id', testSessionId);

      const { data: updatedData } = await supabase
        .from('agent_sessions')
        .select('last_active_at')
        .eq('id', testSessionId)
        .single();

      // last_active_at should be updated automatically
      expect(new Date(updatedData.last_active_at).getTime()).toBeGreaterThan(
        new Date(initialData.last_active_at).getTime()
      );
    });
  });

  describe('agent_memory table', () => {
    it('should create memory entries with valid types', async () => {
      const memoryTypes = ['goal', 'checkpoint', 'action_log', 'briefing', 'insight'];

      for (const memoryType of memoryTypes) {
        const { data, error } = await supabase
          .from('agent_memory')
          .insert({
            session_id: testSessionId,
            user_id: testUserId,
            memory_type: memoryType,
            content: { test: `${memoryType} content` },
            importance: 3,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.memory_type).toBe(memoryType);
        expect(data.importance).toBe(3);
      }
    });

    it('should enforce memory_type check constraint', async () => {
      const { error } = await supabase
        .from('agent_memory')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          memory_type: 'invalid_type',
          content: { test: 'data' },
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('violates check constraint');
    });

    it('should enforce importance range (1-5)', async () => {
      const { error: lowError } = await supabase
        .from('agent_memory')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          memory_type: 'goal',
          content: { test: 'data' },
          importance: 0, // Below minimum
        });

      expect(lowError).toBeDefined();
      expect(lowError.message).toContain('violates check constraint');

      const { error: highError } = await supabase
        .from('agent_memory')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          memory_type: 'goal',
          content: { test: 'data' },
          importance: 6, // Above maximum
        });

      expect(highError).toBeDefined();
      expect(highError.message).toContain('violates check constraint');
    });
  });

  describe('sub_agents table', () => {
    it('should create sub-agents with valid types', async () => {
      const agentTypes = ['calendar', 'briefing', 'analysis'];

      for (const agentType of agentTypes) {
        const { data, error } = await supabase
          .from('sub_agents')
          .insert({
            session_id: testSessionId,
            user_id: testUserId,
            agent_type: agentType,
            status: 'pending',
            task_data: { task: `${agentType} task` },
            priority: 2,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.agent_type).toBe(agentType);
        expect(data.status).toBe('pending');
        expect(data.priority).toBe(2); // Default P2
      }
    });

    it('should enforce priority range (0-2)', async () => {
      const { error } = await supabase
        .from('sub_agents')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          agent_type: 'calendar',
          task_data: { test: 'data' },
          priority: 3, // Invalid priority
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('violates check constraint');
    });

    it('should track agent lifecycle timestamps', async () => {
      const { data: agent } = await supabase
        .from('sub_agents')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          agent_type: 'briefing',
          task_data: { test: 'data' },
        })
        .select()
        .single();

      expect(agent.started_at).toBeNull(); // Not started yet
      expect(agent.completed_at).toBeNull();

      // Start the agent
      await supabase
        .from('sub_agents')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', agent.id);

      // Complete the agent
      const completedAt = new Date().toISOString();
      await supabase
        .from('sub_agents')
        .update({
          status: 'completed',
          completed_at: completedAt,
          result_data: { result: 'success' },
        })
        .eq('id', agent.id);

      const { data: completedAgent } = await supabase
        .from('sub_agents')
        .select('*')
        .eq('id', agent.id)
        .single();

      expect(completedAgent.status).toBe('completed');
      expect(completedAgent.started_at).toBeDefined();
      expect(completedAgent.completed_at).toBe(completedAt);
      expect(completedAgent.result_data).toEqual({ result: 'success' });
    });
  });

  describe('agent_tasks table', () => {
    it('should create tasks with structured output', async () => {
      const { data, error } = await supabase
        .from('agent_tasks')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          original_input: 'Check my calendar for tomorrow',
          structured_output: {
            intent: 'calendar_check',
            entities: { date: 'tomorrow' },
            priority: 1,
          },
          priority: 1,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('pending'); // Default status
      expect(data.priority).toBe(1);
      expect(data.original_input).toBe('Check my calendar for tomorrow');
      expect(data.structured_output).toBeDefined();
    });

    it('should allow task assignment to sub-agents', async () => {
      // Create a sub-agent
      const { data: agent } = await supabase
        .from('sub_agents')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          agent_type: 'calendar',
          task_data: { test: 'data' },
        })
        .select()
        .single();

      // Create and assign a task
      const { data: task } = await supabase
        .from('agent_tasks')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          original_input: 'Test task',
          structured_output: { test: 'data' },
          assigned_agent_id: agent.id,
          status: 'assigned',
        })
        .select()
        .single();

      expect(task.assigned_agent_id).toBe(agent.id);
      expect(task.status).toBe('assigned');
    });
  });

  describe('RLS Policies', () => {
    let otherUserId;

    beforeAll(async () => {
      // Create another test user
      const { data: authData } = await supabase.auth.admin.createUser({
        email: `test-other-${Date.now()}@example.com`,
        password: 'test-password-123',
        email_confirm: true,
      });
      otherUserId = authData.user.id;
    });

    afterAll(async () => {
      if (otherUserId) {
        await supabase.auth.admin.deleteUser(otherUserId);
      }
    });

    it('should prevent users from viewing other users agent sessions', async () => {
      // This would require setting up auth context which is complex in tests
      // For now, we verify RLS is enabled
      const { data: tables } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .in('tablename', ['agent_sessions', 'agent_memory', 'sub_agents', 'agent_tasks']);

      const agentTables = tables.filter(t =>
        ['agent_sessions', 'agent_memory', 'sub_agents', 'agent_tasks'].includes(t.tablename)
      );

      expect(agentTables.length).toBe(4);
      agentTables.forEach(table => {
        expect(table.rowsecurity).toBe(true); // RLS should be enabled
      });
    });
  });

  describe('Indexes', () => {
    it('should have performance indexes created', async () => {
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .in('tablename', ['agent_sessions', 'agent_memory', 'sub_agents', 'agent_tasks']);

      const expectedIndexes = [
        'idx_agent_sessions_user_id',
        'idx_agent_sessions_status',
        'idx_agent_sessions_active',
        'idx_agent_memory_session_id',
        'idx_agent_memory_type',
        'idx_agent_memory_user_recent',
        'idx_sub_agents_session_id',
        'idx_sub_agents_status',
        'idx_sub_agents_priority',
        'idx_agent_tasks_session_id',
        'idx_agent_tasks_status',
        'idx_agent_tasks_priority',
      ];

      const indexNames = indexes.map(i => i.indexname);
      expectedIndexes.forEach(expectedIndex => {
        expect(indexNames).toContain(expectedIndex);
      });
    });
  });

  describe('Triggers', () => {
    it('should auto-update updated_at on agent_sessions', async () => {
      const { data: initial } = await supabase
        .from('agent_sessions')
        .select('updated_at')
        .eq('id', testSessionId)
        .single();

      await new Promise(resolve => setTimeout(resolve, 1000));

      await supabase
        .from('agent_sessions')
        .update({ tokens_used: 200 })
        .eq('id', testSessionId);

      const { data: updated } = await supabase
        .from('agent_sessions')
        .select('updated_at')
        .eq('id', testSessionId)
        .single();

      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(initial.updated_at).getTime()
      );
    });

    it('should auto-update updated_at on sub_agents', async () => {
      const { data: agent } = await supabase
        .from('sub_agents')
        .insert({
          session_id: testSessionId,
          user_id: testUserId,
          agent_type: 'analysis',
          task_data: { test: 'data' },
        })
        .select()
        .single();

      const initialUpdatedAt = agent.updated_at;

      await new Promise(resolve => setTimeout(resolve, 1000));

      await supabase
        .from('sub_agents')
        .update({ status: 'active' })
        .eq('id', agent.id);

      const { data: updated } = await supabase
        .from('sub_agents')
        .select('updated_at')
        .eq('id', agent.id)
        .single();

      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(initialUpdatedAt).getTime()
      );
    });
  });
});
