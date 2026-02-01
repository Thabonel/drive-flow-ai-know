import { useState, useEffect } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, QrCode } from 'lucide-react';

export function MFASettings() {
  const {
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
  } = useMFA();

  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Load factors on component mount
  useEffect(() => {
    listFactors();
  }, [listFactors]);

  // Handle MFA enrollment
  const handleEnrollMFA = async () => {
    try {
      await enrollMFA();
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to enroll MFA',
        variant: 'destructive'
      });
    }
  };

  // Handle MFA verification
  const handleVerifyMFA = async () => {
    if (!verificationCode.trim() || !enrollmentData) return;

    setIsVerifying(true);
    try {
      const result = await verifyMFA(verificationCode, enrollmentData.uri.split('secret=')[1]?.split('&')[0] || '');

      if (result.success) {
        toast({
          title: 'Success',
          description: 'MFA has been successfully enabled',
          variant: 'default'
        });
        setVerificationCode('');
        // Refresh factors list
        await listFactors();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Verification failed',
          variant: 'destructive'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to verify MFA code',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle MFA disable
  const handleDisableMFA = async (factorId: string) => {
    try {
      await unenrollMFA(factorId);
      toast({
        title: 'Success',
        description: 'MFA has been disabled',
        variant: 'default'
      });
      // Refresh factors list
      await listFactors();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to disable MFA',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Score Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Your account security score and MFA status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-medium">Security Score:</span>
              <span className="ml-2 text-2xl font-bold">{securityScore}/10</span>
            </div>
            <div className="flex items-center gap-2">
              {mfaEnabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <Badge variant="default" className="bg-green-600">
                    MFA Enabled
                  </Badge>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <Badge variant="outline" className="border-amber-600 text-amber-600">
                    MFA Disabled
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* MFA Enrollment Section */}
      {!mfaEnabled && !enrollmentData && (
        <Card>
          <CardHeader>
            <CardTitle>Enable Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Secure your account with time-based one-time passwords (TOTP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleEnrollMFA}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Setting up...' : 'Enable MFA'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MFA Setup Section (showing QR code) */}
      {enrollmentData && !mfaEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Set Up Your Authenticator App
            </CardTitle>
            <CardDescription>
              Scan this QR code with your authenticator app, then enter the verification code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white border rounded-lg">
              <img
                src={enrollmentData.qr_code}
                alt="MFA QR Code"
                className="w-48 h-48"
              />
            </div>

            {/* Manual Secret */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Can't scan? Enter this code manually:
              </p>
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                {enrollmentData.secret}
              </code>
            </div>


            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>

            <Button
              onClick={handleVerifyMFA}
              disabled={isVerifying || !verificationCode.trim()}
              className="w-full"
            >
              {isVerifying ? 'Verifying...' : 'Verify Code'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MFA Status Section (when enabled) */}
      {mfaEnabled && factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Multi-Factor Authentication</CardTitle>
            <CardDescription>
              MFA is currently enabled for your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">TOTP (Time-based)</h4>
                <p className="text-sm text-muted-foreground">
                  Authenticator app verification
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default" className="bg-green-600">
                    Verified
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(factors[0]?.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDisableMFA(factors[0]?.id)}
                disabled={isLoading}
              >
                Disable MFA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}