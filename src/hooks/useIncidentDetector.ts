import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Security incident structure
export interface SecurityIncident {
  id?: string;
  type: 'BRUTE_FORCE_ATTEMPT' | 'SUSPICIOUS_ACCESS' | 'RATE_LIMIT_EXCEEDED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  user_id?: string;
  ip_address: string;
  detected_at: string;
  details?: Record<string, any>;
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_POSITIVE';
}

// Incident detector hook interface
export interface UseIncidentDetectorReturn {
  activeIncidents: SecurityIncident[];
  isLoading: boolean;
  error: string | null;
  detectIncidents: () => Promise<void>;
  getActiveIncidents: () => Promise<void>;
  resolveIncident: (incidentId: string) => Promise<void>;
}

export function useIncidentDetector(): UseIncidentDetectorReturn {
  const [activeIncidents, setActiveIncidents] = useState<SecurityIncident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const detectIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current time for lookback window (1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Fetch failed login attempts from last hour
      const { data: failedLogins, error: fetchError } = await supabase
        .from('compliance_audit_log')
        .select('*')
        .eq('action', 'LOGIN_FAILED')
        .gte('timestamp', oneHourAgo)
        .order('timestamp', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      if (!failedLogins || failedLogins.length === 0) {
        return;
      }

      // Group by IP address to detect brute force patterns
      const ipFailureCounts = new Map<string, any[]>();

      for (const login of failedLogins) {
        const ip = login.ip_address || 'unknown';
        if (!ipFailureCounts.has(ip)) {
          ipFailureCounts.set(ip, []);
        }
        ipFailureCounts.get(ip)!.push(login);
      }

      // Check for brute force attempts (6+ failures from same IP)
      for (const [ip, failures] of ipFailureCounts.entries()) {
        if (failures.length >= 6 && ip !== 'unknown') {
          // Create security incident
          const incident: Omit<SecurityIncident, 'id'> = {
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
          };

          // Insert incident into database
          const { error: insertError } = await supabase
            .from('security_incidents')
            .insert(incident);

          if (insertError) {
            console.error('Failed to create security incident:', insertError);
            setError(insertError.message);
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect incidents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActiveIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: incidents, error: fetchError } = await supabase
        .from('security_incidents')
        .select('*')
        .order('detected_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      if (incidents) {
        setActiveIncidents(incidents);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveIncident = useCallback(async (incidentId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('security_incidents')
        .update({ status: 'RESOLVED' })
        .eq('id', incidentId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Refresh active incidents list
      await getActiveIncidents();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve incident');
    } finally {
      setIsLoading(false);
    }
  }, [getActiveIncidents]);

  return {
    activeIncidents,
    isLoading,
    error,
    detectIncidents,
    getActiveIncidents,
    resolveIncident
  };
}