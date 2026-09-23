/**
 * Cooking needs a fire (#151, #157). `getNearbyCookingStation` is the one predicate every
 * cooking entry point reads — the book's Cook button, the "Cook here" interaction and
 * button, the E/C keys and the touch action button — so these cases pin what counts as
 * "beside a fire": Mum's fireplace, a placed campfire, a STOVE/CAMPFIRE tile, or nothing.
 */
/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TileType } from '../types';

const state = vi.hoisted(() => ({
  placed: {} as Record<string, unknown[]>,
  map: null as null | { id: string; grid: number[][] },
}));
vi.mock('../GameState', () => ({
  gameState: { getPlacedItems: (mapId: string) => state.placed[mapId] ?? [] },
}));
vi.mock('../maps', () => ({
  mapManager: { getCurrentMap: () => state.map },
}));

import {
  getNearbyCookingStation,
  getCookingStationsOnMap,
  getCookBlockedReason,
  isClickOnCookingStation,
  NO_COOKING_STATION_MESSAGE,
  TEA_NEEDS_FIREPLACE_MESSAGE,
} from '../utils/cookingStations';
import { MUMS_KITCHEN_FIREPLACE } from '../utils/kitchenFireplace';
import { COOKING } from '../constants';

const campfire = (x: number, y: number, id = 'fire1') => ({
  id,
  itemId: 'furniture_campfire',
  position: { x, y },
  image: '/campfire.png',
});

beforeEach(() => {
  state.placed = {};
  state.map = null;
});

describe('getNearbyCookingStation', () => {
  it("finds Mum's fireplace when the player stands beside it", () => {
    const { x, y } = MUMS_KITCHEN_FIREPLACE;
    const station = getNearbyCookingStation({ x: x + 1.2, y: y + 1.5 }, 'mums_kitchen');
    expect(station?.kind).toBe('fireplace');
  });

  it("does not let the player cook from the far side of Mum's kitchen", () => {
    const { x, y } = MUMS_KITCHEN_FIREPLACE;
    const far = { x: x + COOKING.STATION_RANGE_TILES + 3, y: y + 2 };
    expect(getNearbyCookingStation(far, 'mums_kitchen')).toBeNull();
  });

  it('knows the fireplace belongs to the kitchen only', () => {
    expect(getNearbyCookingStation({ ...MUMS_KITCHEN_FIREPLACE }, 'village')).toBeNull();
  });

  it('finds a placed campfire the player is standing beside', () => {
    state.placed.village = [campfire(10, 10)];
    const station = getNearbyCookingStation({ x: 11.5, y: 11.5 }, 'village');
    expect(station?.kind).toBe('campfire');
    expect(station?.placedItemId).toBe('fire1');
  });

  it('ignores a placed campfire that is out of reach', () => {
    state.placed.village = [campfire(10, 10)];
    expect(getNearbyCookingStation({ x: 16, y: 10 }, 'village')).toBeNull();
  });

  it('ignores placed items that are not cooking stations', () => {
    state.placed.village = [{ ...campfire(10, 10), itemId: 'furniture_garden_bench' }];
    expect(getNearbyCookingStation({ x: 10, y: 10 }, 'village')).toBeNull();
  });

  it('finds nothing where there is no fire at all', () => {
    expect(getNearbyCookingStation({ x: 3, y: 3 }, 'village')).toBeNull();
    expect(getNearbyCookingStation(undefined, 'village')).toBeNull();
    expect(getNearbyCookingStation({ x: 3, y: 3 }, null)).toBeNull();
  });

  it('still finds STOVE and CAMPFIRE tiles drawn into the loaded map', () => {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(TileType.FLOOR));
    grid[2][3] = TileType.STOVE;
    state.map = { id: 'cottage', grid };
    expect(getNearbyCookingStation({ x: 3.5, y: 3.5 }, 'cottage')?.kind).toBe('stove');
    // The grid only speaks for the map that is actually loaded.
    expect(getNearbyCookingStation({ x: 3.5, y: 3.5 }, 'elsewhere')).toBeNull();
  });

  it('prefers the closest station when two are in reach', () => {
    state.placed.village = [campfire(10, 10, 'far'), campfire(13, 10, 'near')];
    expect(getNearbyCookingStation({ x: 13.2, y: 10.2 }, 'village')?.placedItemId).toBe('near');
  });
});

describe('station markers and clicks', () => {
  it('lists every station on the map for the glow markers', () => {
    state.placed.mums_kitchen = [campfire(9, 6)];
    const kinds = getCookingStationsOnMap('mums_kitchen').map((s) => s.kind);
    expect(kinds).toEqual(['fireplace', 'campfire']);
  });

  it('only answers clicks on a placed campfire itself, so walking around it still walks', () => {
    state.placed.village = [campfire(10, 10)];
    const [station] = getCookingStationsOnMap('village');
    expect(isClickOnCookingStation(station, { x: 10, y: 10 })).toBe(true);
    expect(isClickOnCookingStation(station, { x: 12, y: 10 })).toBe(false);
  });

  it('answers clicks on the floor in front of the fireplace', () => {
    const [fireplace] = getCookingStationsOnMap('mums_kitchen');
    const { x, y } = MUMS_KITCHEN_FIREPLACE;
    expect(isClickOnCookingStation(fireplace, { x, y: y + 1 })).toBe(true);
    expect(isClickOnCookingStation(fireplace, { x: x + 4, y: y + 1 })).toBe(false);
  });
});

describe('getCookBlockedReason', () => {
  it('explains where to go when no fire is near', () => {
    expect(getCookBlockedReason('french_toast', null)).toBe(NO_COOKING_STATION_MESSAGE);
    expect(NO_COOKING_STATION_MESSAGE).toBe(
      "Find a fire or stove to cook — Mum's fireplace, or a campfire you've placed."
    );
  });

  it('keeps tea at the kettle over the fireplace', () => {
    state.placed.village = [campfire(10, 10)];
    const atCampfire = getNearbyCookingStation({ x: 10, y: 10 }, 'village');
    expect(getCookBlockedReason('tea', atCampfire)).toBe(TEA_NEEDS_FIREPLACE_MESSAGE);
    expect(getCookBlockedReason('french_toast', atCampfire)).toBeNull();
    const atFireplace = getNearbyCookingStation({ ...MUMS_KITCHEN_FIREPLACE }, 'mums_kitchen');
    expect(getCookBlockedReason('tea', atFireplace)).toBeNull();
  });
});
