// Main Timeline Manager Component

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TimelineCanvas } from './TimelineCanvas';
import { TimelineControls } from './TimelineControls';
import { TimelineLayerManager } from './TimelineLayerManager';
import { TimelinePhilosophy } from './TimelinePhilosophy';
import { AddItemForm } from './AddItemForm';
import { ItemActionMenu } from './ItemActionMenu';
import { ParkedItemsPanel } from './ParkedItemsPanel';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { ViewTypeSwitcher, ViewType } from './ViewTypeSwitcher';
import { RoleZoneSelector } from './RoleZoneSelector';
import { AttentionBudgetWidget } from './AttentionBudgetWidget';
import { DecisionBatchIndicator } from './DecisionBatchIndicator';
import { MultiplierDashboard } from './MultiplierDashboard';
import { RoleBasedEventTemplates } from './RoleBasedEventTemplates';
import { useAttentionBudget } from '@/hooks/useAttentionBudget';
import { CalendarGrid } from './CalendarGrid';
import { CalendarSyncButton } from './CalendarSyncButton';
import { WorkloadIndicator } from './WorkloadIndicator';
import { TaskHeaderPanel } from './TaskHeaderPanel';
import { AddTaskOverlay } from './AddTaskOverlay';
import { PlanDropdown } from '@/components/plans/PlanDropdown';
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
import { useTasks } from '@/hooks/useTasks';
import { useCompactMode } from '@/hooks/useCompactMode';
import { TimelineItem, clamp } from '@/lib/timelineUtils';
import { resolveLayerColor } from '@/lib/layerUtils';
import {
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_LAYER_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  NOW_LINE_POSITION,
  TimelineViewMode,
  VIEW_MODE_CONFIG,
} from '@/lib/timelineConstants';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Settings, Layers, Lock, Unlock, Archive, LayoutTemplate, Sparkles, RefreshCw, Calendar as CalIcon, Brain, Sunrise, Moon, Link as LinkIcon, MoreHorizontal, ZoomIn, ZoomOut, Navigation, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PageHelp } from '@/components/PageHelp';

interface TimelineManagerProps {
  onCanvasReady?: (svg: SVGSVGElement) => void;
}

