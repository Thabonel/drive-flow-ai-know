import { useState } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Clock,
  GripVertical,
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DraggableTaskProps {
  task: Task;
  onDelete: (id: string) => void;
}

function DraggableTask({ task, onDelete }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: task });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-2 bg-card border rounded cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow text-xs ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-medium text-xs leading-tight truncate">
              {task.title}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1 mt-1">
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1"
              style={{ borderColor: task.color, color: task.color }}
            >
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              {formatDuration(task.planned_duration_minutes)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskHeaderPanelProps {
  tasks: Task[];
  loading: boolean;
  onRefetch: () => void;
  onAddTaskClick: () => void;
}

export function TaskHeaderPanel({ tasks, loading, onRefetch, onAddTaskClick }: TaskHeaderPanelProps) {
  const { deleteTask } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter tasks by search query
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <span className="text-xs">Task Pool</span>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {tasks.length}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col" style={{ maxHeight: '300px' }}>
          {/* Header */}
          <div className="p-3 border-b space-y-2">
            <h3 className="font-semibold text-sm">Task Pool</h3>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
            </div>
          </div>

          {/* Task list */}
          <ScrollArea className="flex-1" style={{ maxHeight: '200px' }}>
            <div className="p-3">
              {loading ? (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Loading tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">
                  {searchQuery ? 'No matching tasks' : 'No tasks yet'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer - Add task button */}
          <div className="p-3 border-t">
            <Button
              onClick={() => {
                onAddTaskClick();
                setIsOpen(false);
              }}
              className="w-full h-8 text-xs"
              size="sm"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
