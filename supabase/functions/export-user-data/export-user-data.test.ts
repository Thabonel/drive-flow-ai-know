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
        data: getMockData(table)
      })
    })
  })
};

function getMockData(table: string) {
  const mockData: Record<string, any[]> = {
    'knowledge_documents': [
      {
        id: '1',
        title: 'Test Document 1',
        content: 'Document content 1',
        file_name: 'doc1.pdf',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: { source: 'upload' }
      },
      {
        id: '2',
        title: 'Test Document 2',
        content: 'Document content 2',
        file_name: 'doc2.txt',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        metadata: { source: 'google_drive' }
      }
    ],
    'conversations': [
      {
        id: 'conv-1',
        title: 'Test Conversation 1',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:05:00Z'
      },
      {
        id: 'conv-2',
        title: 'Test Conversation 2',
        messages: [
          { role: 'user', content: 'What is AI?' },
          { role: 'assistant', content: 'AI stands for Artificial Intelligence...' }
        ],
        created_at: '2024-01-02T15:00:00Z',
        updated_at: '2024-01-02T15:10:00Z'
      }
    ],
    'knowledge_bases': [
      {
        id: 'kb-1',
        name: 'Personal KB',
        description: 'My personal knowledge base',
        source_document_ids: ['1', '2'],
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    'ai_query_history': [
      {
        id: 'query-1',
        query: 'What is machine learning?',
        response: 'Machine learning is a subset of AI...',
        created_at: '2024-01-01T12:00:00Z',
        knowledge_base_id: 'kb-1'
      }
    ],
    'user_settings': [
      {
        id: 'settings-1',
        model_preference: 'claude-opus-4-5',
        theme: 'dark',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ],
    'user_google_tokens': [
      {
        id: 'token-1',
        service: 'google_drive',
        created_at: '2024-01-01T00:00:00Z',
        scope: 'drive.readonly',
        expires_at: '2024-02-01T00:00:00Z'
      }
    ]
  };

  return { data: mockData[table] || [] };
}

// Mock global fetch for the Edge Function environment
global.fetch = async (input: string | Request | URL, init?: RequestInit) => {
  // Mock the function call
  const url = typeof input === 'string' ? input : input.toString();

  if (url.includes('export-user-data')) {
    const request = new Request(url, init);
    const response = await handler(request);
    return response;
  }

  return new Response('Not found', { status: 404 });
};

Deno.test('data export includes all user data', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/export-user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({ user_id: 'test-user-id' })
  });

  const response = await handler(request);
  const exportData = await response.json();

  // Verify export structure
  assertExists(exportData);
  assertEquals(exportData.user_id, 'test-user-id');
  assertEquals(exportData.export_date, new Date().toISOString().split('T')[0]); // Today's date
  assertEquals(exportData.format, 'JSON');

  // Verify all data sections are present
  assertExists(exportData.data);
  assertExists(exportData.data.documents);
  assertExists(exportData.data.conversations);
  assertExists(exportData.data.knowledge_bases);
  assertExists(exportData.data.query_history);
  assertExists(exportData.data.settings);
  assertExists(exportData.data.integrations);

  // Verify data counts match mock data
  assertEquals(exportData.data.documents.length, 2);
  assertEquals(exportData.data.conversations.length, 2);
  assertEquals(exportData.data.knowledge_bases.length, 1);
  assertEquals(exportData.data.query_history.length, 1);
  assertEquals(exportData.data.settings.length, 1);

  // Verify sensitive data is excluded
  exportData.data.integrations.forEach((integration: any) => {
    assertEquals(integration.access_token, undefined);
    assertEquals(integration.refresh_token, undefined);
  });
});

Deno.test('data export requires authentication', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/export-user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: 'test-user-id' })
  });

  const response = await handler(request);
  assertEquals(response.status, 401);
});

Deno.test('data export validates user ownership', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/export-user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({ user_id: 'different-user-id' })
  });

  const response = await handler(request);
  assertEquals(response.status, 403);
});

Deno.test('export data includes GDPR-required metadata', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/export-user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({ user_id: 'test-user-id' })
  });

  const response = await handler(request);
  const exportData = await response.json();

  // Verify GDPR-required metadata
  assertExists(exportData.metadata);
  assertExists(exportData.metadata.export_request_date);
  assertExists(exportData.metadata.data_controller);
  assertEquals(exportData.metadata.data_controller, 'AI Query Hub');
  assertExists(exportData.metadata.export_method);
  assertEquals(exportData.metadata.export_method, 'automated');
  assertExists(exportData.metadata.data_sources);

  // Verify data retention info is included
  assertExists(exportData.metadata.retention_info);
  assertExists(exportData.metadata.deletion_rights);
});

Deno.test('export handles large datasets efficiently', async () => {
  // Mock large dataset
  const originalMockData = getMockData;
  global.getMockData = (table: string) => {
    if (table === 'knowledge_documents') {
      return { data: Array(1000).fill(0).map((_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        content: `Content ${i}`,
        created_at: new Date().toISOString()
      })) };
    }
    return originalMockData(table);
  };

  const start = Date.now();

  const request = new Request('https://test.supabase.co/functions/v1/export-user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({ user_id: 'test-user-id' })
  });

  const response = await handler(request);
  const duration = Date.now() - start;

  assertEquals(response.status, 200);

  // Should complete within reasonable time (5 seconds)
  assertEquals(duration < 5000, true);

  const exportData = await response.json();
  assertEquals(exportData.data.documents.length, 1000);
});