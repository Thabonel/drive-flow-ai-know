/**
 * Centralized Z-Index Management System - Enhanced for Complex UIs
 *
 * Defines all z-index values used throughout the Timeline interface
 * to prevent overlapping elements and create clear layer hierarchy.
 *
 * Handles nested popovers, multiple modal states, and responsive components.
 */

export const Z_INDEX = {
  // Base layers
  BACKGROUND: 0,
  CONTENT: 1,

  // Timeline layers
  TIMELINE_BASE: 10,
  TIMELINE_ITEMS: 15,
  TIMELINE_HOVER: 20,
  TIMELINE_DRAGGING: 25,
  TIMELINE_NOW_LINE: 30,

  // UI Overlays (ordered by priority)
  CALENDAR_HEADERS: 35,
  CALENDAR_TIME_COLUMN: 40,
  DRAG_PREVIEW: 45,
  ALERTS: 50,
  QUICK_ADD_FORMS: 55,
  TOOLTIPS: 60,

  // Dropdown and popover system - expanded for nesting
  DROPDOWN_TRIGGER: 65,
  DROPDOWN_CONTENT: 70,
  POPOVER_TRIGGER: 75,
  POPOVER_CONTENT: 80,
  NESTED_POPOVER: 85, // For popovers inside dropdowns
  CONTEXT_MENU: 90,   // Right-click menus

  // Interface mode and responsive overlays
  INTERFACE_MODE_PANEL: 95,
  MOBILE_OVERLAY: 100,
  BOTTOM_SHEET: 105, // Mobile-style slide-up panels

  // Top level overlays - increased spacing
  SIDEBAR_OVERLAY: 110,
  MODAL_BACKDROP: 120,
  MODAL_CONTENT: 130,
  NESTED_MODAL: 140,      // For modals that open from other modals
  LOADING_OVERLAY: 150,    // Loading states

  // System level - highest priority
  TOAST_NOTIFICATIONS: 160,
  ERROR_BOUNDARIES: 170,
  DEBUG_PANELS: 180,      // Development tools
  CRITICAL_ALERTS: 190,   // Emergency system messages
} as const;

// Type for z-index values
export type ZIndexLevel = typeof Z_INDEX[keyof typeof Z_INDEX];

/**
 * Helper function to get z-index value with optional offset
 */
export function getZIndex(level: keyof typeof Z_INDEX, offset: number = 0): number {
  return Z_INDEX[level] + offset;
}

/**
 * CSS class mapping for common z-index levels
 */
export const Z_INDEX_CLASSES = {
  BACKGROUND: 'z-0',
  CONTENT: 'z-[1]',
  TIMELINE_BASE: 'z-[10]',
  TIMELINE_ITEMS: 'z-[15]',
  TIMELINE_HOVER: 'z-[20]',
  TIMELINE_DRAGGING: 'z-[25]',
  TIMELINE_NOW_LINE: 'z-[30]',
  CALENDAR_HEADERS: 'z-[35]',
  CALENDAR_TIME_COLUMN: 'z-[40]',
  DRAG_PREVIEW: 'z-[45]',
  ALERTS: 'z-[50]',
  QUICK_ADD_FORMS: 'z-[55]',
  TOOLTIPS: 'z-[60]',
  DROPDOWN_TRIGGER: 'z-[65]',
  DROPDOWN_CONTENT: 'z-[70]',
  POPOVER_TRIGGER: 'z-[75]',
  POPOVER_CONTENT: 'z-[80]',
  NESTED_POPOVER: 'z-[85]',
  CONTEXT_MENU: 'z-[90]',
  INTERFACE_MODE_PANEL: 'z-[95]',
  MOBILE_OVERLAY: 'z-[100]',
  BOTTOM_SHEET: 'z-[105]',
  DRAG_OVERLAY: 'z-[110]', // For drag and drop operations
  SIDEBAR_OVERLAY: 'z-[110]',
  MODAL_BACKDROP: 'z-[120]',
  MODAL_CONTENT: 'z-[130]',
  NESTED_MODAL: 'z-[140]',
  LOADING_OVERLAY: 'z-[150]',
  TOAST_NOTIFICATIONS: 'z-[160]',
  ERROR_BOUNDARIES: 'z-[170]',
  DEBUG_PANELS: 'z-[180]',
  CRITICAL_ALERTS: 'z-[190]',
} as const;

/**
 * Stacking context utilities for complex nested scenarios
 */
export class StackingContextManager {
  private static contextStack: string[] = [];

  /**
   * Enter a new stacking context (e.g., when opening a modal)
   */
  static enterContext(contextId: string): number {
    this.contextStack.push(contextId);
    return this.getContextDepth();
  }

  /**
   * Exit the current stacking context
   */
  static exitContext(contextId: string): number {
    const index = this.contextStack.lastIndexOf(contextId);
    if (index !== -1) {
      this.contextStack.splice(index, 1);
    }
    return this.getContextDepth();
  }

  /**
   * Get the current context depth for z-index calculation
   */
  static getContextDepth(): number {
    return this.contextStack.length;
  }

  /**
   * Calculate z-index for nested components
   * Base z-index + (context depth * 10)
   */
  static getNestedZIndex(baseLevel: keyof typeof Z_INDEX): number {
    const baseValue = Z_INDEX[baseLevel];
    const contextBoost = this.getContextDepth() * 10;
    return baseValue + contextBoost;
  }

  /**
   * Clear all contexts (for cleanup/reset)
   */
  static clearContexts(): void {
    this.contextStack = [];
  }
}

/**
 * Portal management for ensuring proper z-index behavior
 */
export const createPortalContainer = (zIndexLevel: keyof typeof Z_INDEX): HTMLElement => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = Z_INDEX[zIndexLevel].toString();
  container.setAttribute('data-z-index-level', zIndexLevel);

  // Ensure container exists in DOM
  document.body.appendChild(container);

  return container;
};

// React import for the hook
import { useEffect, useState } from 'react';

/**
 * React hook for managing stacking contexts
 */
export const useStackingContext = (contextId: string, isActive: boolean = true) => {
  const [zIndexOffset, setZIndexOffset] = useState(0);

  useEffect(() => {
    if (isActive) {
      const depth = StackingContextManager.enterContext(contextId);
      setZIndexOffset(depth * 10);

      return () => {
        StackingContextManager.exitContext(contextId);
        setZIndexOffset(StackingContextManager.getContextDepth() * 10);
      };
    }
  }, [contextId, isActive]);

  return {
    zIndexOffset,
    getZIndex: (level: keyof typeof Z_INDEX) => Z_INDEX[level] + zIndexOffset,
    getZIndexClass: (level: keyof typeof Z_INDEX) => `z-[${Z_INDEX[level] + zIndexOffset}]`,
  };
};