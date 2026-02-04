import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import {
  Clock, Calendar as CalIcon, Plus, Sparkles, Lock, Unlock,
  ZoomIn, ZoomOut, Navigation, MoreHorizontal, Settings,
  Layers, Archive, Moon, Brain, LinkIcon, Eye, EyeOff,
  ChevronLeft, ChevronRight, RefreshCw, Sunrise,
  LayoutTemplate
} from 'lucide-react';
import { TimelinePhilosophy } from './TimelinePhilosophy';
import { PageHelp } from '@/components/PageHelp';
import { ViewTypeSwitcher, ViewType } from './ViewTypeSwitcher';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { RoleZoneSelector } from './RoleZoneSelector';
import { AttentionBudgetWidget } from './AttentionBudgetWidget';
import { CalendarSyncButton } from './CalendarSyncButton';
import { PlanDropdown } from '@/components/plans/PlanDropdown';
import { TaskHeaderPanel } from './TaskHeaderPanel';
import { TimelineViewMode } from '@/lib/timelineConstants';

interface TimelineHeaderProps {
  // View state
  viewType: ViewType;
  viewMode: TimelineViewMode;
  isCompactMode: boolean;
  onCompactModeToggle: () => void;

  // Settings
  isLocked: boolean;
  zoomHorizontal: number;
  onToggleLock: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;

  // Navigation
  onJumpBackward: () => void;
  onJumpForward: () => void;
  onJumpToToday: () => void;
  jumpLabel: string;

  // Actions
  onShowAddItem: () => void;
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

  // Data
  layersCount: number;
  parkedItemsCount: number;
  populatingRoutines: boolean;
  hasLayers: boolean;

  // Additional components
  items: any[];
  unscheduledTasks: any[];
  tasksLoading: boolean;
  onRefetchTasks: () => void;
  onAddTaskClick: () => void;
  selectedDate: Date;
  attentionPreferences: any;
  onViewTypeChange: (type: ViewType) => void;
  onViewModeChange: (mode: TimelineViewMode) => void;
}

