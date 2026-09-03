/**
 * debugLog — category-gated developer logging.
 *
 * Bare console.log calls ship every diagnostic line to production players'
 * consoles (571 sites at the time this module was written, including
 * per-frame noise). debugLog keeps those diagnostics available to developers
 * while silencing them for everyone else.
 *
 * Categories reuse the `[Prefix]` tags the codebase already puts at the start
 * of its log lines — the prefix becomes the first argument and the helper
 * re-attaches it, so migrated lines look identical when enabled:
 *
 *   console.log(`[GameState] Quest started: ${questId}`);
 *   → debugLog('GameState', `Quest started: ${questId}`);
 *
 * Enabling (same flag sources as runtimeDebug() in constants.ts):
 *   - `?debug=1` (or `?debug=all`, `?debug=true`) — everything
 *   - `?debug=GameState,map` — specific categories, comma-separated
 *   - `localStorage.setItem('twilight_debug', 'GameState,map')` + reload
 *   - The DevTools "Debug logging" toggle (no reload needed)
 *
 * Matching is case-insensitive; `?debug=gamestate` matches 'GameState'.
 * console.warn / console.error are NOT gated — they carry player-relevant
 * failure diagnostics and stay ungated everywhere.
 */

const STORAGE_KEY = 'twilight_debug'; // shared with runtimeDebug() in constants.ts

/** Flag values that turn on every category. */
const ENABLE_ALL_VALUES = new Set(['1', 'true', 'all']);

interface DebugLogConfig {
  /** Named categories explicitly switched on. */
  categories: Set<string>;
  /** True when a turn-everything-on value (`1`/`true`/`all`) was given. */
  enableAll: boolean;
}

let cachedConfig: DebugLogConfig | null = null;

function resolveConfig(): DebugLogConfig {
  if (cachedConfig) return cachedConfig;

  const config: DebugLogConfig = { categories: new Set(), enableAll: false };

  if (typeof window !== 'undefined') {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('debug') ?? '';
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? '';
      // Same comma-separated convention as runtimeDebug(); either source may
      // name categories, and both sources apply.
      const flags = `${fromUrl},${stored}`
        .toLowerCase()
        .split(',')
        .map((flag) => flag.trim())
        .filter(Boolean);

      for (const flag of flags) {
        if (ENABLE_ALL_VALUES.has(flag)) {
          config.enableAll = true;
        } else {
          config.categories.add(flag);
        }
      }
    } catch {
      // Private-browsing modes can throw on localStorage access. Never fatal.
    }
  }

  cachedConfig = config;
  return config;
}

/**
 * Whether a category currently logs. Called with no argument, reports whether
 * *any* debug logging is on (used by the DevTools toggle).
 *
 * Hot paths that build log arguments eagerly can call this as a guard before
 * doing expensive string assembly:
 *   if (isDebugLogEnabled('GameState')) debugLog('GameState', expensiveReport());
 */
export function isDebugLogEnabled(category?: string): boolean {
  const { categories, enableAll } = resolveConfig();
  if (enableAll) return true;
  if (category === undefined) return categories.size > 0;
  return categories.has(category.toLowerCase());
}

/**
 * Turn debug logging on/off at runtime (DevTools toggle). Persists to
 * localStorage so the choice survives a reload, and takes effect immediately
 * — no reload needed.
 */
export function setDebugLogsEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, 'all');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private-browsing modes can throw on localStorage access. Never fatal.
  }
  cachedConfig = null; // re-resolve on the next call
}

/**
 * Log a developer diagnostic behind its category gate.
 *
 * The first argument is the category (the old `[Prefix]` tag, without
 * brackets); it is re-attached on output so devtools filtering and greps keep
 * working. Remaining arguments pass straight through to console.log.
 */
export function debugLog(category: string, ...args: unknown[]): void {
  if (!isDebugLogEnabled(category)) return;
  console.log(`[${category}]`, ...args);
}
