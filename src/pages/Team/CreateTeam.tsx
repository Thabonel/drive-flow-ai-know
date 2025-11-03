import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Users, FileText, Calendar, Sparkles } from 'lucide-react';

/**
 * Create Team Page
 *
 * Allows Business/Enterprise users to create their team.
 * Shows after user subscribes to Business tier but hasn't created a team yet.
 */
export default function CreateTeam() {
  const navigate = useNavigate();
  const { team, createTeam, isCreating } = useTeam();
  const [teamName, setTeamName] = useState('');
  const [teamSlug, setTeamSlug] = useState('');
  const [error, setError] = useState('');

  // Redirect if user already has a team
  React.useEffect(() => {
    if (team) {
      navigate('/team/settings');
    }
  }, [team, navigate]);

  const handleCreateTeam = () => {
    setError('');

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    if (!teamSlug.trim()) {
      setError('Please enter a team slug');
      return;
    }

    const validSlug = teamSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    createTeam(
      { name: teamName.trim(), slug: validSlug },
      {
        onSuccess: () => {
          navigate('/team/settings');
        },
        onError: (err: Error) => {
          setError(err.message || 'Failed to create team');
        },
      }
    );
  };

  // Auto-generate slug from team name
  React.useEffect(() => {
    if (teamName && !teamSlug) {
      const autoSlug = teamName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setTeamSlug(autoSlug);
    }
  }, [teamName, teamSlug]);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
            <Building2 className="h-10 w-10" />
            Create Your Team
          </h1>
          <p className="text-muted-foreground text-lg">
            Enable context fluency across your organization
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Shared Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All team members access the same knowledge base. Context is local to your organization.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg">Context Fluency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Everyone sings from the same song list. AI assistants have consistent context across the team.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Shared Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Assign tasks to team members and view shared calendar for coordination.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Team Form */}
        <Card>
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
            <CardDescription>
              Set up your team to start collaborating
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="Acme Inc."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-sm text-muted-foreground">
                Your organization or team name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-slug">Team Slug</Label>
              <Input
                id="team-slug"
                placeholder="acme-inc"
                value={teamSlug}
                onChange={(e) => setTeamSlug(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-sm text-muted-foreground">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateTeam}
                disabled={isCreating || !teamName || !teamSlug}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Team...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Team
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>What happens next:</strong> After creating your team, you'll be able to invite
            up to 5 members, upload team documents, and start enabling context fluency across your
            organization.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
