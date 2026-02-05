// Accessibility Timeline Controller - WCAG 2.1 AA Compliance
// Comprehensive keyboard navigation, screen reader support, and focus management

import { useState, useRef, useEffect, useCallback, useContext, createContext } from 'react';
import { TimelineItem, TimelineLayer } from '@/lib/timelineUtils';

// ARIA live region types for announcements
type AnnouncementType = 'polite' | 'assertive' | 'off';

interface AccessibilityAnnouncement {
  message: string;
  type: AnnouncementType;
  timestamp: number;
}

interface KeyboardNavigationState {
  focusedItemIndex: number;
  focusedLayerIndex: number;
  navigationMode: 'item' | 'layer' | 'time';
  isSelectMode: boolean;
  selectedItems: Set<string>;
}

interface AccessibilityContext {
  // Announcements
  announce: (message: string, type?: AnnouncementType) => void;
  clearAnnouncements: () => void;

  // Keyboard navigation
  navigationState: KeyboardNavigationState;
  focusItem: (itemId: string) => void;
  focusLayer: (layerId: string) => void;
  toggleItemSelection: (itemId: string) => void;
  clearSelection: () => void;

  // Screen reader support
  getItemDescription: (item: TimelineItem) => string;
  getLayerDescription: (layer: TimelineLayer) => string;
  getTimelineStatus: () => string;

  // High contrast mode
  highContrastMode: boolean;
  toggleHighContrast: () => void;

  // Reduced motion
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
}

const A11yContext = createContext<AccessibilityContext | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useAccessibility must be used within A11yTimelineProvider');
  }
  return context;
};

interface A11yTimelineProviderProps {
  children: React.ReactNode;
  items: TimelineItem[];
  layers: TimelineLayer[];
}

