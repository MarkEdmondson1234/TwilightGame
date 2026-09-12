/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { getRendererResolution } from '../utils/rendererResolution';

describe('browser zoom framebuffer budget', () => {
  it('retains normal resolution at the physical screen size', () => {
    expect(getRendererResolution(844, 390, 844, 390, 1.5)).toBe(1.5);
  });
  it('keeps the same pixel budget when 50% browser zoom doubles both logical dimensions', () => {
    const resolution = getRendererResolution(1688, 780, 844, 390, 1.5);
    expect(resolution).toBe(0.75);
    expect(1688 * 780 * resolution ** 2).toBe(844 * 390 * 1.5 ** 2);
  });
  it('preserves the budget through rotation and does not upscale small windows', () => {
    expect(getRendererResolution(390, 844, 844, 390, 1.5)).toBe(1.5);
    expect(getRendererResolution(400, 300, 1920, 1080, 2)).toBe(2);
  });
});
