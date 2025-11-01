import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, UserPlus, Shield, Eye, Edit, Sparkles } from 'lucide-react';
import { useAssistantAccess, DEFAULT_ASSISTANT_PERMISSIONS, FULL_ASSISTANT_PERMISSIONS, type AssistantPermissions } from '@/hooks/useAssistantAccess';

interface InviteAssistantDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteAssistantDialog({ open, onClose }: InviteAssistantDialogProps) {
  const { inviteAssistant, loading } = useAssistantAccess();

  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<AssistantPermissions>(DEFAULT_ASSISTANT_PERMISSIONS);
  const [usePreset, setUsePreset] = useState<'view-only' | 'suggest' | 'full-edit'>('suggest');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await inviteAssistant(email, permissions);

    if (result) {
      setEmail('');
      setPermissions(DEFAULT_ASSISTANT_PERMISSIONS);
      setUsePreset('suggest');
      onClose();
    }
  };

  const applyPreset = (preset: 'view-only' | 'suggest' | 'full-edit') => {
    setUsePreset(preset);

    switch (preset) {
      case 'view-only':
        setPermissions({
          view_calendar: true,
          edit_calendar: false,
          suggest_changes: false,
          attach_documents: false,
          apply_templates: false,
          bulk_schedule: false,
          view_documents: true,
        });
        break;
      case 'suggest':
        setPermissions(DEFAULT_ASSISTANT_PERMISSIONS);
        break;
      case 'full-edit':
        setPermissions(FULL_ASSISTANT_PERMISSIONS);
        break;
    }
  };

  const togglePermission = (key: keyof AssistantPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setUsePreset('suggest'); // Reset preset when manually changing
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Assistant
          </DialogTitle>
          <DialogDescription>
            Grant someone access to help manage your calendar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Assistant's Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="assistant@company.com"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              They'll receive an email invitation to access your calendar
            </p>
          </div>

          {/* Permission Presets */}
          <div className="space-y-3">
            <Label>Permission Level</Label>
            <div className="grid grid-cols-3 gap-3">
              <PermissionPreset
                icon={<Eye className="h-5 w-5" />}
                title="View Only"
                description="Can see your calendar"
                color="blue"
                active={usePreset === 'view-only'}
                onClick={() => applyPreset('view-only')}
              />
              <PermissionPreset
                icon={<Sparkles className="h-5 w-5" />}
                title="Suggest Changes"
                description="Can propose edits"
                color="purple"
                active={usePreset === 'suggest'}
                onClick={() => applyPreset('suggest')}
                recommended
              />
              <PermissionPreset
                icon={<Edit className="h-5 w-5" />}
                title="Full Edit"
                description="Can make changes"
                color="green"
                active={usePreset === 'full-edit'}
                onClick={() => applyPreset('full-edit')}
              />
            </div>
          </div>

          {/* Detailed Permissions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Detailed Permissions
                  </div>
                </div>

                <PermissionSwitch
                  label="View Calendar"
                  description="See all calendar events and timeline"
                  checked={permissions.view_calendar}
                  onCheckedChange={() => togglePermission('view_calendar')}
                  required
                />

                <PermissionSwitch
                  label="Edit Calendar"
                  description="Create, update, and delete calendar items"
                  checked={permissions.edit_calendar}
                  onCheckedChange={() => togglePermission('edit_calendar')}
                />

                <PermissionSwitch
                  label="Suggest Changes"
                  description="Propose changes that require your approval"
                  checked={permissions.suggest_changes}
                  onCheckedChange={() => togglePermission('suggest_changes')}
                  disabled={permissions.edit_calendar}
                />

                <PermissionSwitch
                  label="Attach Documents"
                  description="Upload and attach files to meetings"
                  checked={permissions.attach_documents}
                  onCheckedChange={() => togglePermission('attach_documents')}
                />

                <PermissionSwitch
                  label="Apply Templates"
                  description="Apply day templates to your calendar"
                  checked={permissions.apply_templates}
                  onCheckedChange={() => togglePermission('apply_templates')}
                />

                <PermissionSwitch
                  label="Bulk Schedule"
                  description="Schedule multiple meetings at once"
                  checked={permissions.bulk_schedule}
                  onCheckedChange={() => togglePermission('bulk_schedule')}
                />

                <PermissionSwitch
                  label="View Documents"
                  description="See attached documents and files"
                  checked={permissions.view_documents}
                  onCheckedChange={() => togglePermission('view_documents')}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Permission Preset Card
interface PermissionPresetProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'green';
  active: boolean;
  onClick: () => void;
  recommended?: boolean;
}

function PermissionPreset({
  icon,
  title,
  description,
  color,
  active,
  onClick,
  recommended,
}: PermissionPresetProps) {
  const colorClasses = {
    blue: active
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
      : 'border-gray-200 hover:border-blue-300',
    purple: active
      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
      : 'border-gray-200 hover:border-purple-300',
    green: active
      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
      : 'border-gray-200 hover:border-green-300',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative border-2 rounded-lg p-4 text-left transition-all cursor-pointer ${colorClasses[color]}`}
    >
      {recommended && (
        <Badge className="absolute -top-2 -right-2 bg-yellow-500">Recommended</Badge>
      )}
      <div className="space-y-2">
        <div className={`w-10 h-10 rounded-full ${active ? `bg-${color}-500` : 'bg-gray-200 dark:bg-gray-700'} flex items-center justify-center ${active ? 'text-white' : 'text-gray-600'}`}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

// Permission Switch Component
interface PermissionSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
}

function PermissionSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  required,
  disabled,
}: PermissionSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500">*</span>}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={required || disabled} />
    </div>
  );
}
