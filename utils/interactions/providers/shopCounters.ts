/**
 * Shop counters — clicking the counter tiles in Mushra's shop or the grocery shop opens
 * the shop UI. Exclusive: the counter fully owns the click, so no other interaction is offered.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext, ProviderResult } from '../types';

export function shopCounterProvider(ctx: InteractionContext): ProviderResult {
  const { currentMapId, onOpenShop, tileX, tileY } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Mushra's shop counter — clicking tiles (9,4) or (10,4) opens the shop
  if (currentMapId === 'mushras_shop' && tileY === 4 && (tileX === 9 || tileX === 10)) {
    interactions.push({
      type: 'open_shop',
      label: "Browse Mushra's Wares",
      icon: '🍄',
      color: '#86efac',
      execute: () => onOpenShop?.(),
    });
    return { interactions, exclusive: true };
  }

  // Grocery shop counter — clicking in the counter area (above the walkable floor) opens the shop
  // Equivalent to the Mushra shop tile check; the fox NPC alone is unreliable because
  // getNPCAtPosition uses click position (not player position) and skips NPCs in entry animation.
  if (currentMapId === 'shop' && tileY >= 4 && tileY <= 8 && tileX >= 5 && tileX <= 14) {
    interactions.push({
      type: 'open_shop',
      label: 'Browse the Shop',
      icon: '🛒',
      color: '#86efac',
      execute: () => onOpenShop?.(),
    });
    return { interactions, exclusive: true };
  }

  return { interactions };
}
