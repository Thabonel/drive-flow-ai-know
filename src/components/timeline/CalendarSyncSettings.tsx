import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useLayers } from '@/hooks/useLayers';
import { Loader2 } from 'lucide-react';

interface CalendarSyncSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSyncSettings({ open, onOpenChange }: CalendarSyncSettingsProps) {
  const {
    calendars,
    syncSettings,
    isLoading: isLoadingCalendar,
    loadCalendars,
    updateSyncSettings,
  } = useGoogleCalendar();

  const { layers, loading: layersLoading } = useLayers();

  // Local state for form
  const [enabled, setEnabled] = useState(syncSettings?.enabled ?? false);
  const [selectedCalendarId, setSelectedCalendarId] = useState(syncSettings?.selected_calendar_id ?? '');
  const [syncDirection, setSyncDirection] = useState(syncSettings?.sync_direction ?? 'both');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(syncSettings?.auto_sync_enabled ?? true);
  const [syncInterval, setSyncInterval] = useState(String(syncSettings?.sync_interval_minutes ?? 15));
  const [targetLayerId, setTargetLayerId] = useState(syncSettings?.target_layer_id ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Load calendars when modal opens
  useEffect(() => {
    if (open && calendars.length === 0) {
      loadCalendars();
    }
  }, [open, calendars.length, loadCalendars]);

  // Update local state when sync settings change
  useEffect(() => {
    if (syncSettings) {
      setEnabled(syncSettings.enabled);
      setSelectedCalendarId(syncSettings.selected_calendar_id ?? '');
      setSyncDirection(syncSettings.sync_direction);
      setAutoSyncEnabled(syncSettings.auto_sync_enabled);
      setSyncInterval(String(syncSettings.sync_interval_minutes));
      setTargetLayerId(syncSettings.target_layer_id ?? '');
    }
  }, [syncSettings]);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSyncSettings({
        enabled,
        selected_calendar_id: selectedCalendarId || null,
        sync_direction: syncDirection as 'to_calendar' | 'from_calendar' | 'both',
        auto_sync_enabled: autoSyncEnabled,
        sync_interval_minutes: parseInt(syncInterval),
        target_layer_id: targetLayerId || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get standard (non-primary) layers
  const standardLayers = layers.filter(l => !l.is_primary_timeline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Calendar Sync Settings</DialogTitle>
          <DialogDescription>
            Configure how your Timeline syncs with Google Calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sync-enabled">Enable Calendar Sync</Label>
              <p className="text-sm text-muted-foreground">
                Sync timeline items with Google Calendar
              </p>
            </div>
            <Switch
              id="sync-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              {/* Select Calendar */}
              <div className="space-y-2">
                <Label htmlFor="calendar-select">Google Calendar</Label>
                {isLoadingCalendar ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading calendars...
                  </div>
                ) : (
                  <Select
                    value={selectedCalendarId}
                    onValueChange={setSelectedCalendarId}
                  >
                    <SelectTrigger id="calendar-select">
                      <SelectValue placeholder="Select a calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.summary}
                          {calendar.primary && ' (Primary)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose which calendar to sync with your timeline
                </p>
              </div>

              {/* Sync Direction */}
              <div className="space-y-2">
                <Label htmlFor="sync-direction">Sync Direction</Label>
                <Select
                  value={syncDirection}
                  onValueChange={setSyncDirection}
                >
                  <SelectTrigger id="sync-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Two-way (Recommended)</SelectItem>
                    <SelectItem value="to_calendar">Timeline → Calendar only</SelectItem>
                    <SelectItem value="from_calendar">Calendar → Timeline only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {syncDirection === 'both' && 'Changes sync in both directions'}
                  {syncDirection === 'to_calendar' && 'Only push timeline items to Google Calendar'}
                  {syncDirection === 'from_calendar' && 'Only import events from Google Calendar'}
                </p>
              </div>

              {/* Target Layer */}
              <div className="space-y-2">
                <Label htmlFor="target-layer">Target Timeline Layer</Label>
                {layersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading layers...
                  </div>
                ) : (
                  <Select
                    value={targetLayerId}
                    onValueChange={setTargetLayerId}
                  >
                    <SelectTrigger id="target-layer">
                      <SelectValue placeholder="Use first layer (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Use first layer (default)</SelectItem>
                      {standardLayers.map((layer) => (
                        <SelectItem key={layer.id} value={layer.id}>
                          {layer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Google Calendar events will be added to this layer
                </p>
              </div>

              {/* Auto-Sync */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync">Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Sync automatically in the background
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSyncEnabled}
                  onCheckedChange={setAutoSyncEnabled}
                />
              </div>

              {/* Sync Interval */}
              {autoSyncEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="sync-interval">Sync Interval</Label>
                  <Select
                    value={syncInterval}
                    onValueChange={setSyncInterval}
                  >
                    <SelectTrigger id="sync-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to automatically sync in the background
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || (enabled && !selectedCalendarId)}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
