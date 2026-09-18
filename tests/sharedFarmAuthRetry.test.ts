/**
 * @vitest-environment node
 *
 * "She can't see the plants I just planted" — one-sided, for the whole
 * session, fixed by walking out of the village and back in.
 *
 * The shared garden listener starts once, when a save loads onto a shared map
 * or the player walks onto one, and startSharedSync() is a no-op after that.
 * Two things can be true at that first call and were both silently fatal:
 *
 *  1. Nobody is signed in yet. Firebase restores the session *after* the first
 *     map has loaded, and communityGardenService.startListening() returned
 *     without subscribing. Rule 6 in CLAUDE.md — the same race that broke chat
 *     and NPC speech — but this is a manager, not a hook, so the auth-retry
 *     source scan never covered it.
 *  2. The Firebase module has not loaded yet. getCommunityGardenService() hands
 *     back a no-op stub until it has, and farmManager bound its plot listener
 *     to that stub for good.
 *
 * Either way the player's own plots still flushed (that path re-resolves the
 * service every 10 s and checks auth then), so the other player saw everything
 * — which is what made it look like a one-directional network problem rather
 * than a startup race on one device.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => {
  const listeners = new Set<(state: { isAuthenticated: boolean }) => void>();
  return {
    authenticated: false,
    listeners,
    signIn() {
      this.authenticated = true;
      for (const listener of listeners) listener({ isAuthenticated: true });
    },
  };
});

vi.mock('../firebase/authService', () => ({
  authService: {
    isAuthenticated: () => auth.authenticated,
    getUserId: () => (auth.authenticated ? 'me' : null),
    // Mirrors the real implementation: calls back synchronously with the
    // current state, then again on every change.
    onAuthStateChange: (callback: (state: { isAuthenticated: boolean }) => void) => {
      auth.listeners.add(callback);
      callback({ isAuthenticated: auth.authenticated });
      return () => auth.listeners.delete(callback);
    },
  },
}));

vi.mock('../firebase/config', () => ({
  isFirebaseInitialized: () => true,
  getFirebaseDb: () => ({}),
}));

const firestore = vi.hoisted(() => ({ onSnapshot: vi.fn(() => () => {}) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  onSnapshot: firestore.onSnapshot,
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

describe('communityGardenService.startListening before sign-in', () => {
  beforeEach(() => {
    auth.authenticated = false;
    auth.listeners.clear();
    firestore.onSnapshot.mockClear();
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('subscribes once sign-in completes, without being called again', async () => {
    const { communityGardenService } = await import('../firebase/communityGardenService');
    communityGardenService.stopListening();

    communityGardenService.startListening();
    expect(
      firestore.onSnapshot,
      'nothing to subscribe with while signed out'
    ).not.toHaveBeenCalled();

    auth.signIn();
    expect(
      firestore.onSnapshot,
      'the listener must start on its own when the session is restored'
    ).toHaveBeenCalledTimes(1);

    // The retry is one-shot: a later auth change must not double-subscribe.
    auth.signIn();
    expect(firestore.onSnapshot).toHaveBeenCalledTimes(1);
    communityGardenService.stopListening();
  });

  it('drops the pending retry when listening is stopped first', async () => {
    const { communityGardenService } = await import('../firebase/communityGardenService');
    communityGardenService.stopListening();

    communityGardenService.startListening();
    communityGardenService.stopListening();
    auth.signIn();
    expect(
      firestore.onSnapshot,
      'leaving the shared map before sign-in must not leave a listener behind'
    ).not.toHaveBeenCalled();
  });
});

describe('farmManager.startSharedSync waits for the Firebase module', () => {
  it('resolves the service after whenFirebaseSettled(), never the stub', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(join(__dirname, '..', 'utils/farmManager.ts'), 'utf-8');
    const start = source.indexOf('async startSharedSync(');
    const body = source.slice(start, source.indexOf('async stopSharedSync('));

    const settled = body.indexOf('await whenFirebaseSettled()');
    const resolved = body.indexOf('const service = getCommunityGardenService()');
    expect(settled, 'startSharedSync must await whenFirebaseSettled()').toBeGreaterThan(-1);
    expect(
      settled,
      'getCommunityGardenService() before whenFirebaseSettled() returns the no-op stub, ' +
        'and the plot listener is then bound to it for the rest of the session'
    ).toBeLessThan(resolved);
  });
});