export const A11yTimelineProvider: React.FC<A11yTimelineProviderProps> = ({
  children,
  items,
  layers
}) => {
  // Announcement system
  const [announcements, setAnnouncements] = useState<AccessibilityAnnouncement[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Navigation state
  const [navigationState, setNavigationState] = useState<KeyboardNavigationState>({
    focusedItemIndex: -1,
    focusedLayerIndex: 0,
    navigationMode: 'item',
    isSelectMode: false,
    selectedItems: new Set(),
  });

  // Accessibility preferences
  const [highContrastMode, setHighContrastMode] = useState(() => {
    return localStorage.getItem('timeline-high-contrast') === 'true';
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    const stored = localStorage.getItem('timeline-reduced-motion');
    if (stored !== null) return stored === 'true';

    // Check system preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Announcement functions
  const announce = useCallback((message: string, type: AnnouncementType = 'polite') => {
    const announcement: AccessibilityAnnouncement = {
      message,
      type,
      timestamp: Date.now(),
    };

    setAnnouncements(prev => [...prev.slice(-4), announcement]); // Keep last 5 announcements

    // Also use ARIA live regions
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', type);
      liveRegionRef.current.textContent = message;
    }
  }, []);

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = '';
    }
  }, []);

  // Keyboard navigation functions
  const focusItem = useCallback((itemId: string) => {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      setNavigationState(prev => ({
        ...prev,
        focusedItemIndex: itemIndex,
        navigationMode: 'item',
      }));

      const item = items[itemIndex];
      announce(`Focused on ${item.title}, ${getItemDescription(item)}`, 'polite');
    }
  }, [items, announce]);

  const focusLayer = useCallback((layerId: string) => {
    const layerIndex = layers.findIndex(layer => layer.id === layerId);
    if (layerIndex !== -1) {
      setNavigationState(prev => ({
        ...prev,
        focusedLayerIndex: layerIndex,
        navigationMode: 'layer',
      }));

      const layer = layers[layerIndex];
      announce(`Focused on layer ${layer.name}, ${getLayerDescription(layer)}`, 'polite');
    }
  }, [layers, announce]);

  const toggleItemSelection = useCallback((itemId: string) => {
    setNavigationState(prev => {
      const newSelected = new Set(prev.selectedItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
        announce(`Deselected item`, 'polite');
      } else {
        newSelected.add(itemId);
        announce(`Selected item`, 'polite');
      }

      return {
        ...prev,
        selectedItems: newSelected,
      };
    });
  }, [announce]);

  const clearSelection = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      selectedItems: new Set(),
      isSelectMode: false,
    }));
    announce('Selection cleared', 'polite');
  }, [announce]);

  // Description generators for screen readers
  const getItemDescription = useCallback((item: TimelineItem): string => {
    const startTime = new Date(item.start_time);
    const endTime = new Date(startTime.getTime() + item.duration_minutes * 60 * 1000);

    const parts = [
      `Duration: ${item.duration_minutes} minutes`,
      `From ${startTime.toLocaleTimeString()} to ${endTime.toLocaleTimeString()}`,
      `Status: ${item.status}`,
    ];

    if (item.priority) {
      parts.push(`Priority: ${item.priority} out of 10`);
    }

    if (item.notes) {
      parts.push(`Notes: ${item.notes}`);
    }

    if (item.tags && item.tags.length > 0) {
      parts.push(`Tags: ${item.tags.join(', ')}`);
    }

    return parts.join('. ');
  }, []);

  const getLayerDescription = useCallback((layer: TimelineLayer): string => {
    const itemCount = items.filter(item => item.layer_id === layer.id).length;
    const parts = [
      `${itemCount} item${itemCount !== 1 ? 's' : ''}`,
      layer.is_visible ? 'Visible' : 'Hidden',
    ];

    if (layer.description) {
      parts.push(layer.description);
    }

    return parts.join('. ');
  }, [items]);

  const getTimelineStatus = useCallback((): string => {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.status === 'completed').length;
    const overdueItems = items.filter(item => item.status === 'logjam').length;
    const visibleLayers = layers.filter(layer => layer.is_visible).length;

    return [
      `Timeline with ${totalItems} total items`,
      `${completedItems} completed`,
      overdueItems > 0 ? `${overdueItems} overdue` : null,
      `Showing ${visibleLayers} of ${layers.length} layers`,
    ].filter(Boolean).join('. ');
  }, [items, layers]);

  // Accessibility preference toggles
  const toggleHighContrast = useCallback(() => {
    const newValue = !highContrastMode;
    setHighContrastMode(newValue);
    localStorage.setItem('timeline-high-contrast', newValue.toString());
    announce(`High contrast mode ${newValue ? 'enabled' : 'disabled'}`, 'polite');
  }, [highContrastMode, announce]);

  const toggleReducedMotion = useCallback(() => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    localStorage.setItem('timeline-reduced-motion', newValue.toString());
    announce(`Reduced motion ${newValue ? 'enabled' : 'disabled'}`, 'polite');
  }, [reducedMotion, announce]);

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { focusedItemIndex, focusedLayerIndex, navigationMode, isSelectMode } = navigationState;

      switch (e.code) {
        case 'ArrowRight':
          e.preventDefault();
          if (navigationMode === 'item') {
            const nextIndex = Math.min(focusedItemIndex + 1, items.length - 1);
            if (nextIndex !== focusedItemIndex) {
              focusItem(items[nextIndex].id);
            }
          } else if (navigationMode === 'time') {
            announce('Navigate forward in time', 'polite');
            // Would trigger time navigation in parent component
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (navigationMode === 'item') {
            const prevIndex = Math.max(focusedItemIndex - 1, 0);
            if (prevIndex !== focusedItemIndex) {
              focusItem(items[prevIndex].id);
            }
          } else if (navigationMode === 'time') {
            announce('Navigate backward in time', 'polite');
            // Would trigger time navigation in parent component
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (navigationMode === 'layer') {
            const prevLayerIndex = Math.max(focusedLayerIndex - 1, 0);
            if (prevLayerIndex !== focusedLayerIndex) {
              focusLayer(layers[prevLayerIndex].id);
            }
          } else if (navigationMode === 'item') {
            // Move to item in layer above
            const currentItem = items[focusedItemIndex];
            const currentLayerIndex = layers.findIndex(l => l.id === currentItem?.layer_id);
            if (currentLayerIndex > 0) {
              const targetLayer = layers[currentLayerIndex - 1];
              const layerItems = items.filter(item => item.layer_id === targetLayer.id);
              if (layerItems.length > 0) {
                focusItem(layerItems[0].id);
              }
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (navigationMode === 'layer') {
            const nextLayerIndex = Math.min(focusedLayerIndex + 1, layers.length - 1);
            if (nextLayerIndex !== focusedLayerIndex) {
              focusLayer(layers[nextLayerIndex].id);
            }
          } else if (navigationMode === 'item') {
            // Move to item in layer below
            const currentItem = items[focusedItemIndex];
            const currentLayerIndex = layers.findIndex(l => l.id === currentItem?.layer_id);
            if (currentLayerIndex < layers.length - 1) {
              const targetLayer = layers[currentLayerIndex + 1];
              const layerItems = items.filter(item => item.layer_id === targetLayer.id);
              if (layerItems.length > 0) {
                focusItem(layerItems[0].id);
              }
            }
          }
          break;

        case 'Space':
          e.preventDefault();
          if (focusedItemIndex >= 0) {
            const item = items[focusedItemIndex];
            toggleItemSelection(item.id);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (focusedItemIndex >= 0) {
            const item = items[focusedItemIndex];
            announce(`Activated ${item.title}`, 'polite');
            // Would trigger item action in parent component
          }
          break;

        case 'Escape':
          e.preventDefault();
          if (isSelectMode) {
            clearSelection();
          }
          break;

        case 'KeyT':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setNavigationState(prev => ({ ...prev, navigationMode: 'time' }));
            announce('Time navigation mode', 'polite');
          }
          break;

        case 'KeyL':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setNavigationState(prev => ({ ...prev, navigationMode: 'layer' }));
            announce('Layer navigation mode', 'polite');
          }
          break;

        case 'KeyI':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setNavigationState(prev => ({ ...prev, navigationMode: 'item' }));
            announce('Item navigation mode', 'polite');
          }
          break;

        case 'KeyA':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Select all items
            const allItemIds = new Set(items.map(item => item.id));
            setNavigationState(prev => ({
              ...prev,
              selectedItems: allItemIds,
              isSelectMode: true,
            }));
            announce(`Selected all ${items.length} items`, 'polite');
          }
          break;

        case 'KeyS':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            announce(getTimelineStatus(), 'polite');
          }
          break;

        case 'KeyH':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleHighContrast();
          }
          break;

        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleReducedMotion();
          }
          break;

        case 'F1':
          e.preventDefault();
          announce(`Keyboard shortcuts: Arrow keys to navigate, Space to select, Enter to activate, Ctrl+T for time mode, Ctrl+L for layer mode, Ctrl+I for item mode, Ctrl+S for status, Ctrl+H for high contrast, Ctrl+R for reduced motion`, 'polite');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigationState, items, layers, focusItem, focusLayer, toggleItemSelection, clearSelection, getTimelineStatus, toggleHighContrast, toggleReducedMotion, announce]);

  // Announce initial status
  useEffect(() => {
    announce(getTimelineStatus(), 'polite');
  }, [getTimelineStatus, announce]);

  const contextValue: AccessibilityContext = {
    announce,
    clearAnnouncements,
    navigationState,
    focusItem,
    focusLayer,
    toggleItemSelection,
    clearSelection,
    getItemDescription,
    getLayerDescription,
    getTimelineStatus,
    highContrastMode,
    toggleHighContrast,
    reducedMotion,
    toggleReducedMotion,
  };

  return (
    <A11yContext.Provider value={contextValue}>
      {/* ARIA live regions for announcements */}
      <div className="sr-only">
        <div
          ref={liveRegionRef}
          aria-live="polite"
          aria-atomic="true"
          role="status"
        />
        <div
          aria-live="assertive"
          aria-atomic="true"
          role="alert"
        />
      </div>

      {/* Accessibility status panel (hidden by default, shown via keyboard shortcut) */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:border focus:border-gray-300 focus:rounded focus:p-4 focus:shadow-lg focus:z-50">
        <h2 className="text-lg font-semibold mb-2">Timeline Accessibility Status</h2>
        <div className="space-y-2 text-sm">
          <div>Navigation mode: {navigationState.navigationMode}</div>
          <div>Selected items: {navigationState.selectedItems.size}</div>
          <div>High contrast: {highContrastMode ? 'On' : 'Off'}</div>
          <div>Reduced motion: {reducedMotion ? 'On' : 'Off'}</div>
          <div className="mt-4">
            <strong>Keyboard shortcuts:</strong>
            <ul className="mt-1 space-y-1">
              <li>Arrow keys: Navigate</li>
              <li>Space: Select/deselect</li>
              <li>Enter: Activate</li>
              <li>Ctrl+T: Time navigation</li>
              <li>Ctrl+L: Layer navigation</li>
              <li>Ctrl+I: Item navigation</li>
              <li>Ctrl+S: Status report</li>
              <li>Ctrl+H: Toggle high contrast</li>
              <li>Ctrl+R: Toggle reduced motion</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Apply accessibility styles */}
      <div
        className={`
          ${highContrastMode ? 'accessibility-high-contrast' : ''}
          ${reducedMotion ? 'accessibility-reduced-motion' : ''}
        `}
      >
        {children}
      </div>
    </A11yContext.Provider>
  );
};

