import { describe, expect, it, vi } from 'vitest';
import * as timelineUtils from './timelineUtils';
import { resolveLayerColor } from './layerUtils';

describe('resolveLayerColor', () => {
  it('returns the provided color when it exists', () => {
    expect(resolveLayerColor('#123456')).toBe('#123456');
  });

  it('falls back to a random item color when missing', () => {
    const fallback = '#abcdef';
    const spy = vi.spyOn(timelineUtils, 'getRandomItemColor').mockReturnValue(fallback);

    expect(resolveLayerColor(undefined)).toBe(fallback);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('treats empty strings as missing colors', () => {
    const fallback = '#fedcba';
    const spy = vi.spyOn(timelineUtils, 'getRandomItemColor').mockReturnValue(fallback);

    expect(resolveLayerColor('')).toBe(fallback);

    spy.mockRestore();
  });
});
