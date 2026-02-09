// Enhanced Timeline Manager - Refactored with Progressive Disclosure
// Addresses the 1492-line monolithic component issue

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';

// Enhanced components
import { InterfaceModeProvider } from './InterfaceModeController';
import { ResponsiveTimelineHeader } from './ResponsiveTimelineHeader';

// Original components (preserved)
import { TimelineCanvas } from '../TimelineCanvas';
import { CalendarGrid } from '../CalendarGrid';
import { AddItemForm } from '../AddItemForm';
import { ItemActionMenu } from '../ItemActionMenu';
import { ParkedItemsPanel } from '../ParkedItemsPanel';
import { RoleBasedEventTemplates } from '../RoleBasedEventTemplates';
import { WorkloadIndicator } from '../WorkloadIndicator';
import { AddTaskOverlay } from '../AddTaskOverlay';
import { DecisionBatchIndicator } from '../DecisionBatchIndicator';
import { MultiplierDashboard } from '../MultiplierDashboard';

// Modal components
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { TemplateBuilder } from '@/components/templates/TemplateBuilder';
import { AIDailyPlanningModal } from '@/components/ai/AIDailyPlanningModal';
import { AITimeInsights } from '@/components/ai/AITimeInsights';
import { RoutineManager } from '@/components/routines/RoutineManager';
import { DailyPlanningFlow } from '@/components/planning/DailyPlanningFlow';
import { EndOfDayShutdown } from '@/components/planning/EndOfDayShutdown';
import { WeeklyCalibrationWizard } from '../WeeklyCalibrationWizard';

// Hooks and utilities
import { useTimeline } from '@/hooks/useTimeline';
import { useLayers } from '@/hooks/useLayers';
import { useRoutines } from '@/hooks/useRoutines';
import { useTimelineSync } from '@/hooks/useTimelineSync';
import { useTasks } from '@/hooks/useTasks';
import { useCompactMode } from '@/hooks/useCompactMode';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { useModalState, TIMELINE_MODALS } from '@/hooks/useModalState';
import { ViewType } from '../ViewTypeSwitcher';
import { TimelineViewMode, VIEW_MODE_CONFIG } from '@/lib/timelineConstants';
import { TimelineItem, clamp } from '@/lib/timelineUtils';
import { resolveLayerColor } from '@/lib/layerUtils';
import {
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_LAYER_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  NOW_LINE_POSITION,
} from '@/lib/timelineConstants';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedTimelineManagerProps {
  className?: string;
  initialInterfaceMode?: 'beginner' | 'intermediate' | 'expert';
  onCanvasReady?: (svg: SVGSVGElement) => void;
}

