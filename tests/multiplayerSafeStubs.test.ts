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
import { presenceService } from '../firebase/presenceService';
import { getPresenceService, getCommunityGardenService } from '../firebase/safe';

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
