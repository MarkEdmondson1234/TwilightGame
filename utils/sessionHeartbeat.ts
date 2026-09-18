/**
 * Session heartbeat — so a session that dies without a trace still tells us
 * what it was doing.
 *
 * On iOS a tab that runs out of memory is not thrown an error: the browser
 * kills the web content process and, on return, reloads the page onto the
 * title screen. No code runs at that moment, so nothing can report it from
 * inside — the crash a player describes as "it refreshed" (2026-09-18, iPhone,
 * on entering the shop) left Sentry with nothing but silence after the last
 * log line.
 *
 * So the running session writes a small heartbeat to localStorage every
 * HEARTBEAT_MS and on every phase change (map, transition, operation in
 * flight), and marks the record clean on pagehide. The next boot reads it: a
 * record that is not clean is a session that ended abruptly, and its last
 * heartbeat — map, what was in flight and for how long, resident texture MB,
 * uptime, foreground or background — is reported as one Sentry event.
 *
 * Pure on purpose: storage, clock and the state getter are injected, so
 * tests/sessionHeartbeat.test.ts covers it without a browser.
 */

export const HEARTBEAT_MS = 2_000;
export const HEARTBEAT_KEY = 'twilight_session_heartbeat';
/** A record older than this is a tab the OS reclaimed days ago, not a crash worth an issue. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface HeartbeatState {
  map: string;
  /** What the session was in the middle of, e.g. 'texture_batch', 'map_transition'. */
  inFlight: string | null;
  inFlightSinceMs: number | null;
  residentTextureMB: number | null;
  sceneTextureMB: number | null;
  visibleSprites: number | null;
  uptimeMs: number;
  worldReady: boolean;
}

export interface HeartbeatRecord extends HeartbeatState {
  sessionId: string;
  release: string;
  beatAt: number;
  visibility: 'visible' | 'hidden';
  cleanExit: boolean;
}

export type AbruptEndKind = 'foreground' | 'background';

export interface AbruptEnd {
  kind: AbruptEndKind;
  previous: HeartbeatRecord;
  /** How long after the last heartbeat the next session started. */
  gapMs: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Read (and clear) the previous session's record. Returns the abrupt end to
 * report, or null when the previous session left cleanly, is too old to be a
 * crash, or there was none.
 */
export function takePreviousAbruptEnd(storage: StorageLike, now: number): AbruptEnd | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(HEARTBEAT_KEY);
    storage.removeItem(HEARTBEAT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let previous: HeartbeatRecord;
  try {
    previous = JSON.parse(raw) as HeartbeatRecord;
  } catch {
    return null;
  }
  if (previous.cleanExit) return null;
  const gapMs = now - previous.beatAt;
  if (!(gapMs >= 0) || gapMs > STALE_AFTER_MS) return null;
  // A tab the OS reclaimed while hidden is routine housekeeping on a phone; a
  // session that vanished while the player was looking at it is the crash.
  return { kind: previous.visibility === 'hidden' ? 'background' : 'foreground', previous, gapMs };
}

export interface HeartbeatDeps {
  storage: StorageLike;
  now: () => number;
  sessionId: string;
  release: string;
  getState: () => HeartbeatState;
  isHidden: () => boolean;
  /** Subscribe to visibility changes; returns an unsubscribe. */
  onVisibilityChange: (handler: () => void) => () => void;
  /** Subscribe to the page going away (pagehide); returns an unsubscribe. */
  onPageHide: (handler: () => void) => () => void;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

export interface Heartbeat {
  /** Write a heartbeat now (also called on the interval). */
  beat: () => void;
  stop: () => void;
}

export function startHeartbeat(deps: HeartbeatDeps): Heartbeat {
  const write = (cleanExit: boolean) => {
    try {
      const record: HeartbeatRecord = {
        ...deps.getState(),
        sessionId: deps.sessionId,
        release: deps.release,
        beatAt: deps.now(),
        visibility: deps.isHidden() ? 'hidden' : 'visible',
        cleanExit,
      };
      deps.storage.setItem(HEARTBEAT_KEY, JSON.stringify(record));
    } catch {
      /* Diagnostics must never interrupt gameplay. */
    }
  };
  const beat = () => write(false);
  const timer = deps.setInterval(beat, HEARTBEAT_MS);
  const offVisibility = deps.onVisibilityChange(beat);
  // pagehide is the one unload signal iOS reliably fires for a real close;
  // a memory kill fires nothing, which is the whole point.
  const offPageHide = deps.onPageHide(() => write(true));
  beat();
  return {
    beat,
    stop: () => {
      deps.clearInterval(timer);
      offVisibility();
      offPageHide();
    },
  };
}
