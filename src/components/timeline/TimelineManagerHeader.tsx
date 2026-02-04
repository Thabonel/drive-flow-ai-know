// Integration wrapper for TimelineManager to use the new header
import { TimelineHeader } from './TimelineHeader';
import { TimelineViewMode } from '@/lib/timelineConstants';
import { ViewType } from './ViewTypeSwitcher';

interface TimelineManagerHeaderProps {
  // All the same props that TimelineManager currently handles
  items: any[];
  settings: any;
  parkedItems: any[];
  layers: any[];
  unscheduledTasks: any[];
  tasksLoading: boolean;
  populatingRoutines: boolean;
  viewMode: TimelineViewMode;
  viewType: ViewType;
  isCompactMode: boolean;
  attentionPreferences: any;

  // Handler functions
  setIsCompactMode: (compact: boolean) => void;
  setViewType: (type: ViewType) => void;
  setViewMode: (mode: TimelineViewMode) => void;
  setShowAddItemForm: (show: boolean) => void;
  setShowDailyPlanning: (show: boolean) => void;
  setShowWeeklyCalibration: (show: boolean) => void;
  setShowAIPlanning: (show: boolean) => void;
  setShowTemplates: (show: boolean) => void;
  setShowRoleTemplates: (show: boolean) => void;
  setShowRoutines: (show: boolean) => void;
  setShowEndOfDay: (show: boolean) => void;
  setShowAIInsights: (show: boolean) => void;
  setShowParkedItems: (show: boolean) => void;
  setShowAddTask: (show: boolean) => void;
  handleToggleLock: () => void;
  handleQuickZoomIn: () => void;
  handleQuickZoomOut: () => void;
  handleJumpBackward: () => void;
  handleJumpForward: () => void;
  handleJumpToToday: () => void;
  handlePopulateRoutines: () => void;
  getJumpLabel: () => string;
  getSelectedDateForBudget: () => Date;
  refetchTasks: () => void;
}

export function TimelineManagerHeader(props: TimelineManagerHeaderProps) {
  const {
    items,
    settings,
    parkedItems,
    layers,
    unscheduledTasks,
    tasksLoading,
    populatingRoutines,
    viewMode,
    viewType,
    isCompactMode,
    attentionPreferences,
    setIsCompactMode,
    setViewType,
    setViewMode,
    setShowAddItemForm,
    setShowDailyPlanning,
    setShowWeeklyCalibration,
    setShowAIPlanning,
    setShowTemplates,
    setShowRoleTemplates,
    setShowRoutines,
    setShowEndOfDay,
    setShowAIInsights,
    setShowParkedItems,
    setShowAddTask,
    handleToggleLock,
    handleQuickZoomIn,
    handleQuickZoomOut,
    handleJumpBackward,
    handleJumpForward,
    handleJumpToToday,
    handlePopulateRoutines,
    getJumpLabel,
    getSelectedDateForBudget,
    refetchTasks,
  } = props;

  return (
    <TimelineHeader
      viewType={viewType}
      viewMode={viewMode}
      isCompactMode={isCompactMode}
      onCompactModeToggle={() => setIsCompactMode(!isCompactMode)}

      isLocked={settings?.is_locked ?? true}
      zoomHorizontal={settings?.zoom_horizontal ?? 100}
      onToggleLock={handleToggleLock}
      onZoomIn={handleQuickZoomIn}
      onZoomOut={handleQuickZoomOut}

      onJumpBackward={handleJumpBackward}
      onJumpForward={handleJumpForward}
      onJumpToToday={handleJumpToToday}
      jumpLabel={getJumpLabel()}

      onShowAddItem={() => setShowAddItemForm(true)}
      onShowDailyPlanning={() => setShowDailyPlanning(true)}
      onShowWeeklyCalibration={() => setShowWeeklyCalibration(true)}
      onShowAIPlanning={() => setShowAIPlanning(true)}
      onShowTemplates={() => setShowTemplates(true)}
      onShowRoleTemplates={() => setShowRoleTemplates(true)}
      onShowRoutines={() => setShowRoutines(true)}
      onShowEndOfDay={() => setShowEndOfDay(true)}
      onShowAIInsights={() => setShowAIInsights(true)}
      onShowParkedItems={() => setShowParkedItems(true)}
      onPopulateRoutines={handlePopulateRoutines}

      layersCount={layers.length}
      parkedItemsCount={parkedItems?.length || 0}
      populatingRoutines={populatingRoutines}
      hasLayers={layers.length > 0}

      items={items}
      unscheduledTasks={unscheduledTasks}
      tasksLoading={tasksLoading}
      onRefetchTasks={refetchTasks}
      onAddTaskClick={() => setShowAddTask(true)}
      selectedDate={getSelectedDateForBudget()}
      attentionPreferences={attentionPreferences}
      onViewTypeChange={setViewType}
      onViewModeChange={setViewMode}
    />
  );
}