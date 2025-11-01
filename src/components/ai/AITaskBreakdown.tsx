import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  GripVertical,
  Clock,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { callOpenAI } from '@/lib/ai/openai-client';
import {
  generateTaskBreakdownPrompt,
  parseTaskBreakdownResponse,
  shouldAutoDecompose,
  type TaskContext,
  type Subtask,
  type TaskBreakdown,
} from '@/lib/ai/prompts/task-breakdown';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface AITaskBreakdownProps {
  task: {
    title: string;
    description?: string;
    estimated_duration?: number;
    tags?: string[];
    task_type?: string;
  };
  onAddToTimeline?: (subtasks: Subtask[]) => void;
  autoTrigger?: boolean;
}

export function AITaskBreakdown({ task, onAddToTimeline, autoTrigger = false }: AITaskBreakdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const shouldShow = shouldAutoDecompose(task.estimated_duration, task.title);

  // Auto-generate if autoTrigger is true and task meets criteria
  useEffect(() => {
    if (autoTrigger && shouldShow && !breakdown) {
      handleGenerateBreakdown();
    }
  }, [autoTrigger]);

  const handleGenerateBreakdown = async () => {
    setLoading(true);

    try {
      const context: TaskContext = {
        title: task.title,
        description: task.description,
        estimated_duration: task.estimated_duration,
        tags: task.tags,
        task_type: task.task_type,
      };

      const prompt = generateTaskBreakdownPrompt(context);
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 1500,
      });

      const parsedBreakdown = parseTaskBreakdownResponse(response);
      setBreakdown(parsedBreakdown);
      setSubtasks(parsedBreakdown.subtasks);

      // Auto-select all non-optional subtasks
      const autoSelectedIds = new Set(
        parsedBreakdown.subtasks.filter(s => !s.is_optional).map(s => s.id)
      );
      setSelectedIds(autoSelectedIds);

      toast({
        title: 'Task breakdown generated!',
        description: `AI created ${parsedBreakdown.subtasks.length} subtasks with ${parsedBreakdown.overall_confidence >= 0.7 ? 'high' : 'medium'} confidence.`,
      });
    } catch (error) {
      console.error('Failed to generate task breakdown:', error);
      toast({
        title: 'Generation failed',
        description: 'Could not generate task breakdown. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReorderSubtask = (fromIndex: number, toIndex: number) => {
    const newSubtasks = [...subtasks];
    const [moved] = newSubtasks.splice(fromIndex, 1);
    newSubtasks.splice(toIndex, 0, moved);

    // Update order numbers
    const reordered = newSubtasks.map((st, idx) => ({ ...st, order: idx + 1 }));
    setSubtasks(reordered);
  };

  const handleToggleSubtask = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEditSubtask = (id: string, updates: Partial<Subtask>) => {
    setSubtasks(prev =>
      prev.map(st => (st.id === id ? { ...st, ...updates } : st))
    );
    setEditingId(null);
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleAddAllToTimeline = () => {
    const selected = subtasks.filter(st => selectedIds.has(st.id));
    onAddToTimeline?.(selected);
    toast({
      title: 'Added to timeline!',
      description: `${selected.length} subtask(s) added to your timeline.`,
    });
    setOpen(false);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500 text-xs">High</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="bg-yellow-500 text-xs">Medium</Badge>;
    } else {
      return <Badge className="bg-orange-500 text-xs">Low</Badge>;
    }
  };

  if (!shouldShow && !autoTrigger) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          if (!breakdown) handleGenerateBreakdown();
        }}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Sparkles className="h-3 w-3" />
        Break Down Task
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Task Breakdown
            </DialogTitle>
            <DialogDescription>{task.title}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                <p className="text-sm text-muted-foreground">Breaking down your task...</p>
              </div>
            </div>
          ) : breakdown ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Header Stats */}
              <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Subtasks</p>
                    <p className="text-2xl font-bold">{subtasks.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      {breakdown.total_estimated_minutes}
                      <span className="text-sm font-normal">min</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold">{getConfidenceBadge(breakdown.overall_confidence)}</p>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateBreakdown}
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  className="gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              {/* Rationale */}
              {breakdown.breakdown_rationale && (
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground italic">{breakdown.breakdown_rationale}</p>
                  </CardContent>
                </Card>
              )}

              {/* Subtasks Tree */}
              <div className="space-y-2">
                {subtasks.map((subtask, index) => (
                  <SubtaskCard
                    key={subtask.id}
                    subtask={subtask}
                    index={index}
                    isSelected={selectedIds.has(subtask.id)}
                    isEditing={editingId === subtask.id}
                    onToggle={() => handleToggleSubtask(subtask.id)}
                    onEdit={(updates) => handleEditSubtask(subtask.id, updates)}
                    onDelete={() => handleDeleteSubtask(subtask.id)}
                    onStartEdit={() => setEditingId(subtask.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onReorder={handleReorderSubtask}
                    totalSubtasks={subtasks.length}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-background">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={selectedIds.size === subtasks.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(new Set(subtasks.map(st => st.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                  <span>{selectedIds.size} of {subtasks.length} selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAllToTimeline}
                    disabled={selectedIds.size === 0}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add {selectedIds.size > 0 ? selectedIds.size : ''} to Timeline
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Click "Break Down Task" to generate subtasks</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Subtask Card Component
interface SubtaskCardProps {
  subtask: Subtask;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: (updates: Partial<Subtask>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  totalSubtasks: number;
}

function SubtaskCard({
  subtask,
  index,
  isSelected,
  isEditing,
  onToggle,
  onEdit,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onReorder,
  totalSubtasks,
}: SubtaskCardProps) {
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [editMinutes, setEditMinutes] = useState(subtask.estimated_minutes.toString());

  if (isEditing) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="pt-4 space-y-3">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Subtask title"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={editMinutes}
              onChange={(e) => setEditMinutes(e.target.value)}
              placeholder="Minutes"
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                onEdit({
                  title: editTitle,
                  estimated_minutes: parseInt(editMinutes) || subtask.estimated_minutes,
                });
              }}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit} className="gap-1">
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`transition-all ${isSelected ? 'border-purple-300 bg-purple-50/50 dark:bg-purple-950/10' : ''} ${
        subtask.is_optional ? 'opacity-75' : ''
      }`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div className="flex flex-col gap-1 pt-1">
            <button
              onClick={() => index > 0 && onReorder(index, index - 1)}
              disabled={index === 0}
              className="disabled:opacity-30"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Checkbox */}
          <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{subtask.title}</h4>
                  {subtask.is_optional && (
                    <Badge variant="outline" className="text-xs">
                      Optional
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {getConfidenceBadge(subtask.confidence)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{subtask.description}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={onStartEdit}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{subtask.estimated_minutes} min</span>
              </div>
              {subtask.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {subtask.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {subtask.dependencies.length > 0 && (
                <span className="text-xs">Depends on: {subtask.dependencies.join(', ')}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return <span className="text-green-600">High</span>;
  } else if (confidence >= 0.6) {
    return <span className="text-yellow-600">Med</span>;
  } else {
    return <span className="text-orange-600">Low</span>;
  }
}
