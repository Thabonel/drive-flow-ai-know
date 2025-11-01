import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UserPlus,
  Shield,
  Activity,
  Clock,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  MoreVertical,
  Play,
  Pause,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAssistantAccess, type AssistantRelationship, type AssistantSuggestion } from '@/hooks/useAssistantAccess';
import { InviteAssistantDialog } from './InviteAssistantDialog';
import { formatDistanceToNow } from 'date-fns';

export function ExecutiveAssistantDashboard() {
  const {
    myAssistants,
    pendingSuggestions,
    recentActivity,
    loading,
    revokeAccess,
    toggleSuspend,
    reviewSuggestion,
  } = useAssistantAccess();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const activeAssistants = myAssistants.filter((a) => a.status === 'active');
  const pendingInvites = myAssistants.filter((a) => a.status === 'pending');
  const suspendedAssistants = myAssistants.filter((a) => a.status === 'suspended');

  const handleRevoke = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to revoke this assistant\'s access? This cannot be undone.')) {
      return;
    }

    setProcessingId(relationshipId);
    await revokeAccess(relationshipId, 'Revoked by executive');
    setProcessingId(null);
  };

  const handleToggleSuspend = async (relationshipId: string, suspend: boolean) => {
    setProcessingId(relationshipId);
    await toggleSuspend(relationshipId, suspend);
    setProcessingId(null);
  };

  const handleApproveSuggestion = async (suggestion: AssistantSuggestion) => {
    setProcessingId(suggestion.id);
    await reviewSuggestion(suggestion.id, true, 'Approved by executive');
    setProcessingId(null);
  };

  const handleRejectSuggestion = async (suggestion: AssistantSuggestion) => {
    setProcessingId(suggestion.id);
    await reviewSuggestion(suggestion.id, false, 'Rejected by executive');
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-orange-600">
            <Pause className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Assistant Access
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage who can help with your calendar
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Assistant
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Assistants</p>
                <p className="text-3xl font-bold">{activeAssistants.length}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-3xl font-bold">{pendingInvites.length}</p>
              </div>
              <Mail className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Suggestions</p>
                <p className="text-3xl font-bold">{pendingSuggestions.length}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Suggestions */}
      {pendingSuggestions.length > 0 && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Pending Suggestions
            </CardTitle>
            <CardDescription>Review and approve changes suggested by your assistants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{suggestion.suggestion_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {suggestion.reason && (
                          <p className="text-sm mb-2">{suggestion.reason}</p>
                        )}
                        <div className="text-xs bg-white dark:bg-gray-900 rounded p-2 font-mono">
                          {JSON.stringify(suggestion.proposed_data, null, 2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveSuggestion(suggestion)}
                          disabled={processingId === suggestion.id}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectSuggestion(suggestion)}
                          disabled={processingId === suggestion.id}
                          className="gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Assistants */}
      {activeAssistants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Active Assistants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAssistants.map((assistant) => (
                <AssistantCard
                  key={assistant.id}
                  assistant={assistant}
                  onRevoke={() => handleRevoke(assistant.id)}
                  onSuspend={() => handleToggleSuspend(assistant.id, true)}
                  processing={processingId === assistant.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invite.assistant_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {formatDistanceToNow(new Date(invite.invited_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invite.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(invite.id)}
                      disabled={processingId === invite.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspended Assistants */}
      {suspendedAssistants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pause className="h-4 w-4 text-orange-600" />
              Suspended Assistants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspendedAssistants.map((assistant) => (
                <div
                  key={assistant.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/10"
                >
                  <div>
                    <p className="font-medium">{assistant.assistant_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Suspended {assistant.suspended_at && formatDistanceToNow(new Date(assistant.suspended_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleToggleSuspend(assistant.id, false)}
                      disabled={processingId === assistant.id}
                      className="gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevoke(assistant.id)}
                      disabled={processingId === assistant.id}
                      className="gap-1"
                    >
                      <Ban className="h-3 w-3" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {myAssistants.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No assistants yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Invite someone to help manage your calendar
            </p>
            <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Your First Assistant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <InviteAssistantDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
    </div>
  );
}

// Assistant Card Component
interface AssistantCardProps {
  assistant: AssistantRelationship;
  onRevoke: () => void;
  onSuspend: () => void;
  processing: boolean;
}

function AssistantCard({ assistant, onRevoke, onSuspend, processing }: AssistantCardProps) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
          {assistant.assistant_email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{assistant.assistant_email}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Joined {assistant.accepted_at && formatDistanceToNow(new Date(assistant.accepted_at), { addSuffix: true })}
          </p>

          {/* Permissions Summary */}
          <div className="flex flex-wrap gap-1">
            {assistant.permissions.edit_calendar && (
              <Badge variant="outline" className="text-xs">Full Edit</Badge>
            )}
            {assistant.permissions.suggest_changes && !assistant.permissions.edit_calendar && (
              <Badge variant="outline" className="text-xs">Suggest</Badge>
            )}
            {assistant.permissions.bulk_schedule && (
              <Badge variant="outline" className="text-xs">Bulk Schedule</Badge>
            )}
            {assistant.permissions.apply_templates && (
              <Badge variant="outline" className="text-xs">Templates</Badge>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={processing}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onSuspend}>
            <Pause className="h-4 w-4 mr-2" />
            Suspend Access
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRevoke} className="text-red-600">
            <Ban className="h-4 w-4 mr-2" />
            Revoke Access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
