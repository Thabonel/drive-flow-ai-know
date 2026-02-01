import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import {
  ATTENTION_TYPE_DESCRIPTIONS,
  ATTENTION_TYPES,
  AttentionType,
} from '@/lib/attentionTypes';

interface AttentionLegendProps {
  className?: string;
  compact?: boolean;
}

export function AttentionLegend({ className, compact = false }: AttentionLegendProps) {
  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={`gap-2 ${className}`}>
            <Info className="h-4 w-4" />
            <span>Legend</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <AttentionLegend compact={false} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-semibold text-foreground">Attention Types</h4>

      <div className="grid grid-cols-1 gap-2">
        {Object.values(ATTENTION_TYPES).map((type) => {
          const desc = ATTENTION_TYPE_DESCRIPTIONS[type];
          return (
            <div key={type} className="flex items-center gap-3">
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: desc.color }}
              >
                {desc.icon}
              </div>

              {/* Label and description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{desc.label}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {desc.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t space-y-2">
        <h5 className="text-xs font-semibold text-muted-foreground">Other Indicators</h5>

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <span>High Priority (4-5)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white text-xs">★</span>
            </div>
            <span>Non-negotiable</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span>Completed</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse">
            </div>
            <span>Logjam (overdue)</span>
          </div>
        </div>
      </div>
    </div>
  );
}