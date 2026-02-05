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
import { AttentionTypeSelector } from './AttentionTypeSelector';
import { RoleBasedTemplatesCompact } from './RoleBasedTemplates';
import {
  AttentionType,
  RoleMode,
  calculateContextSwitchCost,
} from '@/lib/attentionTypes';
import { TimeEstimateInput } from './TimeEstimateInput';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useAITimeIntelligence } from '@/hooks/useAITimeIntelligence';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { useEventSuggestions } from '@/hooks/useRoleBehavior';
import { Brain, Sparkles, ListTree, Target, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
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
      // Attention system fields
      attention_type?: AttentionType | null;
      priority?: number | null;
      is_non_negotiable?: boolean;
      notes?: string | null;
      tags?: string[] | null;
      context_switch_cost?: number;
    }
  ) => Promise<void>;
  onUpdateItem?: (itemId: string, updates: Partial<TimelineItem>) => Promise<boolean>;
  onUpdateRecurringThisAndFollowing?: (item: TimelineItem, updates: Partial<TimelineItem>) => Promise<void>;
  onAddLayer: (name: string, color?: string) => Promise<TimelineLayer | null>;
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
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date(Date.now() + 3600000));
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Team-related state
  const [visibility, setVisibility] = useState<'personal' | 'team' | 'assigned'>('personal');
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Attention system state
  const [attentionType, setAttentionType] = useState<AttentionType | null>(null);
  const [priority, setPriority] = useState<number>(3); // Default medium priority
  const [isNonNegotiable, setIsNonNegotiable] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<RoleMode | undefined>();

  // AI Time Intelligence
  const { getAIEstimate, isConfigured } = useAITimeIntelligence();
  const [aiEstimate, setAiEstimate] = useState<{
    estimated_minutes: number;
    confidence: number;
    reasoning: string;
  } | null>(null);

  // Role-based behavior suggestions
  const roleSuggestions = useEventSuggestions(
    attentionType || 'create',
    startTime.toISOString(),
    duration,
    currentRole
  );

  // Load user's attention preferences to get current role
  useEffect(() => {
    if (!user || !open) return;

    const loadAttentionPreferences = async () => {
      try {
        const response = await fetch('/functions/v1/attention-preferences', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setCurrentRole(data.preferences.current_role);
          }
        }
      } catch (error) {
        console.error('Error loading attention preferences:', error);
      }
    };

    loadAttentionPreferences();
  }, [user, open]);

  // Set initial values when provided (from double-click)
  useEffect(() => {
    if (initialStartTime && initialLayerId) {
      const start = new Date(initialStartTime);
      setStartTime(start);
      // Set end time 1 hour after start
      setEndTime(new Date(start.getTime() + 60 * 60 * 1000));
      setDuration(60);
      setSelectedLayerId(initialLayerId);
    }
  }, [initialStartTime, initialLayerId]);

  // Populate form when editing an item
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setSelectedLayerId(editingItem.layer_id);
      setColor(editingItem.color);

      const start = new Date(editingItem.start_time);
      const dur = editingItem.duration_minutes;
      const end = new Date(start.getTime() + dur * 60 * 1000);

      setStartTime(start);
      setEndTime(end);
      setDuration(dur);
      setPlannedDuration(editingItem.planned_duration_minutes || dur);
      setIsMeeting(editingItem.is_meeting || false);
      setIsFlexible(editingItem.is_flexible !== undefined ? editingItem.is_flexible : true);

      // Populate attention fields
      setAttentionType(editingItem.attention_type || null);
      setPriority(editingItem.priority || 3);
      setIsNonNegotiable(editingItem.is_non_negotiable || false);
      setNotes(editingItem.notes || '');
      setTags(editingItem.tags ? editingItem.tags.join(', ') : '');

      // Enable advanced mode if duration and planned duration differ
      const hasDifferentDurations = editingItem.planned_duration_minutes &&
        editingItem.planned_duration_minutes !== editingItem.duration_minutes;
      setShowAdvanced(!!hasDifferentDurations);
    } else {
      // Reset form when not editing
      setTitle('');
      const start = new Date();
      start.setHours(start.getHours() + 1, 0, 0, 0);
      setStartTime(start);
      setEndTime(new Date(start.getTime() + 60 * 60 * 1000));
      setDuration(60);
      setPlannedDuration(60);
      setIsMeeting(false);
      setIsFlexible(true);
      setShowAdvanced(false);
      setColor(getRandomItemColor());
      setNewLayerName('');
      setIsCreatingLayer(false);
      setVisibility('personal');
      setAssignedTo('');

      // Reset attention fields
      setAttentionType(null);
      setPriority(3);
      setIsNonNegotiable(false);
      setNotes('');
      setTags('');
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

    // startTime and duration are already in state

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
        // Attention system fields
        attention_type: attentionType,
        priority: priority,
        is_non_negotiable: isNonNegotiable,
        notes: notes.trim() || null,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        context_switch_cost: 0, // Will be calculated based on previous item when saving
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
      const allOptions = {
        // Team options
        ...(team ? {
          team_id: visibility !== 'personal' ? team.id : null,
          visibility,
          assigned_to: visibility === 'assigned' && assignedTo ? assignedTo : null,
          assigned_by: visibility === 'assigned' && assignedTo ? user?.id : null,
        } : {}),
        // Attention system options
        attention_type: attentionType,
        priority: priority,
        is_non_negotiable: isNonNegotiable,
        notes: notes.trim() || null,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        context_switch_cost: 0, // Will be calculated based on previous item when saving
      };

      await onAddItem(
        layerId,
        title.trim(),
        startTime.toISOString(),
        duration,
        color,
        allOptions
      );
    }

    // Reset form
    setTitle('');
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    setStartTime(start);
    setEndTime(new Date(start.getTime() + 60 * 60 * 1000));
    setDuration(60);
    setPlannedDuration(60);
    setIsMeeting(false);
    setIsFlexible(true);
    setShowAdvanced(false);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    setVisibility('personal');
    setAssignedTo('');

    // Reset attention fields
    setAttentionType(null);
    setPriority(3);
    setIsNonNegotiable(false);
    setNotes('');
    setTags('');

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
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    setStartTime(start);
    setEndTime(new Date(start.getTime() + 60 * 60 * 1000));
    setDuration(60);
    setPlannedDuration(60);
    setIsMeeting(false);
    setIsFlexible(true);
    setShowAdvanced(false);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    setVisibility('personal');
    setAssignedTo('');

    // Reset attention fields
    setAttentionType(null);
    setPriority(3);
    setIsNonNegotiable(false);
    setNotes('');
    setTags('');

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
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    setStartTime(start);
    setEndTime(new Date(start.getTime() + 60 * 60 * 1000));
    setDuration(60);
    setPlannedDuration(60);
    setIsMeeting(false);
    setIsFlexible(true);
    setShowAdvanced(false);
    setColor(getRandomItemColor());
    setNewLayerName('');
    setIsCreatingLayer(false);
    setVisibility('personal');
    setAssignedTo('');

    // Reset attention fields
    setAttentionType(null);
    setPriority(3);
    setIsNonNegotiable(false);
    setNotes('');
    setTags('');

    onClose();
  };

  const handleStartTimeChange = (newStart: Date | undefined) => {
    if (!newStart) return;
    setStartTime(newStart);
    // Maintain duration by moving end time
    setEndTime(new Date(newStart.getTime() + duration * 60 * 1000));
  };

  const handleEndTimeChange = (newEnd: Date | undefined) => {
    if (!newEnd) return;
    setEndTime(newEnd);
    // Update duration based on new end time
    const newDuration = Math.max(15, Math.round((newEnd.getTime() - startTime.getTime()) / 60000));
    setDuration(newDuration);
  };

  const handleQuickDuration = (minutes: number) => {
    setDuration(minutes);
    setEndTime(new Date(startTime.getTime() + minutes * 60 * 1000));
    // When not in advanced mode, keep both values in sync
    if (!showAdvanced) {
      setPlannedDuration(minutes);
    }
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

  // Handle template selection
  const handleTemplateSelect = (template: {
    title: string;
    suggestedDuration: number;
    attentionType: AttentionType;
    priority: number;
    isNonNegotiable?: boolean;
    tags?: string[];
  }) => {
    setTitle(template.title);
    setDuration(template.suggestedDuration);
    setPlannedDuration(template.suggestedDuration);
    setAttentionType(template.attentionType);
    setPriority(template.priority);
    setIsNonNegotiable(template.isNonNegotiable || false);

    if (template.tags && template.tags.length > 0) {
      setTags(template.tags.join(', '));
    }

    // Set end time based on duration
    if (startTime) {
      const newEndTime = new Date(startTime.getTime() + template.suggestedDuration * 60 * 1000);
      setEndTime(newEndTime);
    }
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
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Title *</Label>
              <RoleBasedTemplatesCompact
                currentRole={currentRole}
                onTemplateSelect={handleTemplateSelect}
                disabled={isEditMode}
              />
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              required
            />
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <DateTimePicker value={startTime} onChange={handleStartTimeChange} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <DateTimePicker value={endTime} onChange={handleEndTimeChange} />
            </div>
          </div>

          {/* Duration (actual timeline block size) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="duration">
                {showAdvanced ? 'Calendar Time to Reserve *' : 'Duration *'}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs h-7"
              >
                {showAdvanced ? 'Simple' : 'Advanced'}
              </Button>
            </div>
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
              {showAdvanced
                ? 'How much calendar time to block on your timeline'
                : 'How long this task/event will take'}
            </p>
          </div>

          {/* Time Estimate - Only show in advanced mode */}
          {showAdvanced && (
            <div className="space-y-2 border-l-2 border-primary/20 pl-4">
              <TimeEstimateInput
                value={plannedDuration}
                onChange={setPlannedDuration}
                label="Actual Work Time"
              />
              <p className="text-xs text-muted-foreground">
                Estimate of actual work time (for tracking productivity)
              </p>
            </div>
          )}

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
                This is a meeting
              </Label>
              <p className="text-xs text-muted-foreground ml-6">
                Enables meeting prep features and calendar sync (if connected)
              </p>
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

          {/* Attention System Fields */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Attention Management</Label>
            </div>

            {/* Attention Type */}
            <div className="space-y-2">
              <Label htmlFor="attention-type">Attention Type</Label>
              <AttentionTypeSelector
                value={attentionType}
                onChange={setAttentionType}
                currentRole={currentRole}
                showDescriptions={false}
                showCompatibilityWarnings={true}
              />
              <p className="text-xs text-muted-foreground">
                What type of mental energy does this task require?
              </p>

              {/* Role-based suggestions */}
              {roleSuggestions.suggestions.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">
                      {currentRole?.charAt(0).toUpperCase()}{currentRole?.slice(1)} Mode Suggestions
                    </span>
                  </div>
                  {roleSuggestions.suggestions.map((suggestion, index) => (
                    <div key={index} className={`p-2 rounded text-xs ${
                      suggestion.severity === 'high' ? 'bg-red-50 border border-red-200 text-red-700' :
                      suggestion.severity === 'medium' ? 'bg-orange-50 border border-orange-200 text-orange-700' :
                      'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="mt-1">{suggestion.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Duration suggestion */}
              {roleSuggestions.hasDurationSuggestion && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    Suggested duration: {roleSuggestions.suggestedDuration} minutes
                    {roleSuggestions.suggestedDuration !== duration && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-1 text-xs text-blue-600"
                        onClick={() => setDuration(roleSuggestions.suggestedDuration)}
                      >
                        Apply
                      </Button>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Priority and Non-Negotiable */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (1-5)</Label>
                <div className="space-y-2">
                  <Slider
                    id="priority"
                    min={1}
                    max={5}
                    step={1}
                    value={[priority]}
                    onValueChange={(value) => setPriority(value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low</span>
                    <span className="font-medium">Priority: {priority}</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="non-negotiable">Special Designation</Label>
                <div className="flex items-center space-x-2 pt-3">
                  <Checkbox
                    id="non-negotiable"
                    checked={isNonNegotiable}
                    onCheckedChange={(checked) => setIsNonNegotiable(checked === true)}
                  />
                  <Label
                    htmlFor="non-negotiable"
                    className="text-sm font-normal cursor-pointer flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    Non-negotiable priority
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Protected focus time that cannot be interrupted
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context, prerequisites, or important details..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="project, urgent, client-work (comma separated)"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated tags for organizing and filtering tasks
              </p>
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
