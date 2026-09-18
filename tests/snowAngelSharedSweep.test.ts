/**
 * Snow angels on a shared map are cleaned up by whoever is standing there.
 *
 * An angel is a shared placement, and the child who made it is usually gone
 * before its three-minute timer runs out. Only their client held it in local
 * state, so only their client could remove it — and when it never came back,
 * the angel stayed in the shared mirror for everyone, still on the village
 * green in spring (seen 2026-09-18). The sweep must also cover angels that
 * exist only in the shared mirror for the current map.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../maps', () => ({
  mapManager: { getCurrentMapId: () => 'village', getCurrentMap: () => ({ id: 'village' }) },
}));

import { snowAngelManager, SNOW_ANGEL_IMAGE } from '../utils/SnowAngelManager';
import { sharedPlacedItemsManager } from '../multiplayer/sharedPlacedItems';
import { gameState } from '../GameState';
import { TimeManager, Season } from '../utils/TimeManager';

const otherPlayersAngel = (id: string, timestamp: number) => ({
  id,
  itemId: 'seasonal_snow_angel',
  position: { x: 5, y: 5 },
  mapId: 'village',
  image: SNOW_ANGEL_IMAGE,
  timestamp,
  permanent: true,
  customScale: 2,
});

describe('snow angel sweep on a shared map', () => {
  beforeEach(() => {
    sharedPlacedItemsManager.setMap('village');
    sharedPlacedItemsManager.clear();
  });
  afterEach(() => {
    TimeManager.clearTimeOverride();
    sharedPlacedItemsManager.clear();
    vi.restoreAllMocks();
  });

  it('removes another player\'s angel from the shared mirror once it is not winter', () => {
    TimeManager.setTimeOverride({ season: Season.SPRING, day: 5, hour: 10, minute: 0 });
    sharedPlacedItemsManager.apply(otherPlayersAngel('snow_angel_theirs', Date.now()));
    expect(gameState.getPlacedItems('village').some((i) => i.id === 'snow_angel_theirs')).toBe(true);

    snowAngelManager.check();

    expect(gameState.getPlacedItems('village').some((i) => i.id === 'snow_angel_theirs')).toBe(false);
    expect(sharedPlacedItemsManager.has('snow_angel_theirs')).toBe(false);
  });

  it('removes another player\'s angel whose timer has run out even in a snowy winter', () => {
    TimeManager.setTimeOverride({ season: Season.WINTER, day: 40, hour: 10, minute: 0 });
    gameState.setWeather('snow');
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    sharedPlacedItemsManager.apply(otherPlayersAngel('snow_angel_old', fiveMinutesAgo));
    sharedPlacedItemsManager.apply(otherPlayersAngel('snow_angel_fresh', Date.now()));

    snowAngelManager.check();

    expect(sharedPlacedItemsManager.has('snow_angel_old')).toBe(false);
    expect(sharedPlacedItemsManager.has('snow_angel_fresh')).toBe(true);
  });
});
