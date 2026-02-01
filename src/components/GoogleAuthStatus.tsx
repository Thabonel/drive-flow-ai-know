import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleDriveSimple as useGoogleDrive } from '@/hooks/useGoogleDriveSimple';

const GoogleAuthStatus = () => {
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'expired' | 'missing'>('loading');
  const [tokenInfo, setTokenInfo] = useState<{ expires_at: string; scope: string } | null>(null);
  const { user } = useAuth();
  const { signIn, isSigningIn } = useGoogleDrive();

  const checkTokenStatus = async () => {
    if (!user) {
      setTokenStatus('missing');
      return;
    }

    setTokenStatus('loading');

    try {
      // First check for provider token in current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.provider_token) {
        setTokenStatus('valid');
        setTokenInfo({
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          scope: 'drive.readonly'
        });
        return;
      }

      // Fall back to checking stored tokens
      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('access_token, expires_at, scope')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data || !data.access_token) {
        setTokenStatus('missing');
        setTokenInfo(null);
        return;
      }

      setTokenInfo({ expires_at: data.expires_at, scope: data.scope || 'drive.readonly' });

      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now >= expiresAt) {
        setTokenStatus('expired');
      } else {
        setTokenStatus('valid');
      }
    } catch (error) {
      console.error('Error checking token status:', error);
      setTokenStatus('missing');
      setTokenInfo(null);
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, [user]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Refresh status after a short delay
        setTimeout(checkTokenStatus, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const handleConnect = async () => {
    await signIn();
  };

  if (tokenStatus === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking Google Drive connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Google Drive Connection</span>
          {tokenStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {tokenStatus !== 'valid' && <XCircle className="h-5 w-5 text-red-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <span>Status:</span>
          <Badge variant={tokenStatus === 'valid' ? 'default' : 'destructive'}>
            {tokenStatus === 'valid' && 'Connected'}
            {tokenStatus === 'expired' && 'Token Expired'}
            {tokenStatus === 'missing' && 'Not Connected'}
          </Badge>
        </div>

        {tokenInfo && tokenStatus === 'valid' && (
          <div className="text-sm text-muted-foreground">
            <p>Token expires: {new Date(tokenInfo.expires_at).toLocaleString()}</p>
            <p>Scope: {tokenInfo.scope}</p>
          </div>
        )}

        {/* ADD DEBUG INFO FOR TROUBLESHOOTING */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
            <p>Debug Info:</p>
            <p>User ID: {user?.id?.substring(0, 8)}...</p>
            <p>Token Status: {tokenStatus}</p>
            <p>Has Token Info: {!!tokenInfo}</p>
          </div>
        )}

        {tokenStatus !== 'valid' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {tokenStatus === 'expired'
                ? 'Your Google Drive access has expired. Please reconnect to sync files.'
                : 'Connect your Google Drive to sync documents and create knowledge bases.'}
            </p>
            <Button onClick={handleConnect} size="sm" disabled={isSigningIn}>
              {isSigningIn ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {tokenStatus === 'expired' ? 'Reconnect' : 'Connect'} Google Drive
                </>
              )}
            </Button>
          </div>
        )}

        {tokenStatus === 'valid' && (
          <div className="space-y-2">
            <Button onClick={handleConnect} variant="outline" size="sm" disabled={isSigningIn}>
              {isSigningIn ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect Google Drive
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAuthStatus;
