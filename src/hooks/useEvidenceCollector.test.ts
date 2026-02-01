import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvidenceCollector } from './useEvidenceCollector';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null, data: [{ id: 'evidence-123' }] })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}));

describe('useEvidenceCollector Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('evidence collection captures required data', async () => {
    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const evidence = await result.current.collectEvidence('access_controls');

      expect(evidence.user_permissions).toBeDefined();
      expect(evidence.last_collected).toBeInstanceOf(Date);
      expect(evidence.control_type).toBe('access_controls');
    });

    expect(result.current.error).toBeNull();
  });

  test('collects user permission evidence for SOC 2 CC6.1', async () => {
    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const evidence = await result.current.collectEvidence('access_controls');

      // SOC 2 CC6.1: Access Controls
      expect(evidence.user_permissions).toHaveProperty('total_users');
      expect(evidence.user_permissions).toHaveProperty('admin_users');
      expect(evidence.user_permissions).toHaveProperty('mfa_enabled_users');
      expect(evidence.user_permissions).toHaveProperty('last_login_stats');
    });
  });

  test('collects security monitoring evidence for SOC 2 CC6.2', async () => {
    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const evidence = await result.current.collectEvidence('security_monitoring');

      // SOC 2 CC6.2: Logical and Physical Access Controls
      expect(evidence.security_monitoring).toHaveProperty('failed_login_attempts');
      expect(evidence.security_monitoring).toHaveProperty('csp_violations');
      expect(evidence.security_monitoring).toHaveProperty('audit_log_retention');
      expect(evidence.security_monitoring).toHaveProperty('incident_count');
    });
  });

  test('collects system configuration evidence for SOC 2 CC6.7', async () => {
    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const evidence = await result.current.collectEvidence('system_configuration');

      // SOC 2 CC6.7: System Configuration Management
      expect(evidence.system_configuration).toHaveProperty('environment_variables');
      expect(evidence.system_configuration).toHaveProperty('security_headers');
      expect(evidence.system_configuration).toHaveProperty('cors_configuration');
      expect(evidence.system_configuration).toHaveProperty('encryption_status');
    });
  });

  test('collects data processing evidence for SOC 2 CC6.8', async () => {
    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const evidence = await result.current.collectEvidence('data_processing');

      // SOC 2 CC6.8: Data Management and Retention
      expect(evidence.data_processing).toHaveProperty('total_documents');
      expect(evidence.data_processing).toHaveProperty('encrypted_documents');
      expect(evidence.data_processing).toHaveProperty('retention_policies');
      expect(evidence.data_processing).toHaveProperty('backup_status');
    });
  });

  test('retrieves historical evidence for compliance periods', async () => {
    // Mock historical evidence data
    const mockHistoricalEvidence = [
      {
        id: 'evidence-1',
        control_type: 'access_controls',
        collected_at: '2026-01-01T00:00:00Z',
        evidence_data: { user_permissions: { total_users: 150 } }
      },
      {
        id: 'evidence-2',
        control_type: 'access_controls',
        collected_at: '2026-01-15T00:00:00Z',
        evidence_data: { user_permissions: { total_users: 155 } }
      }
    ];

    // Override mock to return historical data
    const module = await import('@/integrations/supabase/client');
    const mockSupabase = module.supabase;

    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockHistoricalEvidence, error: null }))
            }))
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      await result.current.getHistoricalEvidence('access_controls', startDate, endDate);
    });

    expect(result.current.historicalEvidence).toHaveLength(2);
    expect(result.current.historicalEvidence[0].control_type).toBe('access_controls');
  });

  test('generates compliance report for SOC 2 audit period', async () => {
    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const auditPeriod = {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31')
      };

      const report = await result.current.generateComplianceReport(auditPeriod);

      // Compliance report structure
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('controls_assessed');
      expect(report).toHaveProperty('evidence_collected');
      expect(report).toHaveProperty('compliance_status');
      expect(report.period.start).toEqual(auditPeriod.start);
      expect(report.period.end).toEqual(auditPeriod.end);
    });
  });

  test('handles evidence collection errors gracefully', async () => {
    // Mock error response
    const module = await import('@/integrations/supabase/client');
    const mockSupabase = module.supabase;

    mockSupabase.from = vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Evidence collection failed' }
      }))
    }));

    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      try {
        await result.current.collectEvidence('access_controls');
      } catch (error) {
        // Expected to throw due to error condition
      }
    });

    expect(result.current.error).toBe('Evidence collection failed');
  });

  test('validates evidence completeness before storage', async () => {
    // Reset mock to success state for this test
    const module = await import('@/integrations/supabase/client');
    const mockSupabase = module.supabase;

    mockSupabase.from = vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null, data: [{ id: 'evidence-123' }] }))
    }));

    const { result } = renderHook(() => useEvidenceCollector());

    await act(async () => {
      const evidence = await result.current.collectEvidence('access_controls');

      // Evidence validation requirements
      expect(evidence.control_type).toBeTruthy();
      expect(evidence.last_collected).toBeTruthy();
      expect(evidence.collection_metadata).toHaveProperty('version');
      expect(evidence.collection_metadata).toHaveProperty('collector_id');
      expect(evidence.collection_metadata).toHaveProperty('data_integrity_hash');
    });
  });
});