export function TimelineHeader({
  viewType,
  viewMode,
  isCompactMode,
  onCompactModeToggle,
  isLocked,
  zoomHorizontal,
  onToggleLock,
  onZoomIn,
  onZoomOut,
  onJumpBackward,
  onJumpForward,
  onJumpToToday,
  jumpLabel,
  onShowAddItem,
  onShowDailyPlanning,
  onShowWeeklyCalibration,
  onShowAIPlanning,
  onShowTemplates,
  onShowRoleTemplates,
  onShowRoutines,
  onShowEndOfDay,
  onShowAIInsights,
  onShowParkedItems,
  onPopulateRoutines,
  layersCount,
  parkedItemsCount,
  populatingRoutines,
  hasLayers,
  items,
  unscheduledTasks,
  tasksLoading,
  onRefetchTasks,
  onAddTaskClick,
  selectedDate,
  attentionPreferences,
  onViewTypeChange,
  onViewModeChange,
}: TimelineHeaderProps) {
  const [showJumpPopover, setShowJumpPopover] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`timeline-header ${isCompactMode ? 'space-y-2' : 'space-y-4'}`}>
        {/* Primary Header Row - Title + Essential Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title + Philosophy + Help */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              {viewType === 'calendar' ? (
                <CalIcon className={isCompactMode ? 'h-6 w-6' : 'h-8 w-8'} />
              ) : (
                <Clock className={isCompactMode ? 'h-6 w-6' : 'h-8 w-8'} />
              )}
              <h1 className={`${isCompactMode ? 'text-2xl' : 'text-3xl'} font-bold truncate`}>
                {viewType === 'calendar' ? 'Calendar View' : 'Timeline Manager'}
              </h1>
              <TimelinePhilosophy mode="dialog" trigger="icon" />
              {viewType === 'calendar' ? (
                <PageHelp
                  title="Calendar View - How It Works"
                  description="AI Query Hub's Calendar View combines traditional scheduling with intelligent time management."
                  tips={[
                    "✨ Getting Started: Click any time slot to create an event",
                    "🎯 AI Planning: Use 'Plan Day' for AI-assisted scheduling",
                    "📊 Attention Budget: See your cognitive load in real-time"
                  ]}
                />
              ) : (
                <PageHelp
                  title="Timeline Manager - How It Works"
                  description="Visualize time as a flowing river where items drift toward NOW."
                  tips={[
                    "🌊 The Flow Concept: Time flows left to right",
                    "🎯 AI Planning: Use 'Plan Day' for intelligent scheduling",
                    "🧠 Attention Budget: Real-time cognitive load tracking"
                  ]}
                />
              )}
            </div>
          </div>

          {/* Right: View Controls + Compact Toggle */}
          <div className="flex items-center gap-2">
            <ViewTypeSwitcher
              currentViewType={viewType}
              onViewTypeChange={onViewTypeChange}
            />
            <ViewModeSwitcher
              currentMode={viewMode}
              onModeChange={onViewModeChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onCompactModeToggle}
              className="gap-2 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
              title={isCompactMode ? "Expand layout" : "Compact layout"}
            >
              {isCompactMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline">{isCompactMode ? 'Expand' : 'Compact'}</span>
            </Button>
          </div>
        </div>

        {!isCompactMode && (
          <p className="text-muted-foreground text-sm">
            Manage your time with intelligent scheduling. Items flow toward NOW and become urgent when overdue.
          </p>
        )}

        {/* Primary Actions Row - Most Important Functions */}
        <div className="timeline-primary-actions">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tier 1: Essential Actions */}
            <div className="flex items-center gap-3">
              {/* Primary Add Button */}
              <Button
                onClick={onShowAddItem}
                disabled={!hasLayers}
                className={`${
                  isCompactMode ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                } bg-primary text-primary-foreground font-semibold shadow-neu-raised hover:shadow-neu-flat transform hover:scale-[1.02] transition-all duration-150`}
              >
                <Plus className="h-4 w-4 mr-2" />
                {hasLayers ? 'Add Item' : 'Create Layer First'}
              </Button>

              {/* Planning Dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        size={isCompactMode ? 'sm' : 'default'}
                        className="gap-2 shadow-neu-raised hover:shadow-neu-flat transition-all duration-150"
                      >
                        <Sparkles className="h-4 w-4" />
                        Plan Day
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="z-[60]">
                    Access planning tools and AI assistance
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="z-[55] shadow-neu-raised">
                  <DropdownMenuItem onClick={onShowDailyPlanning}>
                    <Sunrise className="h-4 w-4 mr-2" />
                    Daily Planning
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShowWeeklyCalibration}>
                    <CalIcon className="h-4 w-4 mr-2" />
                    Weekly Calibration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShowAIPlanning} disabled={!hasLayers}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Plan My Day
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onShowTemplates}>
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Templates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShowRoleTemplates}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Role Templates
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Plans Integration */}
              <PlanDropdown />
            </div>

            {/* Tier 2: Timeline Controls */}
            <div className="flex items-center gap-2 ml-6">
              {/* Lock Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onToggleLock}
                    variant={isLocked ? 'default' : 'outline'}
                    size={isCompactMode ? 'sm' : 'default'}
                    className="gap-2 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                  >
                    {isLocked ? (
                      <>
                        <Lock className="h-4 w-4" />
                        {!isCompactMode && 'Locked'}
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        {!isCompactMode && 'Unlocked'}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="z-[60]">
                  {isLocked ? 'Auto-scrolling with time' : 'Manual navigation mode'}
                </TooltipContent>
              </Tooltip>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onZoomOut}
                      className="h-9 w-9 p-0 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[60]">Zoom out</TooltipContent>
                </Tooltip>

                <span className="text-xs text-muted-foreground px-2 min-w-[3rem] text-center">
                  {zoomHorizontal}%
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onZoomIn}
                      className="h-9 w-9 p-0 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[60]">Zoom in</TooltipContent>
                </Tooltip>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onJumpBackward}
                      className="h-9 w-9 p-0 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[60]">Previous {jumpLabel.toLowerCase()}</TooltipContent>
                </Tooltip>

                <Button
                  variant="outline"
                  size={isCompactMode ? 'sm' : 'default'}
                  onClick={onJumpToToday}
                  className="gap-2 px-3 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                >
                  <Navigation className="h-4 w-4" />
                  <span className="hidden sm:inline">Today</span>
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onJumpForward}
                      className="h-9 w-9 p-0 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[60]">Next {jumpLabel.toLowerCase()}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Tier 3: Secondary Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <CalendarSyncButton />

              {/* More Actions */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size={isCompactMode ? 'sm' : 'default'}
                        className="gap-2 shadow-neu-flat hover:shadow-neu-raised transition-all duration-150"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        {!isCompactMode && 'More'}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="z-[60]">Additional actions</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="z-[55] shadow-neu-raised w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onShowEndOfDay}>
                    <Moon className="h-4 w-4 mr-2" />
                    End of Day
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShowAIInsights}>
                    <Brain className="h-4 w-4 mr-2" />
                    AI Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShowParkedItems}>
                    <Archive className="h-4 w-4 mr-2" />
                    Parked Items ({parkedItemsCount})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Layers className="h-4 w-4 mr-2" />
                    Layers ({layersCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Secondary Row: Context-Aware Controls */}
        <div className="timeline-secondary-actions">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Attention System */}
            <div className="flex items-center gap-2">
              <RoleZoneSelector
                showLabels={!isCompactMode}
                size={isCompactMode ? 'sm' : 'default'}
              />
              <AttentionBudgetWidget
                items={items}
                selectedDate={selectedDate}
                compact={isCompactMode}
              />
            </div>

            {/* Tasks Panel */}
            <div className="ml-auto">
              <TaskHeaderPanel
                tasks={unscheduledTasks}
                loading={tasksLoading}
                onRefetch={onRefetchTasks}
                onAddTaskClick={onAddTaskClick}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}