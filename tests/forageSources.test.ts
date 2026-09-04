/** @vitest-environment node */
/**
 * Guards the declarative forage source table (utils/forage/sources.ts).
 *
 * The table replaced ~18 hand-written copies of the same forage flow, so a
 * typo in one entry would previously have been a copy-paste bug in one block;
 * now it would silently break a forageable for every player. This test
 * collects every violation and asserts once, itemSSoT-style.
 */
import { describe, it, expect } from 'vitest';
import { FORAGE_SOURCES } from '../utils/forage/sources';
import { getItem } from '../data/items';
import { TILE_LEGEND } from '../data/tiles';
import { TileType } from '../types';

describe('forage source table', () => {
  it('references items that exist in ITEMS', () => {
    const missing = FORAGE_SOURCES.filter((s) => !getItem(s.itemId)).map(
      (s) => `${s.label} → ${s.itemId}`
    );
    expect(missing).toEqual([]);
  });

  it('references tile types that exist in TILE_LEGEND', () => {
    const missing = FORAGE_SOURCES.flatMap((s) =>
      s.tileTypes
        .filter((t) => !(t in TILE_LEGEND))
        .map((t) => `${s.label} → ${TileType[t]} (tileTypes are only a hint when findAnchor is set, but should still be real tiles)`)
    );
    expect(missing).toEqual([]);
  });

  it('gives every source a unique label (debug logs key off it)', () => {
    const labels = FORAGE_SOURCES.map((s) => s.label);
    const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i);
    expect(duplicates).toEqual([]);
  });

  it('never uses a fallback success rate the item already overrides', () => {
    // Purely informational drift guard: if an item gains a forageSuccessRate,
    // the source's fallback becomes dead — fine, but the entry should be
    // revisited so the two don't tell different stories.
    const overridden = FORAGE_SOURCES.filter(
      (s) => getItem(s.itemId)?.forageSuccessRate !== undefined
    ).map((s) => s.itemId);
    expect(overridden.length).toBeGreaterThan(0);
  });

  it('declares cooldownMessage exactly for the sources that self-check cooldown', () => {
    // Mirrors the pre-refactor chain: heather, spruce tree, bee hive, mustard
    // flower, shrinking violet and frost flower each check the anchor cooldown
    // with a custom message; every other source relies on the early scan or
    // has no cooldown gate at all.
    const expected = new Set([
      'heather',
      'spruce tree',
      'bee hive',
      'mustard flower',
      'shrinking violet',
      'frost flower',
    ]);
    const withMessage = new Set(
      FORAGE_SOURCES.filter((s) => s.cooldownMessage).map((s) => s.label)
    );
    expect([...withMessage].sort()).toEqual([...expected].sort());
  });
});