// Main Timeline Manager Component

import React, { useState, useEffect, useRef } from 'react';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineControls } from './TimelineControls';
import { TimelineLayerManager } from './TimelineLayerManager';
import { AddItemForm } from './AddItemForm';
import { ItemActionMenu } from './ItemActionMenu';
import { ParkedItemsPanel } from './ParkedItemsPanel';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { CalendarSyncButton } from './CalendarSyncButton';
import { WorkloadIndicator } from './WorkloadIndicator';
import { TemplateLibrary } from '@/components/templates/TemplateLibrary';
import { TemplateBuilder } from '@/components/templates/TemplateBuilder';
import { AIDailyPlanningModal } from '@/components/ai/AIDailyPlanningModal';
import { AITimeInsights } from '@/components/ai/AITimeInsights';
import { RoutineManager } from '@/components/routines/RoutineManager';
import { DailyPlanningFlow } from '@/components/planning/DailyPlanningFlow';
import { EndOfDayShutdown } from '@/components/planning/EndOfDayShutdown';
import { useTimeline } from '@/hooks/useTimeline';
import { useLayers } from '@/hooks/useLayers';
import { useRoutines } from '@/hooks/useRoutines';
import { useTimelineSync } from '@/hooks/useTimelineSync';
import { TimelineItem, clamp } from '@/lib/timelineUtils';
import {
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_LAYER_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  TimelineViewMode,
  VIEW_MODE_CONFIG,
} from '@/lib/timelineConstants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Settings, Layers, Lock, Unlock, Archive, LayoutTemplate, Sparkles, RefreshCw, Calendar as CalIcon, Brain, Sunrise, Moon, Link as LinkIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PageHelp } from '@/components/PageHelp';

