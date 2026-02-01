import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// MFA enrollment data structure
export interface MFAEnrollmentData {
  qr_code: string;
  secret: string;
  uri: string;
}

// MFA factor structure
export interface MFAFactor {
  id: string;
  type: 'totp';
  status: 'unverified' | 'verified';
  created_at: string;
}

// MFA verification result
export interface MFAVerificationResult {
  success: boolean;
  error?: string;
}

// MFA hook interface
export interface UseMFAReturn {
  enrollmentData: MFAEnrollmentData | null;
  factors: MFAFactor[];
  securityScore: number;
  mfaEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  enrollMFA: () => Promise<void>;
  verifyMFA: (code: string, factorId: string) => Promise<MFAVerificationResult>;
  listFactors: () => Promise<void>;
  unenrollMFA: (factorId: string) => Promise<void>;
}

export function useMFA(): UseMFAReturn {
  const [enrollmentData, setEnrollmentData] = useState<MFAEnrollmentData | null>(null);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [securityScore, setSecurityScore] = useState<number>(5);
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const enrollMFA = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Enroll in TOTP MFA
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });

      if (enrollError) {
        setError(enrollError.message);
        return;
      }

      if (data?.totp) {
        setEnrollmentData({
          qr_code: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri
        });
      }

      // Update user metadata and security score
      await updateSecurityScore(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA enrollment failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMFA = useCallback(async (code: string, factorId: string): Promise<MFAVerificationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) {
        return { success: false, error: challengeError.message };
      }

      // Then verify the code
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      // Update security score and MFA status on successful verification
      await updateSecurityScore(true);
      setMfaEnabled(true);

      return { success: true };

    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'MFA verification failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listFactors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: listError } = await supabase.auth.mfa.listFactors();

      if (listError) {
        setError(listError.message);
        return;
      }

      if (data) {
        // Supabase returns factors grouped by type, use the 'all' array
        const allFactors = data.all || [];
        setFactors(allFactors.map(factor => ({
          id: factor.id,
          type: factor.factor_type as 'totp',
          status: factor.status as 'unverified' | 'verified',
          created_at: factor.created_at
        })));

        // Check if any factors are verified
        const hasVerifiedFactors = allFactors.some(factor => factor.status === 'verified');
        setMfaEnabled(hasVerifiedFactors);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list MFA factors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unenrollMFA = useCallback(async (factorId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }

      // Update factors list and security score
      await listFactors();
      await updateSecurityScore(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA unenrollment failed');
    } finally {
      setIsLoading(false);
    }
  }, [listFactors]);

  const updateSecurityScore = async (mfaEnabled: boolean) => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        // Calculate security score based on MFA status
        const baseScore = 5;
        const mfaBonus = mfaEnabled ? 3 : 0;
        const newScore = baseScore + mfaBonus;

        setSecurityScore(newScore);
        setMfaEnabled(mfaEnabled);

        // Update user metadata (in a real implementation, this might be done server-side)
        await supabase.auth.updateUser({
          data: {
            security_score: newScore,
            mfa_enabled: mfaEnabled
          }
        });
      }
    } catch (err) {
      console.warn('Failed to update security score:', err);
    }
  };

  return {
    enrollmentData,
    factors,
    securityScore,
    mfaEnabled,
    isLoading,
    error,
    enrollMFA,
    verifyMFA,
    listFactors,
    unenrollMFA
  };
}