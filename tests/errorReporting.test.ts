/**
 * @vitest-environment node
 *
 * Safe-wrapper invariant for error reporting: without VITE_SENTRY_DSN set,
 * every export must be a true no-op (never touch the Sentry SDK, never
 * throw) — the same guarantee firebase/safe.ts gives when the `firebase`
 * package isn't installed. VITE_SENTRY_DSN is force-unset via vi.stubEnv()
 * regardless of a local .env.local, so this stays deterministic for anyone
 * who has actually configured Sentry locally.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { init, captureException, captureMessage, withScope, reactErrorHandler, setUser } =
  vi.hoisted(() => ({
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    withScope: vi.fn((cb: (scope: unknown) => void) =>
      cb({ setTag: vi.fn(), setContext: vi.fn() })
    ),
    reactErrorHandler: vi.fn(() => vi.fn()),
    setUser: vi.fn(),
  }));

const { startSessionDiagnostics } = vi.hoisted(() => ({ startSessionDiagnostics: vi.fn() }));
vi.mock('../utils/sessionDiagnostics', () => ({ startSessionDiagnostics }));

vi.mock('@sentry/react', () => ({
  init,
  captureException,
  captureMessage,
  withScope,
  reactErrorHandler,
  setUser,
}));

vi.stubEnv('VITE_SENTRY_DSN', '');

import {
  isErrorReportingConfigured,
  initErrorReporting,
  reportError,
  reportMessage,
  reportErrorOnce,
  reportMessageOnce,
  setErrorReportingUser,
} from '../utils/errorReporting';

describe('errorReporting — safe no-op without a DSN configured', () => {
  beforeEach(() => {
    init.mockClear();
    captureException.mockClear();
    captureMessage.mockClear();
    setUser.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_SENTRY_DSN', ''); // Keep it unset for the remaining tests in this file
  });

  it('reports unconfigured', () => {
    expect(isErrorReportingConfigured()).toBe(false);
  });

  it('initErrorReporting() does not throw and does not call Sentry.init', () => {
    expect(() => initErrorReporting()).not.toThrow();
    expect(init).not.toHaveBeenCalled();
  });

  it('reportError() does not throw and never reaches Sentry.captureException', () => {
    expect(() => reportError(new Error('boom'), 'game_crash')).not.toThrow();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reportMessage() does not throw and never reaches Sentry.captureMessage', () => {
    expect(() => reportMessage('something failed', 'sync')).not.toThrow();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('reportError() handles a non-Error value without throwing', () => {
    expect(() => reportError('a plain string rejection', 'auth')).not.toThrow();
  });

  // authService calls this on every auth state change, including the very
  // first one — which fires before initErrorReporting() has necessarily run,
  // and always fires for players with no Firebase configured at all.
  it('reportErrorOnce() and reportMessageOnce() are safe no-ops unconfigured', () => {
    expect(() => reportErrorOnce(new Error('boom'), 'persistence')).not.toThrow();
    expect(() => reportMessageOnce('drift', 'map')).not.toThrow();
    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('setErrorReportingUser() does not throw and never reaches Sentry.setUser', () => {
    expect(() => setErrorReportingUser('abc123')).not.toThrow();
    expect(() => setErrorReportingUser(null)).not.toThrow();
    expect(setUser).not.toHaveBeenCalled();
  });
});

describe('errorReporting — configured diagnostics', () => {
  it('enables structured logs and starts diagnostics once, without tracing or default PII', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.com/1');
    init.mockClear();
    startSessionDiagnostics.mockClear();
    try {
      const reporting = await import('../utils/errorReporting');
      reporting.initErrorReporting();
      reporting.initErrorReporting();
      expect(init).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledWith(
        expect.objectContaining({
          enableLogs: true,
          tracesSampleRate: 0,
          sendDefaultPii: false,
        })
      );
      expect(startSessionDiagnostics).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubEnv('VITE_SENTRY_DSN', '');
    }
  });
});

describe('errorReporting — once-per-session dedupe', () => {
  let reporting: typeof import('../utils/errorReporting');

  beforeEach(async () => {
    // Fresh module = fresh once-set, so each test starts from zero reports.
    vi.resetModules();
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.com/1');
    init.mockClear();
    captureException.mockClear();
    captureMessage.mockClear();
    reporting = await import('../utils/errorReporting');
    reporting.initErrorReporting();
  });

  afterEach(() => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
  });

  it('reports the first occurrence of a key and suppresses repeats', () => {
    reporting.reportMessageOnce(
      'Cooking self-heal: tea missing from unlocked recipes',
      'persistence',
      { recipeId: 'tea' },
      'cooking:self_heal:tea'
    );
    reporting.reportMessageOnce(
      'Cooking self-heal: tea missing from unlocked recipes',
      'persistence',
      { recipeId: 'tea' },
      'cooking:self_heal:tea'
    );
    reporting.reportMessageOnce(
      'Cooking self-heal: tea missing from unlocked recipes',
      'persistence',
      { recipeId: 'tea' },
      'cooking:self_heal:tea'
    );
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps distinct keys apart — one report each', () => {
    reporting.reportErrorOnce(new Error('boom'), 'persistence', { domain: 'cooking' }, 'cooking:save');
    reporting.reportErrorOnce(new Error('boom'), 'persistence', { domain: 'inventory' }, 'inventory:save');
    expect(captureException).toHaveBeenCalledTimes(2);
  });

  it('derives a stable default key from the message and extra fields', () => {
    reporting.reportMessageOnce('Cloud sync failed', 'persistence', { service: 'diary' });
    reporting.reportMessageOnce('Cloud sync failed', 'persistence', { service: 'diary' });
    expect(captureMessage).toHaveBeenCalledTimes(1);
    // A different extra value is a different issue, not a repeat.
    reporting.reportMessageOnce('Cloud sync failed', 'persistence', { service: 'paintings' });
    expect(captureMessage).toHaveBeenCalledTimes(2);
  });
});
