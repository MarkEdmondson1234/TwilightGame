/**
 * Shop counters — clicking the counter tiles in Mushra's shop or the grocery shop opens
 * the shop UI. Exclusive: the counter fully owns the click, so no other interaction is offered.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext, ProviderResult } from '../types';
import { Season, TimeManager } from '../../TimeManager';
import { SHELLA_NPC_ID } from '../../npcs/seaSideNPCs';

export function shopCounterProvider(ctx: InteractionContext): ProviderResult {
  const { currentMapId, onOpenShop, onNPC, tileX, tileY } = ctx;
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

  // Shella's food truck — summer only. Unlike the other counters, this offers a pie menu
  // (Talk / Buy) rather than jumping straight to the shop, so both interactions are pushed
  // here directly instead of relying on npcProvider's distance-based NPC lookup (which could
  // inconsistently miss "Talk" near the edges of this multi-tile-wide click zone).
  if (
    currentMapId === 'seaSide' &&
    TimeManager.getCurrentTime().season === Season.SUMMER &&
    tileY >= 4 &&
    tileY <= 7 &&
    tileX >= 9 &&
    tileX <= 13
  ) {
    interactions.push(
      {
        type: 'npc',
        label: 'Talk to Shella',
        icon: '💬',
        color: '#60a5fa',
        data: { npcId: SHELLA_NPC_ID },
        execute: () => onNPC?.(SHELLA_NPC_ID),
      },
      {
        type: 'open_shop',
        label: 'Buy',
        icon: '🍦',
        color: '#f97316',
        execute: () => onOpenShop?.(),
      }
    );
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
