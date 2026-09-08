/**
 * @vitest-environment node
 *
 * Where other players exist.
 *
 * Presence, chat, NPC speech and shared placement each used to carry their own
 * copy of this predicate; they now share one, so they cannot disagree about
 * whether a map is inhabited.
 *
 * The procedural maps are the point of this file. They were excluded from the
 * shared world because a `Date.now()` seed made every entry a private world —
 * so two friends walking into the forest together were never in the same room.
 * Now that the seed is `hash(kind:totalDays:depth)` and the generators are
 * deterministic (tests/proceduralDeterminism.test.ts), the id names one world
 * everybody rebuilds identically, which is what a room key has to be.
 */
import { describe, it, expect } from 'vitest';
import { isSharedMap } from '../multiplayer/sharedMaps';
import { MULTIPLAYER } from '../constants';

describe('isSharedMap', () => {
  it('shares the hand-designed outdoor maps', () => {
    for (const mapId of MULTIPLAYER.SHARED_MAPS) {
      expect(isSharedMap(mapId), mapId).toBe(true);
    }
  });

  it('shares the daily procedural forests, mines and lava levels', () => {
    expect(isSharedMap('forest_123456')).toBe(true);
    expect(isSharedMap('cave_123456')).toBe(true);
    expect(isSharedMap('lava_123456')).toBe(true);
  });

  it('does NOT share random shops', () => {
    // A shop's exit transition is written to point back at whichever map the
    // individual player came from, so two players in "the same" shop would walk
    // out through each other's door. Its seed is still a clock value too.
    expect(isSharedMap('shop_123456')).toBe(false);
    expect(isSharedMap('RANDOM_SHOP')).toBe(false);
  });

  it('keeps interiors private', () => {
    expect(isSharedMap('mums_kitchen')).toBe(false);
    expect(isSharedMap('home_upstairs')).toBe(false);
    expect(isSharedMap('personal_garden')).toBe(false);
  });

  it('does not match a map that merely starts with a shared prefix', () => {
    expect(isSharedMap('forest_glade')).toBe(false);
    expect(isSharedMap('cave_of_wonders')).toBe(false);
    expect(isSharedMap('RANDOM_FOREST')).toBe(false); // the placeholder id, never a real room
  });
});
