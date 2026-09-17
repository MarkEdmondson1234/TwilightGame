import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPerformanceSettings, resetPerformanceSettings } from '../utils/performanceTier';

function device(ua: string, cores?: number, memory?: number, touch = false) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua });
  Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: cores });
  Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: memory });
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: touch ? 5 : 0 });
}
const keys = ['userAgent', 'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints'];
const original = keys.map((key) => Object.getOwnPropertyDescriptor(navigator, key));
beforeEach(() => {
  resetPerformanceSettings();
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
});
afterEach(() => {
  keys.forEach((key, i) => {
    if (original[i]) Object.defineProperty(navigator, key, original[i]!);
    else Reflect.deleteProperty(navigator, key);
  });
  vi.restoreAllMocks();
  resetPerformanceSettings();
});

describe('desktop capability profiles', () => {
  it.each([
    ['Mozilla/5.0 (X11; CrOS x86_64) Chrome/140', 4, 4],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/140', 8, 4],
    ['Mozilla/5.0 (X11; CrOS aarch64) Chrome/140', 4, 8],
  ])('uses a balanced profile for %s (%i cores, %i GB)', (ua, cores, memory) => {
    device(ua, cores, memory);
    expect(getPerformanceSettings()).toMatchObject({
      tier: 'medium',
      isMobile: false,
      antialias: false,
      glowSteps: 8,
      resolution: 1.5,
      generateMipmaps: false,
      textureBudgetMB: 512,
      maxConcurrentTextureLoads: 6,
    });
  });
  it.each([
    [2, 4],
    [8, 2],
  ])('uses low quality with %i cores and %i GB', (cores, memory) => {
    device('Mozilla/5.0 (X11; CrOS x86_64) Chrome/140', cores, memory);
    expect(getPerformanceSettings()).toMatchObject({
      tier: 'low',
      resolution: 1,
      enableShadows: false,
      enableGlows: false,
      antialias: false,
      generateMipmaps: false,
      textureBudgetMB: 384,
      maxConcurrentTextureLoads: 4,
    });
  });
  it('falls back conservatively on a Chromebook with hidden capabilities', () => {
    device('Mozilla/5.0 (X11; CrOS x86_64) Chrome/140');
    expect(getPerformanceSettings().tier).toBe('medium');
  });
  it('retains high quality on a capable Chromebook', () => {
    device('Mozilla/5.0 (X11; CrOS x86_64) Chrome/140', 8, 8);
    expect(getPerformanceSettings()).toMatchObject({
      tier: 'high',
      antialias: true,
      glowSteps: 32,
      generateMipmaps: true,
      textureBudgetMB: 1536,
      maxConcurrentTextureLoads: 16,
    });
  });
  it('does not treat missing desktop memory as low memory', () => {
    device('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605', 8);
    expect(getPerformanceSettings().tier).toBe('high');
  });
  it('does not increase resolution on a 1x display', () => {
    device('Mozilla/5.0 (X11; CrOS x86_64) Chrome/140', 4, 4);
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1);
    expect(getPerformanceSettings().resolution).toBe(1);
  });
  it('a fast iPhone keeps the HIGH tier label and mobile memory policy but renders with the MEDIUM profile', () => {
    // Every iPhone from the 8/X onward has 6+ cores and Safari hides
    // deviceMemory, so they detect as HIGH. Their GPUs cannot afford 2×
    // resolution plus MSAA plus 32-step glows; the render profile is capped
    // (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §4 item 7).
    device('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari/605', 6, undefined, true);
    expect(getPerformanceSettings()).toMatchObject({
      tier: 'high',
      isMobile: true,
      antialias: false,
      resolution: 1.5,
      glowSteps: 8,
      darknessCompositeScale: 0.25,
      particleScale: 0.4,
      generateMipmaps: false,
      textureBudgetMB: 384,
      maxConcurrentTextureLoads: 6,
      halfResolutionSprites: true,
    });
  });

  it('a desktop HIGH tier keeps the full render profile', () => {
    device('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/140', 8, 8);
    expect(getPerformanceSettings()).toMatchObject({
      tier: 'high',
      isMobile: false,
      antialias: true,
      resolution: 2,
      glowSteps: 32,
      darknessCompositeScale: 0.5,
      particleScale: 1,
      halfResolutionSprites: false,
    });
  });
});
