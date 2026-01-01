/**
 * Background Task Indicator
 *
 * Shows in the app header when AI tasks are running in the background.
 * Clicking opens a popover with task details and results.
 */

import React from 'react';
import { useBackgroundTasks, BackgroundTask } from '@/contexts/BackgroundTasksContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, XCircle, Brain, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

function TaskStatusIcon({ status }: { status: BackgroundTask['status'] }) {
  switch (status) {
    case 'pending':
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function TaskItem({ task, onClear }: { task: BackgroundTask; onClear: () => void }) {
  const navigate = useNavigate();
  const isActive = task.status === 'running' || task.status === 'pending';

  const handleViewResult = () => {
    // Navigate to dashboard where results can be viewed
    navigate('/');
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isActive ? "bg-primary/5 border-primary/20" : "bg-muted/50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <TaskStatusIcon status={task.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {task.query.substring(0, 60)}{task.query.length > 60 ? '...' : ''}
            </p>
            {task.knowledgeBaseName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Using: {task.knowledgeBaseName}
              </p>
            )}
            {task.progress && (
              <p className="text-xs text-primary mt-1">{task.progress}</p>
            )}
            {task.error && (
              <p className="text-xs text-red-500 mt-1">{task.error}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(task.startedAt).toLocaleTimeString()}
              {task.completedAt && ` - ${new Date(task.completedAt).toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {task.status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewResult}
              className="h-7 px-2 text-xs"
            >
              View
            </Button>
          )}
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BackgroundTaskIndicator() {
  const { tasks, activeTaskCount, clearTask, clearCompletedTasks } = useBackgroundTasks();

  // Don't render if no tasks
  if (tasks.length === 0) {
    return null;
  }

  const hasCompleted = tasks.some(t => t.status === 'completed' || t.status === 'failed');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative gap-2",
            activeTaskCount > 0 && "border-primary"
          )}
        >
          {activeTaskCount > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {activeTaskCount > 0 ? 'AI Working' : 'AI Tasks'}
          </span>
          <Badge
            variant={activeTaskCount > 0 ? "default" : "secondary"}
            className="h-5 min-w-[20px] px-1.5"
          >
            {tasks.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Background Tasks</h4>
            {hasCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompletedTasks}
                className="h-7 px-2 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear done
              </Button>
            )}
          </div>
          {activeTaskCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {activeTaskCount} task{activeTaskCount !== 1 ? 's' : ''} running
            </p>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-2">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onClear={() => clearTask(task.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
