// Main Timeline Manager Component

import React, { useState, useEffect, useRef } from 'react';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineControls } from './TimelineControls';
import { TimelineLayerManager } from './TimelineLayerManager';
import { AddItemForm } from './AddItemForm';
import { ItemActionMenu } from './ItemActionMenu';
import { ParkedItemsPanel } from './ParkedItemsPanel';
import { useTimeline } from '@/hooks/useTimeline';
import { useLayers } from '@/hooks/useLayers';
import { useTimelineSync } from '@/hooks/useTimelineSync';
import { TimelineItem, clamp } from '@/lib/timelineUtils';
import {
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_LAYER_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
} from '@/lib/timelineConstants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Settings, Layers, Lock, Unlock, Archive } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showParkedItems, setShowParkedItems] = useState(false);

  const animationFrameRef = useRef<number>();
  const lastTickRef = useRef<number>(Date.now());

  // Calculate zoom-adjusted values
  const pixelsPerHour = (settings?.zoom_horizontal || 100) / 100 * DEFAULT_PIXELS_PER_HOUR;
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

          {/* Lock/Unlock Toggle Button */}
          <Button
            onClick={handleToggleLock}
            variant={settings?.is_locked ? 'default' : 'outline'}
            className="gap-2"
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
            onItemClick={handleItemClick}
            onDrag={handleDrag}
            onItemDrop={handleItemDrop}
          />
        )}
      </div>

      {/* Modals */}
      <AddItemForm
        open={showAddItemForm}
        onClose={() => setShowAddItemForm(false)}
        layers={layers}
        onAddItem={addItem}
        onAddLayer={addLayer}
      />

      <ItemActionMenu
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
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
    </div>
  );
}
