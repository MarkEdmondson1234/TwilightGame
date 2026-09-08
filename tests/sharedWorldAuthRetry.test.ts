/**
 * @vitest-environment node
 *
 * Every shared-world controller must retry its room join when the player signs
 * in — not only when they walk to a different map.
 *
 * This is the bug that made NPC conversations look broken. Firebase restores
 * the signed-in session *after* the game has loaded its first map, so a
 * controller that joins once per map change ran while `isAvailable()` was still
 * false, left the room, and never came back. A player who resumed standing in
 * the village was silently in no room at all for the whole session; walking out
 * and back in fixed it, which made it look intermittent. Presence had the retry
 * from the start and worked, which is exactly why the others looked like
 * feature bugs rather than one shared plumbing bug.
 *
 * A source scan rather than a hook test on purpose: what has to hold is
 * structural (subscribe to auth, and re-run the join effect), it is identical
 * in four files, and it is the kind of thing a new controller copied from the
 * wrong sibling silently omits.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

/** Every hook that joins a per-map room on a shared map. */
const CONTROLLERS = [
  'hooks/useMultiplayerController.ts',
  'hooks/useChatController.ts',
  'hooks/useNpcSpeechController.ts',
  'hooks/useSharedPlacedItemsController.ts',
  'hooks/useBattleController.ts',
];

describe('shared-world controllers retry on sign-in', () => {
  for (const path of CONTROLLERS) {
    const source = readFileSync(join(ROOT, path), 'utf-8');

    it(`${path} subscribes to auth state changes`, () => {
      expect(
        source.includes('onAuthStateChange'),
        `${path} joins a room but never watches auth. Firebase signs in after the ` +
          'first map has loaded, so the join must be retried — see the authTick ' +
          'pattern in useMultiplayerController.ts.'
      ).toBe(true);
    });

    it(`${path} re-runs its room effect when auth changes`, () => {
      expect(
        /\[currentMapId, authTick\]/.test(source),
        `${path} has no effect keyed on [currentMapId, authTick]. Subscribing to ` +
          'auth is only half of it — the join effect has to actually re-run.'
      ).toBe(true);
    });
  }
});

describe('shared-world controllers agree on where players exist', () => {
  it('all use the single isSharedMap predicate', () => {
    const offenders = CONTROLLERS.filter((path) => {
      const source = readFileSync(join(ROOT, path), 'utf-8');
      return (
        source.includes('MULTIPLAYER.SHARED_MAPS') ||
        !source.includes("from '../multiplayer/sharedMaps'")
      );
    });

    expect(
      offenders,
      'These controllers do not use multiplayer/sharedMaps.ts. They each carried ' +
        'their own copy of the predicate once and drifted; presence and chat ' +
        'disagreeing about a map means you can see somebody but not hear them:\n' +
        offenders.join('\n')
    ).toEqual([]);
  });
});
