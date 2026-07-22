/**
 * Berry and nut picking from wild strawberries and adjacent bushes
 * (brambles, hazel, blueberry, hawthorn).
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { TileType } from '../../../types';
import { getTileData } from '../../mapUtils';
import { groceryAssets, itemAssets, magicalAssets } from '../../../assets';
import { handleBlackberryHarvest, handleBlueberryHarvest, handleForageAction, handleHazelnutHarvest, handleRedBerryHarvest } from '../../forageHandlers';
import { staminaManager } from '../../StaminaManager';

export function berryProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, onForage, tileX, tileY, tileData } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for wild strawberry harvesting
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  if (tileData && tileData.type === TileType.WILD_STRAWBERRY) {
    interactions.push({
      type: 'harvest_strawberry',
      label: 'Pick Strawberries',
      icon: itemAssets.strawberry,
      color: '#ef4444',
      execute: () => {
        const result = handleForageAction(position, currentMapId);
        onForage?.(result);
      },
    });
  }

  // Check for blackberry harvesting from adjacent brambles
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  const adjacentTiles = [
    { x: tileX - 1, y: tileY },
    { x: tileX + 1, y: tileY },
    { x: tileX, y: tileY - 1 },
    { x: tileX, y: tileY + 1 },
    { x: tileX - 1, y: tileY - 1 },
    { x: tileX + 1, y: tileY - 1 },
    { x: tileX - 1, y: tileY + 1 },
    { x: tileX + 1, y: tileY + 1 },
  ];

  const hasBrambles = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.BRAMBLES;
  });

  if (hasBrambles) {
    interactions.push({
      type: 'harvest_blackberry',
      label: 'Pick Blackberries',
      icon: itemAssets.blackberries,
      color: '#7c3aed',
      execute: () => {
        if (!staminaManager.performActivity('harvest')) return;
        const result = handleBlackberryHarvest(position, currentMapId);
        onForage?.(result);
      },
    });
  }

  // Check for hazelnut harvesting from adjacent hazel bushes
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  const hasHazelBush = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.HAZEL_BUSH;
  });

  if (hasHazelBush) {
    interactions.push({
      type: 'harvest_hazelnut',
      label: 'Pick Hazelnuts',
      icon: groceryAssets.hazelnuts,
      color: '#92400e',
      execute: () => {
        if (!staminaManager.performActivity('harvest')) return;
        const result = handleHazelnutHarvest(position, currentMapId);
        onForage?.(result);
      },
    });
  }

  // Check for blueberry harvesting from adjacent blueberry bushes
  // Allow picking with any tool or no tool (mouse click works regardless of equipped tool)
  const hasBlueberryBush = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.BLUEBERRY_BUSH;
  });

  if (hasBlueberryBush) {
    interactions.push({
      type: 'harvest_blueberry',
      label: 'Pick Blueberries',
      icon: itemAssets.blackberries, // TODO: Use dedicated blueberry sprite
      color: '#3b82f6',
      execute: () => {
        if (!staminaManager.performActivity('harvest')) return;
        const result = handleBlueberryHarvest(position, currentMapId);
        onForage?.(result);
      },
    });
  }

  // Check for red berry harvesting from adjacent hawthorn bushes (autumn only)
  const hasHawthornBush = adjacentTiles.some((tile) => {
    const adjacentTileData = getTileData(tile.x, tile.y);
    return adjacentTileData && adjacentTileData.type === TileType.BUSH;
  });

  if (hasHawthornBush) {
    interactions.push({
      type: 'harvest_red_berries',
      label: 'Pick Red Berries',
      icon: magicalAssets.red_berries,
      color: '#b91c1c',
      execute: () => {
        if (!staminaManager.performActivity('harvest')) return;
        const result = handleRedBerryHarvest(position, currentMapId);
        onForage?.(result);
      },
    });
  }

  return interactions;
}
