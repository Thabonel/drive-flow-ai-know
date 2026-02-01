import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import handler from './index.ts';

// Mock environment variables
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: () => ({ data: { user: { id: 'test-user-id', email: 'test@example.com' } } })
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => ({
          data: {
            id: 'test-user-id',
            email: 'test@example.com',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z'
          }
        })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => ({
            data: {
              id: 'test-user-id',
              status: 'deletion_scheduled',
              scheduled_deletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              deletion_requested_at: new Date().toISOString()
            }
          })
        })
      })
    }),
    insert: () => ({
      data: null,
      error: null
    })
  })
};

Deno.test('account deletion schedules data purge', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({ user_id: 'test-user-id' })
  });

  const response = await handler(request);
  const result = await response.json();

  assertEquals(response.status, 200);
  assertExists(result.user_id);
  assertEquals(result.user_id, 'test-user-id');
  assertEquals(result.status, 'deletion_scheduled');
  assertExists(result.scheduled_deletion);
  assertExists(result.deletion_requested_at);

  // Verify scheduled deletion is approximately 30 days from now
  const scheduledDate = new Date(result.scheduled_deletion);
  const now = new Date();
  const daysDifference = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  assertEquals(daysDifference >= 29 && daysDifference <= 31, true); // Allow for some variance
});

Deno.test('deletion requires authentication', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: 'test-user-id' })
  });

  const response = await handler(request);
  assertEquals(response.status, 401);
});

Deno.test('user can only delete their own account', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({ user_id: 'different-user-id' })
  });

  const response = await handler(request);
  assertEquals(response.status, 403);

  const result = await response.json();
  assertEquals(result.error, 'Cannot delete different user account');
});

Deno.test('deletion creates audit trail', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      user_id: 'test-user-id',
      reason: 'User requested account deletion'
    })
  });

  const response = await handler(request);
  const result = await response.json();

  assertEquals(response.status, 200);

  // Verify audit information is included
  assertExists(result.audit);
  assertEquals(result.audit.action, 'account_deletion_scheduled');
  assertEquals(result.audit.user_id, 'test-user-id');
  assertExists(result.audit.timestamp);
  assertEquals(result.audit.ip_address, '192.168.1.1');
  assertEquals(result.audit.user_agent, 'Mozilla/5.0');
});

Deno.test('deletion with grace period allows cancellation', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      user_id: 'test-user-id',
      immediate: false // Default 30-day grace period
    })
  });

  const response = await handler(request);
  const result = await response.json();

  assertEquals(response.status, 200);
  assertEquals(result.status, 'deletion_scheduled');

  // Verify grace period information
  assertExists(result.grace_period);
  assertEquals(result.grace_period.days, 30);
  assertExists(result.grace_period.cancellation_deadline);
  assertEquals(result.message.includes('30 days'), true);
});

Deno.test('immediate deletion for admin or compliance', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token'
    },
    body: JSON.stringify({
      user_id: 'test-user-id',
      immediate: true,
      admin_override: true,
      reason: 'Compliance request'
    })
  });

  const response = await handler(request);
  const result = await response.json();

  assertEquals(response.status, 200);
  assertEquals(result.status, 'deletion_scheduled');

  // Immediate deletion should have very short grace period (1 day for data recovery)
  const scheduledDate = new Date(result.scheduled_deletion);
  const now = new Date();
  const daysDifference = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  assertEquals(daysDifference <= 1, true);
});

Deno.test('deletion validates required confirmation', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      user_id: 'test-user-id'
      // Missing confirmation field
    })
  });

  const response = await handler(request);
  assertEquals(response.status, 400);

  const result = await response.json();
  assertEquals(result.error.includes('confirmation'), true);
});

Deno.test('deletion handles cascade data references', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      user_id: 'test-user-id',
      confirmation: 'DELETE_MY_ACCOUNT'
    })
  });

  const response = await handler(request);
  const result = await response.json();

  assertEquals(response.status, 200);

  // Verify cascade information
  assertExists(result.cascade_info);
  assertExists(result.cascade_info.tables_affected);
  assertEquals(result.cascade_info.tables_affected.includes('knowledge_documents'), true);
  assertEquals(result.cascade_info.tables_affected.includes('conversations'), true);
  assertEquals(result.cascade_info.tables_affected.includes('ai_query_history'), true);
});

Deno.test('deletion provides data export option', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      user_id: 'test-user-id',
      confirmation: 'DELETE_MY_ACCOUNT',
      request_export: true
    })
  });

  const response = await handler(request);
  const result = await response.json();

  assertEquals(response.status, 200);

  // Verify export was triggered
  assertExists(result.export_info);
  assertEquals(result.export_info.export_requested, true);
  assertExists(result.export_info.export_url);
});