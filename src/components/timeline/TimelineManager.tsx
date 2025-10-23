// Main Timeline Manager Component

import React, { useState } from 'react';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineControls } from './TimelineControls';
import { TimelineLayerManager } from './TimelineLayerManager';
import { AddItemForm } from './AddItemForm';
import { ItemActionMenu } from './ItemActionMenu';
import { CompletedItemsToggle } from './CompletedItemsToggle';
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
import { Loader2, Clock } from 'lucide-react';

export function TimelineManager() {
  const {
    items,
    settings,
    loading: timelineLoading,
    nowTime,
    scrollOffset,
    setScrollOffset,
    addItem,
    completeItem,
    rescheduleItem,
    parkItem,
    deleteItem,
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

  // Calculate zoom-adjusted values
  const pixelsPerHour = (settings?.zoom_horizontal || 100) / 100 * DEFAULT_PIXELS_PER_HOUR;
  const layerHeight = (settings?.zoom_vertical || 80) / 100 * DEFAULT_LAYER_HEIGHT;

  // Handle item click
  const handleItemClick = (item: TimelineItem) => {
    setSelectedItem(item);
  };

  // Handle lock toggle
  const handleToggleLock = async () => {
    if (!settings) return;
    await updateSettings({ is_locked: !settings.is_locked });
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

  // Handle completed toggle
  const handleToggleCompleted = async () => {
    if (!settings) return;
    await updateSettings({ show_completed: !settings.show_completed });
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

  if (timelineLoading || layersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedCount = items.filter(i => i.status === 'completed').length;
  const logjamCount = items.filter(i => i.status === 'logjam').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8" />
          Timeline Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your time with a flowing timeline. Items move toward NOW and logjam when overdue.
        </p>
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

      {/* Main layout: Timeline + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Timeline Canvas (takes 3 columns) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Completed toggle */}
          <CompletedItemsToggle
            showCompleted={settings?.show_completed ?? true}
            onToggle={handleToggleCompleted}
            completedCount={completedCount}
          />

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
              showCompleted={settings?.show_completed ?? true}
              onItemClick={handleItemClick}
              onDrag={handleDrag}
            />
          )}
        </div>

        {/* Sidebar (takes 1 column) */}
        <div className="space-y-4">
          {/* Controls */}
          <TimelineControls
            isLocked={settings?.is_locked ?? true}
            onToggleLock={handleToggleLock}
            zoomHorizontal={settings?.zoom_horizontal ?? 100}
            zoomVertical={settings?.zoom_vertical ?? 80}
            onZoomHorizontalChange={handleZoomHorizontalChange}
            onZoomVerticalChange={handleZoomVerticalChange}
            onAddItem={() => setShowAddItemForm(true)}
            onFitAllLayers={handleFitAllLayers}
          />

          {/* Layer Manager */}
          <TimelineLayerManager
            layers={layers}
            onAddLayer={addLayer}
            onUpdateLayer={updateLayer}
            onDeleteLayer={deleteLayer}
            onToggleVisibility={toggleLayerVisibility}
          />
        </div>
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
    </div>
  );
}
