// Responsive Timeline Header - Replaces the complex header section in TimelineManager
// Uses InterfaceModeController for progressive disclosure

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Clock,
  Calendar as CalIcon,
  Plus,
  Sparkles,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Navigation,
  MoreHorizontal,
  Settings,
  Layers,
  Eye,
  EyeOff,
  Calendar,
  Sunrise,
  LayoutTemplate,
  RefreshCw,
  Moon,
  Brain,
  Archive,
  LinkIcon
} from 'lucide-react';
import { InterfaceModeController, useInterfaceMode, ConditionalFeature, BeginnerHints } from './InterfaceModeController';
import { ViewTypeSwitcher, ViewType } from '../ViewTypeSwitcher';
import { ViewModeSwitcher } from '../ViewModeSwitcher';
import { RoleZoneSelector } from '../RoleZoneSelector';
import { NonNegotiableTracker } from '../NonNegotiableTracker';
import { CalendarSyncButton } from '../CalendarSyncButton';
import { TimelineLayerManager } from '../TimelineLayerManager';
import { TimelineControls } from '../TimelineControls';
import { TaskHeaderPanel } from '../TaskHeaderPanel';
import { TimelinePhilosophy } from '../TimelinePhilosophy';
import { HelpButton } from '@/components/HelpButton';
// import { PageHelp } from '@/components/ui/page-help'; // TODO: Check if this component exists
import { PlanDropdown } from '@/components/plans/PlanDropdown';
import type { TimelineLayer, TimelineItem } from '@/lib/timelineUtils';
import type { UserAttentionPreferences } from '@/lib/attentionTypes';
import type { TimelineViewMode } from '@/lib/timelineConstants';
import type { Task } from '@/hooks/useTasks';

interface ResponsiveTimelineHeaderProps {
  // View state
  viewType: ViewType;
  viewMode: TimelineViewMode;
  isCompactMode: boolean;
  onCompactModeToggle: () => void;

  // Timeline actions
  onAddItem: () => void;
  onShowDailyPlanning: () => void;
  onShowWeeklyCalibration: () => void;
  onShowAIPlanning: () => void;
  onShowTemplates: () => void;
  onShowRoleTemplates: () => void;
  onShowRoutines: () => void;
  onShowEndOfDay: () => void;
  onShowAIInsights: () => void;
  onShowParkedItems: () => void;
  onPopulateRoutines: () => void;

  // Lock and navigation
  settings?: { is_locked?: boolean; zoom_horizontal?: number; zoom_vertical?: number };
  onToggleLock: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onJumpToDate: (date: string) => void;
  onJumpToToday: () => void;
  getJumpLabel: () => string;

  // Layer management
  layers: TimelineLayer[];
  onAddLayer: (name: string, color?: string) => Promise<void>;
  onUpdateLayer: (layerId: string, updates: Partial<TimelineLayer>) => Promise<void>;
  onDeleteLayer: (layerId: string) => Promise<void>;
  onToggleLayerVisibility: (layerId: string) => Promise<void>;
  onReorderLayers: (newOrder: TimelineLayer[]) => Promise<void>;

  // Zoom controls
  onZoomHorizontalChange: (value: number) => Promise<void>;
  onZoomVerticalChange: (value: number) => void;
  onFitAllLayers: () => void;

  // View switching
  onViewTypeChange: (type: ViewType) => void;
  onViewModeChange: (mode: TimelineViewMode) => void;
  onTimeWindowChange: (settings: { pastHours: number; futureHours: number; subdivisionMinutes: number }) => Promise<void>;

  // Attention system
  items: TimelineItem[];
  attentionPreferences?: UserAttentionPreferences;
  onUpdateAttentionPreferences: (prefs: UserAttentionPreferences) => void;
  getSelectedDateForBudget: () => Date;

  // Tasks
  unscheduledTasks: Task[];
  tasksLoading: boolean;
  onRefetchTasks: () => void;
  onAddTaskClick: () => void;

  // Loading states
  populatingRoutines: boolean;
  parkedItems?: TimelineItem[];
}

