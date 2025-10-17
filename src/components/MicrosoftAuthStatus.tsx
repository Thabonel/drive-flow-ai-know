import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMicrosoft } from '@/hooks/useMicrosoft';

const MicrosoftAuthStatus = () => {
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'expired' | 'missing'>('loading');
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const { user } = useAuth();
  const { signIn } = useMicrosoft();

  const checkTokenStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_microsoft_tokens')
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
      console.error('Error checking Microsoft token status:', error);
      setTokenStatus('missing');
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, [user]);

  // Listen for auth changes and refresh status
  useEffect(() => {
    const channel = supabase
      .channel('microsoft_tokens_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_microsoft_tokens',
        },
        () => {
          // Refresh token status when tokens are updated
          setTimeout(checkTokenStatus, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConnect = async () => {
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
            <span>Checking Microsoft 365 connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Microsoft 365 Connection</span>
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
                ? 'Your Microsoft 365 access has expired. Please reconnect to sync files.'
                : 'Connect your Microsoft 365 account to sync OneDrive and SharePoint documents.'}
            </p>
            <Button onClick={handleConnect} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {tokenStatus === 'expired' ? 'Reconnect' : 'Connect'} Microsoft 365
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MicrosoftAuthStatus;
