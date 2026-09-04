/** @vitest-environment node */
/**
 * Regression for issue #24: in winter, pruning a fruit tree works via the E key
 * but doesn't show up as an option in the click-based radial menu.
 *
 * getAvailableInteractions() (the same entry point the click handler in
 * useInteractionController.ts calls) already returns 'prune_tree' correctly near
 * a winter apple tree — confirmed directly here. The actual bug is one level up:
 * fruitTreeProvider's care actions (prune/mulch/harvest) are usually the ONLY
 * interaction available near a tree, and useInteractionController.ts silently
 * auto-executes a click when there's exactly one interaction, showing no radial
 * menu at all — which looks, to the player, exactly like the option is "missing".
 * Fixed by setting requireConfirmation: true (the same flag snowAngelProvider
 * already uses for this), which forces the menu to render even as the sole option.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAvailableInteractions } from '../utils/interactions/index';
import { mapManager, transitionToMap } from '../maps';
import { TimeManager, Season } from '../utils/TimeManager';
import { fruitTreeManager } from '../utils/fruitTreeManager';
import { inventoryManager } from '../utils/inventoryManager';
import type { MapDefinition } from '../types';
import { TileType } from '../types';

function orchardMap(id: string): MapDefinition {
  const width = 5;
  const height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(TileType.GRASS));
  // Apple tree anchor at (2, 2), player will stand adjacent at (2, 3)
  grid[2][2] = TileType.APPLE_TREE;
  return {
    id,
    name: id,
    width,
    height,
    grid,
    spawnPoint: { x: 2, y: 3 },
    transitions: [],
    colorScheme: 'village',
    npcs: [],
  } as unknown as MapDefinition;
}

describe('Fruit tree care actions require radial-menu confirmation (#24)', () => {
  const mapId = 'orchard_test';
  const treePos = { x: 2, y: 2 };
  const playerPos = { x: 2, y: 3 };

  beforeEach(() => {
    mapManager.registerMap(orchardMap(mapId));
    transitionToMap(mapId, playerPos);
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue({
      year: 1,
      season: Season.WINTER,
      day: 50,
      totalDays: 50,
      hour: 12,
      minute: 0,
      timeOfDay: 'day' as never,
      totalHours: 1212,
      daylight: { dawn: 7, sunrise: 8, sunset: 16, dusk: 17 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes prune_tree when clicking directly on the tree tile', () => {
    const interactions = getAvailableInteractions({
      position: treePos, // clicking the tree itself
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).toContain('prune_tree');
  });

  it('sets requireConfirmation so the radial menu shows even as the sole interaction', () => {
    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions).toHaveLength(1);
    expect(interactions[0].type).toBe('prune_tree');
    expect(interactions[0].requireConfirmation).toBe(true);
  });

  it('includes prune_tree when clicking elsewhere near the player (canopy click emulation)', () => {
    // Simulates clicking on the tree's canopy, which visually extends above the
    // anchor tile — a position the anchor-only tile search wouldn't match, but
    // fruitTreeProvider intentionally searches from playerPosition instead.
    const interactions = getAvailableInteractions({
      position: { x: treePos.x, y: treePos.y - 2 },
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).toContain('prune_tree');
  });

  it('does not include prune_tree once the tree has already been pruned this winter', () => {
    fruitTreeManager.pruneTree(mapId, treePos.x, treePos.y);

    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).not.toContain('prune_tree');
  });
});

describe('Verdant Surge apply-to-tree interaction', () => {
  // fruitTreeManager state is keyed by "mapId:x:y" and persists for the life of the
  // singleton, so each test gets its own map id — a tree blessed in one test must not
  // leak into the next.
  let mapId: string;
  let mapCounter = 0;
  const treePos = { x: 2, y: 2 };
  const playerPos = { x: 2, y: 3 };
  const potionId = 'potion_verdant_surge';

  beforeEach(() => {
    mapId = `orchard_verdant_test_${mapCounter++}`;
    mapManager.registerMap(orchardMap(mapId));
    transitionToMap(mapId, playerPos);
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue({
      year: 1,
      season: Season.SUMMER,
      day: 50,
      totalDays: 50,
      hour: 12,
      minute: 0,
      timeOfDay: 'day' as never,
      totalHours: 1212,
      daylight: { dawn: 7, sunrise: 8, sunset: 16, dusk: 17 },
    });
    // Start from a clean slate so each test controls its own stock.
    while (inventoryManager.hasItem(potionId, 1)) {
      inventoryManager.removeItem(potionId, 1);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (inventoryManager.hasItem(potionId, 1)) {
      inventoryManager.removeItem(potionId, 1);
    }
  });

  it('appears in the context menu when the potion is held', () => {
    inventoryManager.addItem(potionId, 1);

    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
      isContextMenu: true,
    });

    expect(interactions.map((i) => i.type)).toContain('apply_verdant_surge');
  });

  it('does not appear when the potion is not held', () => {
    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
      isContextMenu: true,
    });

    expect(interactions.map((i) => i.type)).not.toContain('apply_verdant_surge');
  });

  it('does not appear on a plain click (not a context menu)', () => {
    inventoryManager.addItem(potionId, 1);

    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).not.toContain('apply_verdant_surge');
  });

  it('does not appear once the tree is already blessed', () => {
    inventoryManager.addItem(potionId, 1);
    fruitTreeManager.applyVerdantSurge(mapId, treePos.x, treePos.y);

    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
      isContextMenu: true,
    });

    expect(interactions.map((i) => i.type)).not.toContain('apply_verdant_surge');
  });

  it('executing it consumes the potion and blesses the tree', () => {
    inventoryManager.addItem(potionId, 1);

    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
      isContextMenu: true,
    });

    const applyOption = interactions.find((i) => i.type === 'apply_verdant_surge');
    expect(applyOption).toBeDefined();
    applyOption!.execute();

    expect(inventoryManager.hasItem(potionId, 1)).toBe(false);
    expect(fruitTreeManager.isBlessed(mapId, treePos.x, treePos.y)).toBe(true);
  });

  it('appears on a plain click when the potion is the equipped currentTool', () => {
    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: potionId,
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).toContain('apply_verdant_surge');
  });

  it('does not appear on a plain click when a different item is equipped and the potion is not held', () => {
    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: 'hand',
      selectedSeed: null,
    });

    expect(interactions.map((i) => i.type)).not.toContain('apply_verdant_surge');
  });

  it('executing via the equipped path also consumes the potion and blesses the tree', () => {
    inventoryManager.addItem(potionId, 1);

    const interactions = getAvailableInteractions({
      position: treePos,
      playerPosition: playerPos,
      currentMapId: mapId,
      currentTool: potionId,
      selectedSeed: null,
    });

    const applyOption = interactions.find((i) => i.type === 'apply_verdant_surge');
    expect(applyOption).toBeDefined();
    applyOption!.execute();

    expect(inventoryManager.hasItem(potionId, 1)).toBe(false);
    expect(fruitTreeManager.isBlessed(mapId, treePos.x, treePos.y)).toBe(true);
  });
});