export const EnhancedTimelineManager: React.FC<EnhancedTimelineManagerProps> = ({
  className,
  initialInterfaceMode = 'intermediate',
  onCanvasReady
}) => {
  // Core state from original TimelineManager
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [populatingRoutines, setPopulatingRoutines] = useState(false);

  // Consolidated modal state - replaces 14 individual useState declarations
  const modals = useModalState();

  // View state
  const [viewMode, setViewMode] = useState<TimelineViewMode>(() => {
    const stored = localStorage.getItem('timeline-view-mode');
    return (stored === 'day' || stored === 'week' || stored === 'month') ? stored : 'day';
  });
  const [viewType, setViewType] = useState<ViewType>(() => {
    const stored = localStorage.getItem('timeline-view-type');
    return (stored === 'calendar' ? 'calendar' : 'timeline') as ViewType;
  });
  const [initialFormValues, setInitialFormValues] = useState<{ startTime?: string; layerId?: string } | null>(null);
  const [jumpToDate, setJumpToDate] = useState<string>('');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  // Compact mode
  const { isCompactMode, setIsCompactMode } = useCompactMode();

  // URL search params for deep linking
  const [searchParams, setSearchParams] = useSearchParams();

  // All the hooks from original component
  const { items, settings, loading, refetchItems, addItem, updateItem, completeItem, deleteItem, parkedItems, updateSettings } = useTimeline();
  const { layers, addLayer, updateLayer, deleteLayer, toggleLayerVisibility, reorderLayers } = useLayers();
  const { routines } = useRoutines();
  useTimelineSync({ onItemsChange: refetchItems });
  const { tasks: unscheduledTasks, loading: tasksLoading, refetch: refetchTasks } = useTasks();
  const {
    preferences: attentionPreferences,
    updatePreferences: updateAttentionPreferences,
  } = useAttentionBudget();

  // URL deep linking logic (preserved from original)
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const viewParam = searchParams.get('view');

    if (dateParam) {
      const targetDate = new Date(dateParam);
      if (!isNaN(targetDate.getTime())) {
        if (viewType === 'calendar') {
          setCalendarViewDate(targetDate);
        } else {
          // For timeline view, calculate scroll offset to show the date
          const now = new Date();
          const hoursDiff = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          const pixelsPerHour = (settings?.zoom_horizontal || 100) / 100 * DEFAULT_PIXELS_PER_HOUR;
          setScrollOffset(-hoursDiff * pixelsPerHour);
        }

        // Clear the search params after handling
        setSearchParams({}, { replace: true });

        toast.info(`Navigated to ${targetDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        })}`);
      }
    }

    if (viewParam === 'calendar' || viewParam === 'timeline') {
      setViewType(viewParam as ViewType);
      localStorage.setItem('timeline-view-type', viewParam);
    }
  }, [searchParams, setSearchParams, viewType, settings]);

  // Real-time tracking refs
  const animationFrameRef = useRef<number>();
  const lastTickRef = useRef<number>(Date.now());
  const initializedScrollRef = useRef<boolean>(false);
  const prevItemsCountRef = useRef<number>(0);
  const prevItemIdsRef = useRef<Set<string>>(new Set());
  const hasCheckedInitialLoadRef = useRef<boolean>(false);
  const prevViewTypeRef = useRef<ViewType>(viewType);

  // Calculate zoom-adjusted values
  const viewModeConfig = VIEW_MODE_CONFIG[viewMode];
  const basePixelsPerHour = viewModeConfig.pixelsPerHour;
  const pixelsPerHour = (settings?.zoom_horizontal || 100) / 100 * basePixelsPerHour;
  const layerHeight = (settings?.zoom_vertical || 80) / 100 * DEFAULT_LAYER_HEIGHT;

  // Real-time auto-scroll effect (preserved from original)
  useEffect(() => {
    const tick = () => {
      if (!settings?.is_locked) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const deltaTime = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const autoScrollSpeed = pixelsPerHour / 3600;
      setScrollOffset(prev => prev - autoScrollSpeed * deltaTime);

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [settings?.is_locked, pixelsPerHour]);

  // Initial scroll positioning
  useEffect(() => {
    if (!settings) return;

    const estimatedViewportWidth = 1200;
    const pastHours = viewModeConfig.pastHours;
    const targetScrollOffset = pastHours * pixelsPerHour - NOW_LINE_POSITION * estimatedViewportWidth;

    if (!initializedScrollRef.current) {
      setScrollOffset(targetScrollOffset);
      initializedScrollRef.current = true;
    }
  }, [settings, pixelsPerHour, viewModeConfig.pastHours]);

  // Helper functions
  const handleToggleLock = async () => {
    if (!settings) return;

    try {
      await updateSettings({ is_locked: !settings.is_locked });
      toast.success(settings.is_locked ? 'Timeline unlocked' : 'Timeline locked to real-time');
    } catch (error) {
      console.error('Error toggling lock:', error);
      toast.error('Failed to toggle lock');
    }
  };

  const handleQuickZoomIn = () => {
    if (!settings) return;
    const newZoom = clamp(settings.zoom_horizontal * 1.2, MIN_ZOOM, MAX_ZOOM);
    handleZoomHorizontalChange(newZoom);
  };

  const handleQuickZoomOut = () => {
    if (!settings) return;
    const newZoom = clamp(settings.zoom_horizontal / 1.2, MIN_ZOOM, MAX_ZOOM);
    handleZoomHorizontalChange(newZoom);
  };

  const handleZoomHorizontalChange = async (value: number) => {
    try {
      await updateSettings({ zoom_horizontal: value });
    } catch (error) {
      console.error('Error updating horizontal zoom:', error);
      toast.error('Failed to update zoom');
    }
  };

  const handleZoomVerticalChange = async (value: number) => {
    try {
      await updateSettings({ zoom_vertical: value });
    } catch (error) {
      console.error('Error updating vertical zoom:', error);
      toast.error('Failed to update zoom');
    }
  };

  const handleFitAllLayers = () => {
    if (layers.length === 0) return;
    // Implement fit all layers logic
    handleZoomVerticalChange(80); // Reset to default
  };

  const getJumpLabel = (): string => {
    switch (viewMode) {
      case 'day': return 'Day';
      case 'week': return 'Week';
      case 'month': return 'Month';
      default: return 'Period';
    }
  };

  const handleJumpBackward = () => {
    if (viewType === 'calendar') {
      setCalendarViewDate(prev => {
        const d = new Date(prev);
        if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
        else if (viewMode === 'week') d.setDate(d.getDate() - 7);
        else d.setDate(d.getDate() - 1);
        return d;
      });
    } else {
      let incrementHours = 24; // 1 day
      if (viewMode === 'week') incrementHours = 24 * 7;
      else if (viewMode === 'month') incrementHours = 24 * 30;
      setScrollOffset(prev => prev + incrementHours * pixelsPerHour);
    }
  };

  const handleJumpForward = () => {
    if (viewType === 'calendar') {
      setCalendarViewDate(prev => {
        const d = new Date(prev);
        if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
        else if (viewMode === 'week') d.setDate(d.getDate() + 7);
        else d.setDate(d.getDate() + 1);
        return d;
      });
    } else {
      let incrementHours = 24; // 1 day
      if (viewMode === 'week') incrementHours = 24 * 7;
      else if (viewMode === 'month') incrementHours = 24 * 30;
      setScrollOffset(prev => prev - incrementHours * pixelsPerHour);
    }
  };

  const handleJumpToDate = (dateStr: string) => {
    if (!dateStr) return;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return;

    if (viewType === 'calendar') {
      setCalendarViewDate(targetDate);
    } else {
      const now = new Date();
      const hoursDiff = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      setScrollOffset(-hoursDiff * pixelsPerHour);
    }

    toast.info(`Jumped to ${targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })}`);
  };

  const handleJumpToToday = () => {
    if (viewType === 'calendar') {
      setCalendarViewDate(new Date());
    } else {
      setScrollOffset(viewModeConfig.pastHours * pixelsPerHour - NOW_LINE_POSITION * 1200);
    }
    toast.info('Jumped to today');
  };

  const handlePopulateRoutines = async () => {
    if (populatingRoutines || layers.length === 0) return;

    setPopulatingRoutines(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-routines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        await refetchItems();
        toast.success('Today\'s routines added to timeline');
      } else {
        throw new Error('Failed to populate routines');
      }
    } catch (error) {
      console.error('Error populating routines:', error);
      toast.error('Failed to add routines');
    } finally {
      setPopulatingRoutines(false);
    }
  };

  const getSelectedDateForBudget = (): Date => {
    if (viewMode === 'day') {
      return new Date();
    }
    const today = new Date();
    if (viewMode === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return startOfWeek;
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const logjamCount = items.filter(i => i.status === 'logjam').length;

  return (
    <InterfaceModeProvider initialMode={initialInterfaceMode}>
      <TooltipProvider delayDuration={300}>
        <div className={`${isCompactMode ? 'space-y-1' : 'space-y-6'} ${className}`}>
          {/* Enhanced Header */}
          <ResponsiveTimelineHeader
            // View state
            viewType={viewType}
            viewMode={viewMode}
            isCompactMode={isCompactMode}
            onCompactModeToggle={() => setIsCompactMode(!isCompactMode)}

            // Timeline actions - using consolidated modal state
            onAddItem={() => modals.open(TIMELINE_MODALS.ADD_ITEM)}
            onShowDailyPlanning={() => modals.open(TIMELINE_MODALS.DAILY_PLANNING)}
            onShowWeeklyCalibration={() => modals.open(TIMELINE_MODALS.WEEKLY_CALIBRATION)}
            onShowAIPlanning={() => modals.open(TIMELINE_MODALS.AI_PLANNING)}
            onShowTemplates={() => modals.open(TIMELINE_MODALS.TEMPLATES)}
            onShowRoleTemplates={() => modals.open(TIMELINE_MODALS.ROLE_TEMPLATES)}
            onShowRoutines={() => modals.open(TIMELINE_MODALS.ROUTINES)}
            onShowEndOfDay={() => modals.open(TIMELINE_MODALS.END_OF_DAY)}
            onShowAIInsights={() => modals.open(TIMELINE_MODALS.AI_INSIGHTS)}
            onShowParkedItems={() => modals.open(TIMELINE_MODALS.PARKED_ITEMS)}
            onPopulateRoutines={handlePopulateRoutines}

            // Lock and navigation
            settings={settings}
            onToggleLock={handleToggleLock}
            onZoomIn={handleQuickZoomIn}
            onZoomOut={handleQuickZoomOut}
            onNavigateBack={handleJumpBackward}
            onNavigateForward={handleJumpForward}
            onJumpToDate={handleJumpToDate}
            onJumpToToday={handleJumpToToday}
            getJumpLabel={getJumpLabel}

            // Layer management
            layers={layers}
            onAddLayer={addLayer}
            onUpdateLayer={updateLayer}
            onDeleteLayer={deleteLayer}
            onToggleLayerVisibility={toggleLayerVisibility}
            onReorderLayers={reorderLayers}

            // Zoom controls
            onZoomHorizontalChange={handleZoomHorizontalChange}
            onZoomVerticalChange={handleZoomVerticalChange}
            onFitAllLayers={handleFitAllLayers}

            // View switching
            onViewTypeChange={setViewType}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              localStorage.setItem('timeline-view-mode', mode);
            }}

            // Attention system
            items={items}
            attentionPreferences={attentionPreferences}
            onUpdateAttentionPreferences={updateAttentionPreferences}
            getSelectedDateForBudget={getSelectedDateForBudget}

            // Tasks
            unscheduledTasks={unscheduledTasks}
            tasksLoading={tasksLoading}
            onRefetchTasks={refetchTasks}
            onAddTaskClick={() => modals.open(TIMELINE_MODALS.ADD_TASK)}

            // Loading states
            populatingRoutines={populatingRoutines}
            parkedItems={parkedItems}
          />

          {/* Logjam alert - preserved from original */}
          {logjamCount > 0 && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold">
                    You have {logjamCount} overdue item{logjamCount > 1 ? 's' : ''}.
                  </p>
                  <p className="text-sm mt-1">
                    Scroll back in time to find them, or check Parked Items if they're 8+ hours overdue (auto-parked).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => modals.open(TIMELINE_MODALS.PARKED_ITEMS)}
                >
                  View Parked Items
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Workload Indicator */}
          <WorkloadIndicator
            items={items}
            targetDate={getSelectedDateForBudget()}
            showAttentionMetrics={true}
          />

          {/* Main timeline content - preserved */}
          {viewType === 'timeline' ? (
            <TimelineCanvas
              items={items}
              layers={layers}
              nowTime={new Date()}
              scrollOffset={scrollOffset}
              pixelsPerHour={pixelsPerHour}
              layerHeight={layerHeight}
              isLocked={settings?.is_locked ?? false}
              showCompleted={false}
              pastHours={viewModeConfig.pastHours}
              futureHours={viewModeConfig.futureHours}
              subdivisionMinutes={viewModeConfig.subdivisionMinutes}
              onItemClick={(item) => {
                setSelectedItem(item);
                modals.open('itemAction');
              }}
              onDrag={(deltaX) => setScrollOffset(prev => prev + deltaX)}
              onDoubleClick={(startTime, layerId) => {
                setInitialFormValues({ startTime, layerId });
                modals.open(TIMELINE_MODALS.ADD_ITEM);
              }}
              onCanvasReady={onCanvasReady}
            />
          ) : (
            <CalendarGrid
              items={items}
              viewMode={viewMode}
              nowTime={new Date()}
              viewDate={calendarViewDate}
              onItemClick={(item) => {
                setSelectedItem(item);
                modals.open('itemAction');
              }}
              onDoubleClick={(startTime, layerId) => {
                setInitialFormValues({ startTime, layerId });
                modals.open(TIMELINE_MODALS.ADD_ITEM);
              }}
              defaultLayerId={layers.find(l => l.is_visible)?.id}
            />
          )}

          {/* Attention visualization overlays - simplified for now */}
          {/* TODO: Add back AttentionVisualization and EnhancedTimelineVisualization with proper props */}

          {/* Role-specific components - preserved with conditional rendering */}
          {attentionPreferences?.current_role === 'marker' && (
            <DecisionBatchIndicator
              items={items}
              currentDate={getSelectedDateForBudget()}
              onSuggestBatching={(batchItems) => {
                console.log('Suggest batching for:', batchItems);
              }}
            />
          )}

          {attentionPreferences?.current_role === 'multiplier' && (
            <MultiplierDashboard
              items={items}
              currentDate={getSelectedDateForBudget()}
              currentRole={attentionPreferences.current_role}
              compact={isCompactMode}
            />
          )}

          {/* All modal dialogs - using consolidated modal state */}
          <AddTaskOverlay
            isOpen={modals.isOpen(TIMELINE_MODALS.ADD_TASK)}
            onClose={() => modals.close(TIMELINE_MODALS.ADD_TASK)}
            onTaskCreated={refetchTasks}
          />

          {modals.isOpen(TIMELINE_MODALS.ADD_ITEM) && (
            <AddItemForm
              open={modals.isOpen(TIMELINE_MODALS.ADD_ITEM)}
              onClose={() => {
                modals.close(TIMELINE_MODALS.ADD_ITEM);
                setInitialFormValues(null);
                setSelectedItem(null);
              }}
              layers={layers}
              onAddItem={async (layerId, title, startTime, duration, color, options) => {
                await addItem(layerId, title, startTime, duration, color, options);
              }}
              onAddLayer={addLayer}
              initialStartTime={initialFormValues?.startTime}
              initialLayerId={initialFormValues?.layerId}
              editingItem={selectedItem}
            />
          )}

          {modals.isOpen('itemAction') && selectedItem && (
            <ItemActionMenu
              item={selectedItem}
              open={modals.isOpen('itemAction')}
              onClose={() => {
                modals.close('itemAction');
                setSelectedItem(null);
              }}
              onComplete={async (id) => { await completeItem(id); }}
              onDelete={async (id) => { await deleteItem(id); }}
              onEdit={(id) => {
                modals.close('itemAction');
                modals.open(TIMELINE_MODALS.ADD_ITEM);
              }}
              onReschedule={async (id, newTime) => {
                // Reschedule not fully implemented yet
                console.log('Reschedule:', id, newTime);
              }}
              onPark={async (id) => {
                // Park not fully implemented yet
                console.log('Park:', id);
              }}
            />
          )}

          {modals.isOpen(TIMELINE_MODALS.PARKED_ITEMS) && (
            <ParkedItemsPanel
              open={modals.isOpen(TIMELINE_MODALS.PARKED_ITEMS)}
              onClose={() => modals.close(TIMELINE_MODALS.PARKED_ITEMS)}
              parkedItems={parkedItems || []}
              layers={layers}
              onRestoreItem={async (parkedItemId, layerId, startTime) => {
                // Restore functionality
                console.log('Restore:', parkedItemId, layerId, startTime);
                await refetchItems();
              }}
            />
          )}

          <Dialog open={modals.isOpen(TIMELINE_MODALS.TEMPLATES)} onOpenChange={(open) => open ? modals.open(TIMELINE_MODALS.TEMPLATES) : modals.close(TIMELINE_MODALS.TEMPLATES)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <TemplateLibrary
                onCreateCustom={() => {
                  modals.close(TIMELINE_MODALS.TEMPLATES);
                  modals.open(TIMELINE_MODALS.TEMPLATE_BUILDER);
                }}
                onTemplateApplied={() => {
                  modals.close(TIMELINE_MODALS.TEMPLATES);
                  refetchItems();
                }}
              />
            </DialogContent>
          </Dialog>

          <TemplateBuilder
            open={modals.isOpen(TIMELINE_MODALS.TEMPLATE_BUILDER)}
            onClose={() => modals.close(TIMELINE_MODALS.TEMPLATE_BUILDER)}
            onSaved={() => {
              modals.close(TIMELINE_MODALS.TEMPLATE_BUILDER);
            }}
          />

          <AIDailyPlanningModal
            open={modals.isOpen(TIMELINE_MODALS.AI_PLANNING)}
            onClose={() => modals.close(TIMELINE_MODALS.AI_PLANNING)}
            onPlanApplied={() => {
              refetchItems();
              modals.close(TIMELINE_MODALS.AI_PLANNING);
            }}
          />

          <Dialog open={modals.isOpen(TIMELINE_MODALS.ROUTINES)} onOpenChange={(open) => open ? modals.open(TIMELINE_MODALS.ROUTINES) : modals.close(TIMELINE_MODALS.ROUTINES)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <RoutineManager onClose={() => modals.close(TIMELINE_MODALS.ROUTINES)} />
            </DialogContent>
          </Dialog>

          <Dialog open={modals.isOpen(TIMELINE_MODALS.AI_INSIGHTS)} onOpenChange={(open) => open ? modals.open(TIMELINE_MODALS.AI_INSIGHTS) : modals.close(TIMELINE_MODALS.AI_INSIGHTS)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <AITimeInsights />
            </DialogContent>
          </Dialog>

          <DailyPlanningFlow
            open={modals.isOpen(TIMELINE_MODALS.DAILY_PLANNING)}
            onClose={() => {
              modals.close(TIMELINE_MODALS.DAILY_PLANNING);
              refetchItems();
            }}
            isQuickMode={false}
          />

          <EndOfDayShutdown
            open={modals.isOpen(TIMELINE_MODALS.END_OF_DAY)}
            onClose={() => {
              modals.close(TIMELINE_MODALS.END_OF_DAY);
              refetchItems();
            }}
          />

          <WeeklyCalibrationWizard
            isOpen={modals.isOpen(TIMELINE_MODALS.WEEKLY_CALIBRATION)}
            onClose={() => {
              modals.close(TIMELINE_MODALS.WEEKLY_CALIBRATION);
              refetchItems();
            }}
          />

          <Dialog open={modals.isOpen(TIMELINE_MODALS.ROLE_TEMPLATES)} onOpenChange={(open) => open ? modals.open(TIMELINE_MODALS.ROLE_TEMPLATES) : modals.close(TIMELINE_MODALS.ROLE_TEMPLATES)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <RoleBasedEventTemplates
                preferences={attentionPreferences}
                onCreateEvent={async (template, startTime) => {
                  const defaultLayer = layers.find(l => l.is_visible);
                  if (defaultLayer) {
                    try {
                      await addItem(
                        defaultLayer.id,
                        template.title,
                        startTime || new Date().toISOString(),
                        template.duration,
                        resolveLayerColor(defaultLayer.color),
                        {
                          attention_type: template.attentionType,
                          priority: template.priority,
                          notes: template.notes,
                          tags: template.tags
                        }
                      );
                      modals.close(TIMELINE_MODALS.ROLE_TEMPLATES);
                      refetchItems();
                    } catch (error) {
                      console.error('Error creating event from template:', error);
                    }
                  }
                }}
                onOpenFullForm={() => {
                  modals.close(TIMELINE_MODALS.ROLE_TEMPLATES);
                  modals.open(TIMELINE_MODALS.ADD_ITEM);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </InterfaceModeProvider>
  );
};