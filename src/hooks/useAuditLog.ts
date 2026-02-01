import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Audit log event structure
export interface AuditLogEvent {
  action: string;
  category: 'authentication' | 'security' | 'data_access' | 'administrative' | 'usage';
  metadata?: Record<string, any>;
}

// Audit log entry structure
export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  action: string;
  category: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  additional_metadata?: Record<string, any>;
}

// Audit log hook interface
export interface UseAuditLogReturn {
  logs: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  logEvent: (event: AuditLogEvent) => Promise<void>;
  getAuditLogs: (category?: string, limit?: number) => Promise<void>;
}

export function useAuditLog(): UseAuditLogReturn {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const logEvent = useCallback(async (event: AuditLogEvent) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: userData } = await supabase.auth.getUser();

      // Detect client-side information
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      const ipAddress = 'unknown'; // Will be detected server-side

      // Prepare audit log entry
      const auditEntry: Omit<AuditLogEntry, 'id'> = {
        user_id: userData.user?.id || null,
        action: event.action,
        category: event.category,
        timestamp: new Date().toISOString(),
        ip_address: event.metadata?.ip_address || ipAddress,
        user_agent: userAgent,
        additional_metadata: event.metadata || {}
      };

      // Insert into audit log table
      const { error: insertError } = await supabase
        .from('compliance_audit_log')
        .insert(auditEntry);

      if (insertError) {
        setError(insertError.message);
        return;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log audit event');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuditLogs = useCallback(async (category?: string, limit: number = 100) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('compliance_audit_log')
        .select('*');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      if (data) {
        setLogs(data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    logs,
    isLoading,
    error,
    logEvent,
    getAuditLogs
  };
}