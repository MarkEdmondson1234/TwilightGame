/**
 * Error Reporting (Sentry)
 *
 * Remote error/crash reporting so real player issues are visible without
 * someone having to notice something looks wrong and paste console output
 * (which is literally how prior bugs were found — see git history around
 * the shared-farm sync fix and the splash-screen game-init fix).
 *
 * Mirrors firebase/config.ts's pattern: reads config from VITE_ env vars,
 * silently disables itself (every export becomes a safe no-op) when the DSN
 * isn't configured, so the game works identically with or without it set up.
 *
 * Structured session diagnostics use the Logs quota. Automatic tracing and
 * session replay remain off; no gameplay content is recorded.
 */

import * as Sentry from '@sentry/react';
import { startSessionDiagnostics } from './sessionDiagnostics';
import { debugLog } from './debugLog';

let initialised = false;

/** Whether a Sentry DSN has been configured via env vars. */
export function isErrorReportingConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SENTRY_DSN);
}

/**
 * Initialise Sentry. Safe to call even when not configured — no-ops.
 * Call once, early in app startup (see index.tsx).
 */
export function initErrorReporting(): void {
  if (initialised || !isErrorReportingConfigured()) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Set by the deploy workflow to the git commit SHA — lets errors in the
    // Sentry dashboard be traced back to the exact deploy that shipped them.
    // Unset locally (no CI to stamp it), which is fine — Sentry just omits it.
    release: import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: 0,
    enableLogs: true,
    sendDefaultPii: false,
    // Drop fetch cancellations. The browser throws AbortError whenever an
    // in-flight request is cancelled — which happens normally every time a
    // player navigates or a map transition supersedes an asset load. These
    // accounted for 85 of the first 87 events ever reported here (3 separate
    // issues, 0 users impacted, Sentry's own triage rating them "super_low"),
    // burning quota and burying the one real bug underneath. Nothing is lost:
    // a fetch failure that actually matters surfaces as the error thrown by
    // the code that awaited it, with a real stack.
    //
    // Same trade for the transient network-death family (added after the first
    // weeks of production data — JAVASCRIPT-REACT-5/6/7): every browser has its
    // own name for "the request never made it" — Chrome "Failed to fetch",
    // Safari "Load failed", Firefox "NetworkError when attempting to fetch
    // resource" — plus the service worker's wrapped rethrow
    // ("FetchEvent.respondWith received an error"). They fire when a player
    // loses connectivity mid-request or the SW is being replaced; none are code
    // bugs. These bare browser messages carry no URL, no feature and no stack
    // (the ones that reached Sentry arrived frameless), so they cannot be
    // triaged — while feature-level failures that matter still announce
    // themselves through their own catch blocks' console.warn (which
    // probe-live.mjs reads) and their once-per-session report.
    ignoreErrors: [
      /AbortError/,
      /^Failed to fetch$/,                              // Chrome
      /^Load failed$/,                                  // Safari/WebKit
      /^NetworkError when attempting to fetch resource/, // Firefox
      /FetchEvent\.respondWith/,                        // service-worker wrapped variant
    ],
  });
  initialised = true;
  startSessionDiagnostics();
  debugLog('ErrorReporting', 'Sentry initialised');
}

/**
 * React 19's root-level error hooks — passed to createRoot() in index.tsx.
 * Only the two cases components/ErrorBoundary.tsx's componentDidCatch can't
 * see: an uncaught error with no boundary above it, and an error React
 * itself recovers from. Deliberately NOT wiring onCaughtError here — that
 * fires for the same errors ErrorBoundary.componentDidCatch already reports
 * (with richer context, including the component stack), and wiring both
 * would double-report every game crash.
 */
export const onUncaughtError = Sentry.reactErrorHandler();
export const onRecoverableError = Sentry.reactErrorHandler();

