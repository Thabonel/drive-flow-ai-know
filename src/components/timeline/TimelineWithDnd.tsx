import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TimelineManager } from './TimelineManager';
import { TaskSidebar } from './TaskSidebar';
import { Task } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export function TimelineWithDnd() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors for drag and drop
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // Require 10px movement before dragging starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      setActiveTask(active.data.current as Task);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    // Check if dropped on timeline
    if (over.id === 'timeline-drop-zone') {
      const task = active.data.current as Task;
      // The actual scheduling will be handled by TimelineManager
      // via the onTaskScheduled callback
      console.log('Task dropped on timeline:', task);
    }

    setActiveTask(null);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {/* Main Timeline */}
        <TimelineManager />

        {/* Task Sidebar */}
        <TaskSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Drag Overlay - shows the dragged task */}
        <DragOverlay>
          {activeTask && (
            <div className="p-3 bg-card border-2 border-primary rounded-lg shadow-2xl max-w-[280px]">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-tight">
                    {activeTask.title}
                  </h4>
                  {activeTask.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {activeTask.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: activeTask.color,
                        color: activeTask.color,
                      }}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(activeTask.planned_duration_minutes)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
