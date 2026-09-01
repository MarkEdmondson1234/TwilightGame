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
    withScope: vi.fn((cb: (scope: unknown) => void) => cb({ setTag: vi.fn(), setContext: vi.fn() })),
    reactErrorHandler: vi.fn(() => vi.fn()),
    setUser: vi.fn(),
  }));

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
  it('setErrorReportingUser() does not throw and never reaches Sentry.setUser', () => {
    expect(() => setErrorReportingUser('abc123')).not.toThrow();
    expect(() => setErrorReportingUser(null)).not.toThrow();
    expect(setUser).not.toHaveBeenCalled();
  });
});
