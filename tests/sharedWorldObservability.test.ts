// @vitest-environment node
/**
 * "She can see me but I can't see her" — the shared world's failure modes that
 * leave no trace.
 *
 * Every case here is a step that used to return quietly (`null`, `false`, a
 * record silently skipped) and had no Sentry event, no ungated log line and
 * no retry. Two players staring at different worlds could not be told apart
 * from an offline game. These tests pin the three things that changed:
 *
 *  1. The presence ghost check judges records on the *server's* clock, so a
 *     tablet whose time is minutes out does not discard every live player.
 *  2. Every inbound presence record that is dropped, and a device clock that is
 *     well out, is reported — once per cause per session.
 *  3. A picture that fails to reach the cloud (never uploaded because nobody was
 *     signed in yet, or rejected) and a picture the other side cannot fetch are
 *     both reported, with a reason that says which side lost it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reporting = vi.hoisted(() => ({
  reportError: vi.fn(),
  reportErrorOnce: vi.fn(),
  reportMessage: vi.fn(),
  reportMessageOnce: vi.fn(),
}));
vi.mock('../utils/errorReporting', () => reporting);

// ---------------------------------------------------------------------------
// In-memory RTDB adapter — just enough to drive presenceService.
// ---------------------------------------------------------------------------
const rtdb = vi.hoisted(() => {
  type Callback = (snapshot: { key: string | null; val: () => unknown }) => void;
  const childAdded = new Map<string, Callback>();
  const valueWatchers = new Map<string, Callback>();
  return {
    childAdded,
    valueWatchers,
    removed: [] as string[],
    reset() {
      childAdded.clear();
      valueWatchers.clear();
      this.removed = [];
    },
    /** Deliver a presence record into a room as the SDK would. */
    addChild(room: string, uid: string, value: unknown) {
      childAdded.get(room)?.({ key: uid, val: () => value });
    },
    /** Tell the client what the server's clock offset is. */
    setServerOffset(offsetMs: number) {
      valueWatchers.get('.info/serverTimeOffset')?.({
        key: 'serverTimeOffset',
        val: () => offsetMs,
      });
    },
  };
});
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  set: async () => {},
  remove: async (path: string) => {
    rtdb.removed.push(path);
  },
  serverTimestamp: () => Date.now(),
  onDisconnect: () => ({ remove: async () => {}, cancel: async () => {} }),
  onChildAdded: (path: string, cb: never) => {
    rtdb.childAdded.set(path, cb);
    return () => rtdb.childAdded.delete(path);
  },
  onChildChanged: () => () => {},
  onChildRemoved: () => () => {},
  onValue: (path: string, cb: never) => {
    rtdb.valueWatchers.set(path, cb);
    return () => rtdb.valueWatchers.delete(path);
  },
}));
vi.mock('../firebase/realtimeConfig', () => ({
  getRealtimeDb: () => ({}),
  isRealtimeConfigured: () => true,
}));
vi.mock('../firebase/config', () => ({ isFirebaseInitialized: () => true }));
vi.mock('../firebase/authService', () => ({
  authService: { getUserId: () => 'me', isAuthenticated: () => true },
}));

import { presenceService } from '../firebase/presenceService';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import {
  resetServerClockForTests,
  serverNow,
  setServerTimeOffset,
} from '../multiplayer/serverClock';
import { MULTIPLAYER } from '../constants';
import type { PresenceEvent, PresenceWire } from '../multiplayer/types';

const MINUTE = 60_000;

function liveRecord(t: number): Record<string, unknown> {
  return { n: 'Nomi', c: 'character1', x: 5, y: 5, d: 'd', t };
}

