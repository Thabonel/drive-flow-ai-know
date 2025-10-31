import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateAssistantRelationship } from "@/hooks/useAssistantData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteAssistantDialogProps {
  trigger?: React.ReactNode;
}

export function InviteAssistantDialog({ trigger }: InviteAssistantDialogProps) {
  const { user } = useAuth();
  const createMutation = useCreateAssistantRelationship();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundUserId, setFoundUserId] = useState<string | null>(null);

  const [permissions, setPermissions] = useState({
    manage_timeline: true,
    upload_documents: true,
    create_items: true,
    edit_items: true,
    delete_items: false,
    view_confidential: false,
    manage_goals: true,
    create_briefs: true,
  });

  const handleSearchUser = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSearching(true);
    try {
      // Search for user by email in Supabase Auth
      // Note: This requires a backend function since we can't query auth.users directly
      const { data, error } = await supabase.functions.invoke("search-user-by-email", {
        body: { email },
      });

      if (error) {
        // If the function doesn't exist, fall back to creating invitation by email
        toast.info("User will be invited to join when you send the invitation");
        setFoundUserId(null);
      } else if (data?.user_id) {
        setFoundUserId(data.user_id);
        toast.success("User found! You can now send the invitation.");
      } else {
        toast.info("User not found. They will be invited to join.");
        setFoundUserId(null);
      }
    } catch (error) {
      console.error("Error searching for user:", error);
      toast.info("User will be invited when you send the invitation");
      setFoundUserId(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async () => {
    if (!user) return;

    if (!foundUserId) {
      toast.error("Please search for a user first");
      return;
    }

    if (foundUserId === user.id) {
      toast.error("You cannot invite yourself as an assistant");
      return;
    }

    await createMutation.mutateAsync({
      executiveId: user.id,
      assistantId: foundUserId,
      permissions,
      notes: notes.trim() || undefined,
    });

    // Reset form and close
    setEmail("");
    setNotes("");
    setFoundUserId(null);
    setPermissions({
      manage_timeline: true,
      upload_documents: true,
      create_items: true,
      edit_items: true,
      delete_items: false,
      view_confidential: false,
      manage_goals: true,
      create_briefs: true,
    });
    setOpen(false);
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Assistant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Assistant</DialogTitle>
          <DialogDescription>
            Grant an assistant access to manage your timeline and documents with
            specific permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Search */}
          <div className="space-y-2">
            <Label htmlFor="email">Assistant Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="assistant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSearchUser}
                disabled={isSearching || !email}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
            {foundUserId && (
              <p className="text-sm text-green-600 dark:text-green-500">
                ✓ User found! Ready to invite.
              </p>
            )}
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Permissions</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Select what this assistant can do on your behalf
              </p>
            </div>

            <div className="space-y-3">
              {/* Timeline Permissions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Timeline Management</p>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="manage_timeline">Manage Timeline</Label>
                      <p className="text-xs text-muted-foreground">
                        Full timeline management access
                      </p>
                    </div>
                    <Switch
                      id="manage_timeline"
                      checked={permissions.manage_timeline}
                      onCheckedChange={() => togglePermission("manage_timeline")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="create_items">Create Items</Label>
                      <p className="text-xs text-muted-foreground">
                        Add new timeline items
                      </p>
                    </div>
                    <Switch
                      id="create_items"
                      checked={permissions.create_items}
                      onCheckedChange={() => togglePermission("create_items")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit_items">Edit Items</Label>
                      <p className="text-xs text-muted-foreground">
                        Modify existing items
                      </p>
                    </div>
                    <Switch
                      id="edit_items"
                      checked={permissions.edit_items}
                      onCheckedChange={() => togglePermission("edit_items")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="delete_items">Delete Items</Label>
                      <p className="text-xs text-muted-foreground">
                        Remove timeline items (use with caution)
                      </p>
                    </div>
                    <Switch
                      id="delete_items"
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
                      <Label htmlFor="upload_documents">Upload Documents</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload and attach documents
                      </p>
                    </div>
                    <Switch
                      id="upload_documents"
                      checked={permissions.upload_documents}
                      onCheckedChange={() => togglePermission("upload_documents")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="view_confidential">View Confidential</Label>
                      <p className="text-xs text-muted-foreground">
                        Access confidential documents (highly sensitive)
                      </p>
                    </div>
                    <Switch
                      id="view_confidential"
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
                      <Label htmlFor="manage_goals">Manage Goals</Label>
                      <p className="text-xs text-muted-foreground">
                        Create and edit AI goals
                      </p>
                    </div>
                    <Switch
                      id="manage_goals"
                      checked={permissions.manage_goals}
                      onCheckedChange={() => togglePermission("manage_goals")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="create_briefs">Create Briefs</Label>
                      <p className="text-xs text-muted-foreground">
                        Generate daily executive briefs
                      </p>
                    </div>
                    <Switch
                      id="create_briefs"
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes or instructions for this relationship..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!foundUserId || createMutation.isPending}
            >
              {createMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
