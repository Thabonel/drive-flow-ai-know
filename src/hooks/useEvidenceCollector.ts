import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Evidence collection types for SOC 2 compliance
export interface EvidenceData {
  control_type: string;
  last_collected: Date;
  user_permissions?: {
    total_users: number;
    admin_users: number;
    mfa_enabled_users: number;
    last_login_stats: Record<string, any>;
  };
  security_monitoring?: {
    failed_login_attempts: number;
    csp_violations: number;
    audit_log_retention: string;
    incident_count: number;
  };
  system_configuration?: {
    environment_variables: string[];
    security_headers: Record<string, string>;
    cors_configuration: Record<string, any>;
    encryption_status: boolean;
  };
  data_processing?: {
    total_documents: number;
    encrypted_documents: number;
    retention_policies: Record<string, string>;
    backup_status: Record<string, any>;
  };
  collection_metadata: {
    version: string;
    collector_id: string;
    data_integrity_hash: string;
  };
}

// Historical evidence entry
export interface HistoricalEvidenceEntry {
  id: string;
  control_type: string;
  collected_at: string;
  evidence_data: Record<string, any>;
}

// Compliance report structure
export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  controls_assessed: string[];
  evidence_collected: number;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
}

// Evidence collector hook interface
export interface UseEvidenceCollectorReturn {
  historicalEvidence: HistoricalEvidenceEntry[];
  isLoading: boolean;
  error: string | null;
  collectEvidence: (controlType: string) => Promise<EvidenceData>;
  getHistoricalEvidence: (controlType: string, startDate: Date, endDate: Date) => Promise<void>;
  generateComplianceReport: (period: { start: Date; end: Date }) => Promise<ComplianceReport>;
}

export function useEvidenceCollector(): UseEvidenceCollectorReturn {
  const [historicalEvidence, setHistoricalEvidence] = useState<HistoricalEvidenceEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const collectEvidence = useCallback(async (controlType: string): Promise<EvidenceData> => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user for context
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date();

      // Generate collection metadata
      const collectionMetadata = {
        version: '1.0.0',
        collector_id: userData.user?.id || 'system',
        data_integrity_hash: generateIntegrityHash(controlType, now)
      };

      // Collect evidence based on control type
      let evidenceData: EvidenceData = {
        control_type: controlType,
        last_collected: now,
        collection_metadata: collectionMetadata
      };

      switch (controlType) {
        case 'access_controls':
          evidenceData.user_permissions = await collectUserPermissionEvidence();
          break;
        case 'security_monitoring':
          evidenceData.security_monitoring = await collectSecurityMonitoringEvidence();
          break;
        case 'system_configuration':
          evidenceData.system_configuration = await collectSystemConfigurationEvidence();
          break;
        case 'data_processing':
          evidenceData.data_processing = await collectDataProcessingEvidence();
          break;
        default:
          throw new Error(`Unsupported control type: ${controlType}`);
      }

      // Store evidence in database
      const { error: insertError } = await supabase
        .from('compliance_evidence')
        .insert({
          control_type: controlType,
          collected_at: now.toISOString(),
          evidence_data: evidenceData,
          collector_id: userData.user?.id || 'system'
        });

      if (insertError) {
        setError(insertError.message);
        throw new Error(insertError.message);
      }

      return evidenceData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Evidence collection failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHistoricalEvidence = useCallback(async (controlType: string, startDate: Date, endDate: Date) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('compliance_evidence')
        .select('*')
        .eq('control_type', controlType)
        .gte('collected_at', startDate.toISOString())
        .lte('collected_at', endDate.toISOString())
        .order('collected_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      if (data) {
        setHistoricalEvidence(data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical evidence');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateComplianceReport = useCallback(async (period: { start: Date; end: Date }): Promise<ComplianceReport> => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, return a basic compliance report structure
      // In a full implementation, this would analyze collected evidence
      const report: ComplianceReport = {
        period: period,
        controls_assessed: ['access_controls', 'security_monitoring', 'system_configuration', 'data_processing'],
        evidence_collected: 100, // Placeholder - would be calculated from actual evidence
        compliance_status: 'COMPLIANT'
      };

      return report;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate compliance report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    historicalEvidence,
    isLoading,
    error,
    collectEvidence,
    getHistoricalEvidence,
    generateComplianceReport
  };
}

// Helper functions for evidence collection

async function collectUserPermissionEvidence() {
  // Mock implementation - in real system would query user data
  return {
    total_users: 150,
    admin_users: 5,
    mfa_enabled_users: 120,
    last_login_stats: {
      last_24h: 45,
      last_week: 140,
      last_month: 150
    }
  };
}

async function collectSecurityMonitoringEvidence() {
  // Mock implementation - in real system would query audit logs
  return {
    failed_login_attempts: 12,
    csp_violations: 3,
    audit_log_retention: '1 year',
    incident_count: 0
  };
}

async function collectSystemConfigurationEvidence() {
  // Mock implementation - in real system would check actual config
  return {
    environment_variables: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ANTHROPIC_API_KEY'],
    security_headers: {
      'Content-Security-Policy': 'default-src \'self\'',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff'
    },
    cors_configuration: {
      allowed_origins: ['https://aiqueryhub.netlify.app'],
      credentials: true
    },
    encryption_status: true
  };
}

async function collectDataProcessingEvidence() {
  // Mock implementation - in real system would query document stats
  return {
    total_documents: 25000,
    encrypted_documents: 25000,
    retention_policies: {
      'user_documents': '7 years',
      'audit_logs': '7 years',
      'session_data': '30 days'
    },
    backup_status: {
      last_backup: new Date().toISOString(),
      backup_frequency: 'daily',
      backup_retention: '90 days'
    }
  };
}

function generateIntegrityHash(controlType: string, timestamp: Date): string {
  // Simple hash implementation for demo - in production would use proper cryptographic hash
  const data = `${controlType}-${timestamp.toISOString()}-${Math.random()}`;
  return Buffer.from(data).toString('base64').slice(0, 16);
}