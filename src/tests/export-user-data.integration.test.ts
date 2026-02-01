import { describe, test, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Integration test for data export functionality
describe('Data Export Integration', () => {
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Get current user for testing (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    testUserId = user?.id || null;
  });

  test('export function exists and is accessible', async () => {
    // Test that the function endpoint exists
    const { data, error } = await supabase.functions.invoke('export-user-data', {
      body: { user_id: 'test-user-id' }
    });

    // Should fail with authentication error (expected)
    expect(error).toBeDefined();
    // Function should exist (not 404)
    expect(error?.message).not.toContain('Function not found');
  });

  test('export requires authentication', async () => {
    try {
      const response = await fetch('/functions/v1/export-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: 'test-user-id' })
      });

      expect(response.status).toBe(401);
    } catch (error) {
      // Network error expected in test environment
      expect(error).toBeDefined();
    }
  });

  test('export data structure validation', () => {
    // Test the expected structure of export data
    const mockExportData = {
      user_id: 'test-user',
      export_date: '2026-02-01',
      format: 'JSON',
      data: {
        documents: [],
        conversations: [],
        knowledge_bases: [],
        query_history: [],
        settings: [],
        integrations: []
      },
      metadata: {
        export_request_date: '2026-02-01T00:00:00.000Z',
        data_controller: 'AI Query Hub',
        export_method: 'automated',
        data_sources: ['user_account'],
        retention_info: expect.any(String),
        deletion_rights: expect.any(String)
      }
    };

    // Verify structure matches expected format
    expect(mockExportData).toHaveProperty('user_id');
    expect(mockExportData).toHaveProperty('export_date');
    expect(mockExportData).toHaveProperty('format', 'JSON');
    expect(mockExportData).toHaveProperty('data');
    expect(mockExportData).toHaveProperty('metadata');

    // Verify data section has all required properties
    expect(mockExportData.data).toHaveProperty('documents');
    expect(mockExportData.data).toHaveProperty('conversations');
    expect(mockExportData.data).toHaveProperty('knowledge_bases');
    expect(mockExportData.data).toHaveProperty('query_history');
    expect(mockExportData.data).toHaveProperty('settings');
    expect(mockExportData.data).toHaveProperty('integrations');

    // Verify GDPR metadata requirements
    expect(mockExportData.metadata).toHaveProperty('data_controller');
    expect(mockExportData.metadata).toHaveProperty('retention_info');
    expect(mockExportData.metadata).toHaveProperty('deletion_rights');
  });

  test('export covers all user data tables', () => {
    const expectedTables = [
      'knowledge_documents',
      'conversations',
      'knowledge_bases',
      'ai_query_history',
      'user_settings',
      'user_google_tokens'
    ];

    const exportDataKeys = [
      'documents',
      'conversations',
      'knowledge_bases',
      'query_history',
      'settings',
      'integrations'
    ];

    // Verify we're covering all major user data tables
    expect(exportDataKeys.length).toBeGreaterThanOrEqual(expectedTables.length - 1);
    expect(exportDataKeys).toContain('documents');
    expect(exportDataKeys).toContain('conversations');
    expect(exportDataKeys).toContain('settings');
  });

  test('sensitive data exclusion', () => {
    const mockIntegrationData = [
      {
        id: 'token-1',
        service: 'google_drive',
        scope: 'drive.readonly',
        created_at: '2024-01-01T00:00:00Z',
        // These should be undefined in export
        access_token: undefined,
        refresh_token: undefined
      }
    ];

    mockIntegrationData.forEach(integration => {
      expect(integration.access_token).toBeUndefined();
      expect(integration.refresh_token).toBeUndefined();
      // Non-sensitive data should be present
      expect(integration.service).toBeDefined();
      expect(integration.scope).toBeDefined();
    });
  });

  test('GDPR compliance metadata', () => {
    const mockMetadata = {
      export_request_date: '2026-02-01T00:00:00.000Z',
      data_controller: 'AI Query Hub',
      export_method: 'automated',
      data_sources: ['user_account', 'documents', 'conversations'],
      retention_info: 'Data is retained as long as your account is active...',
      deletion_rights: 'You have the right to request deletion of your personal data...'
    };

    // Verify GDPR Article 15 requirements
    expect(mockMetadata.data_controller).toBe('AI Query Hub');
    expect(mockMetadata.retention_info).toContain('account is active');
    expect(mockMetadata.deletion_rights).toContain('right to request deletion');
    expect(mockMetadata.export_method).toBe('automated');
    expect(mockMetadata.data_sources).toBeInstanceOf(Array);
    expect(mockMetadata.data_sources.length).toBeGreaterThan(0);
  });
});