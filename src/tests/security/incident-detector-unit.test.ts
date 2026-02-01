import { describe, it, expect } from 'vitest';
import type { SecurityIncident } from '@/hooks/useIncidentDetector';

// Unit tests for incident detection logic (without database dependencies)
describe('Incident Detector Logic', () => {
  // Helper function to simulate the incident detection algorithm
  function detectBruteForceFromLogs(logs: any[]): SecurityIncident[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Filter to only failed login attempts in last hour
    const recentFailures = logs.filter(log =>
      log.action === 'LOGIN_FAILED' &&
      new Date(log.timestamp) >= oneHourAgo
    );

    // Group by IP address
    const ipFailureCounts = new Map<string, any[]>();
    for (const failure of recentFailures) {
      const ip = failure.ip_address || 'unknown';
      if (!ipFailureCounts.has(ip)) {
        ipFailureCounts.set(ip, []);
      }
      ipFailureCounts.get(ip)!.push(failure);
    }

    // Detect brute force attempts (6+ failures from same IP)
    const incidents: SecurityIncident[] = [];
    for (const [ip, failures] of ipFailureCounts.entries()) {
      if (failures.length >= 6 && ip !== 'unknown') {
        incidents.push({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'HIGH',
          ip_address: ip,
          detected_at: new Date().toISOString(),
          status: 'ACTIVE',
          details: {
            failure_count: failures.length,
            first_attempt: failures[failures.length - 1]?.timestamp,
            last_attempt: failures[0]?.timestamp,
            affected_user_ids: [...new Set(failures.map(f => f.user_id).filter(Boolean))]
          }
        });
      }
    }

    return incidents;
  }

  it('should detect brute force when 6+ failed logins from same IP', () => {
    // Arrange
    const mockLogs = Array(7).fill(null).map((_, i) => ({
      id: `log-${i}`,
      action: 'LOGIN_FAILED',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: '192.168.1.100',
      user_id: 'test-user'
    }));

    // Act
    const incidents = detectBruteForceFromLogs(mockLogs);

    // Assert
    expect(incidents).toHaveLength(1);
    expect(incidents[0].type).toBe('BRUTE_FORCE_ATTEMPT');
    expect(incidents[0].severity).toBe('HIGH');
    expect(incidents[0].ip_address).toBe('192.168.1.100');
    expect(incidents[0].status).toBe('ACTIVE');
    expect(incidents[0].details.failure_count).toBe(7);
  });

  it('should not detect brute force for fewer than 6 failed attempts', () => {
    // Arrange
    const mockLogs = Array(5).fill(null).map((_, i) => ({
      id: `log-${i}`,
      action: 'LOGIN_FAILED',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: '192.168.1.100',
      user_id: 'test-user'
    }));

    // Act
    const incidents = detectBruteForceFromLogs(mockLogs);

    // Assert
    expect(incidents).toHaveLength(0);
  });

  it('should ignore failures older than 1 hour', () => {
    // Arrange
    const mockLogs = [
      // 3 recent failures
      ...Array(3).fill(null).map((_, i) => ({
        id: `recent-${i}`,
        action: 'LOGIN_FAILED',
        timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
        ip_address: '192.168.1.100',
        user_id: 'test-user'
      })),
      // 4 old failures (older than 1 hour)
      ...Array(4).fill(null).map((_, i) => ({
        id: `old-${i}`,
        action: 'LOGIN_FAILED',
        timestamp: new Date(Date.now() - (90 + i * 5) * 60 * 1000).toISOString(), // 90+ minutes ago
        ip_address: '192.168.1.100',
        user_id: 'test-user'
      }))
    ];

    // Act
    const incidents = detectBruteForceFromLogs(mockLogs);

    // Assert - Should not trigger because only 3 recent failures
    expect(incidents).toHaveLength(0);
  });

  it('should handle multiple IPs correctly', () => {
    // Arrange
    const IP1 = '192.168.1.100';
    const IP2 = '192.168.1.101';

    const mockLogs = [
      // 6 failures from IP1 (should trigger)
      ...Array(6).fill(null).map((_, i) => ({
        id: `ip1-${i}`,
        action: 'LOGIN_FAILED',
        timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
        ip_address: IP1,
        user_id: 'test-user-1'
      })),
      // 4 failures from IP2 (should not trigger)
      ...Array(4).fill(null).map((_, i) => ({
        id: `ip2-${i}`,
        action: 'LOGIN_FAILED',
        timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
        ip_address: IP2,
        user_id: 'test-user-2'
      }))
    ];

    // Act
    const incidents = detectBruteForceFromLogs(mockLogs);

    // Assert
    expect(incidents).toHaveLength(1);
    expect(incidents[0].ip_address).toBe(IP1);
    expect(incidents[0].details.failure_count).toBe(6);
  });

  it('should ignore unknown IP addresses', () => {
    // Arrange
    const mockLogs = Array(10).fill(null).map((_, i) => ({
      id: `log-${i}`,
      action: 'LOGIN_FAILED',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: 'unknown',
      user_id: 'test-user'
    }));

    // Act
    const incidents = detectBruteForceFromLogs(mockLogs);

    // Assert - Should not trigger for unknown IP
    expect(incidents).toHaveLength(0);
  });

  it('should include affected user IDs in incident details', () => {
    // Arrange
    const mockLogs = Array(6).fill(null).map((_, i) => ({
      id: `log-${i}`,
      action: 'LOGIN_FAILED',
      timestamp: new Date(Date.now() - (i * 5 * 60 * 1000)).toISOString(),
      ip_address: '192.168.1.100',
      user_id: i < 3 ? 'user-1' : 'user-2' // Multiple users targeted
    }));

    // Act
    const incidents = detectBruteForceFromLogs(mockLogs);

    // Assert
    expect(incidents).toHaveLength(1);
    expect(incidents[0].details.affected_user_ids).toContain('user-1');
    expect(incidents[0].details.affected_user_ids).toContain('user-2');
    expect(incidents[0].details.affected_user_ids).toHaveLength(2);
  });
});