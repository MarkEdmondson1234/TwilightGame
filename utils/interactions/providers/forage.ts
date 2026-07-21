/**
 * Foraging wild plants, mushrooms and other gatherables.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { TileType } from '../../../types';
import { getTileData, hasTileTypeNearby } from '../../mapUtils';
import { handleForageAction } from '../../forageHandlers';
import { npcManager } from '../../../NPCManager';

export function forageProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, onForage, tileX, tileY, tileData } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for forage interactions
  if (tileData) {
    let canForage = false;

    // Forest/deep forest foraging (regular tiles)
    if (currentMapId.startsWith('forest') || currentMapId === 'deep_forest') {
      const forageableTiles = [
        TileType.FERN,
        TileType.GRASS,
        TileType.MUSHROOM, // Mushrooms give mushroom items, not seeds
        TileType.WILD_STRAWBERRY,
        TileType.MOONPETAL, // Moonpetal in deep forest (night-blooming magical flower)
      ];
      if (forageableTiles.includes(tileData.type)) {
        canForage = true;
      }
    }

    // Stream foraging (dragonfly wings) - check if adjacent to stream
    // Search for STREAM tiles within 4 tiles (5x5 sprite + adjacency)
    const searchRadius = 4;
    for (let dy = -searchRadius; dy <= searchRadius && !canForage; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const checkX = tileX + dx;
        const checkY = tileY + dy;
        const checkTile = getTileData(checkX, checkY);

        if (checkTile?.type === TileType.STREAM) {
          // Found a stream anchor - check if player is adjacent to the 5x5 area
          const streamLeft = checkX - 2;
          const streamRight = checkX + 2;
          const streamTop = checkY - 2;
          const streamBottom = checkY + 2;

          const isAdjacentToStream =
            tileX >= streamLeft - 1 &&
            tileX <= streamRight + 1 &&
            tileY >= streamTop - 1 &&
            tileY <= streamBottom + 1 &&
            // But NOT inside the stream itself
            !(
              tileX >= streamLeft &&
              tileX <= streamRight &&
              tileY >= streamTop &&
              tileY <= streamBottom
            );

          if (isAdjacentToStream) {
            canForage = true;
            break;
          }
        }
      }
    }

    // Check for forageable multi-tile sprites (bee hive, toadstool, moonpetal, addersmeat, wolfsbane, mustard flower, shrinking violet, frost flower, dead spruce, spruce trees)
    // Use radius=1 (3x3 search) — covers 3x3 sprites with centred anchors; larger sprites need clicking near the base
    if (!canForage) {
      canForage = hasTileTypeNearby(
        tileX,
        tileY,
        [
          TileType.BEE_HIVE,
          TileType.LUMINESCENT_TOADSTOOL,
          TileType.FOREST_MUSHROOM,
          TileType.MOONPETAL,
          TileType.ADDERSMEAT,
          TileType.WOLFSBANE,
          TileType.ROSEBUSH_PINK,
          TileType.ROSEBUSH_RED,
          TileType.MUSTARD_FLOWER,
          TileType.SHRINKING_VIOLET,
          TileType.FROST_FLOWER,
          TileType.HEATHER,
          TileType.DEAD_SPRUCE,
          TileType.SPRUCE_TREE,
          TileType.SPRUCE_TREE_SMALL,
          TileType.GIANT_MUSHROOM,
          TileType.SAKURA_TREE,
          TileType.MEADOW_GRASS,
        ],
        1
      );
    }

    // Check for lava lake foraging (phoenix ash) — use radius 4 to cover large lakes
    if (!canForage) {
      canForage = hasTileTypeNearby(tileX, tileY, [
        TileType.LAVA_LAKE_SM,
        TileType.LAVA_LAKE_MD,
        TileType.LAVA_LAKE_LG,
      ], 4);
    }

    // Check for nearby sparrow NPCs (forageable feathers)
    if (!canForage) {
      const npcs = npcManager.getCurrentMapNPCs();
      for (const npc of npcs) {
        if (npc.id.startsWith('sparrow_')) {
          const dx = Math.abs(npc.position.x - tileX);
          const dy = Math.abs(npc.position.y - tileY);
          if (dx <= 1 && dy <= 1) {
            canForage = true;
            break;
          }
        }
      }
    }

    if (canForage) {
      interactions.push({
        type: 'forage',
        label: 'Forage',
        icon: '🔍',
        color: '#059669',
        execute: () => {
          const result = handleForageAction(position, currentMapId);
          onForage?.(result);
        },
      });
    }
  }

  return interactions;
}
