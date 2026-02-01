import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useIncidentDetector } from '@/hooks/useIncidentDetector';
import { renderHook, waitFor } from '@testing-library/react';

describe('Incident Response Integration', () => {
  // Test user ID for integration tests
  const TEST_USER_ID = 'test-incident-user-' + Date.now();
  const TEST_IP_ADDRESS = '192.168.1.100';

  beforeAll(async () => {
    // Clean up any existing test data
    await supabase.from('security_incidents').delete().like('ip_address', '192.168.1.%');
    await supabase.from('compliance_audit_log').delete().like('ip_address', '192.168.1.%');
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('security_incidents').delete().like('ip_address', '192.168.1.%');
    await supabase.from('compliance_audit_log').delete().like('ip_address', '192.168.1.%');
  });

  beforeEach(async () => {
    // Clean up before each test
    await supabase.from('security_incidents').delete().like('ip_address', '192.168.1.%');
    await supabase.from('compliance_audit_log').delete().like('ip_address', '192.168.1.%');
  });

  it('should create security incident when 6+ failed logins detected', async () => {
    // Arrange: Create 7 failed login attempts from same IP
    const failedLoginEvents = [];
    for (let i = 0; i < 7; i++) {
      const event = {
        user_id: TEST_USER_ID,
        action: 'LOGIN_FAILED',
        category: 'authentication',
        timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(), // 5 minutes apart
        ip_address: TEST_IP_ADDRESS,
        user_agent: 'Mozilla/5.0 (Test Browser)',
        additional_metadata: {
          reason: 'invalid_credentials',
          test_marker: 'integration-test'
        }
      };
      failedLoginEvents.push(event);
    }

    // Insert failed login events into audit log
    const { error: insertError } = await supabase
      .from('compliance_audit_log')
      .insert(failedLoginEvents);

    expect(insertError).toBeNull();

    // Act: Use the incident detector hook to detect incidents
    const { result } = renderHook(() => useIncidentDetector());

    await waitFor(() => {
      expect(result.current.detectIncidents).toBeDefined();
    });

    await result.current.detectIncidents();

    // Wait for detection to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    // Assert: Check that incident was created
    const { data: incidents, error: fetchError } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('ip_address', TEST_IP_ADDRESS)
      .eq('type', 'BRUTE_FORCE_ATTEMPT');

    expect(fetchError).toBeNull();
    expect(incidents).toBeDefined();
    expect(incidents!.length).toBe(1);

    const incident = incidents![0];
    expect(incident.type).toBe('BRUTE_FORCE_ATTEMPT');
    expect(incident.severity).toBe('HIGH');
    expect(incident.status).toBe('ACTIVE');
    expect(incident.ip_address).toBe(TEST_IP_ADDRESS);
    expect(incident.details.failure_count).toBe(7);
  });

  it('should not create incident for fewer than 6 failed attempts', async () => {
    // Arrange: Create only 4 failed login attempts
    const failedLoginEvents = [];
    for (let i = 0; i < 4; i++) {
      const event = {
        user_id: TEST_USER_ID,
        action: 'LOGIN_FAILED',
        category: 'authentication',
        timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
        ip_address: TEST_IP_ADDRESS,
        user_agent: 'Mozilla/5.0 (Test Browser)',
        additional_metadata: {
          reason: 'invalid_credentials',
          test_marker: 'integration-test'
        }
      };
      failedLoginEvents.push(event);
    }

    // Insert failed login events
    const { error: insertError } = await supabase
      .from('compliance_audit_log')
      .insert(failedLoginEvents);

    expect(insertError).toBeNull();

    // Act: Run incident detection
    const { result } = renderHook(() => useIncidentDetector());

    await waitFor(() => {
      expect(result.current.detectIncidents).toBeDefined();
    });

    await result.current.detectIncidents();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    // Assert: No incident should be created
    const { data: incidents, error: fetchError } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('ip_address', TEST_IP_ADDRESS);

    expect(fetchError).toBeNull();
    expect(incidents).toBeDefined();
    expect(incidents!.length).toBe(0);
  });

  it('should be able to resolve incidents', async () => {
    // Arrange: Create a test incident directly
    const { data: incident, error: createError } = await supabase
      .from('security_incidents')
      .insert({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        ip_address: TEST_IP_ADDRESS,
        status: 'ACTIVE',
        details: { test: true }
      })
      .select()
      .single();

    expect(createError).toBeNull();
    expect(incident).toBeDefined();

    // Act: Resolve the incident using the hook
    const { result } = renderHook(() => useIncidentDetector());

    await waitFor(() => {
      expect(result.current.resolveIncident).toBeDefined();
    });

    await result.current.resolveIncident(incident.id);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    // Assert: Incident should be marked as resolved
    const { data: resolvedIncident, error: fetchError } = await supabase
      .from('security_incidents')
      .select('*')
      .eq('id', incident.id)
      .single();

    expect(fetchError).toBeNull();
    expect(resolvedIncident).toBeDefined();
    expect(resolvedIncident.status).toBe('RESOLVED');
  });

  it('should handle incidents from multiple IPs correctly', async () => {
    const IP1 = '192.168.1.101';
    const IP2 = '192.168.1.102';

    // Arrange: Create 6 failures from IP1 and 3 failures from IP2
    const ip1Events = Array(6).fill(null).map((_, i) => ({
      user_id: TEST_USER_ID,
      action: 'LOGIN_FAILED',
      category: 'authentication',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: IP1,
      user_agent: 'Mozilla/5.0 (Test Browser)',
      additional_metadata: { test_marker: 'multi-ip-test' }
    }));

    const ip2Events = Array(3).fill(null).map((_, i) => ({
      user_id: TEST_USER_ID,
      action: 'LOGIN_FAILED',
      category: 'authentication',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: IP2,
      user_agent: 'Mozilla/5.0 (Test Browser)',
      additional_metadata: { test_marker: 'multi-ip-test' }
    }));

    await supabase
      .from('compliance_audit_log')
      .insert([...ip1Events, ...ip2Events]);

    // Act: Run incident detection
    const { result } = renderHook(() => useIncidentDetector());
    await result.current.detectIncidents();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    // Assert: Only IP1 should trigger an incident
    const { data: incidents } = await supabase
      .from('security_incidents')
      .select('*')
      .in('ip_address', [IP1, IP2]);

    expect(incidents).toBeDefined();
    expect(incidents!.length).toBe(1);
    expect(incidents![0].ip_address).toBe(IP1);
    expect(incidents![0].details.failure_count).toBe(6);
  });
});