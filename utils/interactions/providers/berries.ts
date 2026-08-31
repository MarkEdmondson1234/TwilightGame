/**
 * Berry and nut picking from wild strawberries and adjacent bushes
 * (brambles, hazel, blueberry, hawthorn).
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { TileType } from '../../../types';
import { findTileTypeNearby } from '../../mapUtils';
import { groceryAssets, itemAssets, magicalAssets } from '../../../assets';
import {
  handleBlackberryHarvest,
  handleBlueberryHarvest,
  handleForageAction,
  handleHazelnutHarvest,
  handleRedBerryHarvest,
} from '../../forageHandlers';
import { staminaManager } from '../../StaminaManager';
import { Season, TimeManager } from '../../TimeManager';

export function berryProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, onForage, tileX, tileY, tileData } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Each harvest handler below (handleBlackberryHarvest etc.) already rejects an
  // out-of-season pick with a "not ripe yet" message, but this provider offered
  // the radial-menu option year-round regardless — the option itself was the bug
  // (issue #20), not the harvest. Gate each one to match its handler's season.
  const currentSeason = TimeManager.getCurrentTime().season;

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

  // Check for blackberry/hazelnut/blueberry/hawthorn harvesting from a bush at or
  // adjacent to the click. findTileTypeNearby's radius=1 search includes the
  // clicked tile itself as well as its 8 neighbours — a hand-rolled version of
  // this used to check only the 8 neighbours, so clicking directly on the bush's
  // own anchor tile never matched (only clicking one tile away from it did),
  // making the click hitbox appear offset from the visible sprite (issue #21).
  const hasBrambles = findTileTypeNearby(tileX, tileY, [TileType.BRAMBLES], 1).found;

  if (hasBrambles && currentSeason === Season.SUMMER) {
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
  const hasHazelBush = findTileTypeNearby(tileX, tileY, [TileType.HAZEL_BUSH], 1).found;

  if (hasHazelBush && currentSeason === Season.AUTUMN) {
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
  const hasBlueberryBush = findTileTypeNearby(tileX, tileY, [TileType.BLUEBERRY_BUSH], 1).found;

  if (hasBlueberryBush && (currentSeason === Season.SUMMER || currentSeason === Season.AUTUMN)) {
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
  const hasHawthornBush = findTileTypeNearby(tileX, tileY, [TileType.BUSH], 1).found;

  if (hasHawthornBush && currentSeason === Season.AUTUMN) {
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