export function TimelineManager() {
  const {
    items,
    settings,
    parkedItems,
    loading: timelineLoading,
    nowTime,
    scrollOffset,
    setScrollOffset,
    addItem,
    updateItem,
    completeItem,
    rescheduleItem,
    parkItem,
    restoreParkedItem,
    deleteItem,
    deleteParkedItem,
    updateSettings,
    refetchItems,
  } = useTimeline();

  const {
    layers,
    loading: layersLoading,
    addLayer,
    updateLayer,
    deleteLayer,
    toggleLayerVisibility,
    refetch: refetchLayers,
  } = useLayers();

  // Real-time sync
  useTimelineSync({
    onItemsChange: refetchItems,
    onLayersChange: refetchLayers,
    onSettingsChange: () => {}, // Settings are managed by useTimeline
  });

  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showParkedItems, setShowParkedItems] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showAIPlanning, setShowAIPlanning] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [populatingRoutines, setPopulatingRoutines] = useState(false);
  const [showDailyPlanning, setShowDailyPlanning] = useState(false);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [viewMode, setViewMode] = useState<TimelineViewMode>('week');
  const [initialFormValues, setInitialFormValues] = useState<{ startTime?: string; layerId?: string } | null>(null);

  const { populateRoutinesForDay } = useRoutines();

  const animationFrameRef = useRef<number>();
  const lastTickRef = useRef<number>(Date.now());

  // Calculate zoom-adjusted values based on view mode
  const viewModeConfig = VIEW_MODE_CONFIG[viewMode];
  const basePixelsPerHour = viewModeConfig.pixelsPerHour;
  const pixelsPerHour = (settings?.zoom_horizontal || 100) / 100 * basePixelsPerHour;
  const layerHeight = (settings?.zoom_vertical || 80) / 100 * DEFAULT_LAYER_HEIGHT;

  // Real-time auto-scroll effect (only in locked mode)
  useEffect(() => {
    const tick = () => {
      if (!settings?.is_locked) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const deltaTime = (now - lastTickRef.current) / 1000; // seconds
      lastTickRef.current = now;

      // Calculate real-time scroll speed based on current zoom
      // For real-time: 1 hour in real life = pixelsPerHour pixels scrolled
      // Therefore: pixelsPerHour pixels per 3600 seconds
      const autoScrollSpeed = pixelsPerHour / 3600; // pixels per second

      // Auto-scroll left (simulating time passing)
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

  // Handle item click
  const handleItemClick = (item: TimelineItem) => {
    setSelectedItem(item);
  };

  // Handle edit item
  const handleEditItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setEditingItem(item);
      setShowAddItemForm(true);
    }
  };

  // Handle lock toggle
  const handleToggleLock = async () => {
    if (!settings) return;

    const newLockedState = !settings.is_locked;

    // When switching from unlocked to locked:
    // Adjust scroll offset so timeline stays in sync with NOW line position
    if (newLockedState) {
      // In unlocked mode, NOW line was at (30% + scrollOffset)
      // In locked mode, NOW line will be at 30%
      // So we need to reset scrollOffset to 0 to keep timeline aligned
      setScrollOffset(0);
    }

    await updateSettings({ is_locked: newLockedState });
  };

  // Handle zoom changes
  const handleZoomHorizontalChange = async (value: number) => {
    const clamped = clamp(value, MIN_ZOOM, MAX_ZOOM);
    await updateSettings({ zoom_horizontal: clamped });
  };

  const handleZoomVerticalChange = async (value: number) => {
    const clamped = clamp(value, MIN_ZOOM, MAX_ZOOM);
    await updateSettings({ zoom_vertical: clamped });
  };


  // Handle fit all layers
  const handleFitAllLayers = async () => {
    // Calculate optimal vertical zoom to fit all layers
    const visibleLayers = layers.filter(l => l.is_visible);
    if (visibleLayers.length === 0) return;

    // Assuming viewport height of ~600px for timeline
    const targetHeight = 600;
    const optimalZoom = Math.floor((targetHeight / (visibleLayers.length * DEFAULT_LAYER_HEIGHT)) * 100);
    const clampedZoom = clamp(optimalZoom, MIN_ZOOM, MAX_ZOOM);

    await updateSettings({ zoom_vertical: clampedZoom });
  };

  // Handle drag
  const handleDrag = (deltaX: number) => {
    setScrollOffset(prev => prev + deltaX);
  };

  // Handle item drop (after drag)
  const handleItemDrop = async (item: TimelineItem, newStartTime: string, newLayerId: string) => {
    await rescheduleItem(item.id, newStartTime, newLayerId);
  };

  // Handle item resize
  const handleItemResize = async (item: TimelineItem, newDurationMinutes: number) => {
    await updateItem(item.id, { duration_minutes: newDurationMinutes });
  };

  // Handle double-click on timeline - open form with pre-filled values
  const handleTimelineDoubleClick = (startTime: string, layerId: string) => {
    setInitialFormValues({ startTime, layerId });
    setShowAddItemForm(true);
  };

  // Handle populate today's routines
  const handlePopulateRoutines = async () => {
    if (layers.length === 0) return;

    setPopulatingRoutines(true);
    const defaultLayer = layers.find(l => l.is_visible);
    if (defaultLayer) {
      await populateRoutinesForDay(new Date(), defaultLayer.id);
      await refetchItems();
    }
    setPopulatingRoutines(false);
  };

  if (timelineLoading || layersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const logjamCount = items.filter(i => i.status === 'logjam').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Timeline Manager
            <PageHelp
              title="Timeline Manager Help"
              description="The Timeline Manager helps you visualize and manage your tasks on a flowing timeline. Items move towards the NOW line, and become 'logjammed' (red pulsing) when overdue. You can drag items to reschedule, resize them to adjust duration, or park them for later."
              tips={[
                "Drag items horizontally to reschedule them",
                "Drag the right edge to resize duration (like Google Calendar)",
                "Click items to mark done, reschedule, park, or delete",
                "Double-click empty space to create a new item at that time",
                "Use layers to organize different types of tasks",
                "Lock/unlock to enable auto-scrolling with real time"
              ]}
            />
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your time with a flowing timeline. Items move toward NOW and logjam when overdue.
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Primary Add Item Button */}
          <button
            onClick={() => setShowAddItemForm(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            disabled={layers.length === 0}
          >
            {layers.length === 0 ? 'Create a Layer First' : '+ Add Timeline Item'}
          </button>

          {/* Daily Planning Ritual Button */}
          <Button
            onClick={() => setShowDailyPlanning(true)}
            variant="default"
            className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
          >
            <Sunrise className="h-4 w-4" />
            Daily Planning
          </Button>

          {/* AI Planning Button */}
          <Button
            onClick={() => setShowAIPlanning(true)}
            variant="default"
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            disabled={layers.length === 0}
          >
            <Sparkles className="h-4 w-4" />
            AI Plan My Day
          </Button>

          {/* End of Day Button */}
          <Button
            onClick={() => setShowEndOfDay(true)}
            variant="outline"
            className="gap-2"
          >
            <Moon className="h-4 w-4" />
            End of Day
          </Button>

          {/* Lock/Unlock Toggle Button */}
          <Button
            onClick={handleToggleLock}
            variant={settings?.is_locked ? 'default' : 'outline'}
            className="gap-2 w-32"
          >
            {settings?.is_locked ? (
              <>
                <Lock className="h-4 w-4" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Unlocked
              </>
            )}
          </Button>

          {/* Timeline Controls Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Controls
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-[80vh] overflow-y-auto" align="start">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Timeline Controls</h3>
                <p className="text-xs text-muted-foreground">Manage your timeline view</p>
              </div>
              <TimelineControls
                zoomHorizontal={settings?.zoom_horizontal ?? 100}
                zoomVertical={settings?.zoom_vertical ?? 80}
                onZoomHorizontalChange={handleZoomHorizontalChange}
                onZoomVerticalChange={handleZoomVerticalChange}
                onFitAllLayers={handleFitAllLayers}
              />
            </PopoverContent>
          </Popover>

          {/* Timeline Layers Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4" />
                Layers ({layers.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-[80vh] overflow-y-auto" align="start">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Timeline Layers</h3>
                <p className="text-xs text-muted-foreground">Organize your items into layers</p>
              </div>
              <TimelineLayerManager
                layers={layers}
                onAddLayer={addLayer}
                onUpdateLayer={updateLayer}
                onDeleteLayer={deleteLayer}
                onToggleVisibility={toggleLayerVisibility}
              />
            </PopoverContent>
          </Popover>

          {/* Parked Items Button */}
          <Button
            onClick={() => setShowParkedItems(true)}
            variant="outline"
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            Parked ({parkedItems?.length || 0})
          </Button>

          {/* Day Templates Button */}
          <Button
            onClick={() => setShowTemplates(true)}
            variant="outline"
            className="gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>

          {/* Routines Button */}
          <Button
            onClick={() => setShowRoutines(true)}
            variant="outline"
            className="gap-2"
          >
            <CalIcon className="h-4 w-4" />
            Routines
          </Button>

          {/* Populate Today's Routines Button */}
          <Button
            onClick={handlePopulateRoutines}
            variant="outline"
            className="gap-2"
            disabled={populatingRoutines || layers.length === 0}
          >
            {populatingRoutines ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Add Today's Routines
              </>
            )}
          </Button>

          {/* AI Time Insights Button */}
          <Button
            onClick={() => setShowAIInsights(true)}
            variant="outline"
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            AI Insights
          </Button>

          {/* Booking Links Button */}
          <Button
            onClick={() => window.location.href = '/booking-links'}
            variant="outline"
            className="gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            Booking Links
          </Button>

          {/* Google Calendar Sync Button */}
          <CalendarSyncButton />

          {/* View Mode Switcher */}
          <div className="ml-auto">
            <ViewModeSwitcher
              currentMode={viewMode}
              onModeChange={setViewMode}
            />
          </div>
        </div>
      </div>

      {/* Logjam alert */}
      {logjamCount > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            You have {logjamCount} overdue item{logjamCount > 1 ? 's' : ''}.
            Click on them to reschedule, complete, or park.
          </AlertDescription>
        </Alert>
      )}

      {/* Workload Indicator */}
      <WorkloadIndicator items={items} />

      {/* Main timeline area */}
      <div className="space-y-4">
        {/* Main timeline */}
        {layers.length === 0 ? (
          <Alert>
            <AlertDescription>
              Create a layer first to start adding items to your timeline.
            </AlertDescription>
          </Alert>
        ) : (
          <TimelineCanvas
            items={items}
            layers={layers}
            nowTime={nowTime}
            scrollOffset={scrollOffset}
            pixelsPerHour={pixelsPerHour}
            layerHeight={layerHeight}
            isLocked={settings?.is_locked ?? true}
            showCompleted={true}
            pastHours={viewModeConfig.pastHours}
            futureHours={viewModeConfig.futureHours}
            subdivisionMinutes={viewModeConfig.subdivisionMinutes}
            onItemClick={handleItemClick}
            onDrag={handleDrag}
            onItemDrop={handleItemDrop}
            onItemResize={handleItemResize}
            onDoubleClick={handleTimelineDoubleClick}
          />
        )}
      </div>

      {/* Modals */}
      <AddItemForm
        open={showAddItemForm}
        onClose={() => {
          setShowAddItemForm(false);
          setInitialFormValues(null);
          setEditingItem(null);
        }}
        layers={layers}
        onAddItem={addItem}
        onUpdateItem={updateItem}
        onAddLayer={addLayer}
        initialStartTime={initialFormValues?.startTime}
        initialLayerId={initialFormValues?.layerId}
        editingItem={editingItem}
      />

      <ItemActionMenu
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        onEdit={handleEditItem}
        onComplete={completeItem}
        onReschedule={rescheduleItem}
        onPark={parkItem}
        onDelete={deleteItem}
      />

      <ParkedItemsPanel
        open={showParkedItems}
        onClose={() => setShowParkedItems(false)}
        parkedItems={parkedItems || []}
        layers={layers}
        onRestoreItem={restoreParkedItem}
        onDeleteParkedItem={deleteParkedItem}
      />

      {/* Template Library Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <TemplateLibrary
            onCreateCustom={() => {
              setShowTemplates(false);
              setShowTemplateBuilder(true);
            }}
            onTemplateApplied={() => {
              refetchItems();
              setShowTemplates(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Template Builder */}
      <TemplateBuilder
        open={showTemplateBuilder}
        onClose={() => setShowTemplateBuilder(false)}
        onSaved={() => {
          setShowTemplateBuilder(false);
          setShowTemplates(true);
        }}
      />

      {/* AI Daily Planning Modal */}
      <AIDailyPlanningModal
        open={showAIPlanning}
        onClose={() => setShowAIPlanning(false)}
        onPlanApplied={() => {
          refetchItems();
          setShowAIPlanning(false);
        }}
      />

      {/* Routine Manager Dialog */}
      <Dialog open={showRoutines} onOpenChange={setShowRoutines}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <RoutineManager onClose={() => setShowRoutines(false)} />
        </DialogContent>
      </Dialog>

      {/* AI Time Insights Dialog */}
      <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <AITimeInsights />
        </DialogContent>
      </Dialog>

      {/* Daily Planning Flow */}
      <DailyPlanningFlow
        open={showDailyPlanning}
        onClose={() => {
          setShowDailyPlanning(false);
          refetchItems();
        }}
        isQuickMode={false}
      />

      {/* End of Day Shutdown */}
      <EndOfDayShutdown
        open={showEndOfDay}
        onClose={() => {
          setShowEndOfDay(false);
          refetchItems();
        }}
      />
    </div>
  );
}
