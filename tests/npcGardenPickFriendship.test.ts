/**
 * @vitest-environment node
 *
 * A villager's vegetables may only be picked once you are friends (issue #157).
 *
 * Below NPC_GARDEN.PICK_MIN_TIER nothing is harvested and the player gets a kind
 * message instead; at the tier, harvesting works exactly as before. The gate has
 * to hold on every input path — the click provider (including herb and
 * dual-harvest options, which call farmManager directly) and handleFarmAction,
 * which keyboard and touch call — or one path quietly lets a stranger pick.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TileType, FarmPlotState } from '../types';
import type { FarmPlot, FriendshipTier } from '../types';
import type { InteractionContext } from '../utils/interactions/types';
import { NPC_GARDEN } from '../constants';

// --- friendship: the one thing under test --------------------------------------
const TIER_ORDER: FriendshipTier[] = ['stranger', 'acquaintance', 'good_friend'];
let playerTier: FriendshipTier = 'stranger';
const meetsFriendshipRequirement = vi.fn((_npcId: string, required?: FriendshipTier) =>
  required ? TIER_ORDER.indexOf(playerTier) >= TIER_ORDER.indexOf(required) : true
);
vi.mock('../utils/FriendshipManager', () => ({
  friendshipManager: {
    meetsFriendshipRequirement: (npcId: string, tier?: FriendshipTier) =>
      meetsFriendshipRequirement(npcId, tier),
  },
}));

// --- a single READY plot at (5,5) ----------------------------------------------
let currentPlot: FarmPlot | null = null;
const harvestCrop = vi.fn(() => ({
  cropId: currentPlot?.cropType ?? 'radish',
  yield: 1,
  seedsDropped: 0,
  quality: 'normal' as const,
}));
const harvestCropWithMode = vi.fn(() => null);
const removeHerb = vi.fn();
vi.mock('../utils/farmManager', () => ({
  farmManager: {
    updateAllPlots: () => {},
    getPlot: () => currentPlot,
    getTileTypeForPlot: () => TileType.SOIL_READY,
    getAllPlots: () => [],
    harvestCrop: (...args: unknown[]) => harvestCrop(...(args as [])),
    harvestCropWithMode: (...args: unknown[]) => harvestCropWithMode(...(args as [])),
    removeHerb: (...args: unknown[]) => removeHerb(...(args as [])),
  },
}));

vi.mock('../utils/StaminaManager', () => ({
  staminaManager: { performActivity: () => true },
}));
vi.mock('../utils/CharacterData', () => ({
  characterData: { saveFarmPlots: () => {}, saveInventory: () => {} },
}));

import { farmingProvider } from '../utils/interactions/providers/farming';
import { handleFarmAction } from '../utils/actionHandlers';
import { npcPlotPickRefusal } from '../utils/npcGardenAccess';

function plot(cropType: string, plantedByNpc?: string): FarmPlot {
  return {
    mapId: 'village',
    position: { x: 5, y: 5 },
    state: FarmPlotState.READY,
    cropType,
    plantedAtDay: 0,
    plantedAtHour: 0,
    lastWateredDay: 0,
    lastWateredHour: 0,
    stateChangedAtDay: 0,
    stateChangedAtHour: 0,
    plantedAtTimestamp: 1,
    lastWateredTimestamp: 1,
    stateChangedAtTimestamp: 1,
    quality: 'normal',
    fertiliserApplied: false,
    ...(plantedByNpc ? { plantedByNpc } : {}),
  } as FarmPlot;
}

const onFarmAction = vi.fn();
function ctx(overrides: Partial<InteractionContext> = {}): InteractionContext {
  return {
    currentMapId: 'village',
    currentTool: 'hand',
    selectedSeed: null,
    position: { x: 5, y: 5 },
    tileX: 5,
    tileY: 5,
    tilePos: { x: 5, y: 5 },
    tileData: { type: TileType.SOIL_READY },
    playerSizeTier: 0,
    placedItems: [],
    itemAtPosition: undefined,
    onFarmAction,
    ...overrides,
  } as unknown as InteractionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  playerTier = 'stranger';
  currentPlot = null;
});

describe('npcPlotPickRefusal', () => {
  it('never refuses a player-planted plot', () => {
    expect(npcPlotPickRefusal(plot('radish'))).toBeNull();
  });

  it('refuses a stranger, kindly, naming the gardener', () => {
    const message = npcPlotPickRefusal(plot('radish', 'village_elder'));
    expect(message).toMatch(/Village Elder's radish/);
    expect(message).toMatch(/better friends/);
    expect(meetsFriendshipRequirement).toHaveBeenCalledWith(
      'village_elder',
      NPC_GARDEN.PICK_MIN_TIER
    );
  });

  it('allows picking at the required tier', () => {
    playerTier = NPC_GARDEN.PICK_MIN_TIER;
    expect(npcPlotPickRefusal(plot('radish', 'village_elder'))).toBeNull();
  });

  it('uses a named friendship tier, not a bare number', () => {
    expect(TIER_ORDER).toContain(NPC_GARDEN.PICK_MIN_TIER);
    expect(NPC_GARDEN.PICK_MIN_TIER).not.toBe('stranger');
  });
});

describe('click — farming provider', () => {
  it('below the tier: offers only a gentle message, and harvests nothing', () => {
    currentPlot = plot('radish', 'village_elder');
    const interactions = farmingProvider(ctx());

    expect(interactions.map((i) => i.type)).toEqual(['farm_npc_crop_not_yet']);
    interactions[0].execute();

    expect(harvestCrop).not.toHaveBeenCalled();
    expect(onFarmAction).toHaveBeenCalledWith(
      expect.objectContaining({ handled: false, message: expect.stringMatching(/better friends/) })
    );
  });

  it('below the tier: herb and dual-harvest options are withheld too', () => {
    for (const crop of ['lavender', 'sunflower']) {
      currentPlot = plot(crop, 'old_woman_knitting');
      const interactions = farmingProvider(ctx({ isContextMenu: true }));
      expect(interactions.map((i) => i.type)).toEqual(['farm_npc_crop_not_yet']);
      interactions[0].execute();
    }
    expect(harvestCrop).not.toHaveBeenCalled();
    expect(harvestCropWithMode).not.toHaveBeenCalled();
    expect(removeHerb).not.toHaveBeenCalled();
  });

  it('collecting interactions has no side effects', () => {
    currentPlot = plot('radish', 'village_elder');
    farmingProvider(ctx());
    expect(onFarmAction).not.toHaveBeenCalled();
    expect(harvestCrop).not.toHaveBeenCalled();
  });

  it('at the tier: the ordinary harvest is offered and picks the crop', () => {
    playerTier = NPC_GARDEN.PICK_MIN_TIER;
    currentPlot = plot('radish', 'village_elder');
    const interactions = farmingProvider(ctx());

    expect(interactions.map((i) => i.type)).toEqual(['farm_harvest']);
    interactions[0].execute();
    expect(harvestCrop).toHaveBeenCalledWith('village', { x: 5, y: 5 });
  });
});

describe('keyboard and touch — handleFarmAction', () => {
  it('below the tier: no harvest, and the kind message is returned for the toast', () => {
    currentPlot = plot('radish', 'village_elder');
    const result = handleFarmAction({ x: 5.5, y: 5.5 }, 'hand', 'village');

    expect(result.handled).toBe(false);
    expect(result.messageType).toBe('info');
    expect(result.message).toMatch(/better friends/);
    expect(harvestCrop).not.toHaveBeenCalled();
  });

  it('at the tier: harvests as before', () => {
    playerTier = NPC_GARDEN.PICK_MIN_TIER;
    currentPlot = plot('radish', 'village_elder');
    const result = handleFarmAction({ x: 5.5, y: 5.5 }, 'hand', 'village');

    expect(result.handled).toBe(true);
    expect(harvestCrop).toHaveBeenCalledTimes(1);
  });

  it("a player's own crop is unaffected by friendship", () => {
    currentPlot = plot('radish');
    expect(handleFarmAction({ x: 5.5, y: 5.5 }, 'hand', 'village').handled).toBe(true);
    expect(harvestCrop).toHaveBeenCalledTimes(1);
  });
});
