import { getRandomItemColor } from '@/lib/timelineUtils';

/**
 * Resolve a layer color, ensuring we always return a valid value.
 * Falls back to a random item color when the layer hasn't been assigned one.
 */
export function resolveLayerColor(color?: string | null): string {
  if (color && color.trim()) {
    return color;
  }

  return getRandomItemColor();
}
