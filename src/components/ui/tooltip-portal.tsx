/**
 * TooltipPortal - Managed Tooltip Container
 *
 * Provides consistent tooltip behavior and z-index management
 * by rendering tooltips in a portal to the document body.
 */

import { createPortal } from 'react-dom';
import { useState, useEffect, useRef, ReactNode } from 'react';
import { Z_INDEX_CLASSES } from '@/lib/z-index';
import { cn } from '@/lib/utils';

interface TooltipPortalProps {
  trigger: ReactNode;
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  delayMs?: number;
}

export function TooltipPortal({
  trigger,
  content,
  side = 'top',
  align = 'center',
  disabled = false,
  className = '',
  contentClassName = '',
  delayMs = 300
}: TooltipPortalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate tooltip position
  const calculatePosition = (triggerRect: DOMRect) => {
    const offset = 8; // Distance from trigger
    let x = 0;
    let y = 0;

    // Calculate base position based on side
    switch (side) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2;
        y = triggerRect.top - offset;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2;
        y = triggerRect.bottom + offset;
        break;
      case 'left':
        x = triggerRect.left - offset;
        y = triggerRect.top + triggerRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + offset;
        y = triggerRect.top + triggerRect.height / 2;
        break;
    }

    // Adjust for alignment
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          x = triggerRect.left;
          break;
        case 'end':
          x = triggerRect.right;
          break;
        // 'center' is already handled above
      }
    } else {
      switch (align) {
        case 'start':
          y = triggerRect.top;
          break;
        case 'end':
          y = triggerRect.bottom;
          break;
        // 'center' is already handled above
      }
    }

    return { x, y };
  };

  // Show tooltip with delay
  const showTooltip = () => {
    if (disabled) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }

    showTimeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const pos = calculatePosition(rect);
        setPosition(pos);
        setIsVisible(true);
      }
    }, delayMs);
  };

  // Hide tooltip
  const hideTooltip = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100); // Small delay to allow moving between trigger and tooltip
  };

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const pos = calculatePosition(rect);
        setPosition(pos);
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, side, align]);

  return (
    <>
      <div
        ref={triggerRef}
        className={cn('inline-block', className)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {trigger}
      </div>

      {isVisible && !disabled && createPortal(
        <div
          className={cn(
            'absolute pointer-events-none',
            'px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900',
            'rounded-md shadow-lg border',
            'transition-opacity duration-200',
            Z_INDEX_CLASSES.TOOLTIPS,
            contentClassName
          )}
          style={{
            left: side === 'right' ? position.x :
                  side === 'left' ? position.x :
                  align === 'start' ? position.x :
                  align === 'end' ? position.x :
                  position.x - 50, // center by default
            top: side === 'bottom' ? position.y :
                 side === 'top' ? position.y :
                 align === 'start' ? position.y :
                 align === 'end' ? position.y :
                 position.y - 12, // center by default
            transform:
              side === 'top' ? 'translateY(-100%)' :
              side === 'left' ? 'translateX(-100%)' :
              side === 'right' ? 'translateX(0)' :
              side === 'bottom' ? 'translateY(0)' :
              'translateY(-50%)',
            maxWidth: 300,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={() => {
            // Keep tooltip visible when hovering over it
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = undefined;
            }
          }}
          onMouseLeave={hideTooltip}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}