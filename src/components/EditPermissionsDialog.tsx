import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUpdateAssistantRelationship } from "@/hooks/useAssistantData";
import type { AssistantRelationship } from "@/lib/timelineUtils";

interface EditPermissionsDialogProps {
  relationship: AssistantRelationship & {
    assistant?: {
      id: string;
      email: string;
      raw_user_meta_data?: {
        full_name?: string;
      };
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPermissionsDialog({
  relationship,
  open,
  onOpenChange,
}: EditPermissionsDialogProps) {
  const updateMutation = useUpdateAssistantRelationship();
  const [notes, setNotes] = useState("");
  const [permissions, setPermissions] = useState({
    manage_timeline: false,
    upload_documents: false,
    create_items: false,
    edit_items: false,
    delete_items: false,
    view_confidential: false,
    manage_goals: false,
    create_briefs: false,
  });

  // Load relationship data when dialog opens
  useEffect(() => {
    if (relationship) {
      setNotes(relationship.notes || "");
      setPermissions({
        manage_timeline: relationship.permissions.manage_timeline || false,
        upload_documents: relationship.permissions.upload_documents || false,
        create_items: relationship.permissions.create_items || false,
        edit_items: relationship.permissions.edit_items || false,
        delete_items: relationship.permissions.delete_items || false,
        view_confidential: relationship.permissions.view_confidential || false,
        manage_goals: relationship.permissions.manage_goals || false,
        create_briefs: relationship.permissions.create_briefs || false,
      });
    }
  }, [relationship]);

  const handleSave = async () => {
    if (!relationship) return;

    await updateMutation.mutateAsync({
      relationshipId: relationship.id,
      permissions,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!relationship) return null;

  const assistant = relationship.assistant;
  const assistantName = assistant?.raw_user_meta_data?.full_name || "Unknown User";
  const assistantEmail = assistant?.email || "";
  const initials = assistantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Assistant Permissions</DialogTitle>
          <DialogDescription>
            Modify permissions and access for this assistant relationship
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Assistant Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{assistantName}</p>
              <p className="text-sm text-muted-foreground">{assistantEmail}</p>
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Permissions</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Control what this assistant can do on your behalf
              </p>
            </div>

            <div className="space-y-3">
              {/* Timeline Permissions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Timeline Management</p>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_manage_timeline">Manage Timeline</Label>
                      <p className="text-xs text-muted-foreground">
                        Full timeline management access
                      </p>
                    </div>
                    <Switch
                      id="edit_manage_timeline"
                      checked={permissions.manage_timeline}
                      onCheckedChange={() => togglePermission("manage_timeline")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_create_items">Create Items</Label>
                      <p className="text-xs text-muted-foreground">
                        Add new timeline items
                      </p>
                    </div>
                    <Switch
                      id="edit_create_items"
                      checked={permissions.create_items}
                      onCheckedChange={() => togglePermission("create_items")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_edit_items">Edit Items</Label>
                      <p className="text-xs text-muted-foreground">
                        Modify existing items
                      </p>
                    </div>
                    <Switch
                      id="edit_edit_items"
                      checked={permissions.edit_items}
                      onCheckedChange={() => togglePermission("edit_items")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_delete_items">Delete Items</Label>
                      <p className="text-xs text-muted-foreground">
                        Remove timeline items (use with caution)
                      </p>
                    </div>
                    <Switch
                      id="edit_delete_items"
                      checked={permissions.delete_items}
                      onCheckedChange={() => togglePermission("delete_items")}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Document Permissions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Documents</p>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_upload_documents">Upload Documents</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload and attach documents
                      </p>
                    </div>
                    <Switch
                      id="edit_upload_documents"
                      checked={permissions.upload_documents}
                      onCheckedChange={() => togglePermission("upload_documents")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_view_confidential">View Confidential</Label>
                      <p className="text-xs text-muted-foreground">
                        Access confidential documents (highly sensitive)
                      </p>
                    </div>
                    <Switch
                      id="edit_view_confidential"
                      checked={permissions.view_confidential}
                      onCheckedChange={() => togglePermission("view_confidential")}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Other Permissions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Other Features</p>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_manage_goals">Manage Goals</Label>
                      <p className="text-xs text-muted-foreground">
                        Create and edit AI goals
                      </p>
                    </div>
                    <Switch
                      id="edit_manage_goals"
                      checked={permissions.manage_goals}
                      onCheckedChange={() => togglePermission("manage_goals")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_create_briefs">Create Briefs</Label>
                      <p className="text-xs text-muted-foreground">
                        Generate daily executive briefs
                      </p>
                    </div>
                    <Switch
                      id="edit_create_briefs"
                      checked={permissions.create_briefs}
                      onCheckedChange={() => togglePermission("create_briefs")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes (Optional)</Label>
            <Textarea
              id="edit_notes"
              placeholder="Add any notes or instructions for this relationship..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