/**
 * Attach (or clear) the signed-in player's identity on reported errors.
 *
 * Without this every issue reads "Users Impacted: 0" even while real players
 * are hitting it, because Sentry has no way to tell one browser from another.
 * That makes the first triage question — "is this one player refreshing, or
 * thirty players broken?" — unanswerable, which is exactly backwards.
 *
 * **Only the Firebase uid is sent.** Never email, display name or character
 * name: this is a children's game, the uid is an opaque identifier that
 * answers "how many distinct players" without describing any of them, and
 * Sentry's own `sendDefaultPii` (which would attach IP addresses) is left off.
 *
 * Called from authService's notifyListeners() so it tracks every auth change
 * from one place — sign-in, sign-out and anonymous upgrade alike. Safe no-op
 * when Sentry isn't configured.
 */
export function setErrorReportingUser(uid: string | null): void {
  if (!initialised) return;
  Sentry.setUser(uid ? { id: uid } : null);
}

/** Broad categories used to filter/group errors in the Sentry dashboard. */
export type ErrorReportCategory =
  | 'auth'
  | 'sync'
  | 'shared_farm'
  | 'presence'
  | 'game_crash'
  // Data durability outside the syncManager pipeline: local save failures,
  // domain loads, diary/painting durability, save-data integrity self-heals.
  | 'persistence'
  // Map authoring/integrity problems that survive validation (invalid
  // transition spawn targets, maps with no valid spawn at all).
  | 'map'
  // Gift/shared-world feature errors (gift delivery failures).
  | 'shared_world';

/**
 * Report a caught error. Safe no-op when Sentry isn't configured or hasn't
 * initialised — callers don't need to check isErrorReportingConfigured()
 * themselves.
 */
export function reportError(
  error: unknown,
  category: ErrorReportCategory,
  extra?: Record<string, unknown>
): void {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    scope.setTag('category', category);
    if (extra) scope.setContext('details', extra);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

/**
 * Report a non-exception event (e.g. "write failed" with no thrown Error).
 */
export function reportMessage(
  message: string,
  category: ErrorReportCategory,
  extra?: Record<string, unknown>
): void {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    scope.setTag('category', category);
    if (extra) scope.setContext('details', extra);
    Sentry.captureMessage(message, 'warning');
  });
}

// Keys already reported this page session. Module-scoped on purpose: the page
// lifetime is the dedupe window — "is this happening at all in production", not
// "how often". A page reload resets it, and HMR module re-evaluation does too.
const reportedOnce = new Set<string>();

function onceKey(
  category: ErrorReportCategory,
  extra: Record<string, unknown> | undefined,
  explicit: string | undefined,
  fallback: string
): string {
  if (explicit) return `${category}:${explicit}`;
  // Collapses to a stable string so two identical failures dedupe even when the
  // caller did not choose a key; key order in `extra` does not matter.
  const detail = extra
    ? Object.entries(extra)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(',')
    : '';
  return detail ? `${category}:${fallback}:${detail}` : `${category}:${fallback}`;
}

/**
 * reportError/reportMessage, but at most once per page session per key. For
 * failure sites that fire repeatedly (a save attempted every second that keeps
 * failing, a fallback hit on every map transition) — one issue is signal, a
 * thousand identical events is quota burn.
 */
export function reportErrorOnce(
  error: unknown,
  category: ErrorReportCategory,
  extra?: Record<string, unknown>,
  key?: string
): void {
  if (!initialised) return;
  const dedupeKey = onceKey(category, extra, key, error instanceof Error ? error.message : String(error));
  if (reportedOnce.has(dedupeKey)) return;
  reportedOnce.add(dedupeKey);
  reportError(error, category, extra);
}

/**
 * reportMessage, but at most once per page session per key — see reportErrorOnce.
 */
export function reportMessageOnce(
  message: string,
  category: ErrorReportCategory,
  extra?: Record<string, unknown>,
  key?: string
): void {
  if (!initialised) return;
  const dedupeKey = onceKey(category, extra, key, message);
  if (reportedOnce.has(dedupeKey)) return;
  reportedOnce.add(dedupeKey);
  reportMessage(message, category, extra);
}
