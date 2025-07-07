import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';

const GoogleAuthStatus = () => {
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'expired' | 'missing'>('loading');
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const { user } = useAuth();
  const { initializeGoogleDrive, signIn } = useGoogleDrive();

  const checkTokenStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setTokenStatus('missing');
        return;
      }

      setTokenInfo(data);
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
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, [user]);

  const handleReconnect = async () => {
    await initializeGoogleDrive();
    await signIn();
    // Refresh status after a short delay
    setTimeout(checkTokenStatus, 2000);
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

        {tokenStatus !== 'valid' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {tokenStatus === 'expired' 
                ? 'Your Google Drive access has expired. Please reconnect to sync files.'
                : 'Connect your Google Drive to sync documents and create knowledge bases.'}
            </p>
            <Button onClick={handleReconnect} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {tokenStatus === 'expired' ? 'Reconnect' : 'Connect'} Google Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAuthStatus;