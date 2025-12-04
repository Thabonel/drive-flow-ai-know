/**
 * PlanCreator Modal
 *
 * Allows users to write markdown plans with duration tags.
 * Uses REGEX parsing to extract tasks - NO AI estimation.
 */

import React, { useState, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProjectPlans } from '@/hooks/useProjectPlans';
import { parseMarkdownPlan, formatDuration, validatePlan } from '@/lib/planParser';

interface PlanCreatorProps {
  open: boolean;
  onClose: () => void;
  onPlanCreated?: (planId: string) => void;
}

export function PlanCreator({ open, onClose, onPlanCreated }: PlanCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const { createPlan, isCreating } = useProjectPlans();

  // Live parsing as user types
  const parseResult = useMemo(() => {
    if (!content.trim()) return null;
    return parseMarkdownPlan(content);
  }, [content]);

  const validation = useMemo(() => {
    if (!parseResult) return null;
    return validatePlan(parseResult.tasks);
  }, [parseResult]);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;

    createPlan(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        source_content: content,
        source_type: 'markdown',
      },
      {
        onSuccess: (data) => {
          // Reset form
          setTitle('');
          setDescription('');
          setContent('');
          onClose();
          onPlanCreated?.(data.plan.id);
        },
      }
    );
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  // Example template
  const examplePlan = `## Setup Environment [duration: 30m]
Install dependencies and configure project

## Build Feature [duration: 2h]
Implement the main functionality
- Create components
- Add business logic

## Write Tests [duration: 1h]
Unit and integration tests

## Documentation [duration: 45m]
Update README and inline docs`;

  const insertExample = () => {
    setContent(examplePlan);
    if (!title) setTitle('Example Project Plan');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Plan
          </DialogTitle>
          <DialogDescription>
            Write your plan with duration tags. The system will extract tasks and schedule them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="plan-title">Plan Title</Label>
            <Input
              id="plan-title"
              placeholder="e.g., Q1 Feature Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="plan-description">Description (optional)</Label>
            <Input
              id="plan-description"
              placeholder="Brief description of this plan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="plan-content" className="flex items-center gap-2">
                Plan Content
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium mb-1">Duration Tag Formats:</p>
                      <ul className="text-sm space-y-1">
                        <li><code>[duration: 2h]</code></li>
                        <li><code>[duration: 30m]</code></li>
                        <li><code>[duration: 1h30m]</code></li>
                        <li><code>[1.5h]</code> (shorthand)</li>
                        <li><code>(45 minutes)</code></li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Button variant="ghost" size="sm" onClick={insertExample}>
                Insert Example
              </Button>
            </div>

            <Textarea
              id="plan-content"
              placeholder={`## Task Name [duration: 2h]
Description of what needs to be done

## Another Task [duration: 1h]
More details here...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
          </div>

          {/* Live Parse Preview */}
          {parseResult && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Parse Preview</span>
                {validation?.isValid ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-600 text-white">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{parseResult.tasks.length} task{parseResult.tasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDuration(parseResult.totalDurationMinutes)}</span>
                </div>
              </div>

              {/* Task List */}
              {parseResult.tasks.length > 0 && (
                <div className="space-y-1">
                  {parseResult.tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background"
                    >
                      <span className="truncate flex-1">{task.title}</span>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {formatDuration(task.user_defined_duration_minutes)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm">
                    <p className="font-medium mb-1">Missing duration tags:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {parseResult.warnings.map((w, i) => (
                        <li key={i}>{w.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Empty State */}
          {!content.trim() && (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Start typing your plan above, or{' '}
                <button
                  onClick={insertExample}
                  className="text-primary underline hover:no-underline"
                >
                  insert an example
                </button>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isCreating ||
              !title.trim() ||
              !parseResult ||
              parseResult.tasks.length === 0
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Plan
                {parseResult && parseResult.tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {parseResult.tasks.length} tasks
                  </Badge>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
