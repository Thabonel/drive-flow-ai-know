import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDropbox } from '@/hooks/useDropbox';

const DropboxAuthStatus = () => {
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'expired' | 'missing'>('loading');
  const [tokenInfo, setTokenInfo] = useState<{ expires_at: string | null; account_id: string | null } | null>(null);
  const { user } = useAuth();
  const { signIn, disconnect, isSigningIn } = useDropbox();

  const checkTokenStatus = async () => {
    if (!user) {
      setTokenStatus('missing');
      return;
    }

    setTokenStatus('loading');

    try {
      const { data, error } = await supabase
        .from('user_dropbox_tokens')
        .select('access_token, expires_at, account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data || !data.access_token) {
        setTokenStatus('missing');
        setTokenInfo(null);
        return;
      }

      setTokenInfo({ expires_at: data.expires_at, account_id: data.account_id });

      // Dropbox offline tokens don't expire, but check if expires_at is set
      if (data.expires_at) {
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        if (now >= expiresAt) {
          setTokenStatus('expired');
          return;
        }
      }

      setTokenStatus('valid');
    } catch (error) {
      console.error('Error checking Dropbox token status:', error);
      setTokenStatus('missing');
      setTokenInfo(null);
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, [user]);

  const handleConnect = async () => {
    await signIn();
    // Refresh status after connecting
    setTimeout(checkTokenStatus, 1000);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setTokenStatus('missing');
    setTokenInfo(null);
  };

  if (tokenStatus === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking Dropbox connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 20l6 4 6-4-6-4-6 4z"/>
          </svg>
          <span>Dropbox Connection</span>
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
            {tokenInfo.account_id && <p>Account: {tokenInfo.account_id}</p>}
            {tokenInfo.expires_at && (
              <p>Token expires: {new Date(tokenInfo.expires_at).toLocaleString()}</p>
            )}
            {!tokenInfo.expires_at && <p>Token: Long-lived (no expiration)</p>}
          </div>
        )}

        {tokenStatus !== 'valid' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {tokenStatus === 'expired'
                ? 'Your Dropbox access has expired. Please reconnect to sync files.'
                : 'Connect your Dropbox account to sync documents and create knowledge bases.'}
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
                  {tokenStatus === 'expired' ? 'Reconnect' : 'Connect'} Dropbox
                </>
              )}
            </Button>
          </div>
        )}

        {tokenStatus === 'valid' && (
          <div className="flex gap-2">
            <Button onClick={handleConnect} variant="outline" size="sm" disabled={isSigningIn}>
              {isSigningIn ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect
                </>
              )}
            </Button>
            <Button onClick={handleDisconnect} variant="outline" size="sm">
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DropboxAuthStatus;
