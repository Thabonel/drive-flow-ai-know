import { useState } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  GripVertical,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

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
      className={`group p-3 bg-card border rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight truncate">
              {task.title}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: task.color, color: task.color }}
            >
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(task.planned_duration_minutes)}
            </Badge>

            {task.tags.length > 0 && (
              <div className="flex gap-1">
                {task.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{task.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onTaskScheduled?: (task: Task, startTime: string, layerId: string) => void;
}

export function TaskSidebar({ isOpen, onToggle, onTaskScheduled }: TaskSidebarProps) {
  const { tasks, loading, addTask, deleteTask } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Filter tasks by search query
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle add task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await addTask(newTaskTitle.trim());
      setNewTaskTitle('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed right-4 top-24 z-40 shadow-lg"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-screen bg-background border-l shadow-xl z-30 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '320px' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Unscheduled Tasks</h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Task list */}
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Loading tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {searchQuery ? 'No matching tasks' : 'No tasks yet. Add one below!'}
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
          </ScrollArea>

          {/* Footer - Add task */}
          <div className="p-4 border-t">
            {showAddForm ? (
              <div className="space-y-2">
                <Input
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTask();
                    if (e.key === 'Escape') setShowAddForm(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddTask}
                    size="sm"
                    className="flex-1"
                    disabled={!newTaskTitle.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTaskTitle('');
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
