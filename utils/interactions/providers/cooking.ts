/**
 * Cooking and brewing stations — stoves, campfires (tiles and placed), cauldrons, and the
 * fireplace in Mum's kitchen.
 *
 * Cooking is only offered when the *player* is beside a station
 * (`getNearbyCookingStation`), not merely when the click lands on one — a background-image
 * room lets a click reach across the whole room, and cooking is meant to happen at the fire.
 *
 * Registered in ../registry.ts ahead of placedItemProvider, so "Cook here" is offered above
 * a placed campfire's "Pick Up". See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { checkCookingLocation, handleFireplaceTea } from '../../actionHandlers';
import { getTileCoords } from '../../mapUtils';
import {
  getNearbyCookingStation,
  getCookingStationLabel,
  isClickOnCookingStation,
} from '../../cookingStations';

export function cookingProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { position, currentMapId, onCooking, onBrewing } = ctx;
  const config = ctx;
  const interactions: AvailableInteraction[] = [];

  // Cauldron = potion brewing (cooking stations are handled below)
  const brewingLoc = checkCookingLocation(position);
  if (brewingLoc.found && brewingLoc.locationType === 'cauldron') {
    interactions.push({
      type: 'brewing',
      label: 'Brew Potion',
      icon: '🧪',
      color: '#8b5cf6', // Purple for magic
      data: { locationType: brewingLoc.locationType, position: brewingLoc.position },
      execute: () => onBrewing?.(brewingLoc.position),
    });
  }

  // A plain click must land on the station (so walking about near a campfire still walks);
  // a context menu is the player asking what is possible, so being beside one is enough.
  const station = getNearbyCookingStation(ctx.playerPosition ?? position, currentMapId);
  if (!station) return interactions;
  if (!ctx.isContextMenu && !isClickOnCookingStation(station, getTileCoords(position))) {
    return interactions;
  }

  interactions.push({
    type: 'cooking',
    label: 'Cook here',
    icon: station.kind === 'stove' ? '🍳' : '🔥',
    color: '#f97316',
    data: { stationId: station.id, label: getCookingStationLabel(station) },
    execute: () => onCooking?.(station),
  });

  // The kettle hangs over Mum's fire: the quick cup of tea from the first lesson.
  if (station.kind === 'fireplace') {
    interactions.push({
      type: 'fireplace_tea',
      requireConfirmation: true,
      label: 'Make Tea at the Fireplace',
      icon: '☕',
      color: '#92400e',
      execute: () => {
        const result = handleFireplaceTea();
        config.onFireplaceTea?.(result);
      },
    });
  }

  return interactions;
}
