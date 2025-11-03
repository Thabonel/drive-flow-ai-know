import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Mail, UserPlus, Trash2, Shield, Eye, UserCog, Crown } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Team Members Page
 *
 * Displays team members, pending invitations, and allows:
 * - Inviting new members (admins)
 * - Changing member roles (owners/admins)
 * - Removing members (owners/admins)
 * - Cancelling pending invitations (admins)
 */
export default function TeamMembers() {
  const { team, isAdmin, isOwner, isLoading: teamLoading } = useTeam();
  const {
    members,
    invitations,
    memberCount,
    pendingInvitationCount,
    isLoading,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    isInviting,
  } = useTeamMembers(team?.id);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    inviteMember(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail('');
          setShowInviteForm(false);
        },
      }
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'member':
        return <UserCog className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (teamLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            You don't have a team yet. Create one to access team features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isAtCapacity = memberCount + pendingInvitationCount >= (team.max_members || 5);

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Team Members
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and invitations ({memberCount}/{team.max_members} members)
          </p>
        </div>
        {isAdmin && !isAtCapacity && (
          <Button onClick={() => setShowInviteForm(!showInviteForm)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Capacity Warning */}
      {isAtCapacity && (
        <Alert>
          <AlertDescription>
            Your team has reached its member limit. Remove a member or upgrade your plan to invite more.
          </AlertDescription>
        </Alert>
      )}

      {/* Invite Form */}
      {showInviteForm && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite New Member</CardTitle>
            <CardDescription>
              Send an email invitation to join your team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Viewer - View team documents and timeline
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Member - Full access to documents and timeline
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin - Manage team and members
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingInvitationCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({pendingInvitationCount})</CardTitle>
            <CardDescription>
              Invitations sent but not yet accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited {new Date(invitation.created_at).toLocaleDateString()} •
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(invitation.role)}
                        <span className="capitalize">{invitation.role}</span>
                      </div>
                    </Badge>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revoke the invitation sent to {invitation.email}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelInvitation(invitation.id)}>
                              Revoke Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({memberCount})</CardTitle>
          <CardDescription>
            People with access to your team's documents and timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.user?.user_metadata?.full_name?.[0] || member.user?.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.user?.user_metadata?.full_name || member.user?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.role !== 'owner' ? (
                    <Select
                      value={member.role}
                      onValueChange={(value: any) =>
                        updateMemberRole({ memberId: member.id, role: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        <span className="capitalize">{member.role}</span>
                      </div>
                    </Badge>
                  )}
                  {isAdmin && member.role !== 'owner' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {member.user?.email} from the team.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMember(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Member
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
