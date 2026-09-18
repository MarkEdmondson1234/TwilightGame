/**
 * A session that dies without a trace still tells the next boot what it was
 * doing. On iOS a memory kill runs no code — the player sees the page refresh
 * back to the title screen and Sentry sees silence. The heartbeat left in
 * localStorage is the only witness (utils/sessionHeartbeat.ts).
 */
/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import {
  startHeartbeat,
  takePreviousAbruptEnd,
  HEARTBEAT_KEY,
  HEARTBEAT_MS,
  STALE_AFTER_MS,
  type HeartbeatState,
  type StorageLike,
} from '../utils/sessionHeartbeat';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function harness(state: Partial<HeartbeatState> = {}) {
  const storage = memoryStorage();
  let now = 1_000_000;
  let hidden = false;
  const visibility: (() => void)[] = [];
  const pagehide: (() => void)[] = [];
  const intervals: (() => void)[] = [];
  const current: HeartbeatState = {
    map: 'village',
    inFlight: null,
    inFlightSinceMs: null,
    residentTextureMB: 181,
    sceneTextureMB: 88,
    visibleSprites: 700,
    uptimeMs: 60_000,
    worldReady: true,
    ...state,
  };
  const hb = startHeartbeat({
    storage,
    now: () => now,
    sessionId: 'sess-1',
    release: 'abc123',
    getState: () => current,
    isHidden: () => hidden,
    onVisibilityChange: (h) => {
      visibility.push(h);
      return () => {};
    },
    onPageHide: (h) => {
      pagehide.push(h);
      return () => {};
    },
    setInterval: (fn) => {
      intervals.push(fn);
      return 1;
    },
    clearInterval: () => {},
  });
  return {
    storage,
    hb,
    current,
    tick: (ms: number) => {
      now += ms;
      intervals.forEach((f) => f());
    },
    hide: () => {
      hidden = true;
      visibility.forEach((h) => h());
    },
    leave: () => pagehide.forEach((h) => h()),
    nowPlus: (ms: number) => now + ms,
  };
}

describe('session heartbeat', () => {
  it('writes a heartbeat at once and on the interval', () => {
    const h = harness();
    expect(h.storage.data.has(HEARTBEAT_KEY)).toBe(true);
    h.current.map = 'shop';
    h.tick(HEARTBEAT_MS);
    expect(JSON.parse(h.storage.data.get(HEARTBEAT_KEY)!).map).toBe('shop');
  });

  it('a session that never unloaded is reported as an abrupt foreground end, with what it was doing', () => {
    const h = harness({ inFlight: 'texture_batch', inFlightSinceMs: 999_000, map: 'shop' });
    // The process is killed here: no pagehide, no further beats.
    const abrupt = takePreviousAbruptEnd(h.storage, h.nowPlus(30_000));
    expect(abrupt).not.toBeNull();
    expect(abrupt!.kind).toBe('foreground');
    expect(abrupt!.previous.map).toBe('shop');
    expect(abrupt!.previous.inFlight).toBe('texture_batch');
    expect(abrupt!.previous.residentTextureMB).toBe(181);
    expect(abrupt!.previous.release).toBe('abc123');
    expect(abrupt!.gapMs).toBe(30_000);
    // Consumed: the boot after that has nothing to report.
    expect(takePreviousAbruptEnd(h.storage, h.nowPlus(31_000))).toBeNull();
  });

  it('a tab reclaimed while hidden is a background end, not a crash', () => {
    const h = harness();
    h.hide();
    const abrupt = takePreviousAbruptEnd(h.storage, h.nowPlus(600_000));
    expect(abrupt?.kind).toBe('background');
  });

  it('a clean close (pagehide) is not reported', () => {
    const h = harness();
    h.leave();
    expect(takePreviousAbruptEnd(h.storage, h.nowPlus(1_000))).toBeNull();
  });

  it('a record older than a day is not a crash worth an issue', () => {
    const h = harness();
    expect(takePreviousAbruptEnd(h.storage, h.nowPlus(STALE_AFTER_MS + 1))).toBeNull();
  });

  it('survives a storage that throws', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('QuotaExceeded');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    expect(takePreviousAbruptEnd(broken, 1)).toBeNull();
    expect(() =>
      startHeartbeat({
        storage: broken,
        now: () => 1,
        sessionId: 's',
        release: 'r',
        getState: () => ({
          map: 'village', inFlight: null, inFlightSinceMs: null, residentTextureMB: null,
          sceneTextureMB: null, visibleSprites: null, uptimeMs: 0, worldReady: false,
        }),
        isHidden: () => false,
        onVisibilityChange: () => () => {},
        onPageHide: () => () => {},
        setInterval: () => 1,
        clearInterval: vi.fn(),
      })
    ).not.toThrow();
  });
});
