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
import { Clock, Loader2 } from 'lucide-react';
import { calculateRecurringDates, alignStartDateToPattern } from '@/lib/recurrence';
import { useToast } from '@/hooks/use-toast';
import { NOW_LINE_POSITION, VIEW_MODE_CONFIG, TimelineViewMode, TIMELINE_HEADER_HEIGHT } from '@/lib/timelineConstants';

interface TimelineWithDndProps {
  refetchItems: () => Promise<void>;
  refetchTasks: () => Promise<void>;
}

export function TimelineWithDnd({ refetchItems, refetchTasks }: TimelineWithDndProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    time: string;
    layerId: string;
    x: number;
    y: number;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const { deleteTask } = useTasks();
  const { addItem, settings, scrollOffset, nowTime } = useTimeline();
  const { layers } = useLayers();
  const { toast } = useToast();

  // Configure sensors for drag and drop (MUST be before early return - Rules of Hooks)
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

  // Calculate pixelsPerHour from settings (same as TimelineManager)
  const viewMode = (settings?.view_mode as TimelineViewMode) || 'day';
  const viewModeConfig = VIEW_MODE_CONFIG[viewMode];
  const basePixelsPerHour = viewModeConfig.pixelsPerHour;
  const pixelsPerHour = ((settings?.zoom_horizontal || 100) / 100) * basePixelsPerHour;

  // Calculate drop position (time and layer) from mouse coordinates
  const calculateDropPosition = useCallback((event: DragMoveEvent | DragEndEvent) => {
    if (!timelineRef.current || layers.length === 0 || !nowTime) return null;

    const rect = timelineRef.current.getBoundingClientRect();

    // Use final drop position: activatorEvent + delta
    const activatorX = event.activatorEvent ? (event.activatorEvent as MouseEvent).clientX : 0;
    const activatorY = event.activatorEvent ? (event.activatorEvent as MouseEvent).clientY : 0;
    const deltaX = event.delta?.x || 0;
    const deltaY = event.delta?.y || 0;
    const x = activatorX + deltaX;
    const y = activatorY + deltaY;

    // Calculate which layer based on Y position
    const relativeY = y - rect.top;

    // Account for timeline header (time markers at top)
    const layerY = relativeY - TIMELINE_HEADER_HEIGHT;

    const visibleLayers = layers.filter(l => l.is_visible); // Filter visible layers FIRST
    const layerHeight = (rect.height - TIMELINE_HEADER_HEIGHT) / visibleLayers.length; // Subtract header from total height
    const layerIndex = Math.floor(layerY / layerHeight);
    const targetLayer = visibleLayers[Math.max(0, Math.min(layerIndex, visibleLayers.length - 1))];

    // Debug logging
    console.log('Layer Detection Debug:', {
      y,
      rectTop: rect.top,
      rectHeight: rect.height,
      relativeY,
      headerHeight: TIMELINE_HEADER_HEIGHT,
      layerY,
      visibleLayersCount: visibleLayers.length,
      layerHeight,
      calculatedIndex: layerIndex,
      clampedIndex: Math.max(0, Math.min(layerIndex, visibleLayers.length - 1)),
      targetLayerTitle: targetLayer?.title,
      visibleLayerTitles: visibleLayers.map(l => l.title),
    });

    if (!targetLayer) return null;

    // Calculate time based on X position using proper timeline formula
    // Formula: itemX = nowLineX + (hoursFromNow * pixelsPerHour) + scrollOffset
    // Reverse: hoursFromNow = (x - nowLineX - scrollOffset) / pixelsPerHour
    const relativeX = x - rect.left;
    const nowLineX = rect.width * NOW_LINE_POSITION;
    const hoursFromNow = (relativeX - nowLineX - scrollOffset) / pixelsPerHour;

    const targetTime = new Date(nowTime.getTime() + hoursFromNow * 60 * 60 * 1000);

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
  }, [layers, nowTime, scrollOffset, pixelsPerHour]);

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
        // Align the start date to match the recurrence pattern
        // E.g., if pattern is "Monday" but dropped on "Wednesday", start on next Monday
        const alignedStartDate = alignStartDateToPattern(
          dropPreview.time,
          task.recurrence_pattern
        );

        console.log('Scheduling recurring task:', {
          layerId: dropPreview.layerId,
          title: task.title,
          originalDropTime: dropPreview.time,
          alignedStartTime: alignedStartDate,
          duration: task.planned_duration_minutes,
          pattern: task.recurrence_pattern,
        });

        // Calculate all occurrence dates starting from aligned date
        const occurrenceDates = calculateRecurringDates(
          alignedStartDate,
          task.recurrence_pattern,
          task.recurrence_end_date,
          52 // Generate up to 52 occurrences (~1 year)
        );

        console.log(`Generating ${occurrenceDates.length} recurring instances`);

        // Generate a unique series ID for this recurring task group
        const recurringSeriesId = crypto.randomUUID();

        // Create timeline items for each occurrence
        const createdItems = [];
        for (let index = 0; index < occurrenceDates.length; index++) {
          const occurrenceDate = occurrenceDates[index];
          try {
            const item = await addItem(
              dropPreview.layerId,
              task.title,
              occurrenceDate,
              task.planned_duration_minutes,
              task.color,
              {
                recurring_series_id: recurringSeriesId,
                occurrence_index: index,
              }
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
          // Only delete if this is a one-off task (not a template)
          if (!task.is_template) {
            // Delete the task from unscheduled list
            // Mark as intentional to prevent race condition with real-time subscription
            await deleteTask(task.id, true);
          }

          // Refetch tasks to update dropdown (remove if one-off, keep if template)
          await refetchTasks();
          // NOTE: No need to call refetchItems() here - addItem() already updates local state for each occurrence

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
          isTemplate: task.is_template,
        });

        const item = await addItem(
          dropPreview.layerId,
          task.title,
          dropPreview.time,
          task.planned_duration_minutes,
          task.color
        );

        if (item) {
          // Only delete if this is a one-off task (not a template)
          if (!task.is_template) {
            // Delete the task from unscheduled list
            // Mark as intentional to prevent race condition with real-time subscription
            await deleteTask(task.id, true);
          }

          // Refetch tasks to update dropdown (remove if one-off, keep if template)
          await refetchTasks();
          // NOTE: No need to call refetchItems() here - addItem() already updates local state
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

  // Loading guard - AFTER all hooks are called (Rules of Hooks)
  if (layers.length === 0 || !nowTime || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

          {/* Drop preview indicator - vertical line only */}
          {activeTask && dropPreview && (
            <div
              className="absolute pointer-events-none z-50 border-2 border-dashed border-primary bg-primary/10 rounded"
              style={{
                left: dropPreview.x - 2,
                top: dropPreview.y - 20,
                width: '4px',
                height: '40px',
              }}
            />
          )}
        </div>

        {/* Drag Overlay - shows the dragged task with time indicator */}
        <DragOverlay>
          {activeTask && (
            <div className="relative">
              {/* Time indicator box - positioned above dragged card */}
              {dropPreview && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-sm font-semibold text-primary whitespace-nowrap bg-background px-3 py-2 rounded-lg shadow-lg border-2 border-primary z-50">
                  {new Date(dropPreview.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
              {/* Dragged task card */}
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
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
