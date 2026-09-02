/**
 * @vitest-environment node
 *
 * Right-click on a farm plot offers what the *plot* supports, not what the player
 * happens to be holding.
 *
 * On a plain click the held tool gates everything: no hoe, no "Till Soil". That is
 * correct for clicking — but it is also the game's biggest source of "I clicked it and
 * nothing happened", because nothing on screen says why. The context menu is the way out
 * of that, and it only works if three things hold together: the action is offered
 * without the tool in hand, it runs with the tool it actually needs, and it is not
 * offered for a tool the player does not own.
 *
 * Each of those fails silently — an action that quietly does nothing, or a menu entry
 * that cannot work — so all three are pinned here.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TileType, FarmPlotState } from '../types';
import type { InteractionContext } from '../utils/interactions/types';

vi.mock('../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, DEBUG: { FARM: false, CLICK: false } };
});

const handleFarmAction = vi.fn(() => ({ handled: true }));
vi.mock('../utils/actionHandlers', () => ({
  handleFarmAction: (...args: unknown[]) => handleFarmAction(...(args as [])),
}));

const ownedTools = new Set<string>();
const ownedSeeds: { itemId: string }[] = [];
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    hasItem: (id: string) => ownedTools.has(id),
    getAllSeeds: () => ownedSeeds,
    getInventoryData: () => ({ items: [], tools: [] }),
  },
}));

let plotTileType: TileType = TileType.SOIL_FALLOW;
vi.mock('../utils/farmManager', () => ({
  farmManager: {
    updateAllPlots: () => {},
    getPlot: () => ({ state: FarmPlotState.FALLOW }),
    getTileTypeForPlot: () => plotTileType,
    getAllPlots: () => [],
  },
}));

vi.mock('../utils/CharacterData', () => ({ characterData: { saveFarmPlots: () => {}, saveInventory: () => {} } }));
vi.mock('../GameState', () => ({ gameState: { addGold: () => {} } }));
vi.mock('../data/crops', () => ({ getCrop: (id: string) => ({ displayName: id, sellPrice: 1 }) }));
vi.mock('../data/items', () => ({
  getCropIdFromSeed: (seedId: string) => seedId.replace('seed_', ''),
}));

import { farmingProvider } from '../utils/interactions/providers/farming';

const onSelectTool = vi.fn();

function ctx(overrides: Partial<InteractionContext> = {}): InteractionContext {
  return {
    currentMapId: 'farm',
    currentTool: 'hand',
    selectedSeed: null,
    position: { x: 5, y: 5 },
    tileX: 5,
    tileY: 5,
    tilePos: { x: 5, y: 5 },
    tileData: { type: plotTileType },
    playerSizeTier: 0,
    placedItems: [],
    itemAtPosition: undefined,
    onFarmAction: () => {},
    onSelectTool,
    ...overrides,
  } as unknown as InteractionContext;
}

const labels = (ctxArg: InteractionContext) => farmingProvider(ctxArg).map((i) => i.label);

beforeEach(() => {
  vi.clearAllMocks();
  ownedTools.clear();
  ownedSeeds.length = 0;
  plotTileType = TileType.SOIL_FALLOW;
});

describe('farm plot — plain click keeps the held-tool rule', () => {
  it('offers Till Soil when the hoe is in hand', () => {
    expect(labels(ctx({ currentTool: 'tool_hoe' }))).toContain('Till Soil');
  });

  it('does not offer Till Soil to an empty hand, even when the hoe is owned', () => {
    ownedTools.add('tool_hoe');
    expect(labels(ctx({ currentTool: 'hand' }))).not.toContain('Till Soil');
  });
});

describe('farm plot — context menu offers what the plot supports', () => {
  it('offers Till Soil on fallow soil with an empty hand, if the hoe is owned', () => {
    ownedTools.add('tool_hoe');
    expect(labels(ctx({ currentTool: 'hand', isContextMenu: true }))).toContain('Till Soil');
  });

  it('withholds Till Soil when the player does not own a hoe', () => {
    // The menu shows what is possible, not what would be possible after a shopping trip.
    expect(labels(ctx({ currentTool: 'hand', isContextMenu: true }))).not.toContain('Till Soil');
  });

  it('offers Water Soil on tilled soil with an empty hand, if the can is owned', () => {
    plotTileType = TileType.SOIL_TILLED;
    ownedTools.add('tool_watering_can');
    expect(labels(ctx({ currentTool: 'hand', isContextMenu: true }))).toContain('Water Soil');
  });

  it('runs the action with the tool it needs, and brings that tool to hand', () => {
    ownedTools.add('tool_hoe');
    const till = farmingProvider(ctx({ currentTool: 'hand', isContextMenu: true })).find(
      (i) => i.label === 'Till Soil'
    );
    till?.execute();

    // Without both of these the menu entry appears and then quietly does nothing.
    expect(onSelectTool).toHaveBeenCalledWith('tool_hoe');
    expect(handleFarmAction).toHaveBeenCalledWith(
      { x: 5, y: 5 },
      'tool_hoe', // not 'hand' — the whole point
      'farm',
      undefined
    );
  });

  it('lists every seed carried, so choosing what to plant does not mean a trip to the inventory', () => {
    plotTileType = TileType.SOIL_TILLED;
    ownedSeeds.push({ itemId: 'seed_radish' }, { itemId: 'seed_corn' }, { itemId: 'seed_radish' });

    const planting = labels(ctx({ currentTool: 'hand', isContextMenu: true })).filter((l) =>
      l.startsWith('Plant ')
    );

    // De-duplicated: seeds are stored one instance per stack.
    expect(planting).toEqual(['Plant radish', 'Plant corn']);
  });

  it('plants only the seed in hand on a plain click', () => {
    plotTileType = TileType.SOIL_TILLED;
    ownedSeeds.push({ itemId: 'seed_radish' }, { itemId: 'seed_corn' });

    const planting = labels(ctx({ currentTool: 'seed_corn' })).filter((l) => l.startsWith('Plant '));
    expect(planting).toEqual(['Plant corn']);
  });

  it('never shows the placeholder guidance entry, which is written to be auto-executed unseen', () => {
    plotTileType = TileType.SOIL_TILLED; // Nothing offerable: no can, no seeds.
    expect(labels(ctx({ currentTool: 'hand', isContextMenu: true }))).not.toContain(
      'Check Farm Action'
    );
  });
});
