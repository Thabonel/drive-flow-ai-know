import { useState } from 'react';
import { useDayTemplates, DayTemplate, TemplateBlock } from '@/hooks/useDayTemplates';
import { useTemplateApplication } from '@/hooks/useTemplateApplication';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar as CalendarIcon, Plus, Trash2, Star, Users, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateLibraryProps {
  onCreateCustom: () => void;
  onTemplateApplied?: () => void;
}

export function TemplateLibrary({ onCreateCustom, onTemplateApplied }: TemplateLibraryProps) {
  const { templates, systemTemplates, userTemplates, loading, error, deleteTemplate, refetch } = useDayTemplates();
  const { applyTemplate, applying } = useTemplateApplication();
  const [selectedTemplate, setSelectedTemplate] = useState<DayTemplate | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [clearExisting, setClearExisting] = useState(false);
  const [skipMeetings, setSkipMeetings] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handle apply template
  const handleApply = async () => {
    if (!selectedTemplate) return;

    const result = await applyTemplate(selectedTemplate, {
      targetDate: selectedDate,
      clearExisting,
      skipMeetings,
    });

    if (result.success) {
      setShowApplyDialog(false);
      setSelectedTemplate(null);
      setClearExisting(false);
      setSkipMeetings(true);
      refetch(); // Refresh to update usage stats
      onTemplateApplied?.();
    }
  };

  // Handle delete template
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeletingId(templateId);
    const success = await deleteTemplate(templateId);
    setDeletingId(null);

    if (!success) {
      alert('Failed to delete template');
    }
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate total duration of template
  const calculateTotalDuration = (blocks: TemplateBlock[]): number => {
    return blocks.reduce((sum, block) => sum + block.duration_minutes, 0);
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return '👥';
      case 'work':
        return '💼';
      case 'break':
        return '☕';
      case 'personal':
        return '🏠';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Day Templates</h2>
          <p className="text-sm text-muted-foreground">
            Choose a template to structure your day or create your own
          </p>
        </div>
        <Button onClick={onCreateCustom} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Custom Template
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">System Templates</h3>
          <Badge variant="secondary">{systemTemplates.length}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onApply={() => {
                setSelectedTemplate(template);
                setShowApplyDialog(true);
              }}
              formatDuration={formatDuration}
              calculateTotalDuration={calculateTotalDuration}
              getTypeIcon={getTypeIcon}
            />
          ))}
        </div>
      </div>

      {/* User Templates Section */}
      {userTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">My Templates</h3>
            <Badge variant="secondary">{userTemplates.length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => {
                  setSelectedTemplate(template);
                  setShowApplyDialog(true);
                }}
                onDelete={() => handleDelete(template.id)}
                isDeleting={deletingId === template.id}
                formatDuration={formatDuration}
                calculateTotalDuration={calculateTotalDuration}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates available</p>
        </div>
      )}

      {/* Apply Template Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Template: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Choose a date and options to apply this template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date Picker */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="mx-auto"
              />
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Selected: {format(selectedDate, 'MMMM d, yyyy')}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="clear-existing">Clear existing items</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove existing items for this day before applying template
                  </p>
                </div>
                <Switch
                  id="clear-existing"
                  checked={clearExisting}
                  onCheckedChange={setClearExisting}
                />
              </div>

              {clearExisting && (
                <div className="flex items-center justify-between pl-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="skip-meetings">Skip meetings</Label>
                    <p className="text-xs text-muted-foreground">
                      Keep existing meetings when clearing
                    </p>
                  </div>
                  <Switch
                    id="skip-meetings"
                    checked={skipMeetings}
                    onCheckedChange={setSkipMeetings}
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="text-xs text-muted-foreground">
              This will create {selectedTemplate?.template_blocks.length} timeline items
              {clearExisting && ' (after clearing existing items)'}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApplyDialog(false)}
              disabled={applying}
            >
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? 'Applying...' : 'Apply Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: DayTemplate;
  onApply: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  formatDuration: (minutes: number) => string;
  calculateTotalDuration: (blocks: TemplateBlock[]) => number;
  getTypeIcon: (type: string) => string;
}

function TemplateCard({
  template,
  onApply,
  onDelete,
  isDeleting,
  formatDuration,
  calculateTotalDuration,
  getTypeIcon,
}: TemplateCardProps) {
  const totalDuration = calculateTotalDuration(template.template_blocks);
  const blocksByType = template.template_blocks.reduce((acc, block) => {
    acc[block.type] = (acc[block.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
          {template.is_default && (
            <Badge variant="default" className="ml-2">
              <Star className="h-3 w-3 mr-1" />
              Default
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(totalDuration)}
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {template.template_blocks.length} blocks
          </div>
        </div>

        {/* Usage stats */}
        {template.usage_count > 0 && (
          <div className="text-xs text-muted-foreground">
            Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
            {template.last_used_at && (
              <> · Last used {format(new Date(template.last_used_at), 'MMM d')}</>
            )}
          </div>
        )}

        {/* Block type breakdown */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(blocksByType).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-xs">
              {getTypeIcon(type)} {count}
            </Badge>
          ))}
        </div>

        {/* Mini timeline preview */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Preview</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {template.template_blocks.slice(0, 6).map((block, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs"
                style={{ color: block.color }}
              >
                <span className="font-mono text-muted-foreground">
                  {block.start_time}
                </span>
                <div
                  className="flex-1 px-2 py-1 rounded text-white font-medium"
                  style={{ backgroundColor: block.color }}
                >
                  {block.title}
                </div>
                <span className="text-muted-foreground">
                  {formatDuration(block.duration_minutes)}
                </span>
              </div>
            ))}
            {template.template_blocks.length > 6 && (
              <div className="text-xs text-muted-foreground text-center">
                +{template.template_blocks.length - 6} more
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button onClick={onApply} className="flex-1">
          Apply Template
        </Button>
        {onDelete && (
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
