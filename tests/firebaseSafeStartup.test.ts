/**
 * @vitest-environment node
 *
 * Startup has two independent callers into firebase/safe: the multiplayer
 * controller (which asks whether presence can run the moment the app mounts)
 * and gameInitializer (which actually initialises Firebase). They race.
 *
 * In production the loser of that race got a null module back — loadFirebase()
 * shared a "load already started" boolean rather than the in-flight promise —
 * so safeInitializeFirebase() returned early and silently. initializeFirebase()
 * was never called: signing in threw "Firebase not initialized", cloud saves
 * were off, and multiplayer was invisible to both players.
 */
import { describe, it, expect, vi } from 'vitest';

const calls = { initializeFirebase: 0, authInitialize: 0 };

vi.mock('../firebase/index', () => ({
  initializeFirebase: async () => {
    calls.initializeFirebase += 1;
    return { app: {}, auth: {}, db: {} };
  },
  authService: {
    initialize: () => {
      calls.authInitialize += 1;
    },
  },
  syncManager: { initialize: () => {} },
  presenceService: {},
  sharedDataService: {},
  cloudSaveService: {},
  communityGardenService: {},
  paintingStorageService: {},
}));

describe('firebase/safe startup', () => {
  it('still initialises Firebase when another caller started the module load first', async () => {
    const { whenFirebaseSettled, safeInitializeFirebase, isFirebaseLoaded } = await import(
      '../firebase/safe'
    );

    // Presence asks first; the game initialiser follows in the same tick, while
    // the dynamic import is still in flight.
    const settled = whenFirebaseSettled();
    const result = await safeInitializeFirebase();
    await settled;

    expect(
      calls.initializeFirebase,
      'safeInitializeFirebase() must wait for the in-flight module load rather than ' +
        'bailing out with a null module — otherwise Firebase is never initialised and ' +
        'sign-in, cloud saves and multiplayer are all dead for the session.'
    ).toBe(1);
    expect(result).not.toBeNull();
    expect(calls.authInitialize).toBe(1);
    expect(isFirebaseLoaded()).toBe(true);
  });

  it('shares one initialisation between concurrent callers', async () => {
    const { safeInitializeFirebase } = await import('../firebase/safe');
    await Promise.all([safeInitializeFirebase(), safeInitializeFirebase()]);
    expect(calls.initializeFirebase).toBe(1);
  });
});
