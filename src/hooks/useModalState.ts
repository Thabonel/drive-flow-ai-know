// Modal State Management Hook
// Consolidates multiple useState declarations for modal visibility

import { useState, useCallback, useMemo } from 'react';

type ModalKey = string;

interface ModalState {
  isOpen: (key: ModalKey) => boolean;
  open: (key: ModalKey) => void;
  close: (key: ModalKey) => void;
  toggle: (key: ModalKey) => void;
  closeAll: () => void;
  openModals: Set<ModalKey>;
}

/**
 * Hook to manage multiple modal states with a single state object
 *
 * Replaces patterns like:
 * ```tsx
 * const [showModal1, setShowModal1] = useState(false);
 * const [showModal2, setShowModal2] = useState(false);
 * const [showModal3, setShowModal3] = useState(false);
 * ```
 *
 * With:
 * ```tsx
 * const modals = useModalState();
 * modals.isOpen('modal1')
 * modals.open('modal1')
 * modals.close('modal1')
 * ```
 *
 * @param initialOpen - Optional array of modal keys that should start open
 */
export function useModalState(initialOpen: ModalKey[] = []): ModalState {
  const [openModals, setOpenModals] = useState<Set<ModalKey>>(
    () => new Set(initialOpen)
  );

  const isOpen = useCallback(
    (key: ModalKey): boolean => openModals.has(key),
    [openModals]
  );

  const open = useCallback((key: ModalKey): void => {
    setOpenModals(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const close = useCallback((key: ModalKey): void => {
    setOpenModals(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggle = useCallback((key: ModalKey): void => {
    setOpenModals(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const closeAll = useCallback((): void => {
    setOpenModals(new Set());
  }, []);

  return useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      closeAll,
      openModals,
    }),
    [isOpen, open, close, toggle, closeAll, openModals]
  );
}

// Common modal keys for the Timeline Manager
export const TIMELINE_MODALS = {
  ADD_ITEM: 'addItem',
  PARKED_ITEMS: 'parkedItems',
  TEMPLATES: 'templates',
  TEMPLATE_BUILDER: 'templateBuilder',
  AI_PLANNING: 'aiPlanning',
  AI_INSIGHTS: 'aiInsights',
  ROUTINES: 'routines',
  DAILY_PLANNING: 'dailyPlanning',
  END_OF_DAY: 'endOfDay',
  ADD_TASK: 'addTask',
  ROLE_TEMPLATES: 'roleTemplates',
  WEEKLY_CALIBRATION: 'weeklyCalibration',
} as const;

export type TimelineModalKey = typeof TIMELINE_MODALS[keyof typeof TIMELINE_MODALS];
