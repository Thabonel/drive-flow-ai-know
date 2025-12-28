import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2, Trash2, Save, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHelp } from '@/components/PageHelp';

/**
 * Team Settings Page
 *
 * Allows team owners and admins to manage team settings:
 * - Team name
 * - Team slug
 * - Member limits
 * - Delete team (owners only)
 */
export default function TeamSettings() {
  const { team, isOwner, isAdmin, isLoading, updateTeam, deleteTeam, isUpdating, isDeleting } = useTeam();

  const [teamName, setTeamName] = useState(team?.name || '');
  const [teamSlug, setTeamSlug] = useState(team?.slug || '');

  // Update form when team data loads
  React.useEffect(() => {
    if (team) {
      setTeamName(team.name);
      setTeamSlug(team.slug);
    }
  }, [team]);

  const handleSaveSettings = () => {
    if (!team) return;

    updateTeam({
      teamId: team.id,
      updates: {
        name: teamName,
        slug: teamSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      },
    });
  };

  const handleDeleteTeam = () => {
    if (!team) return;
    deleteTeam(team.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    // Mock team data for demonstration
    const mockTeamId = 'mock-team-id-12345';
    const mockCreatedDate = '2024-01-01T10:00:00Z';
    const mockUpdatedDate = '2024-01-15T14:30:00Z';

    return (
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        {/* Mock Data Banner */}
        <Alert className="border-primary bg-primary/5">
          <AlertDescription className="text-center font-medium">
            📋 This is sample data to preview team features • When you create your own team, this will disappear
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Team Settings
            <PageHelp
              title="Team Settings Help"
              description="Manage your team's configuration, name, and settings. Only team owners and admins can modify team settings."
              tips={[
                "Change your team's display name and URL slug",
                "Team slugs must be unique and can only contain lowercase letters, numbers, and hyphens",
                "Only team owners can delete a team",
                "Deleting a team will remove all team data, members, and shared documents",
                "Team name changes are reflected immediately for all members"
              ]}
            />
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your team's configuration and settings
          </p>
        </div>

        {/* General Settings */}
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic team information and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value="Acme Corporation"
                disabled
                placeholder="Acme Inc."
              />
              <p className="text-sm text-muted-foreground">
                This is your team's display name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-slug">Team Slug</Label>
              <Input
                id="team-slug"
                value="acme-corp"
                disabled
                placeholder="acme-inc"
              />
              <p className="text-sm text-muted-foreground">
                Used in URLs and team identification. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button disabled>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Info */}
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>Details about your team subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Team ID</span>
              <span className="font-mono text-sm">{mockTeamId}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Member Limit</span>
              <span className="font-medium">5 members</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {new Date(mockCreatedDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">
                {new Date(mockUpdatedDate).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive opacity-75">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Team
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasChanges = teamName !== team.name || teamSlug !== team.slug;

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Team Settings
          <PageHelp
            title="Team Settings Help"
            description="Manage your team's configuration, name, and settings. Only team owners and admins can modify team settings."
            tips={[
              "Change your team's display name and URL slug",
              "Team slugs must be unique and can only contain lowercase letters, numbers, and hyphens",
              "Only team owners can delete a team",
              "Deleting a team will remove all team data, members, and shared documents",
              "Team name changes are reflected immediately for all members"
            ]}
          />
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your team's configuration and settings
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic team information and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Acme Inc."
              disabled={!isAdmin}
            />
            <p className="text-sm text-muted-foreground">
              This is your team's display name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-slug">Team Slug</Label>
            <Input
              id="team-slug"
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.target.value)}
              placeholder="acme-inc"
              disabled={!isAdmin}
            />
            <p className="text-sm text-muted-foreground">
              Used in URLs and team identification. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={!hasChanges || isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>Details about your team subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Team ID</span>
            <span className="font-mono text-sm">{team.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Member Limit</span>
            <span className="font-medium">{team.max_members} members</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {new Date(team.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="font-medium">
              {new Date(team.updated_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Team Privacy */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Visibility</CardTitle>
            <CardDescription>Control who can see and join your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Privacy Mode</Label>
                <p className="text-sm text-muted-foreground">
                  {team.privacy_mode === 'private'
                    ? 'Team is invite-only and not discoverable'
                    : 'Team is discoverable (invite still required to join)'}
                </p>
              </div>
              <Switch
                checked={team.privacy_mode === 'open'}
                onCheckedChange={(checked) => {
                  updateTeam({
                    teamId: team.id,
                    updates: { privacy_mode: checked ? 'open' : 'private' },
                  });
                }}
                disabled={!isAdmin}
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Private:</strong> Walled garden, invite-only, not searchable<br />
                <strong>Open:</strong> Discoverable in team directory (future feature)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone - Only visible to owners */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Team
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your team,
                    remove all members, and delete all team-shared documents and timeline items.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTeam}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
