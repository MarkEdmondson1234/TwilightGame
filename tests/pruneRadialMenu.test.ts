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