export function TimelineManager({ onCanvasReady }: TimelineManagerProps = {}) {
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
    deleteRecurringThisAndFollowing,
    updateRecurringThisAndFollowing,
    deleteParkedItem,
    updateSettings,
    refetchItems,
    refetchParkedItems,
  } = useTimeline();

  const {
    layers,
    loading: layersLoading,
    addLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    toggleLayerVisibility,
    refetch: refetchLayers,
  } = useLayers();

  const {
    tasks: unscheduledTasks,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = useTasks();

  // Attention system hooks
  const { preferences: attentionPreferences } = useAttentionBudget();

  // Real-time sync with callback for newly inserted items
  useTimelineSync({
    onItemsChange: refetchItems,
    onItemInsert: (newItem) => {
      // When a new item is inserted (e.g., via AI Chat), show toast and navigate if needed
      if (viewType === 'calendar' && newItem.start_time) {
        const itemDate = new Date(newItem.start_time);

        // Check if item is outside current calendar view
        const currentWeekStart = new Date(calendarViewDate);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

        const isOutsideCurrentView =
          viewMode === 'day' ? itemDate.toDateString() !== calendarViewDate.toDateString() :
            viewMode === 'week' ? itemDate < currentWeekStart || itemDate > currentWeekEnd :
              itemDate.getMonth() !== calendarViewDate.getMonth() || itemDate.getFullYear() !== calendarViewDate.getFullYear();

        if (isOutsideCurrentView) {
          // Navigate to the item's date and show toast
          setCalendarViewDate(itemDate);
          toast.success(`"${newItem.title}" added - Calendar navigated to ${format(itemDate, 'EEEE, MMM d')}`);
        } else {
          // Item is in current view, just show confirmation
          toast.success(`"${newItem.title}" added to your calendar`);
        }
      }
    },
    onLayersChange: refetchLayers,
    onSettingsChange: () => { }, // Settings are managed by useTimeline
    onParkedItemsChange: refetchParkedItems,
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
  const [showAddTask, setShowAddTask] = useState(false);
  const [showRoleTemplates, setShowRoleTemplates] = useState(false);
  const [viewMode, setViewMode] = useState<TimelineViewMode>('week');
  const [viewType, setViewType] = useState<ViewType>(() => {
    const stored = localStorage.getItem('timeline-view-type');
    return (stored === 'calendar' ? 'calendar' : 'timeline') as ViewType;
  });
  const [initialFormValues, setInitialFormValues] = useState<{ startTime?: string; layerId?: string } | null>(null);
  const [jumpToDate, setJumpToDate] = useState<string>('');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  // URL search params for deep linking to specific dates (e.g., from AI Chat)
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle date parameter from URL (e.g., /timeline?date=2024-01-15&view=calendar)
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const viewParam = searchParams.get('view');

    if (dateParam) {
      const targetDate = new Date(dateParam);
      if (!isNaN(targetDate.getTime())) {
        // Set calendar view date to the target date
        setCalendarViewDate(targetDate);

        // If view=calendar param is set, switch to calendar view
        if (viewParam === 'calendar') {
          setViewType('calendar');
        }

        // Clear the URL params after processing (so refresh doesn't keep jumping)
        searchParams.delete('date');
        searchParams.delete('view');
        setSearchParams(searchParams, { replace: true });

        toast.info(`Showing ${targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      }
    }
  }, [searchParams, setSearchParams]);

  // Handle navigation from AI Chat via localStorage (e.g., when clicking "View in Timeline" toast)
  useEffect(() => {
    const navigateToDate = localStorage.getItem('timeline-navigate-to-date');
    if (navigateToDate) {
      const targetDate = new Date(navigateToDate);
      if (!isNaN(targetDate.getTime())) {
        // Switch to calendar view and navigate to date
        setViewType('calendar');
        setCalendarViewDate(targetDate);

        // Clear the storage to prevent repeated navigation
        localStorage.removeItem('timeline-navigate-to-date');

        toast.info(`Calendar navigated to ${targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      }
    }
  }, []);

  // Track previous items count to detect new items added externally (e.g., via AI Chat)
  const prevItemsCountRef = useRef<number>(0);
  const prevItemIdsRef = useRef<Set<string>>(new Set());
  // Track previous view type to detect switching to calendar view
  const prevViewTypeRef = useRef<ViewType>(viewType);
  // Track if we've done the initial navigation check (for calendar view on page load)
  const hasCheckedInitialLoadRef = useRef<boolean>(false);

  const { populateRoutinesForDay } = useRoutines();
  const { isCompactMode, setIsCompactMode } = useCompactMode();

  // Persist view type to localStorage
  useEffect(() => {
    localStorage.setItem('timeline-view-type', viewType);
  }, [viewType]);

  // Auto-navigate calendar to show newly added items (e.g., from AI Chat)
  // This detects when items are added externally and navigates to show them
  useEffect(() => {
    if (items.length === 0) {
      prevItemIdsRef.current = new Set();
      prevItemsCountRef.current = 0;
      prevViewTypeRef.current = viewType;
      return;
    }

    // Build current set of item IDs
    const currentIds = new Set(items.map(item => item.id));

    // Find new items (IDs that weren't in the previous set)
    const newItems = items.filter(item => !prevItemIdsRef.current.has(item.id));

    // Detect if we just switched TO calendar view
    const justSwitchedToCalendar = viewType === 'calendar' && prevViewTypeRef.current !== 'calendar';

    // Helper to check if a date is outside the current calendar view
    const currentViewStart = calendarViewDate;
    const currentWeekStart = new Date(currentViewStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); // Monday
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6); // Sunday

    const isDateOutsideCurrentView = (date: Date) => {
      return viewMode === 'day' ? date.toDateString() !== currentViewStart.toDateString() :
        viewMode === 'week' ? date < currentWeekStart || date > currentWeekEnd :
          date.getMonth() !== currentViewStart.getMonth() || date.getFullYear() !== currentViewStart.getFullYear();
    };

    // If there are new items and we're in calendar view, navigate to show them
    if (newItems.length > 0 && viewType === 'calendar' && prevItemsCountRef.current > 0) {
      // Find the earliest new item's date
      const earliestNewItem = newItems.reduce((earliest, item) => {
        const itemDate = new Date(item.start_time);
        return itemDate < earliest ? itemDate : earliest;
      }, new Date(newItems[0].start_time));

      const newItemDate = new Date(earliestNewItem);

      if (isDateOutsideCurrentView(newItemDate)) {
        setCalendarViewDate(newItemDate);
        toast.info(`Calendar navigated to ${newItemDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      }
    }

    // When switching TO calendar view, check for items outside current view and navigate
    if (justSwitchedToCalendar && items.length > 0) {
      const now = new Date();

      // Find future items that are outside the current calendar view
      const futureItemsOutsideView = items.filter(item => {
        const itemDate = new Date(item.start_time);
        return itemDate >= now && isDateOutsideCurrentView(itemDate);
      });

      if (futureItemsOutsideView.length > 0) {
        // Navigate to the nearest future item
        const nearestFutureItem = futureItemsOutsideView.reduce((nearest, item) => {
          const itemDate = new Date(item.start_time);
          const nearestDate = new Date(nearest.start_time);
          return itemDate < nearestDate ? item : nearest;
        }, futureItemsOutsideView[0]);

        const nearestDate = new Date(nearestFutureItem.start_time);
        setCalendarViewDate(nearestDate);
        toast.info(`Showing items scheduled for ${nearestDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      }
    }

    // On INITIAL page load with calendar view, check for recently created items
    // This handles the case where user navigates from AI Chat to Timeline
    const isInitialLoad = prevItemsCountRef.current === 0 && !hasCheckedInitialLoadRef.current;
    if (isInitialLoad && viewType === 'calendar' && items.length > 0) {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      // Find items that were recently created (within last 2 minutes) and are in the future
      const recentlyCreatedItems = items.filter(item => {
        const createdAt = item.created_at ? new Date(item.created_at) : null;
        const itemDate = new Date(item.start_time);
        return createdAt && createdAt > twoMinutesAgo && itemDate >= now && isDateOutsideCurrentView(itemDate);
      });

      if (recentlyCreatedItems.length > 0) {
        // Navigate to the earliest recently created item
        const earliestItem = recentlyCreatedItems.reduce((earliest, item) => {
          const itemDate = new Date(item.start_time);
          const earliestDate = new Date(earliest.start_time);
          return itemDate < earliestDate ? item : earliest;
        }, recentlyCreatedItems[0]);

        const itemDate = new Date(earliestItem.start_time);
        setCalendarViewDate(itemDate);
        toast.info(`Showing recently scheduled item on ${itemDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      }
    }

    // Mark that we've checked initial load
    if (isInitialLoad) {
      hasCheckedInitialLoadRef.current = true;
    }

    // Update refs for next comparison
    prevItemIdsRef.current = currentIds;
    prevItemsCountRef.current = items.length;
    prevViewTypeRef.current = viewType;
  }, [items, viewType, viewMode, calendarViewDate]);

  const animationFrameRef = useRef<number>();
  const lastTickRef = useRef<number>(Date.now());
  const initializedScrollRef = useRef<boolean>(false);

  // Calculate zoom-adjusted values based on view mode
  const viewModeConfig = VIEW_MODE_CONFIG[viewMode];
  const basePixelsPerHour = viewModeConfig.pixelsPerHour;
  const pixelsPerHour = (settings?.zoom_horizontal || 100) / 100 * basePixelsPerHour;

  // Helper to get selected date for attention budget calculation
  const getSelectedDateForBudget = (): Date => {
    // For day view, use current date
    if (viewMode === 'day') {
      return new Date();
    }
    // For week/month views, use the start of the current period
    const today = new Date();
    if (viewMode === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return startOfWeek;
    }
    // For month view, use start of month
    return new Date(today.getFullYear(), today.getMonth(), 1);
  };
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

  // Set initial scroll offset to show pastHours before NOW
  useEffect(() => {
    // Wait for settings to load
    if (!settings) return;

    // Estimate viewport width (typical desktop width)
    const estimatedViewportWidth = 1200;

    // Calculate scroll offset to show exactly pastHours before NOW
    // Formula: scrollOffset = pastHours * pixelsPerHour - NOW_LINE_POSITION * viewportWidth
    const pastHours = viewModeConfig.pastHours;
    const targetScrollOffset = pastHours * pixelsPerHour - NOW_LINE_POSITION * estimatedViewportWidth;

    // Only set if this is initial load or view mode changed
    if (!initializedScrollRef.current) {
      setScrollOffset(targetScrollOffset);
      initializedScrollRef.current = true;

      console.log('Timeline: Set initial scroll offset', {
        pastHours,
        pixelsPerHour,
        nowLinePosition: NOW_LINE_POSITION,
        estimatedViewportWidth,
        targetScrollOffset,
      });
    }
  }, [settings, viewModeConfig.pastHours, pixelsPerHour]);

  // Recalculate scroll offset when view mode changes
  useEffect(() => {
    // Skip initial mount
    if (!initializedScrollRef.current) return;

    // Estimate viewport width (typical desktop width)
    const estimatedViewportWidth = 1200;

    // Calculate new scroll offset for the new view mode
    const pastHours = viewModeConfig.pastHours;
    const newScrollOffset = pastHours * pixelsPerHour - NOW_LINE_POSITION * estimatedViewportWidth;

    setScrollOffset(newScrollOffset);

    console.log('Timeline: View mode changed, recalculating scroll offset', {
      viewMode,
      pastHours,
      pixelsPerHour,
      newScrollOffset,
    });
  }, [viewMode, viewModeConfig.pastHours, pixelsPerHour]);

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

  // Handle edit recurring item (this and following)
  const handleEditRecurringThisAndFollowing = (item: TimelineItem) => {
    // Open the edit form with the item
    // AddItemForm will handle the "this and following" logic on submit
    setEditingItem(item);
    setShowAddItemForm(true);
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

  // Quick zoom in/out for horizontal zoom
  const handleQuickZoomIn = async () => {
    const currentZoom = settings?.zoom_horizontal ?? 100;
    const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    await handleZoomHorizontalChange(newZoom);
  };

  const handleQuickZoomOut = async () => {
    const currentZoom = settings?.zoom_horizontal ?? 100;
    const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
    await handleZoomHorizontalChange(newZoom);
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

  // Handle quick add from calendar (single click + title)
  const handleQuickAdd = async (title: string, startTime: string, durationMinutes: number, layerId: string): Promise<boolean> => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) {
      toast.error('Layer not found. Please create or select a visible layer.');
      return false;
    }

    const result = await addItem(
      layerId,
      title,
      startTime,
      durationMinutes,
      resolveLayerColor(layer.color)
    );
    return !!result;
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

  // Handle jump to specific date
  const handleJumpToDate = (dateString: string) => {
    if (!dateString) return;

    const targetDate = new Date(dateString);
    const now = new Date();

    // Calculate hours difference from now to target
    const hoursDiff = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Calculate scroll offset to center the target date
    // Positive hoursDiff = future (scroll right/negative offset)
    // Negative hoursDiff = past (scroll left/positive offset)
    const estimatedViewportWidth = 1200;
    const targetScrollOffset = -hoursDiff * pixelsPerHour + NOW_LINE_POSITION * estimatedViewportWidth;

    setScrollOffset(targetScrollOffset);
    setJumpToDate('');
  };

  // Jump to today (reset scroll or calendar view)
  const handleJumpToToday = () => {
    if (viewType === 'calendar') {
      setCalendarViewDate(new Date());
    } else {
      const estimatedViewportWidth = 1200;
      const pastHours = viewModeConfig.pastHours;
      const targetScrollOffset = pastHours * pixelsPerHour - NOW_LINE_POSITION * estimatedViewportWidth;
      setScrollOffset(targetScrollOffset);
    }
  };

  // Get jump increment in hours based on view mode
  const getJumpIncrement = (): number => {
    switch (viewMode) {
      case 'day':
        return 24; // 1 day
      case 'week':
        return 24 * 7; // 1 week
      case 'month':
        return 24 * 30; // ~1 month
      default:
        return 24 * 7; // default to 1 week
    }
  };

  // Get label for navigation buttons based on view mode
  const getJumpLabel = (): string => {
    switch (viewMode) {
      case 'day':
        return 'Day';
      case 'week':
        return 'Week';
      case 'month':
        return 'Month';
      default:
        return 'Week';
    }
  };

  // Jump forward by view mode increment
  const handleJumpForward = () => {
    if (viewType === 'calendar') {
      // For calendar view, advance the view date
      setCalendarViewDate(prev => {
        switch (viewMode) {
          case 'day': return addDays(prev, 1);
          case 'week': return addWeeks(prev, 1);
          case 'month': return addMonths(prev, 1);
          default: return addWeeks(prev, 1);
        }
      });
    } else {
      const incrementHours = getJumpIncrement();
      const incrementPixels = incrementHours * pixelsPerHour;
      setScrollOffset(scrollOffset - incrementPixels); // Negative because scrolling right shows future
    }
  };

  // Jump backward by view mode increment
  const handleJumpBackward = () => {
    if (viewType === 'calendar') {
      // For calendar view, go back in the view date
      setCalendarViewDate(prev => {
        switch (viewMode) {
          case 'day': return addDays(prev, -1);
          case 'week': return addWeeks(prev, -1);
          case 'month': return addMonths(prev, -1);
          default: return addWeeks(prev, -1);
        }
      });
    } else {
      const incrementHours = getJumpIncrement();
      const incrementPixels = incrementHours * pixelsPerHour;
      setScrollOffset(scrollOffset + incrementPixels); // Positive because scrolling left shows past
    }
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
    <div className={isCompactMode ? 'space-y-1' : 'space-y-6'}>
      {/* Header */}
      <div className={isCompactMode ? 'space-y-1' : 'space-y-4'}>
        {/* Combined Header Row - Title and Action Buttons on Same Line */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {viewType === 'calendar' ? (
              <CalIcon className={isCompactMode ? 'h-6 w-6' : 'h-8 w-8'} />
            ) : (
              <Clock className={isCompactMode ? 'h-6 w-6' : 'h-8 w-8'} />
            )}
            <h1 className={isCompactMode ? 'text-2xl font-bold' : 'text-3xl font-bold'}>
              {viewType === 'calendar' ? 'Calendar View' : 'Timeline Manager'}
            </h1>
            <TimelinePhilosophy mode="dialog" trigger="icon" />
{viewType === 'calendar' ? (
              <PageHelp
                title="Calendar View Help"
                description="The Calendar View displays your timeline items in a familiar Google Calendar-style layout. Create events by clicking or dragging on the grid, view your schedule by day, week, or month, and manage items with intuitive controls."
                tips={[
                  "Click on any time slot to quick-add an event",
                  "Drag vertically to create events with specific durations",
                  "Click on events to edit, reschedule, or delete them",
                  "Drag events to move them to different times or days",
                  "Drag the bottom edge of events to resize duration",
                  "Switch between Day, Week, and Month views for different perspectives",
                  "Use arrow buttons to navigate forward/backward in time",
                  "The red line shows the current time (on today's view)",
                  "Events snap to 15-minute intervals for precise scheduling",
                  "Use layers to organize different types of events",
                  "Sync with Google Calendar using the Calendar button",
                  "Switch to Timeline view for a flowing, scrollable timeline"
                ]}
              />
            ) : (
              <PageHelp
                title="Timeline Manager Help"
                description="The Timeline Manager helps you visualize and manage your tasks on a flowing timeline. Items move towards the NOW line, and become 'logjammed' (red pulsing) when overdue. You can drag items to reschedule, resize them to adjust duration, or park them for later."
                tips={[
                  "Drag items horizontally to reschedule them",
                  "Drag the right edge to resize duration (like Google Calendar)",
                  "Click items to mark done, reschedule, park, or delete",
                  "Double-click empty space to create a new item at that time",
                  "Use arrow buttons to jump forward/backward by day, week, or month",
                  "Use layers to organize different types of tasks",
                  "Lock/unlock to enable auto-scrolling with real time",
                  "Use 'Plan Day' for AI planning, templates, and routines",
                  "Schedule project plans directly from the 'Plans' dropdown",
                  "Sync with Google Calendar using the Calendar button",
                  "Use unscheduled tasks panel to save items for later scheduling",
                  "Switch view modes (Day/Week/Month) for different perspectives"
                ]}
              />
            )}
          </div>

          {/* Compact Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompactMode(!isCompactMode)}
            className="gap-2"
            title={isCompactMode ? "Expand layout" : "Compact layout"}
          >
            {isCompactMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{isCompactMode ? 'Expand' : 'Compact'}</span>
          </Button>
        </div>

        {!isCompactMode && (
          <p className="text-muted-foreground">
            Manage your time with a flowing timeline. Items move toward NOW and logjam when overdue.
          </p>
        )}

        {/* Action Buttons Row - Simplified to 5 Primary Actions */}
        <div className={isCompactMode ? 'flex items-center gap-2 flex-wrap' : 'flex items-center gap-3 flex-wrap'}>
          {/* Primary Add Item Button */}
          <button
            onClick={() => setShowAddItemForm(true)}
            className={isCompactMode
              ? 'px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm text-sm'
              : 'px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm'
            }
            disabled={layers.length === 0}
          >
            {layers.length === 0 ? 'Create a Layer First' : '+ Add Item'}
          </button>

          {/* Unified Planning Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size={isCompactMode ? 'sm' : 'default'} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Plan Day
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setShowDailyPlanning(true)}>
                <Sunrise className="h-4 w-4 mr-2" />
                Daily Planning
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAIPlanning(true)} disabled={layers.length === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Plan My Day
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowTemplates(true)}>
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Templates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRoleTemplates(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Role Templates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRoutines(true)}>
                <CalIcon className="h-4 w-4 mr-2" />
                Manage Routines
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePopulateRoutines} disabled={populatingRoutines || layers.length === 0}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {populatingRoutines ? 'Adding...' : "Add Today's Routines"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Plans Dropdown - Schedule project plans to timeline */}
          <PlanDropdown />

          {/* Lock/Unlock Toggle Button */}
          <Button
            onClick={handleToggleLock}
            variant={settings?.is_locked ? 'default' : 'outline'}
            size={isCompactMode ? 'sm' : 'default'}
            className="gap-2"
          >
            {settings?.is_locked ? (
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

          {/* Quick Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickZoomOut}
              disabled={settings?.zoom_horizontal && settings.zoom_horizontal <= MIN_ZOOM}
              title="Zoom Out (Ctrl + -)"
              className="h-9 w-9 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1 min-w-[3rem] text-center">
              {settings?.zoom_horizontal ?? 100}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickZoomIn}
              disabled={settings?.zoom_horizontal && settings.zoom_horizontal >= MAX_ZOOM}
              title="Zoom In (Ctrl + +)"
              className="h-9 w-9 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Timeline Navigation */}
          <div className="flex items-center gap-1">
            {/* Previous increment */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleJumpBackward}
              title={`Previous ${getJumpLabel()}`}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Jump to Date Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size={isCompactMode ? 'sm' : 'default'} className="gap-2 px-3">
                  <Navigation className="h-4 w-4" />
                  <span className="hidden sm:inline">{!isCompactMode && getJumpLabel()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Jump to Date</h3>
                  <p className="text-xs text-muted-foreground">
                    Navigate to a specific date, or use arrows to jump by {getJumpLabel().toLowerCase()}
                  </p>
                  <input
                    type="date"
                    value={jumpToDate}
                    onChange={(e) => setJumpToDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleJumpToDate(jumpToDate)}
                      disabled={!jumpToDate}
                      className="flex-1"
                    >
                      Go
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleJumpToToday}
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Next increment */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleJumpForward}
              title={`Next ${getJumpLabel()}`}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Sync - moved outside dropdown for proper popover behavior */}
          <CalendarSyncButton />

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={isCompactMode ? 'sm' : 'default'} className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                {!isCompactMode && 'More'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setShowEndOfDay(true)}>
                <Moon className="h-4 w-4 mr-2" />
                End of Day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAIInsights(true)}>
                <Brain className="h-4 w-4 mr-2" />
                AI Insights
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowParkedItems(true)}>
                <Archive className="h-4 w-4 mr-2" />
                Parked Items ({parkedItems?.length || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/booking-links'}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Booking Links
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Timeline Settings</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center px-2 py-1.5 text-sm">
                      <Layers className="h-4 w-4 mr-2" />
                      Layers ({layers.length})
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 max-h-[80vh] overflow-y-auto" side="right">
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
                      onReorderLayers={reorderLayers}
                    />
                  </PopoverContent>
                </Popover>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center px-2 py-1.5 text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Zoom Controls
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 max-h-[80vh] overflow-y-auto" side="right">
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
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Attention System Controls */}
          <div className="flex items-center gap-2">
            <RoleZoneSelector
              showLabels={!isCompactMode}
              size={isCompactMode ? 'sm' : 'default'}
            />
            <AttentionBudgetWidget
              items={items}
              selectedDate={getSelectedDateForBudget()}
              compact={isCompactMode}
            />

            {/* Decision Batching Indicator for Marker mode */}
            {attentionPreferences?.current_role === 'marker' && (
              <DecisionBatchIndicator
                items={items}
                currentDate={getSelectedDateForBudget()}
                onSuggestBatching={(batchItems) => {
                  // Could implement batching suggestions here
                  console.log('Suggest batching for:', batchItems);
                }}
              />
            )}

            {/* Multiplier Dashboard for Multiplier mode */}
            {attentionPreferences?.current_role === 'multiplier' && (
              <MultiplierDashboard
                items={items}
                currentDate={getSelectedDateForBudget()}
                currentRole={attentionPreferences.current_role}
                compact={isCompactMode}
              />
            )}
          </div>

          {/* View Type and Mode Switchers */}
          <div className="ml-auto flex items-center gap-2">
            <ViewTypeSwitcher
              currentViewType={viewType}
              onViewTypeChange={setViewType}
            />
            <ViewModeSwitcher
              currentMode={viewMode}
              onModeChange={setViewMode}
            />
          </div>

          {/* Unscheduled Tasks Panel */}
          <TaskHeaderPanel
            tasks={unscheduledTasks}
            loading={tasksLoading}
            onRefetch={refetchTasks}
            onAddTaskClick={() => setShowAddTask(true)}
          />
        </div>
      </div>

      {/* Add Task Overlay */}
      <AddTaskOverlay
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onTaskCreated={refetchTasks}
      />

      {/* Logjam alert */}
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
              onClick={() => setShowParkedItems(true)}
            >
              View Parked Items
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Workload Indicator */}
      <WorkloadIndicator items={items} />

      {/* Main timeline area */}
      <div className="space-y-4">
        {/* Main timeline or calendar */}
        {layers.length === 0 ? (
          <Alert>
            <AlertDescription>
              Create a layer first to start adding items to your timeline.
            </AlertDescription>
          </Alert>
        ) : viewType === 'calendar' ? (
          <CalendarGrid
            items={items}
            viewMode={viewMode}
            nowTime={nowTime}
            viewDate={calendarViewDate}
            onItemClick={handleItemClick}
            onItemDrop={handleItemDrop}
            onItemResize={handleItemResize}
            onDoubleClick={handleTimelineDoubleClick}
            onQuickAdd={handleQuickAdd}
            onOpenFullEditor={handleTimelineDoubleClick}
            defaultLayerId={layers.find(l => l.is_visible)?.id}
          />
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
            onCanvasReady={onCanvasReady}
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
        onUpdateRecurringThisAndFollowing={updateRecurringThisAndFollowing}
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
        onDeleteRecurringThisAndFollowing={deleteRecurringThisAndFollowing}
        onUpdateRecurringThisAndFollowing={handleEditRecurringThisAndFollowing}
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

      {/* Role-Based Event Templates Dialog */}
      <Dialog open={showRoleTemplates} onOpenChange={setShowRoleTemplates}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <RoleBasedEventTemplates
            preferences={attentionPreferences}
            onCreateEvent={async (template, startTime) => {
              // Create event from template
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
                  setShowRoleTemplates(false);
                  refetchItems();
                } catch (error) {
                  console.error('Error creating event from template:', error);
                }
              }
            }}
            onOpenFullForm={() => {
              setShowRoleTemplates(false);
              setShowAddItemForm(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
