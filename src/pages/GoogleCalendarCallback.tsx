import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Google Calendar authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      // Get the authorization code from URL
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setMessage(`Authorization failed: ${error}`);
        toast({
          title: 'Authorization Failed',
          description: error === 'access_denied'
            ? 'You denied access to Google Calendar'
            : `Error: ${error}`,
          variant: 'destructive',
        });
        setTimeout(() => navigate('/timeline'), 3000);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setStatus('error');
        setMessage('No authorization code received');
        toast({
          title: 'Authorization Failed',
          description: 'No authorization code received from Google',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/timeline'), 3000);
        return;
      }

      if (!user) {
        console.error('User not authenticated');
        setStatus('error');
        setMessage('Please log in first');
        toast({
          title: 'Not Authenticated',
          description: 'Please log in before connecting Google Calendar',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      try {
        setMessage('Exchanging authorization code for tokens...');

        // Exchange the authorization code for tokens via Edge Function
        const { data, error: exchangeError } = await supabase.functions.invoke('exchange-google-calendar-code', {
          body: { code }
        });

        if (exchangeError) {
          throw new Error(exchangeError.message || 'Failed to exchange authorization code');
        }

        console.log('Token exchange successful:', data);
        setMessage('Syncing your calendar events...');

        // Trigger initial sync
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
          body: {
            sync_type: 'initial',
            calendar_id: 'primary',
          }
        });

        if (syncError) {
          console.error('Initial sync error:', syncError);
          // Don't fail completely - tokens are stored, sync can happen later
          toast({
            title: 'Connected Successfully',
            description: 'Calendar connected but initial sync failed. Try "Sync Now" on the timeline.',
          });
        } else {
          console.log('Initial sync completed:', syncResult);
          toast({
            title: 'Calendar Connected!',
            description: `Imported ${syncResult?.items_created || 0} events from Google Calendar`,
          });
        }

        setStatus('success');
        setMessage('Google Calendar connected successfully!');

        // Redirect to timeline after short delay
        setTimeout(() => navigate('/timeline'), 2000);

      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to connect Google Calendar');
        toast({
          title: 'Connection Failed',
          description: err instanceof Error ? err.message : 'Failed to connect Google Calendar',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/timeline'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, user, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === 'processing' && (
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        )}
        {status === 'success' && (
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        )}
        {status === 'error' && (
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        )}
        <h1 className="text-2xl font-semibold">{message}</h1>
        <p className="text-muted-foreground">
          {status === 'processing' && 'Please wait...'}
          {status === 'success' && 'Redirecting to timeline...'}
          {status === 'error' && 'Redirecting back...'}
        </p>
      </div>
    </div>
  );
}
