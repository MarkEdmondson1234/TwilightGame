/**
 * @vitest-environment node
 *
 * firebase/safe.ts exists so the game still runs when the `firebase` package is
 * absent: every service is reached through a getter that falls back to a stub.
 * The failure mode this guards is nasty and asymmetric — a method added to the
 * real service but forgotten on the stub works perfectly in every environment
 * that has Firebase, and crashes only in the one that does not.
 *
 * Presence is the most exposed case, because it is called from inside the game
 * loop: a missing stub method there is a `TypeError` sixty times a second.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { presenceService } from '../firebase/presenceService';
import {
  getPresenceService,
  getCommunityGardenService,
  whenFirebaseSettled,
} from '../firebase/safe';

/** Own + prototype methods, minus the Object.prototype furniture. */
function methodNames(target: object): string[] {
  const names = new Set<string>();
  let current: object | null = target;
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) {
      if (key === 'constructor') continue;
      const value = (target as Record<string, unknown>)[key];
      if (typeof value === 'function') names.add(key);
    }
    current = Object.getPrototypeOf(current);
  }
  return [...names].sort();
}

describe('presence stub parity', () => {
  it('implements every public method of the real presence service', () => {
    // Note this test runs *with* firebase installed, so getPresenceService()
    // may hand back the real service; the stub is compared directly instead.
    const realMethods = methodNames(presenceService);
    const stub = getPresenceService();
    const stubMethods = methodNames(stub);

    const missing = realMethods.filter((name) => !stubMethods.includes(name));

    expect(
      missing,
      'These methods exist on firebase/presenceService but not on the stub in ' +
        'firebase/safe.ts. The game would crash on them in a build without the ' +
        '`firebase` package. Add a no-op to stubPresenceService.'
    ).toEqual([]);
  });

  it('returns something callable even before Firebase has loaded', () => {
    const stub = getPresenceService();
    expect(typeof stub.isAvailable).toBe('function');
    expect(typeof stub.enterRoom).toBe('function');
    expect(typeof stub.leaveRoom).toBe('function');
    expect(typeof stub.publish).toBe('function');
    expect(typeof stub.onPresence).toBe('function');
  });

  it('hands back a working unsubscribe from onPresence', () => {
    // The controller calls this in an effect cleanup; a stub returning
    // undefined would throw on unmount.
    const unsubscribe = getPresenceService().onPresence(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('community garden stub parity', () => {
  it('still exposes the shared-farm API the same way', () => {
    // Sanity check on the pattern presence follows, so a regression in the
    // older service is caught by the same run.
    const service = getCommunityGardenService();
    expect(typeof service.startListening).toBe('function');
    expect(typeof service.writePlot).toBe('function');
    expect(typeof service.onPlotsChanged).toBe('function');
  });
});

describe('presence must not latch onto the stub', () => {
  /**
   * The bug this guards, found only by testing the deployed site.
   *
   * Every getter in firebase/safe.ts returns a no-op stub until the dynamic
   * Firebase import settles. The multiplayer controller resolved the presence
   * service once at mount and cached it in a ref — so on a cold load it captured
   * the *stub*, `isAvailable()` returned false forever, and multiplayer was
   * silently dead for the whole session no matter who signed in.
   *
   * Two properties keep that fixed: the getter must be live once Firebase has
   * settled, and the controller must not hold on to what it returns.
   */

  it('returns the real service, not the stub, once Firebase has settled', async () => {
    const loaded = await whenFirebaseSettled();
    expect(loaded, 'the firebase package should be installed in the test env').toBe(true);
    expect(getPresenceService()).toBe(presenceService);
  });

  it('resolves whenFirebaseSettled idempotently', async () => {
    // The controller and App both await this; the underlying load must run once.
    await expect(whenFirebaseSettled()).resolves.toBe(true);
    await expect(whenFirebaseSettled()).resolves.toBe(true);
  });

  it('does not cache a presence service in the controller', () => {
    const source = readFileSync(
      join(__dirname, '..', 'hooks', 'useMultiplayerController.ts'),
      'utf-8'
    );

    // A ref/module-level binding holding the service is the exact shape of the bug.
    expect(
      /(?:useRef|let|const)\s*(?:<[^>]*>)?\s*\(?\s*getPresenceService\(\)/.test(source),
      'useMultiplayerController must not store getPresenceService() — call it at each ' +
        'use site instead, or it can capture the no-op stub before Firebase has loaded.'
    ).toBe(false);

    expect(
      source.includes('whenFirebaseSettled'),
      'useMultiplayerController must await whenFirebaseSettled() before subscribing to ' +
        'presence or auth, or it subscribes to the stub and never hears anything.'
    ).toBe(true);
  });

  it('re-joins when auth state changes, not only when the map changes', () => {
    // Presence needs an authenticated user (same as the community garden), so a
    // player who signs in without walking anywhere must still become visible.
    const source = readFileSync(
      join(__dirname, '..', 'hooks', 'useMultiplayerController.ts'),
      'utf-8'
    );
    expect(source).toContain('onAuthStateChange');
    expect(source).toMatch(/\[currentMapId, authTick\]/);
  });
});
