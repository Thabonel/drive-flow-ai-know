import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UserCircle,
  Users,
  Clock,
  Eye,
  Edit,
  AlertCircle,
  Activity,
  Shield,
} from 'lucide-react';
import { useAssistantAccess, type AssistantRelationship } from '@/hooks/useAssistantAccess';
import { useAuth } from '@/hooks/useAuth';

export function AssistantPortal() {
  const { user } = useAuth();
  const { myExecutives, recentActivity, loading } = useAssistantAccess();
  const [selectedExecutive, setSelectedExecutive] = useState<string>('own');

  const activeExecutives = myExecutives.filter((rel) => rel.status === 'active');
  const currentRelationship = activeExecutives.find(
    (rel) => rel.executive_id === selectedExecutive
  );

  const isManagingExecutive = selectedExecutive !== 'own';

  const getPermissionBadge = (relationship: AssistantRelationship) => {
    const { permissions } = relationship;

    if (permissions.edit_calendar) {
      return (
        <Badge className="bg-green-600">
          <Edit className="h-3 w-3 mr-1" />
          Full Edit Access
        </Badge>
      );
    } else if (permissions.suggest_changes) {
      return (
        <Badge className="bg-blue-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Suggest Changes
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <Eye className="h-3 w-3 mr-1" />
          View Only
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (activeExecutives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assistant Portal
          </CardTitle>
          <CardDescription>Manage calendars for your executives</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have access to any executive calendars yet. Please accept an invitation
              from an executive to get started.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Selector */}
      <Card className={isManagingExecutive ? 'border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isManagingExecutive ? (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <CardTitle>
                  {isManagingExecutive ? 'Managing Executive Calendar' : 'Your Calendar'}
                </CardTitle>
                <CardDescription>
                  {isManagingExecutive
                    ? `You are managing the calendar for ${currentRelationship?.assistant_email || 'Executive'}`
                    : 'Viewing your own calendar'}
                </CardDescription>
              </div>
            </div>

            {isManagingExecutive && currentRelationship && (
              <div>{getPermissionBadge(currentRelationship)}</div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calendar Switcher */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Switch Calendar</label>
            <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    My Calendar
                  </div>
                </SelectItem>
                {activeExecutives.map((rel) => (
                  <SelectItem key={rel.id} value={rel.executive_id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {rel.assistant_email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assistant Mode Banner */}
          {isManagingExecutive && (
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <Shield className="h-4 w-4 text-purple-600" />
              <AlertDescription>
                <strong>Assistant Mode Active:</strong> All changes you make will be visible in the
                activity log for the executive. {currentRelationship?.permissions.edit_calendar
                  ? 'You have full edit access.'
                  : 'You can suggest changes that require approval.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Permissions Overview */}
          {isManagingExecutive && currentRelationship && (
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Your Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <PermissionItem
                    label="View Calendar"
                    granted={currentRelationship.permissions.view_calendar}
                  />
                  <PermissionItem
                    label="Edit Calendar"
                    granted={currentRelationship.permissions.edit_calendar}
                  />
                  <PermissionItem
                    label="Suggest Changes"
                    granted={currentRelationship.permissions.suggest_changes}
                  />
                  <PermissionItem
                    label="Attach Documents"
                    granted={currentRelationship.permissions.attach_documents}
                  />
                  <PermissionItem
                    label="Apply Templates"
                    granted={currentRelationship.permissions.apply_templates}
                  />
                  <PermissionItem
                    label="Bulk Schedule"
                    granted={currentRelationship.permissions.bulk_schedule}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {isManagingExecutive && currentRelationship && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your recent actions on this executive's calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity
                .filter((activity) => activity.relationship_id === currentRelationship.id)
                .slice(0, 10)
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.action_type}
                    </Badge>
                  </div>
                ))}

              {recentActivity.filter((a) => a.relationship_id === currentRelationship.id).length ===
                0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity yet. Start by managing the calendar.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Permission Item Component
function PermissionItem({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${granted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      />
      <span className={granted ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
