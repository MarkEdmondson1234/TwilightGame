/**
 * Mini-Game Registry
 *
 * Central registry of all mini-games. To add a new mini-game:
 * 1. Create a folder under minigames/ with definition.ts + component
 * 2. Import the definition here
 * 3. Add it to MINI_GAME_DEFINITIONS
 *
 * That's it — no other files need to change.
 */

import type { MiniGameDefinition } from './types';

// Import mini-game definitions
import { decorationCraftingDefinition } from './decoration-crafting/definition';
import { paintingEaselDefinition } from './painting-easel/definition';
import { pumpkinCarvingDefinition } from './pumpkin-carving/definition';

/**
 * All registered mini-games.
 */
const MINI_GAME_DEFINITIONS: MiniGameDefinition[] = [
  decorationCraftingDefinition,
  paintingEaselDefinition,
  pumpkinCarvingDefinition,
];

// =============================================================================
// Indexed lookup maps (built once on import)
// =============================================================================

const byId = new Map<string, MiniGameDefinition>();
const byPlacedItem = new Map<string, MiniGameDefinition[]>();
const byNpc = new Map<string, MiniGameDefinition[]>();
const byInventoryItem = new Map<string, MiniGameDefinition[]>();

function buildIndices(): void {
  byId.clear();
  byPlacedItem.clear();
  byNpc.clear();
  byInventoryItem.clear();

  for (const def of MINI_GAME_DEFINITIONS) {
    byId.set(def.id, def);

    if (def.triggers.placedItemId) {
      const list = byPlacedItem.get(def.triggers.placedItemId) ?? [];
      list.push(def);
      byPlacedItem.set(def.triggers.placedItemId, list);
    }
    if (def.triggers.npcId) {
      const list = byNpc.get(def.triggers.npcId) ?? [];
      list.push(def);
      byNpc.set(def.triggers.npcId, list);
    }
    if (def.triggers.inventoryItemId) {
      const list = byInventoryItem.get(def.triggers.inventoryItemId) ?? [];
      list.push(def);
      byInventoryItem.set(def.triggers.inventoryItemId, list);
    }
  }
}

buildIndices();

// =============================================================================
// Public API
// =============================================================================

/** Get a mini-game definition by ID. */
export function getMiniGame(id: string): MiniGameDefinition | undefined {
  return byId.get(id);
}

/** Get all mini-games triggered by a placed item. */
export function getMiniGamesForPlacedItem(itemId: string): MiniGameDefinition[] {
  return byPlacedItem.get(itemId) ?? [];
}

/** Get all mini-games triggered by an NPC. */
export function getMiniGamesForNPC(npcId: string): MiniGameDefinition[] {
  return byNpc.get(npcId) ?? [];
}

/** Get all mini-games triggered by an inventory item. */
export function getMiniGamesForInventoryItem(itemId: string): MiniGameDefinition[] {
  return byInventoryItem.get(itemId) ?? [];
}

/** Get all registered mini-game definitions. */
export function getAllMiniGames(): readonly MiniGameDefinition[] {
  return MINI_GAME_DEFINITIONS;
}
