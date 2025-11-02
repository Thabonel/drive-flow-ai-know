import { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TimelineManager } from './TimelineManager';
import { Task, useTasks } from '@/hooks/useTasks';
import { useTimeline } from '@/hooks/useTimeline';
import { useLayers } from '@/hooks/useLayers';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { calculateRecurringDates } from '@/lib/recurrence';
import { useToast } from '@/hooks/use-toast';

export function TimelineWithDnd() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    time: string;
    layerId: string;
    x: number;
    y: number;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const { deleteTask } = useTasks();
  const { addItem } = useTimeline();
  const { layers } = useLayers();
  const { toast } = useToast();

  // Configure sensors for drag and drop
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Calculate drop position (time and layer) from mouse coordinates
  const calculateDropPosition = useCallback((event: DragMoveEvent | DragEndEvent) => {
    if (!timelineRef.current || layers.length === 0) return null;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.activatorEvent ? (event.activatorEvent as MouseEvent).clientX : 0;
    const y = event.activatorEvent ? (event.activatorEvent as MouseEvent).clientY : 0;

    // Calculate which layer based on Y position
    const relativeY = y - rect.top;
    const layerHeight = rect.height / layers.filter(l => l.is_visible).length;
    const layerIndex = Math.floor(relativeY / layerHeight);
    const visibleLayers = layers.filter(l => l.is_visible);
    const targetLayer = visibleLayers[Math.max(0, Math.min(layerIndex, visibleLayers.length - 1))];

    if (!targetLayer) return null;

    // Calculate time based on X position (simplified - assumes NOW line at center)
    // In reality, this should use the timeline's scroll offset and zoom level
    const now = new Date();
    const relativeX = x - rect.left;
    const centerX = rect.width * 0.3; // NOW_LINE_POSITION
    const hoursFromNow = (relativeX - centerX) / 60; // Rough estimate

    const targetTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

    // Snap to 15-minute intervals
    const minutes = targetTime.getMinutes();
    const snappedMinutes = Math.round(minutes / 15) * 15;
    targetTime.setMinutes(snappedMinutes);
    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);

    return {
      time: targetTime.toISOString(),
      layerId: targetLayer.id,
      x: relativeX,
      y: relativeY,
    };
  }, [layers]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      setActiveTask(active.data.current as Task);
    }
  };

  // Handle drag move (for preview)
  const handleDragMove = (event: DragMoveEvent) => {
    const position = calculateDropPosition(event);
    setDropPreview(position);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    const task = active.data.current as Task;

    if (!task || !dropPreview) {
      setActiveTask(null);
      setDropPreview(null);
      return;
    }

    // Check if there are visible layers
    if (layers.filter(l => l.is_visible).length === 0) {
      console.error('No visible layers available');
      setActiveTask(null);
      setDropPreview(null);
      return;
    }

    try {
      // Check if this is a recurring task
      if (task.is_recurring && task.recurrence_pattern) {
        console.log('Scheduling recurring task:', {
          layerId: dropPreview.layerId,
          title: task.title,
          time: dropPreview.time,
          duration: task.planned_duration_minutes,
          pattern: task.recurrence_pattern,
        });

        // Calculate all occurrence dates
        const occurrenceDates = calculateRecurringDates(
          dropPreview.time,
          task.recurrence_pattern,
          task.recurrence_end_date,
          52 // Generate up to 52 occurrences (~1 year)
        );

        console.log(`Generating ${occurrenceDates.length} recurring instances`);

        // Create timeline items for each occurrence
        const createdItems = [];
        for (const occurrenceDate of occurrenceDates) {
          try {
            const item = await addItem(
              dropPreview.layerId,
              task.title,
              occurrenceDate,
              task.planned_duration_minutes,
              task.color
            );
            if (item) {
              createdItems.push(item);
            }
          } catch (error) {
            console.error(`Failed to create occurrence at ${occurrenceDate}:`, error);
            // Continue with other occurrences
          }
        }

        if (createdItems.length > 0) {
          // Delete the task from unscheduled list
          await deleteTask(task.id);

          toast({
            title: 'Recurring task scheduled',
            description: `Created ${createdItems.length} recurring instances`,
          });

          console.log(`Successfully scheduled ${createdItems.length} recurring instances`);
        } else {
          toast({
            title: 'Failed to schedule recurring task',
            description: 'No instances could be created',
            variant: 'destructive',
          });
        }
      } else {
        // Non-recurring task - single instance
        console.log('Scheduling single task:', {
          layerId: dropPreview.layerId,
          title: task.title,
          time: dropPreview.time,
          duration: task.planned_duration_minutes,
          color: task.color,
        });

        const item = await addItem(
          dropPreview.layerId,
          task.title,
          dropPreview.time,
          task.planned_duration_minutes,
          task.color
        );

        if (item) {
          // Only delete task if item was successfully created
          await deleteTask(task.id);
          console.log('Task scheduled successfully');
        }
      }
    } catch (error) {
      console.error('Failed to schedule task:', error);
      // Error toast is already shown by addItem for non-recurring tasks
    } finally {
      setActiveTask(null);
      setDropPreview(null);
    }
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
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {/* Main Timeline - with drop zone */}
        <div ref={timelineRef} className="relative">
          <TimelineManager />

          {/* Drop preview indicator */}
          {activeTask && dropPreview && (
            <div
              className="absolute pointer-events-none z-50 border-2 border-dashed border-primary bg-primary/10 rounded"
              style={{
                left: dropPreview.x - 2,
                top: dropPreview.y - 20,
                width: '4px',
                height: '40px',
              }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap bg-background px-2 py-1 rounded shadow-sm">
                {new Date(dropPreview.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>

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
