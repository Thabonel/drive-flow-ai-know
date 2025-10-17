import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMicrosoft } from '@/hooks/useMicrosoft';
import { useToast } from '@/hooks/use-toast';

const MicrosoftCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useMicrosoft();
  const { toast } = useToast();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        toast({
          title: 'Authentication Failed',
          description: errorDescription || 'Failed to authenticate with Microsoft',
          variant: 'destructive',
        });
        navigate('/add-documents');
        return;
      }

      if (!code) {
        toast({
          title: 'Invalid Callback',
          description: 'No authorization code received',
          variant: 'destructive',
        });
        navigate('/add-documents');
        return;
      }

      try {
        await handleCallback(code);
        navigate('/add-documents');
      } catch (error) {
        console.error('Error processing Microsoft callback:', error);
        navigate('/add-documents');
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-lg">Connecting to Microsoft 365...</p>
        <p className="text-sm text-muted-foreground">Please wait while we complete the authentication.</p>
      </div>
    </div>
  );
};

export default MicrosoftCallback;
