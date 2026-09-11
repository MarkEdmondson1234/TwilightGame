/** @vitest-environment node */
/**
 * The Harvest Feast's closing speech is one of 3 lines, chosen by how many
 * distinct meals the community contributed that day (never the two baseline
 * NPC dishes — see data/harvestFeast.ts's ELIAS_CLOSING_LINES and the
 * "village-wide cumulative" design decision in HarvestFeastManager.ts).
 */
import { describe, it, expect } from 'vitest';
import { computeFeastTier } from '../utils/HarvestFeastManager';
import { ELIAS_CLOSING_LINES } from '../data/harvestFeast';

describe('computeFeastTier', () => {
  it('is tier 1 when no player meals were contributed (baseline only)', () => {
    expect(computeFeastTier(0)).toBe(1);
  });

  it('is tier 2 for 1 to 3 distinct player-contributed meals', () => {
    expect(computeFeastTier(1)).toBe(2);
    expect(computeFeastTier(2)).toBe(2);
    expect(computeFeastTier(3)).toBe(2);
  });

  it('is tier 3 for more than 3 distinct player-contributed meals', () => {
    expect(computeFeastTier(4)).toBe(3);
    expect(computeFeastTier(10)).toBe(3);
  });

  it('every tier has a closing line defined', () => {
    expect(ELIAS_CLOSING_LINES[1]).toBeTruthy();
    expect(ELIAS_CLOSING_LINES[2]).toBeTruthy();
    expect(ELIAS_CLOSING_LINES[3]).toBeTruthy();
  });
});
