import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Loader2 } from 'lucide-react';

export default function GoogleCalendarCallback() {
  const location = useLocation();
  const { handleOAuthCallback, isConnecting } = useGoogleCalendar();

  useEffect(() => {
    // The access token is in the URL hash (fragment)
    // e.g., #access_token=...&token_type=Bearer&expires_in=3600
    if (location.hash) {
      handleOAuthCallback(location.hash);
    }
  }, [location.hash, handleOAuthCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h1 className="text-xl font-semibold">
          {isConnecting ? 'Connecting Google Calendar...' : 'Processing...'}
        </h1>
        <p className="text-muted-foreground">
          Please wait while we complete the connection.
        </p>
      </div>
    </div>
  );
}
