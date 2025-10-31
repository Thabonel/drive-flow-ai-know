import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Check, X, Edit, Eye, Trash2, Clock } from "lucide-react";
import type { AssistantRelationship } from "@/lib/timelineUtils";
import { useApproveAssistantRelationship, useRevokeAssistantRelationship } from "@/hooks/useAssistantData";

interface AssistantRelationshipCardProps {
  relationship: AssistantRelationship & {
    assistant?: {
      id: string;
      email: string;
      raw_user_meta_data?: {
        full_name?: string;
      };
    };
    executive?: {
      id: string;
      email: string;
      raw_user_meta_data?: {
        full_name?: string;
      };
    };
  };
  viewAsExecutive?: boolean;
  onEdit?: (relationship: AssistantRelationship) => void;
  onViewAudit?: (relationship: AssistantRelationship) => void;
}

export function AssistantRelationshipCard({
  relationship,
  viewAsExecutive = true,
  onEdit,
  onViewAudit,
}: AssistantRelationshipCardProps) {
  const approveMutation = useApproveAssistantRelationship();
  const revokeMutation = useRevokeAssistantRelationship();

  const user = viewAsExecutive ? relationship.assistant : relationship.executive;
  const userName = user?.raw_user_meta_data?.full_name || "Unknown User";
  const userEmail = user?.email || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusVariant = {
    pending: "secondary" as const,
    active: "default" as const,
    revoked: "outline" as const,
  }[relationship.status];

  const permissionsList = Object.entries(relationship.permissions)
    .filter(([_, value]) => value === true)
    .map(([key]) => {
      const labels: Record<string, string> = {
        manage_timeline: "Timeline",
        upload_documents: "Documents",
        create_items: "Create",
        edit_items: "Edit",
        delete_items: "Delete",
        view_confidential: "Confidential",
        manage_goals: "Goals",
        create_briefs: "Briefs",
      };
      return labels[key] || key;
    });

  const handleApprove = () => {
    approveMutation.mutate(relationship.id);
  };

  const handleRevoke = () => {
    if (confirm("Are you sure you want to revoke this relationship? This action cannot be undone.")) {
      revokeMutation.mutate(relationship.id);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{userName}</CardTitle>
              <CardDescription className="text-xs">{userEmail}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{relationship.status}</Badge>
            {viewAsExecutive && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {relationship.status === "pending" && (
                    <>
                      <DropdownMenuItem onClick={handleApprove}>
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {relationship.status === "active" && onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(relationship)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Permissions
                    </DropdownMenuItem>
                  )}
                  {onViewAudit && (
                    <DropdownMenuItem onClick={() => onViewAudit(relationship)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Audit Log
                    </DropdownMenuItem>
                  )}
                  {relationship.status === "active" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleRevoke}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Revoke Access
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {relationship.notes && (
          <div className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
            {relationship.notes}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Permissions
          </p>
          {permissionsList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {permissionsList.map((perm) => (
                <Badge key={perm} variant="outline" className="text-xs">
                  {perm}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No permissions granted</p>
          )}
        </div>

        {relationship.permissions.view_only_layers &&
          Array.isArray(relationship.permissions.view_only_layers) &&
          relationship.permissions.view_only_layers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                View-Only Layers
              </p>
              <div className="flex flex-wrap gap-1.5">
                {relationship.permissions.view_only_layers.map((layerId: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    Layer {layerId.slice(0, 8)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Created {new Date(relationship.created_at).toLocaleDateString()}
            </span>
          </div>
          {relationship.approved_at && (
            <span className="text-green-600 dark:text-green-500">
              Approved {new Date(relationship.approved_at).toLocaleDateString()}
            </span>
          )}
          {relationship.revoked_at && (
            <span className="text-red-600 dark:text-red-500">
              Revoked {new Date(relationship.revoked_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
