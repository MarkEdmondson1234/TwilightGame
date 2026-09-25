/**
 * Small touch screens (issue #157 follow-up). Production showed a small iPhone
 * in landscape in Chrome at 568x260 CSS px: the camera was already at its 50%
 * floor, eight tiles tall, and the 144px D-pad was 58% of the height.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MIN_ZOOM, getCoverZoom, getZoomLimitsForRoom } from '../hooks/usePinchZoom';
import { TILE_SIZE } from '../constants';
import {
  DPAD_TOGGLE_SIZE_PX,
  QUICK_BAR_RIGHT_PX,
  TOUCH_ABSOLUTE_MIN_ZOOM,
  TOUCH_MIN_VISIBLE_WORLD_HEIGHT_PX,
  dpadFootprint,
  getTouchLayout,
  getTouchLayoutTier,
  getWorldMinZoom,
  quickBarLeft,
} from '../utils/touchLayout';
import { QUICK_SLOT_COUNT } from '../components/QuickSlotBar';
import { isDpadHidden, setDpadHidden } from '../utils/dpadPreference';
import { shouldSuggestHomeScreen } from '../hooks/useHomeScreenTip';

const SANNE = { width: 568, height: 260 };
const PHONE = { width: 844, height: 390 };

describe('camera zoom floor on touch screens', () => {
  it('stays at 50% on desktop and ordinary phones', () => {
    expect(getWorldMinZoom(false, SANNE.height, DEFAULT_MIN_ZOOM)).toBe(DEFAULT_MIN_ZOOM);
    expect(getWorldMinZoom(true, PHONE.height, DEFAULT_MIN_ZOOM)).toBe(DEFAULT_MIN_ZOOM);
    expect(getWorldMinZoom(true, 900, DEFAULT_MIN_ZOOM)).toBe(DEFAULT_MIN_ZOOM);
  });

  it('lets a short screen see as much world as an ordinary phone', () => {
    const zoom = getWorldMinZoom(true, SANNE.height, DEFAULT_MIN_ZOOM);
    expect(zoom).toBeLessThan(DEFAULT_MIN_ZOOM);
    expect(SANNE.height / zoom).toBeGreaterThanOrEqual(TOUCH_MIN_VISIBLE_WORLD_HEIGHT_PX - 1);
    expect(SANNE.height / zoom / TILE_SIZE).toBeGreaterThanOrEqual(12);
  });

  it('never zooms out past the readable limit', () => {
    expect(getWorldMinZoom(true, 120, DEFAULT_MIN_ZOOM)).toBe(TOUCH_ABSOLUTE_MIN_ZOOM);
  });

  it('reaches the pinch limits and the cover zoom of a big map', () => {
    const floor = getWorldMinZoom(true, SANNE.height, DEFAULT_MIN_ZOOM);
    const cover = getCoverZoom(50 * 64, 30 * 64, SANNE.width, SANNE.height, floor);
    expect(cover).toBe(floor);
    expect(getZoomLimitsForRoom(false, false, cover, false, floor).minZoom).toBe(floor);
    // A small map still covers the screen rather than showing a border (#26).
    expect(getCoverZoom(10 * 64, 6 * 64, SANNE.width, SANNE.height, floor)).toBeGreaterThan(floor);
  });
});

describe('touch control layout tiers', () => {
  it('sorts screens by height', () => {
    expect(getTouchLayoutTier(SANNE.height)).toBe('tiny');
    expect(getTouchLayoutTier(PHONE.height)).toBe('compact');
    expect(getTouchLayoutTier(1024)).toBe('regular');
  });

  it('keeps the quick bar where it was on ordinary phones and tablets', () => {
    expect(quickBarLeft(getTouchLayout(1024))).toBe(208);
    expect(quickBarLeft(getTouchLayout(PHONE.height))).toBe(176);
  });

  it('gives a tiny screen a smaller D-pad, and nothing but its toggle when hidden', () => {
    const tiny = dpadFootprint(getTouchLayout(SANNE.height));
    expect(tiny.height).toBeLessThan(dpadFootprint(getTouchLayout(PHONE.height)).height);
    expect(tiny.height / SANNE.height).toBeLessThan(0.5);
    const hidden = dpadFootprint(getTouchLayout(SANNE.height, true));
    expect(hidden.height).toBeLessThanOrEqual(DPAD_TOGGLE_SIZE_PX + 8);
  });

  it('leaves every quick slot tappable at 568x260', () => {
    for (const dpadHidden of [false, true]) {
      const width =
        SANNE.width - quickBarLeft(getTouchLayout(SANNE.height, dpadHidden)) - QUICK_BAR_RIGHT_PX;
      const slot = (width - 12 - 4 * (QUICK_SLOT_COUNT - 1)) / QUICK_SLOT_COUNT;
      expect(
        slot,
        `slot width with the D-pad ${dpadHidden ? 'hidden' : 'shown'}`
      ).toBeGreaterThanOrEqual(32);
    }
  });
});

describe('D-pad preference', () => {
  afterEach(() => {
    setDpadHidden(false);
    vi.restoreAllMocks();
  });

  it('remembers the choice on this device', () => {
    vi.spyOn(window.localStorage, 'setItem');
    vi.spyOn(window.localStorage, 'removeItem');
    setDpadHidden(true);
    expect(isDpadHidden()).toBe(true);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('twilight.touch.dpadHidden', '1');
    setDpadHidden(false);
    expect(isDpadHidden()).toBe(false);
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('twilight.touch.dpadHidden');
  });
});

describe('Add to Home Screen tip', () => {
  const iphoneChrome =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/153.0 Mobile/15E148 Safari/604.1';
  const base = {
    userAgent: iphoneChrome,
    platform: 'iPhone',
    maxTouchPoints: 5,
    standalone: false,
  };

  it('is offered to a short iPhone browser tab', () => {
    expect(shouldSuggestHomeScreen({ ...base, viewportHeight: SANNE.height })).toBe(true);
  });

  it('is not offered once installed, on tall screens, or off iOS', () => {
    expect(shouldSuggestHomeScreen({ ...base, standalone: true, viewportHeight: 260 })).toBe(false);
    expect(shouldSuggestHomeScreen({ ...base, viewportHeight: 800 })).toBe(false);
    expect(
      shouldSuggestHomeScreen({
        userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/153.0 Mobile',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
        standalone: false,
        viewportHeight: 260,
      })
    ).toBe(false);
  });
});
