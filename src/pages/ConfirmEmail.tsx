import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ConfirmEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Try to get session immediately
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          setStatus('success');
          setMessage('Email confirmed successfully!');
          toast({
            title: "Email Confirmed",
            description: "Redirecting to your dashboard...",
          });
          setTimeout(() => navigate('/conversations'), 2000);
          return;
        }

        // If no session yet, listen for auth changes (common for PKCE)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            setStatus('success');
            setMessage('Email confirmed successfully!');
            toast({
              title: "Email Confirmed",
              description: "Redirecting to your dashboard...",
            });
            setTimeout(() => navigate('/conversations'), 2000);
            subscription.unsubscribe();
          }
        });

        // Fail if no success after a timeout
        setTimeout(() => {
          if (status === 'loading') {
            subscription.unsubscribe();
            setStatus('error');
            setMessage('Confirmation timed out or link is invalid. Please try logging in.');
          }
        }, 10000);

      } catch (error: any) {
        console.error('Confirmation error:', error);
        setStatus('error');

        if (error.message?.includes('expired')) {
          setMessage('This confirmation link has expired. Please try resending the confirmation email from the login page.');
        } else if (error.message?.includes('already confirmed')) {
          setMessage('Your email is already confirmed. Redirecting to login...');
          setTimeout(() => navigate('/auth'), 3000);
        } else {
          setMessage(error.message || 'Invalid confirmation link. Please try again or contact support.');
        }

        toast({
          title: "Confirmation Failed",
          description: error.message || "Failed to confirm email",
          variant: "destructive",
        });
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Brain className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground">AI Query Hub</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              Email Confirmation
            </CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we verify your email address...
              </p>
            )}
            {status === 'success' && (
              <p className="text-sm text-green-600 text-center">
                Your account is now active. You'll be redirected shortly.
              </p>
            )}
            {status === 'error' && (
              <div className="space-y-2">
                <p className="text-sm text-red-600 text-center">{message}</p>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/auth')}
                >
                  Return to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmEmail;
