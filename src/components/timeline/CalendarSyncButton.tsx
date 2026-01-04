import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, Settings, Check, AlertCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { CalendarSyncSettings } from './CalendarSyncSettings';
import { formatDistanceToNow } from 'date-fns';

export function CalendarSyncButton() {
  const {
    isAuthenticated,
    syncSettings,
    isConnecting,
    isSyncing,
    connectCalendar,
    disconnectCalendar,
    syncNow,
  } = useGoogleCalendar();

  const [showSettings, setShowSettings] = useState(false);

  // Determine sync status
  const getSyncStatus = () => {
    if (isSyncing) return 'syncing';
    if (!isAuthenticated || !syncSettings?.enabled) return 'disconnected';
    if (syncSettings.last_sync_status === 'error') return 'error';
    if (syncSettings.last_sync_at) return 'synced';
    return 'pending';
  };

  const syncStatus = getSyncStatus();

  // Get status display text
  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (!isAuthenticated) return 'Not connected';
    if (!syncSettings?.enabled) return 'Sync disabled';
    if (syncSettings.last_sync_status === 'error') {
      return `Error: ${syncSettings.last_sync_error?.substring(0, 30)}...`;
    }
    if (syncSettings.last_sync_at) {
      return `Synced ${formatDistanceToNow(new Date(syncSettings.last_sync_at), { addSuffix: true })}`;
    }
    return 'Ready to sync';
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'synced':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Handle connect/disconnect
  const handleToggleConnection = async () => {
    if (isAuthenticated) {
      await disconnectCalendar();
    } else {
      await connectCalendar();
    }
  };

  // Handle manual sync
  const handleSync = async () => {
    if (!isAuthenticated || !syncSettings?.enabled) return;
    await syncNow();
  };

  return (
    <TooltipProvider delayDuration={300}>
    <>
      <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 min-w-[140px]"
                disabled={isConnecting}
              >
                {getStatusIcon()}
                <span className="hidden sm:inline">Connect Google</span>
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>
            {getStatusText()}
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Google Calendar Sync</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      disabled={!isAuthenticated}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Sync settings
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                {getStatusText()}
              </p>
            </div>

            {/* Connection status */}
            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your Google Calendar to sync events with your timeline.
                </p>
                <Button
                  onClick={handleToggleConnection}
                  disabled={isConnecting}
                  className="w-full gap-2"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Connect Google Calendar
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Sync info */}
                {syncSettings?.selected_calendar_id && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Syncing with:</p>
                    <p className="font-medium truncate">
                      {syncSettings.selected_calendar_id === 'primary'
                        ? 'Primary Calendar'
                        : syncSettings.selected_calendar_id}
                    </p>
                  </div>
                )}

                {/* Sync direction */}
                {syncSettings?.sync_direction && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Sync direction:</p>
                    <p className="font-medium">
                      {syncSettings.sync_direction === 'both'
                        ? 'Two-way sync'
                        : syncSettings.sync_direction === 'to_calendar'
                        ? 'Timeline → Calendar'
                        : 'Calendar → Timeline'}
                    </p>
                  </div>
                )}

                {/* Error message */}
                {syncSettings?.last_sync_status === 'error' && (
                  <div className="p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-600 dark:text-red-400">
                    <p className="font-medium">Last sync failed</p>
                    <p className="text-xs mt-1">{syncSettings.last_sync_error}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing || !syncSettings?.enabled}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleToggleConnection}
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Settings Modal */}
      {showSettings && (
        <CalendarSyncSettings
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}
    </>
    </TooltipProvider>
  );
}
