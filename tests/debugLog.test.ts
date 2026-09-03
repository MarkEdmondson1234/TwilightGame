/**
 * Tests for utils/debugLog.ts — the category-gated logging helper from §2 of
 * docs/PENDING_CLEANUP.md.
 *
 * tests/setup.ts stubs `localStorage` globally as a no-op, so this file
 * installs its own in-memory Storage (same approach as
 * diaryRepeatedConversation.test.ts) to exercise the persistence and
 * setDebugLogsEnabled paths. The `?debug=` URL flag is driven through
 * history.replaceState, which updates window.location.search in jsdom.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debugLog, isDebugLogEnabled, setDebugLogsEnabled } from '../utils/debugLog';

const STORAGE_KEY = 'twilight_debug';

function createInMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function setUrlSearch(search: string) {
  window.history.replaceState(null, '', search === '' ? '/' : `/${search}`);
}

describe('debugLog', () => {
  const originalLocalStorage = global.localStorage;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    global.localStorage = createInMemoryStorage();
    setUrlSearch('');
    setDebugLogsEnabled(false); // also resets the module's cached config
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    setUrlSearch('');
    vi.restoreAllMocks();
  });

  it('is disabled by default and logs nothing', () => {
    expect(isDebugLogEnabled()).toBe(false);
    expect(isDebugLogEnabled('GameState')).toBe(false);

    debugLog('GameState', 'Quest started: intro');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('re-attaches the [category] prefix and passes arguments through when enabled', () => {
    setUrlSearch('?debug=gamestate'); // case-insensitive match

    debugLog('GameState', 'Quest started:', 'intro');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[GameState]', 'Quest started:', 'intro');
  });

  it('gates per category from the URL flag', () => {
    setUrlSearch('?debug=GameState,map');

    expect(isDebugLogEnabled('gamestate')).toBe(true); // case-insensitive
    expect(isDebugLogEnabled('Map')).toBe(true);
    expect(isDebugLogEnabled('FriendshipManager')).toBe(false);
  });

  it('combines URL and localStorage flag sources', () => {
    setUrlSearch('?debug=GameState');
    window.localStorage.setItem(STORAGE_KEY, 'map');

    expect(isDebugLogEnabled('GameState')).toBe(true);
    expect(isDebugLogEnabled('map')).toBe(true);
    expect(isDebugLogEnabled('FriendshipManager')).toBe(false);
  });

  it.each(['1', 'true', 'all'])('enables every category for ?debug=%s', (value) => {
    setUrlSearch(`?debug=${value}`);

    expect(isDebugLogEnabled()).toBe(true);
    expect(isDebugLogEnabled('GameState')).toBe(true);
    expect(isDebugLogEnabled('anything')).toBe(true);
  });

  it('setDebugLogsEnabled(true) turns everything on and persists without reload', () => {
    expect(isDebugLogEnabled('GameState')).toBe(false);

    setDebugLogsEnabled(true);

    expect(isDebugLogEnabled('GameState')).toBe(true);
    expect(isDebugLogEnabled('FriendshipManager')).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('all');
  });

  it('setDebugLogsEnabled(false) turns everything off and removes the stored key', () => {
    setDebugLogsEnabled(true);
    expect(isDebugLogEnabled('GameState')).toBe(true);

    setDebugLogsEnabled(false);

    expect(isDebugLogEnabled('GameState')).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('an active URL flag survives the storage toggle being switched off', () => {
    // The URL flag re-applies on every config resolution — the toggle only
    // manages the localStorage side of the two sources.
    setUrlSearch('?debug=GameState');
    setDebugLogsEnabled(false);

    expect(isDebugLogEnabled('GameState')).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('survives a localStorage that throws (private browsing)', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => setDebugLogsEnabled(true)).not.toThrow();
    // With persistence failing, nothing was stored, so logging stays off —
    // degrading gracefully rather than throwing.
    expect(isDebugLogEnabled('GameState')).toBe(false);
  });
});