// Accessibility-enhanced timeline item component
interface A11yTimelineItemProps {
  item: TimelineItem;
  layer: TimelineLayer;
  isFocused: boolean;
  isSelected: boolean;
  onFocus: () => void;
  onActivate: () => void;
  children: React.ReactNode;
}

export const A11yTimelineItem: React.FC<A11yTimelineItemProps> = ({
  item,
  layer,
  isFocused,
  isSelected,
  onFocus,
  onActivate,
  children
}) => {
  const { getItemDescription } = useAccessibility();
  const elementRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (isFocused && elementRef.current) {
      elementRef.current.focus();
    }
  }, [isFocused]);

  const description = getItemDescription(item);

  return (
    <div
      ref={elementRef}
      role="gridcell"
      aria-label={`${item.title}, ${description}`}
      aria-selected={isSelected}
      aria-describedby={`item-${item.id}-description`}
      tabIndex={isFocused ? 0 : -1}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          onActivate();
        }
      }}
      className={`
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isSelected ? 'ring-2 ring-orange-500 ring-offset-2' : ''}
      `}
    >
      {children}

      {/* Hidden description for screen readers */}
      <div id={`item-${item.id}-description`} className="sr-only">
        {description}
      </div>
    </div>
  );
};

// CSS for accessibility features
const accessibilityStyles = `
  .accessibility-high-contrast {
    --color-primary: #000000;
    --color-secondary: #ffffff;
    --color-accent: #ffff00;
    --color-success: #00ff00;
    --color-error: #ff0000;
    --color-warning: #ff8800;
    filter: contrast(150%) brightness(120%);
  }

  .accessibility-reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .accessibility-reduced-motion * {
      animation: none !important;
      transition: none !important;
    }
  }

  /* Screen reader only class */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }
`;

// Inject accessibility styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = accessibilityStyles;
  document.head.appendChild(style);
}