/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { canSkiHere, getActivityCandidates } from '../utils/activityDiscovery';

describe('activity discovery eligibility', () => {
  it('offers skiing in the same winter forests as the launch action', () => {
    for (const mapId of ['forest', 'forest_123', 'deep_forest']) {
      expect(canSkiHere(mapId, 'winter')).toBe(true);
      expect(getActivityCandidates({ mapId, season: 'winter', nearbyNpcs: [] })).toEqual([
        { id: 'skiing' },
      ]);
      expect(canSkiHere(mapId, 'summer')).toBe(false);
    }
    expect(canSkiHere('village', 'winter')).toBe(false);
    expect(canSkiHere('mushroom_forest', 'winter')).toBe(false);
  });
  it('requires the nearby host and correct season for pumpkin carving', () => {
    const nearbyNpcs = [{ id: 'child', name: 'Village Child' }];
    expect(getActivityCandidates({ mapId: 'village', season: 'autumn', nearbyNpcs })).toEqual([
      { id: 'pumpkin-carving', npcId: 'child' },
    ]);
    expect(getActivityCandidates({ mapId: 'village', season: 'spring', nearbyNpcs })).toEqual([]);
    expect(getActivityCandidates({ mapId: 'village', season: 'autumn', nearbyNpcs: [] })).toEqual(
      []
    );
  });
  it('offers all-year wreaths only from the actual mini-game host, and recognises generated Cinder IDs', () => {
    expect(
      getActivityCandidates({
        mapId: 'mushroom',
        season: 'winter',
        nearbyNpcs: [{ id: 'mushra', name: 'Mushra' }],
      })
    ).toEqual([{ id: 'wreath-making', npcId: 'mushra' }]);
    expect(
      getActivityCandidates({
        mapId: 'village',
        season: 'spring',
        nearbyNpcs: [{ id: 'village_mushra', name: 'Mushra' }],
      })
    ).toEqual([]);
    expect(
      getActivityCandidates({
        mapId: 'lava_123',
        season: 'summer',
        nearbyNpcs: [{ id: 'guide_123', name: 'Cinder the Guide' }],
      })
    ).toEqual([{ id: 'lava-leap', npcId: 'guide_123' }]);
  });
});
