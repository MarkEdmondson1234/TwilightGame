/**
 * @vitest-environment node
 *
 * Presence is silent when it fails — you simply never see anybody — so the
 * ways it can switch itself off permanently are worth pinning down.
 *
 * The regression this guards: getRealtimeDb() cached "unavailable" the first
 * time it was called, and the first call happens the moment the player steps
 * onto a shared map — which can easily be before initializeFirebase() has
 * resolved. One early call therefore killed multiplayer for the whole session,
 * with no log to say why.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const firebaseState = { initialised: false };

vi.mock('../firebase/config', () => ({
  isFirebaseInitialized: () => firebaseState.initialised,
  getFirebaseApp: () => ({ name: 'test-app' }),
}));

vi.mock('firebase/database', () => ({
  getDatabase: () => ({ name: 'test-db' }),
}));

import {
  getRealtimeDb,
  isRealtimeConfigured,
  resetRealtimeDbForTests,
} from '../firebase/realtimeConfig';

describe('realtime database availability', () => {
  beforeEach(() => {
    resetRealtimeDbForTests();
    firebaseState.initialised = false;
    vi.stubEnv(
      'VITE_FIREBASE_DATABASE_URL',
      'https://example-default-rtdb.europe-west1.firebasedatabase.app'
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRealtimeDbForTests();
  });

  it('retries once Firebase has initialised, instead of latching on the early null', () => {
    // Called too early (shared map reached before Firebase finished starting).
    expect(getRealtimeDb()).toBeNull();

    firebaseState.initialised = true;

    expect(
      getRealtimeDb(),
      'getRealtimeDb() must not cache the "Firebase not ready yet" answer — ' +
        'doing so disables multiplayer for the rest of the session.'
    ).not.toBeNull();
  });

  it('reuses the same instance once opened', () => {
    firebaseState.initialised = true;
    expect(getRealtimeDb()).toBe(getRealtimeDb());
  });

  it('stays unavailable when no database URL is configured', () => {
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', '');
    firebaseState.initialised = true;
    expect(isRealtimeConfigured()).toBe(false);
    expect(getRealtimeDb()).toBeNull();
  });
});