function wire(t: number): PresenceWire {
  return { n: 'Nomi', c: 'character1', o: null, x: 5, y: 5, d: 'd', s: 0, ff: false, e: null, t };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
  resetServerClockForTests();
  rtdb.reset();
  remotePlayerManager.clear();
  remotePlayerManager.setMap(null);
  for (const mock of Object.values(reporting)) mock.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(async () => {
  await presenceService.destroy();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. The ghost check uses the server's clock
// ---------------------------------------------------------------------------
describe('ghost check on a device whose clock is out', () => {
  it('keeps a live player when the local clock runs ten minutes fast', async () => {
    // Local clock is 10 min ahead: the server is *behind* us, so the offset
    // (server minus local) is negative.
    const events: PresenceEvent[] = [];
    presenceService.onPresence((event) => events.push(event));
    await presenceService.enterRoom('village');
    rtdb.setServerOffset(-10 * MINUTE);

    // A record stamped "just now" by the server — which, on our clock, reads
    // as ten minutes ago. Stamped independently of serverNow() so the test
    // cannot pass by both sides being wrong together.
    rtdb.addChild('presence/village', 'nomi', liveRecord(Date.now() - 10 * MINUTE));

    expect(events.map((event) => event.type)).toEqual(['joined']);
    expect(rtdb.removed).toEqual([]);
  });

  it('would have dropped that same player on the raw local clock', () => {
    // The pure manager, fed as the old code did — local now, no offset.
    remotePlayerManager.setMap('village');
    const tenMinutesAgoLocally = Date.now() - 10 * MINUTE;
    remotePlayerManager.apply('nomi', wire(tenMinutesAgoLocally));
    expect(remotePlayerManager.getCount()).toBe(0);

    // Same record, once the offset is known: it is a live player.
    setServerTimeOffset(-10 * MINUTE);
    remotePlayerManager.apply('nomi', wire(tenMinutesAgoLocally));
    expect(remotePlayerManager.getCount()).toBe(1);
  });

  it('still sweeps a genuinely stale record', async () => {
    const events: PresenceEvent[] = [];
    presenceService.onPresence((event) => events.push(event));
    await presenceService.enterRoom('village');
    rtdb.setServerOffset(0);

    rtdb.addChild(
      'presence/village',
      'ghost',
      liveRecord(Date.now() - MULTIPLAYER.GHOST_AFTER_MS - MINUTE)
    );
    await Promise.resolve();

    expect(events).toEqual([]);
    expect(rtdb.removed).toEqual(['presence/village/ghost']);
  });
});

// ---------------------------------------------------------------------------
// 2. Dropped records and clock skew are reported
// ---------------------------------------------------------------------------
describe('presence drop reporting', () => {
  it('reports a ghost sweep with both the corrected and the raw age', async () => {
    await presenceService.enterRoom('village');
    rtdb.setServerOffset(-2 * MINUTE);
    const stale = serverNow() - MULTIPLAYER.GHOST_AFTER_MS - MINUTE;
    rtdb.addChild('presence/village', 'ghost', liveRecord(stale));

    const call = reporting.reportMessageOnce.mock.calls.find(
      ([message]) => message === 'Presence record dropped as ghost'
    );
    expect(call, 'a swept record must reach Sentry').toBeDefined();
    const [, category, details] = call!;
    expect(category).toBe('presence');
    expect(details).toMatchObject({ room: 'village', uid: 'ghost', serverOffsetKnown: true });
    // Corrected age is the real one; the raw age carries the 2 min of skew on top.
    expect(details.ageMs).toBe(MULTIPLAYER.GHOST_AFTER_MS + MINUTE);
    expect(details.rawAgeMs).toBe(MULTIPLAYER.GHOST_AFTER_MS + 3 * MINUTE);
  });

  it('reports a malformed record, naming its fields', async () => {
    await presenceService.enterRoom('village');
    rtdb.addChild('presence/village', 'odd', { n: 'X', x: 'not a number' });

    const call = reporting.reportMessageOnce.mock.calls.find(
      ([message]) => message === 'Presence record dropped: malformed'
    );
    expect(call).toBeDefined();
    expect(call![2]).toMatchObject({ room: 'village', uid: 'odd', fields: 'n,x' });
  });

  it('reports a device clock that is well out, and stays quiet for a sane one', async () => {
    await presenceService.enterRoom('village');
    rtdb.setServerOffset(MULTIPLAYER.CLOCK_SKEW_WARN_MS / 2);
    expect(reporting.reportMessageOnce).not.toHaveBeenCalled();

    rtdb.setServerOffset(-(MULTIPLAYER.CLOCK_SKEW_WARN_MS + 1));
    expect(reporting.reportMessageOnce).toHaveBeenCalledWith(
      'Device clock differs from server',
      'presence',
      { offsetMs: -(MULTIPLAYER.CLOCK_SKEW_WARN_MS + 1) },
      'clock-skew'
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Pictures that never made it, on either side
// ---------------------------------------------------------------------------
const paintingStorage = vi.hoisted(() => ({
  loaded: true,
  saveImage: vi.fn(),
  loadImage: vi.fn(),
}));
vi.mock('../firebase/safe', () => ({
  isFirebaseLoaded: () => paintingStorage.loaded,
  getPaintingStorageService: () => paintingStorage,
}));

import { loadPaintingImageDetailed, savePaintingImage } from '../utils/paintingImageService';

describe('painting picture durability reporting', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    paintingStorage.loaded = true;
    paintingStorage.saveImage.mockReset();
    paintingStorage.loadImage.mockReset();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const PNG = 'data:image/png;base64,' + 'A'.repeat(4000);

  it('reports a wreath that stayed local because nobody was signed in yet', async () => {
    paintingStorage.saveImage.mockResolvedValue({ status: 'signed-out' });
    await savePaintingImage('custom_1', PNG, 'Fine Wreath');

    expect(reporting.reportMessageOnce).toHaveBeenCalledWith(
      'Painting image not uploaded: not signed in',
      'persistence',
      expect.objectContaining({ paintingId: 'custom_1', name: 'Fine Wreath', format: 'image/png' })
    );
    // The size is what tells a PNG-fallback-over-the-cap apart from anything else.
    expect(reporting.reportMessageOnce.mock.calls[0][2].sizeKB).toBeGreaterThan(0);
  });

  it('reports a rejected upload with its size and format', async () => {
    const rejected = new Error('Document exceeds maximum size');
    paintingStorage.saveImage.mockResolvedValue({ status: 'error', error: rejected });
    await savePaintingImage('custom_2', PNG, 'Magnificent Wreath');

    expect(reporting.reportErrorOnce).toHaveBeenCalledWith(
      rejected,
      'persistence',
      expect.objectContaining({ paintingId: 'custom_2', format: 'image/png' })
    );
  });

  it('says why a picture could not be loaded', async () => {
    paintingStorage.loadImage.mockResolvedValue({ status: 'missing' });
    expect(await loadPaintingImageDetailed('custom_3')).toEqual({
      dataUrl: null,
      reason: 'missing',
    });

    paintingStorage.loadImage.mockResolvedValue({ status: 'signed-out' });
    expect(await loadPaintingImageDetailed('custom_3')).toEqual({
      dataUrl: null,
      reason: 'signed-out',
    });

    paintingStorage.loaded = false;
    expect(await loadPaintingImageDetailed('custom_3')).toEqual({
      dataUrl: null,
      reason: 'firebase-not-loaded',
    });
  });

  it('caches a fetched picture and says where it came from', async () => {
    paintingStorage.loadImage.mockResolvedValue({
      status: 'found',
      dataUrl: PNG,
      source: 'shared',
    });
    expect(await loadPaintingImageDetailed('custom_4')).toEqual({ dataUrl: PNG, reason: 'shared' });
    expect(await loadPaintingImageDetailed('custom_4')).toEqual({ dataUrl: PNG, reason: 'local' });
    expect(paintingStorage.loadImage).toHaveBeenCalledTimes(1);
  });
});
