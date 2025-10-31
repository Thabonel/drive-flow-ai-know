// Magnetic Timeline - Gap-free 24-hour continuous timeline

import { useState, useEffect, useCallback } from 'react';
import { useMagneticTimeline } from '@/hooks/useMagneticTimeline';
import { MagneticTimelineItem } from '@/lib/magneticTimelineUtils';
import { itemsToBlocks, findGaps, getMinutesFromMidnight } from '@/lib/magneticTimelineUtils';
import { AlertCircle, Lock, Unlock, Maximize2, Scissors } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { MagneticTimelineBar } from './MagneticTimelineBar';
import { ToolboxPanel } from './ToolboxPanel';

export function MagneticTimeline() {
  const {
    items,
    loading,
    hasFullCoverage,
    addItem,
    moveItemTo,
    resizeItemTo,
    splitItem,
    deleteItem,
    updateItem,
    manualReflow,
  } = useMagneticTimeline();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showToolbox, setShowToolbox] = useState(false);
  const [bladeMode, setBladeMode] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate current time as minutes from midnight
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Calculate gaps
  const blocks = itemsToBlocks(items);
  const gaps = findGaps(blocks);

  const selectedItem = items.find(item => item.id === selectedItemId);

  const handleItemClick = (item: MagneticTimelineItem) => {
    setSelectedItemId(item.id);
    setBladeMode(false);
  };

  const handleItemMove = async (itemId: string, newMinutes: number) => {
    await moveItemTo(itemId, newMinutes);
    setSelectedItemId(null);
  };

  const handleItemResize = async (itemId: string, newDuration: number) => {
    await resizeItemTo(itemId, newDuration);
  };

  const handleBladeClick = (minutes: number) => {
    if (!selectedItemId) return;

    splitItem(selectedItemId, minutes);
    setBladeMode(false);
    setSelectedItemId(null);
  };

  const handleToggleLocked = async () => {
    if (!selectedItem) return;
    await updateItem(selectedItem.id, {
      is_locked_time: !selectedItem.is_locked_time,
    });
  };

  const handleToggleFlexible = async () => {
    if (!selectedItem) return;
    await updateItem(selectedItem.id, {
      is_flexible: !selectedItem.is_flexible,
    });
  };

  // Memoize keyboard handler to prevent infinite loop
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Blade tool activation with 'B' key
    if (e.key === 'b' || e.key === 'B') {
      if (selectedItemId) {
        setBladeMode(prev => !prev);  // Use functional update to avoid stale closure
      }
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      setBladeMode(false);
      setSelectedItemId(null);
    }
  }, [selectedItemId]);  // Only depend on selectedItemId

  // Register keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);  // Depend on memoized function

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Day</h2>
          <p className="text-sm text-muted-foreground">
            Magnetic 24-hour timeline - gap-free, continuous coverage
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedItem && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleLocked}
                className="gap-2"
              >
                {selectedItem.is_locked_time ? (
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFlexible}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                {selectedItem.is_flexible ? 'Flexible' : 'Fixed'}
              </Button>

              <Button
                variant={bladeMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBladeMode(!bladeMode)}
                className="gap-2"
              >
                <Scissors className="h-4 w-4" />
                Split (B)
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowToolbox(!showToolbox)}
          >
            {showToolbox ? 'Hide' : 'Show'} Toolbox
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={manualReflow}
          >
            Auto-Reflow
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {!hasFullCoverage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Timeline does not cover full 24 hours. {gaps.length} gap(s) detected.
            Click "Auto-Reflow" to fix.
          </AlertDescription>
        </Alert>
      )}

      {bladeMode && (
        <Alert>
          <Scissors className="h-4 w-4" />
          <AlertDescription>
            Blade mode active: Click on the timeline to split "{selectedItem?.title}" at that position.
            Press ESC to cancel.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Timeline Bar */}
      <MagneticTimelineBar
        items={items}
        currentMinutes={currentMinutes}
        selectedItemId={selectedItemId}
        bladeMode={bladeMode}
        onItemClick={handleItemClick}
        onItemMove={handleItemMove}
        onItemResize={handleItemResize}
        onBladeClick={handleBladeClick}
      />

      {/* Toolbox Panel (conditional) */}
      {showToolbox && (
        <ToolboxPanel
          onClose={() => setShowToolbox(false)}
          onAddItem={async (template) => {
            // Add item at current time using template defaults
            await addItem(
              template.name,
              currentMinutes,
              template.duration,
              template.color,
              !!template.isLocked,
              template.isFlexible !== false
            );
            setShowToolbox(false);
          }}
        />
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div>Items: {items.length}</div>
        <div>Coverage: {hasFullCoverage ? '24 hours ✓' : `${gaps.length} gaps`}</div>
        {selectedItem && (
          <div>
            Selected: {selectedItem.title} ({selectedItem.duration_minutes}m)
          </div>
        )}
      </div>
    </div>
  );
}
