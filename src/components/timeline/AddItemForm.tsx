// Form for adding new timeline items

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TimelineLayer, getRandomItemColor, TimelineItem } from '@/lib/timelineUtils';
import { QUICK_ADD_DURATIONS } from '@/lib/timelineConstants';
import { TimeEstimateInput } from './TimeEstimateInput';
import { useAITimeIntelligence } from '@/hooks/useAITimeIntelligence';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Sparkles, ListTree } from 'lucide-react';
import { AITaskBreakdown } from '@/components/ai/AITaskBreakdown';
import { AIMeetingPrep } from '@/components/ai/AIMeetingPrep';
import { RecurringActionDialog } from './RecurringActionDialog';
import { shouldAutoDecompose } from '@/lib/ai/prompts/task-breakdown';
import type { Subtask } from '@/lib/ai/prompts/task-breakdown';

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  layers: TimelineLayer[];
  onAddItem: (
    layerId: string,
    title: string,
    startTime: string,
    durationMinutes: number,
    color: string,
    options?: {
      team_id?: string | null;
      visibility?: 'personal' | 'team' | 'assigned';
      assigned_to?: string | null;
      assigned_by?: string | null;
    }
  ) => Promise<void>;
  onUpdateItem?: (itemId: string, updates: Partial<TimelineItem>) => Promise<void>;
  onUpdateRecurringThisAndFollowing?: (item: TimelineItem, updates: Partial<TimelineItem>) => Promise<void>;
  onAddLayer: (name: string, color?: string) => Promise<any>;
  initialStartTime?: string;
  initialLayerId?: string;
  editingItem?: TimelineItem | null;
}

