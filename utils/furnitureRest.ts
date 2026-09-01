/**
 * Which placed furniture the player is currently resting on.
 *
 * The same footprint test was written out three times in App.tsx — twice in the game loop
 * (to feed `staminaManager.update`) and once for the stamina bar's `forceShow`. It lives
 * here so the stamina restore, the stamina bar and the sleep indicator can never disagree
 * about whether the player is actually in bed.
 *
 * Placed items do not block movement, so "on the furniture" means the player's world
 * position falls inside the item's scaled footprint.
 */

import type { Position } from '../types';
import { gameState } from '../GameState';
import { getItem } from '../data/items';

/** The utility effect a piece of furniture provides while the player stands on it. */
export type RestEffect = 'sleep' | 'rest';

/**
 * The furniture effect the player is standing within, or null when they are not on any.
 *
 * `sleep` wins over `rest` if two footprints overlap — a bed restores faster, so the
 * player should never be penalised for parking an armchair against it.
 */
export function getRestingFurnitureEffect(
  playerPos: Position,
  mapId: string
): RestEffect | null {
  let found: RestEffect | null = null;

  for (const item of gameState.getPlacedItems(mapId)) {
    const def = getItem(item.itemId);
    if (!def) continue;

    const effect = def.furnitureEffect;
    if (effect !== 'sleep' && effect !== 'rest') continue;

    if (!isWithinFootprint(playerPos, item.position, item.customScale ?? def.placedScale ?? 1)) {
      continue;
    }

    if (effect === 'sleep') return 'sleep'; // nothing beats a bed — stop looking
    found = 'rest';
  }

  return found;
}

/**
 * The point the player should walk to in order to use a piece of furniture: the centre of
 * the footprint that `getRestingFurnitureEffect` tests, so arriving there always counts.
 */
export function getFurnitureRestPosition(anchor: Position, scale: number): Position {
  return { x: anchor.x + (scale - 1) / 2, y: anchor.y + (scale - 1) / 2 };
}

function isWithinFootprint(playerPos: Position, anchor: Position, scale: number): boolean {
  return (
    playerPos.x >= anchor.x - 0.5 &&
    playerPos.x <= anchor.x + scale - 0.5 &&
    playerPos.y >= anchor.y - 0.5 &&
    playerPos.y <= anchor.y + scale - 0.5
  );
}
