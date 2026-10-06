/**
 * Snowmen on a shared map are cleaned up by whoever is standing there.
 *
 * A snowman is built in the village, so it is a shared placement. The season
 * usually turns while its builder is elsewhere: their local copy is removed,
 * but the shared-world reconcile only deletes documents for the current map,
 * so the shared copy survived and came back through the mirror into spring.
 * A friend's snowmen were never in our local state at all. The sweep must
 * also cover snowmen that exist only in the shared mirror for the current map.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../maps/MapManager', () => ({
  mapManager: { getCurrentMapId: () => 'village', getCurrentMap: () => ({ id: 'village' }) },
}));

import { snowmanManager, SNOWMAN_IMAGE } from '../utils/SnowmanManager';
import { sharedPlacedItemsManager } from '../multiplayer/sharedPlacedItems';
import { gameState } from '../GameState';
import { TimeManager, Season } from '../utils/TimeManager';

const sharedSnowman = (id: string) => ({
  id,
  itemId: 'seasonal_snowman',
  position: { x: 5, y: 5 },
  mapId: 'village',
  image: SNOWMAN_IMAGE,
  timestamp: Date.now(),
  permanent: true,
});

describe('snowman sweep on a shared map', () => {
  beforeEach(() => {
    sharedPlacedItemsManager.setMap('village');
    sharedPlacedItemsManager.clear();
  });
  afterEach(() => {
    TimeManager.clearTimeOverride();
    sharedPlacedItemsManager.clear();
    vi.restoreAllMocks();
  });

  it('removes a snowman that is only in the shared mirror once it is not winter', () => {
    TimeManager.setTimeOverride({ season: Season.SPRING, day: 5, hour: 10, minute: 0 });
    sharedPlacedItemsManager.apply(sharedSnowman('snowman_orphaned'));
    expect(gameState.getPlacedItems('village').some((i) => i.id === 'snowman_orphaned')).toBe(true);

    snowmanManager.check();

    expect(gameState.getPlacedItems('village').some((i) => i.id === 'snowman_orphaned')).toBe(false);
    expect(sharedPlacedItemsManager.has('snowman_orphaned')).toBe(false);
  });

  it('leaves shared snowmen alone while it is still winter', () => {
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 40, hour: 10, minute: 0 });
    sharedPlacedItemsManager.apply(sharedSnowman('snowman_winter'));

    snowmanManager.check();

    expect(sharedPlacedItemsManager.has('snowman_winter')).toBe(true);
  });
});