export const ResponsiveTimelineHeader: React.FC<ResponsiveTimelineHeaderProps> = (props) => {
  const { currentMode, config } = useInterfaceMode();
  const [jumpToDate, setJumpToDate] = useState<string>('');

  // Get zoom constraints
  const MIN_ZOOM = 10;
  const MAX_ZOOM = 500;

  const canZoomOut = (props.settings?.zoom_horizontal ?? 100) > MIN_ZOOM;
  const canZoomIn = (props.settings?.zoom_horizontal ?? 100) < MAX_ZOOM;

  return (
    <div className="space-y-4" data-component="responsive-header">
      {/* Beginner onboarding hints */}
      <BeginnerHints />

      {/* Main header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Title and branding */}
        <div className="flex items-center gap-3">
          {props.viewType === 'calendar' ? (
            <CalIcon className="h-7 w-7 text-primary" />
          ) : (
            <Clock className="h-7 w-7 text-primary" />
          )}

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {props.viewType === 'calendar' ? 'Calendar View' : 'Timeline Manager'}
            </h1>

            {/* Help and philosophy */}
            <div className="flex items-center gap-2">
              <TimelinePhilosophy mode="dialog" trigger="icon" />

{/* Enhanced help system with comprehensive explanations */}
              {props.viewType === 'calendar' ? (
                <HelpButton
                  title="Calendar View - Complete Guide"
                  description="AI Query Hub's Calendar View provides a familiar calendar interface enhanced with intelligent time management features. See your schedule by day, week, or month while monitoring your attention budget and productivity patterns."
                  tips={[
                    "✨ Click any time slot to create an event instantly",
                    "🎯 Use 'Plan Day' to let AI organize your tasks optimally",
                    "📊 Watch your attention budget in real-time to avoid overcommitting",
                    "🔄 Sync with Google Calendar for seamless integration",
                    "👁️ Switch between day, week, and month views using the buttons",
                    "🎨 Different colored layers help organize work by context or priority",
                    "⏰ Events show duration and can be resized by dragging edges",
                    "📱 Mobile-optimized with touch-friendly controls and gestures"
                  ]}
                />
              ) : (
                <HelpButton
                  title="Timeline Manager - Complete Guide"
                  description="The Timeline Manager visualizes time as a flowing river where tasks and events move toward the present moment. The prominent red NOW line shows exactly where you are in time, while past items move left and future items wait on the right."
                  tips={[
                    "🌊 Time flows from left (past) to right (future) toward the red NOW line",
                    "🎯 Use AI planning to automatically schedule tasks in optimal time slots",
                    "🧠 Interface modes (Beginner/Intermediate/Expert) control complexity",
                    "🔐 Lock timeline to auto-scroll with real time, or unlock to plan ahead",
                    "🚨 Overdue items turn red and pulse to grab your attention",
                    "📊 Layers organize items by context (Work, Personal, Health, etc.)",
                    "✏️ Double-click empty space to quickly create new items",
                    "🎨 Drag items between time slots or layers to reschedule",
                    "📱 Touch-optimized with pinch-to-zoom and swipe navigation on mobile",
                    "🕐 The prominent red NOW line with time display keeps you grounded in the present"
                  ]}
                />
              )}
            </div>
          </div>
        </div>

        {/* Interface mode controller and compact toggle */}
        <div className="flex items-center gap-2">
          <InterfaceModeController />

          <ConditionalFeature feature="addItem">
            <Button
              variant="outline"
              size="sm"
              onClick={props.onCompactModeToggle}
              className="gap-2"
            >
              {props.isCompactMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {props.isCompactMode ? 'Expand' : 'Compact'}
              </span>
            </Button>
          </ConditionalFeature>
        </div>
      </div>

      {/* Description text for beginner mode */}
      {config.showDescriptiveText && !props.isCompactMode && (
        <p className="text-muted-foreground">
          Manage your time with a flowing timeline. Items move toward NOW and logjam when overdue.
        </p>
      )}

      {/* Primary actions row - responsive layout */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Essential actions (always visible) */}
        <div className="flex items-center gap-2">
          {/* Add Item - Primary CTA */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={props.onAddItem}
                className="gap-2"
                size={config.compactMode ? 'sm' : 'default'}
                disabled={props.layers.length === 0}
              >
                <Plus className="h-4 w-4" />
                {props.layers.length === 0 ? 'Create Layer First' : 'Add Item'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {props.layers.length === 0
                ? 'Create a layer first to organize your timeline items'
                : 'Create a new timeline item'
              }
            </TooltipContent>
          </Tooltip>

          {/* Planning dropdown */}
          <ConditionalFeature feature="planDay">
            <DropdownMenu>
              <Tooltip>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button variant="default" size={config.compactMode ? 'sm' : 'default'} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Plan Day
                    </Button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <TooltipContent>Access planning tools and AI scheduling</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" aria-label="Planning tools">
                <DropdownMenuItem textValue="Daily Planning" onClick={props.onShowDailyPlanning}>
                  <Sunrise className="h-4 w-4 mr-2" />
                  Daily Planning
                </DropdownMenuItem>

                <ConditionalFeature feature="weeklyCalibration">
                  <DropdownMenuItem textValue="Weekly Calibration" onClick={props.onShowWeeklyCalibration}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Weekly Calibration
                  </DropdownMenuItem>
                </ConditionalFeature>

                <DropdownMenuItem textValue="AI Plan My Day" onClick={props.onShowAIPlanning} disabled={props.layers.length === 0}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Plan My Day
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <ConditionalFeature feature="templates">
                  <DropdownMenuItem textValue="Templates" onClick={props.onShowTemplates}>
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Templates
                  </DropdownMenuItem>
                </ConditionalFeature>

                <ConditionalFeature feature="roleZones">
                  <DropdownMenuItem textValue="Role Templates" onClick={props.onShowRoleTemplates}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Role Templates
                  </DropdownMenuItem>
                </ConditionalFeature>

                <DropdownMenuItem textValue="Manage Routines" onClick={props.onShowRoutines}>
                  <CalIcon className="h-4 w-4 mr-2" />
                  Manage Routines
                </DropdownMenuItem>

                <DropdownMenuItem
                  textValue="Add Today's Routines"
                  onClick={props.onPopulateRoutines}
                  disabled={props.populatingRoutines || props.layers.length === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {props.populatingRoutines ? 'Adding...' : "Add Today's Routines"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ConditionalFeature>

          {/* Plans dropdown */}
          <ConditionalFeature feature="templates">
            <PlanDropdown />
          </ConditionalFeature>

          {/* Lock/Unlock toggle */}
          <ConditionalFeature feature="lockToggle">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={props.onToggleLock}
                  variant={props.settings?.is_locked ? 'default' : 'outline'}
                  size={config.compactMode ? 'sm' : 'default'}
                  className="gap-2"
                >
                  {props.settings?.is_locked ? (
                    <>
                      <Lock className="h-4 w-4" />
                      {!config.compactMode && 'Locked'}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      {!config.compactMode && 'Unlocked'}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {props.settings?.is_locked
                  ? 'Locked to current time - click to unlock for free scrolling'
                  : 'Free scrolling mode - click to lock and follow real time'
                }
              </TooltipContent>
            </Tooltip>
          </ConditionalFeature>
        </div>

        {/* Secondary controls */}
        <ConditionalFeature feature="zoomControls">
          <div className="flex items-center gap-1 border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={props.onZoomOut}
                  disabled={!canZoomOut}
                  className="h-8 w-8 p-0 rounded-none"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out (Ctrl + -)</TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground px-2 min-w-[3rem] text-center">
              {props.settings?.zoom_horizontal ?? 100}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={props.onZoomIn}
                  disabled={!canZoomIn}
                  className="h-8 w-8 p-0 rounded-none"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in (Ctrl + +)</TooltipContent>
            </Tooltip>
          </div>
        </ConditionalFeature>

        {/* Calendar sync */}
        <ConditionalFeature feature="calendarSync">
          <CalendarSyncButton />
        </ConditionalFeature>

        {/* More actions dropdown */}
        <ConditionalFeature feature="moreActions">
          <DropdownMenu>
            <Tooltip>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant="outline" size={config.compactMode ? 'sm' : 'default'} className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    {!config.compactMode && 'More'}
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <TooltipContent>Additional actions and settings</TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="start" className="w-56" aria-label="More actions">
              <DropdownMenuItem textValue="End of Day" onClick={props.onShowEndOfDay}>
                <Moon className="h-4 w-4 mr-2" />
                End of Day
              </DropdownMenuItem>

              <ConditionalFeature feature="aiInsights">
                <DropdownMenuItem textValue="AI Insights" onClick={props.onShowAIInsights}>
                  <Brain className="h-4 w-4 mr-2" />
                  AI Insights
                </DropdownMenuItem>
              </ConditionalFeature>

              <ConditionalFeature feature="parkedItems">
                <DropdownMenuItem textValue="Parked Items" onClick={props.onShowParkedItems}>
                  <Archive className="h-4 w-4 mr-2" />
                  Parked Items ({props.parkedItems?.length || 0})
                </DropdownMenuItem>
              </ConditionalFeature>

              <ConditionalFeature feature="bookingLinks">
                <DropdownMenuItem textValue="Booking Links" onClick={() => window.location.href = '/booking-links'}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Booking Links
                </DropdownMenuItem>
              </ConditionalFeature>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Settings</DropdownMenuLabel>

              <ConditionalFeature feature="layers">
                <DropdownMenuItem textValue="Layers" asChild>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center px-2 py-1.5 text-sm">
                        <Layers className="h-4 w-4 mr-2" />
                        Layers ({props.layers.length})
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 max-h-[80vh] overflow-y-auto" side="right">
                      <TimelineLayerManager
                        layers={props.layers}
                        onAddLayer={props.onAddLayer}
                        onUpdateLayer={props.onUpdateLayer}
                        onDeleteLayer={props.onDeleteLayer}
                        onToggleVisibility={props.onToggleLayerVisibility}
                        onReorderLayers={props.onReorderLayers}
                      />
                    </PopoverContent>
                  </Popover>
                </DropdownMenuItem>
              </ConditionalFeature>

              <DropdownMenuItem textValue="Zoom Controls" asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center px-2 py-1.5 text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Zoom Controls
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 max-h-[80vh] overflow-y-auto" side="right">
                    <TimelineControls
                      zoomHorizontal={props.settings?.zoom_horizontal ?? 100}
                      zoomVertical={props.settings?.zoom_vertical ?? 80}
                      onZoomHorizontalChange={props.onZoomHorizontalChange}
                      onZoomVerticalChange={props.onZoomVerticalChange}
                      onFitAllLayers={props.onFitAllLayers}
                    />
                  </PopoverContent>
                </Popover>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ConditionalFeature>
      </div>

      {/* Attention system row - conditional based on mode */}
      <ConditionalFeature feature="attentionSystem">
        <div className="flex items-center gap-4 flex-wrap">
          <ConditionalFeature feature="roleZones">
            <RoleZoneSelector
              showLabels={!config.compactMode}
              size={config.compactMode ? 'sm' : 'default'}
            />
          </ConditionalFeature>

          <NonNegotiableTracker
            items={props.items}
            preferences={props.attentionPreferences}
            currentWeek={props.getSelectedDateForBudget()}
            compact={config.compactMode}
            onPreferencesUpdate={props.onUpdateAttentionPreferences}
          />

          {/* Role-specific components */}
          <ConditionalFeature feature="decisionBatching">
            {props.attentionPreferences?.current_role === 'marker' && (
              <Badge variant="outline" className="text-xs">
                Decision Batching Mode
              </Badge>
            )}
          </ConditionalFeature>

          <ConditionalFeature feature="multiplierDashboard">
            {props.attentionPreferences?.current_role === 'multiplier' && (
              <Badge variant="outline" className="text-xs">
                Multiplier Dashboard Active
              </Badge>
            )}
          </ConditionalFeature>
        </div>
      </ConditionalFeature>

      {/* View controls and tasks panel */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ViewTypeSwitcher
            currentViewType={props.viewType}
            onViewTypeChange={props.onViewTypeChange}
          />

          <ViewModeSwitcher
            currentMode={props.viewMode}
            onModeChange={props.onViewModeChange}
            onZoomChange={props.onZoomHorizontalChange}
            onTimeWindowChange={props.onTimeWindowChange}
          />

          {/* Navigate back */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={props.onNavigateBack}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go back one {props.getJumpLabel().toLowerCase()}</TooltipContent>
          </Tooltip>

          {/* Jump to date */}
          <Popover>
            <Tooltip>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 px-3">
                    <Navigation className="h-4 w-4" />
                    <span className="hidden sm:inline">{props.getJumpLabel()}</span>
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <TooltipContent>Navigate to a specific date</TooltipContent>
            </Tooltip>

            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Jump to Date</h3>
                <input
                  type="date"
                  value={jumpToDate}
                  onChange={(e) => setJumpToDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => props.onJumpToDate(jumpToDate)}
                    disabled={!jumpToDate}
                    className="flex-1"
                  >
                    Go
                  </Button>
                  <Button size="sm" variant="outline" onClick={props.onJumpToToday}>
                    Today
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Navigate forward */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={props.onNavigateForward}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go forward one {props.getJumpLabel().toLowerCase()}</TooltipContent>
          </Tooltip>
        </div>

        <TaskHeaderPanel
          tasks={props.unscheduledTasks}
          loading={props.tasksLoading}
          onRefetch={props.onRefetchTasks}
          onAddTaskClick={props.onAddTaskClick}
        />
      </div>
    </div>
  );
};