export function AddItemForm({
  open,
  onClose,
  layers,
  onAddItem,
  onUpdateItem,
  onUpdateRecurringThisAndFollowing,
  onAddLayer,
  initialStartTime,
  initialLayerId,
  editingItem,
}: AddItemFormProps) {
  const isEditMode = !!editingItem;
  const { user } = useAuth();
  const { team } = useTeam();
  const { members } = useTeamMembers(team?.id);

  const [title, setTitle] = useState('');
  const [hoursFromNow, setHoursFromNow] = useState(1);
  const [duration, setDuration] = useState(60);
  const [plannedDuration, setPlannedDuration] = useState<number>(30); // Default 30 min estimate
  const [isMeeting, setIsMeeting] = useState(false);
  const [isFlexible, setIsFlexible] = useState(true);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [newLayerName, setNewLayerName] = useState('');
  const [isCreatingLayer, setIsCreatingLayer] = useState(false);
  const [color, setColor] = useState(getRandomItemColor());
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<TimelineItem> | null>(null);

  // Team-related state
  const [visibility, setVisibility] = useState<'personal' | 'team' | 'assigned'>('personal');
  const [assignedTo, setAssignedTo] = useState<string>('');

  // AI Time Intelligence
  const { getAIEstimate, isConfigured } = useAITimeIntelligence();
  const [aiEstimate, setAiEstimate] = useState<{
    estimated_minutes: number;
    confidence: number;
    reasoning: string;
  } | null>(null);

  // Set initial values when provided (from double-click)
  useEffect(() => {
    if (initialStartTime && initialLayerId) {
      // Calculate hours from now based on initial start time
      const now = new Date();
      const targetTime = new Date(initialStartTime);
      const hoursDiff = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      setHoursFromNow(Number(hoursDiff.toFixed(2)));
      setSelectedLayerId(initialLayerId);
    }
  }, [initialStartTime, initialLayerId]);

  // Populate form when editing an item
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setSelectedLayerId(editingItem.layer_id);
      setColor(editingItem.color);
      setDuration(editingItem.duration_minutes);
      setPlannedDuration(editingItem.planned_duration_minutes || editingItem.duration_minutes);
      setIsMeeting(editingItem.is_meeting || false);
      setIsFlexible(editingItem.is_flexible !== undefined ? editingItem.is_flexible : true);

      // Calculate hours from now
      const now = new Date();
      const startTime = new Date(editingItem.start_time);
      const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      setHoursFromNow(Number(hoursDiff.toFixed(2)));
    } else {
      // Reset form when not editing
      setTitle('');
      setHoursFromNow(1);
      setDuration(60);
      setPlannedDuration(30);
      setIsMeeting(false);
      setIsFlexible(true);
      setColor(getRandomItemColor());
      setNewLayerName('');
      setIsCreatingLayer(false);
      setVisibility('personal');
      setAssignedTo('');
    }
  }, [editingItem]);

  // Calculate AI estimate when title or meeting status changes
  useEffect(() => {
    if (!isConfigured || !title.trim() || isEditMode) {
      setAiEstimate(null);
      return;
    }

    // Debounce the AI estimate calculation
    const timeoutId = setTimeout(() => {
      const taskType = isMeeting ? 'meeting' : 'work';
      const estimate = getAIEstimate(title.trim(), taskType);
      setAiEstimate(estimate);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [title, isMeeting, isConfigured, isEditMode, getAIEstimate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let layerId = selectedLayerId;

    // If creating a new layer (only in add mode)
    if (!isEditMode && isCreatingLayer && newLayerName.trim()) {
      const newLayer = await onAddLayer(newLayerName.trim());
      if (newLayer) {
        layerId = newLayer.id;
      } else {
        return; // Failed to create layer
      }
    }

    if (!layerId || !title.trim()) {
      return;
    }

    // Calculate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + hoursFromNow);

    if (isEditMode && editingItem && onUpdateItem) {
      // Prepare updates
      const updates = {
        title: title.trim(),
        layer_id: layerId,
        start_time: startTime.toISOString(),
        duration_minutes: duration,
        planned_duration_minutes: plannedDuration,
        is_meeting: isMeeting,
        is_flexible: isFlexible,
        color: color,
      };

      // Check if this is a recurring item
      if (editingItem.recurring_series_id && editingItem.occurrence_index !== null && onUpdateRecurringThisAndFollowing) {
        // Store pending updates and show recurring dialog
        setPendingUpdates(updates);
        setShowRecurringDialog(true);
        return; // Don't close the form yet
      } else {
        // Non-recurring item - update normally
        await onUpdateItem(editingItem.id, updates);
      }
    } else {
      // Add new item
      const teamOptions = team ? {
        team_id: visibility !== 'personal' ? team.id : null,
        visibility,
        assigned_to: visibility === 'assigned' && assignedTo ? assignedTo : null,
        assigned_by: visibility === 'assigned' && assignedTo ? user?.id : null,
      } : undefined;

      await onAddItem(
        layerId,
        title.trim(),
        startTime.toISOString(),
        duration,
        color,
        teamOptions
      );
    }

    // Reset form
    setTitle('');
    setHoursFromNow(1);
    setDuration(60);
    setPlannedDuration(30);
    setIsMeeting(false);
    setIsFlexible(true);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    setVisibility('personal');
    setAssignedTo('');
    onClose();
  };

  // Handle updating just this occurrence
  const handleUpdateThisOnly = async () => {
    if (!editingItem || !pendingUpdates || !onUpdateItem) return;

    await onUpdateItem(editingItem.id, pendingUpdates);
    setPendingUpdates(null);
    setShowRecurringDialog(false);

    // Reset form
    setTitle('');
    setHoursFromNow(1);
    setDuration(60);
    setPlannedDuration(30);
    setIsMeeting(false);
    setIsFlexible(true);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    setVisibility('personal');
    setAssignedTo('');
    onClose();
  };

  // Handle updating this and all following occurrences
  const handleUpdateThisAndFollowing = async () => {
    if (!editingItem || !pendingUpdates || !onUpdateRecurringThisAndFollowing) return;

    await onUpdateRecurringThisAndFollowing(editingItem, pendingUpdates);
    setPendingUpdates(null);
    setShowRecurringDialog(false);

    // Reset form
    setTitle('');
    setHoursFromNow(1);
    setDuration(60);
    setPlannedDuration(30);
    setIsMeeting(false);
    setIsFlexible(true);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    setVisibility('personal');
    setAssignedTo('');
    onClose();
  };

  const handleQuickDuration = (minutes: number) => {
    setDuration(minutes);
  };

  const handleApplyAIEstimate = () => {
    if (aiEstimate) {
      setPlannedDuration(aiEstimate.estimated_minutes);
      setDuration(aiEstimate.estimated_minutes);
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.4) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Timeline Item' : 'Add Timeline Item'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details of your timeline item' : 'Create a new item on your timeline'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              required
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="hoursFromNow">Start Time</Label>
            <div className="flex items-center gap-2">
              <Input
                id="hoursFromNow"
                type="number"
                value={hoursFromNow}
                onChange={(e) => setHoursFromNow(Number(e.target.value))}
                step="0.25"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                hours from now
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Use negative values for past items
            </p>
          </div>

          {/* Duration (actual timeline block size) */}
          <div className="space-y-2">
            <Label htmlFor="duration">Timeline Block Duration *</Label>
            <div className="flex gap-2 flex-wrap">
              {QUICK_ADD_DURATIONS.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={duration === minutes ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickDuration(minutes)}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              How much time to block on the timeline
            </p>
          </div>

          {/* Time Estimate */}
          <TimeEstimateInput
            value={plannedDuration}
            onChange={setPlannedDuration}
            label="Time Estimate"
          />

          {/* AI Estimate Display */}
          {aiEstimate && !isEditMode && (
            <div className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    AI Suggestion:
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-help">
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            {aiEstimate.estimated_minutes} min
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs text-white border-0 ${getConfidenceBadgeColor(aiEstimate.confidence)}`}
                          >
                            {Math.round(aiEstimate.confidence * 100)}% confident
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{aiEstimate.reasoning}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleApplyAIEstimate}
                  className="gap-1.5 text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100"
                >
                  <Sparkles className="h-3 w-3" />
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Task Type Flags */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-meeting"
                checked={isMeeting}
                onCheckedChange={(checked) => setIsMeeting(checked === true)}
              />
              <Label
                htmlFor="is-meeting"
                className="text-sm font-normal cursor-pointer"
              >
                This is a meeting (synced from calendar)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-flexible"
                checked={isFlexible}
                onCheckedChange={(checked) => setIsFlexible(checked === true)}
              />
              <Label
                htmlFor="is-flexible"
                className="text-sm font-normal cursor-pointer"
              >
                Flexible timing (can be rescheduled)
              </Label>
            </div>
          </div>

          {/* Team Options (only show if user has a team) */}
          {team && !isEditMode && (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={(v: 'personal' | 'team' | 'assigned') => setVisibility(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal (only me)</SelectItem>
                    <SelectItem value="team">Team (all members)</SelectItem>
                    <SelectItem value="assigned">Assigned (specific member)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show assignment selector when visibility is 'assigned' */}
              {visibility === 'assigned' && members && members.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="assigned-to">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.user?.user_metadata?.full_name || member.user?.email || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Layer Selection */}
          <div className="space-y-2">
            <Label>Layer *</Label>
            {!isCreatingLayer ? (
              <div className="space-y-2">
                <Select
                  value={selectedLayerId}
                  onValueChange={setSelectedLayerId}
                  required={!isCreatingLayer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a layer" />
                  </SelectTrigger>
                  <SelectContent>
                    {layers.map((layer) => (
                      <SelectItem key={layer.id} value={layer.id}>
                        {layer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setIsCreatingLayer(true)}
                  className="p-0 h-auto"
                >
                  + Create New Layer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  placeholder="New layer name"
                  required={isCreatingLayer}
                />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setIsCreatingLayer(false);
                    setNewLayerName('');
                  }}
                  className="p-0 h-auto"
                >
                  Cancel - Use Existing Layer
                </Button>
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColor(getRandomItemColor())}
              >
                Random
              </Button>
            </div>
          </div>

          {/* AI Task Breakdown Suggestion */}
          {!isEditMode && shouldAutoDecompose(duration, title) && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <div className="flex items-start gap-3">
                <ListTree className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Break down this task?</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    This task looks complex. Let AI break it into smaller subtasks with time estimates.
                  </p>
                  <AITaskBreakdown
                    task={{
                      title,
                      description: '',
                      estimated_duration: duration,
                      task_type: isMeeting ? 'meeting' : 'work',
                    }}
                    onAddToTimeline={(subtasks: Subtask[]) => {
                      // Close the current dialog and let user add subtasks individually
                      onClose();
                      // TODO: Implement batch add to timeline
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Meeting Prep for Meetings */}
          {!isEditMode && isMeeting && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Prepare for this meeting?</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get AI-generated talking points, questions, and a meeting brief.
                  </p>
                  <AIMeetingPrep
                    meeting={{
                      id: '',
                      title,
                      description: '',
                      duration_minutes: duration,
                      meeting_type: 'other',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEditMode ? 'Update Item' : 'Add Item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Recurring Action Dialog */}
      <RecurringActionDialog
        open={showRecurringDialog}
        onClose={() => setShowRecurringDialog(false)}
        actionType="edit"
        onThisOnly={handleUpdateThisOnly}
        onThisAndFollowing={handleUpdateThisAndFollowing}
      />
    </Dialog>
  );
}
