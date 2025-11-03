import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, XCircle, Users, Building2 } from 'lucide-react';

/**
 * Accept Team Invitation Page
 *
 * Accessed via email link: /accept-invite/:token
 * Validates the invitation token and adds the user to the team.
 */
export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { acceptInvitation, isAccepting } = useTeamMembers();
  const [status, setStatus] = useState<'checking' | 'ready' | 'success' | 'error'>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && token) {
      setStatus('ready');
    } else if (!authLoading && !user) {
      // User not logged in - redirect to auth with return URL
      navigate(`/auth?redirect=/accept-invite/${token}`);
    }
  }, [user, authLoading, token, navigate]);

  const handleAcceptInvitation = () => {
    if (!token) return;

    acceptInvitation(token, {
      onSuccess: () => {
        setStatus('success');
        // Redirect to team page after 2 seconds
        setTimeout(() => {
          navigate('/team/settings');
        }, 2000);
      },
      onError: (err: Error) => {
        setStatus('error');
        setError(err.message || 'Failed to accept invitation');
      },
    });
  };

  if (authLoading || status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Checking invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
            <CardDescription>
              You've successfully joined the team
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Redirecting you to your team page...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Invitation Error</CardTitle>
            <CardDescription>
              Unable to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>This invitation may have:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Expired (invitations are valid for 7 days)</li>
                <li>Already been accepted</li>
                <li>Been sent to a different email address</li>
                <li>Been cancelled by the team admin</li>
              </ul>
            </div>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready to accept
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <strong>Team Benefits:</strong> Access shared documents, collaborate on the team
              timeline, and enable context fluency with your teammates.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Access team documents in AI queries</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>View and manage shared timeline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Collaborate with team members</span>
            </div>
          </div>

          <Button
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
            className="w-full"
            size="lg"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting Invitation...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By accepting, you agree to access team-shared content and collaborate with other team
            members.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
