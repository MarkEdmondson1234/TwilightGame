/**
 * Tests for the Mini-Game Registry (minigames/registry.ts)
 *
 * The `add-minigame` skill advertises adding a mini-game as "2 files + 1 registry
 * line", so the registry is where mistakes concentrate. These tests assert the
 * invariants the runtime silently depends on.
 *
 * What breaks if these fail:
 * - Duplicate `id`: the `byId` index silently keeps only the LAST definition, so
 *   `getMiniGame()` opens the wrong game (or the game becomes unreachable).
 * - Missing/empty required field: MiniGameHost renders a nameless, iconless or
 *   colourless radial-menu entry, or crashes when it tries to mount `component`.
 * - No trigger declared: the game is registered but can never be reached by the
 *   player — the definition is dead weight with no runtime error to hint at it.
 * - Item ID typo in `triggers.placedItemId` / `triggers.inventoryItemId` /
 *   `requirements[].itemId`: these are matched against real inventory item IDs
 *   (see utils/interactions/providers/placedItems.ts). A typo silently means the
 *   mini-game never triggers, or its requirement can never be satisfied. This is
 *   the mini-game equivalent of the item SSoT check in tests/itemSSoT.test.ts.
 * - Lookup helper regressions: providers call these on every interaction, so they
 *   must return [] for unknown ids rather than throwing mid-frame.
 */

/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import {
  getAllMiniGames,
  getMiniGame,
  getMiniGamesForPlacedItem,
  getMiniGamesForNPC,
  getMiniGamesForNPCName,
  getMiniGamesForInventoryItem,
  getMiniGamesForMapLocation,
} from '../minigames/registry';
import { ITEMS } from '../data/items';
import { initializeMaps, mapManager } from '../maps';
import type { MiniGameDefinition } from '../minigames/types';

const ALL = getAllMiniGames();

/** Fields every definition must declare as a non-empty string. */
const REQUIRED_STRING_FIELDS: Array<keyof MiniGameDefinition> = [
  'id',
  'displayName',
  'description',
  'icon',
  'colour',
];

/** Trigger keys that hold a bare item ID which must exist in ITEMS. */
const ITEM_TRIGGER_KEYS = ['placedItemId', 'inventoryItemId'] as const;

describe('Mini-Game Registry - Structure', () => {
  it('registers at least one mini-game', () => {
    expect(ALL.length).toBeGreaterThan(0);
  });

  it('every definition has a unique id', () => {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    ALL.forEach((def, index) => {
      const previous = seen.get(def.id);
      if (previous !== undefined) {
        duplicates.push(
          `Duplicate id "${def.id}" at registry index ${index} (already used at index ${previous}). ` +
            `The byId index keeps only the last one — rename one of them in its definition.ts.`
        );
      }
      seen.set(def.id, index);
    });

    if (duplicates.length > 0) {
      console.error('Duplicate mini-game ids:\n' + duplicates.join('\n'));
    }
    expect(duplicates).toEqual([]);
  });

  it('every definition has all required fields, non-empty', () => {
    const problems: string[] = [];

    ALL.forEach((def, index) => {
      const label = def.id || `<unnamed at registry index ${index}>`;

      REQUIRED_STRING_FIELDS.forEach((field) => {
        const value = def[field];
        if (typeof value !== 'string' || value.trim() === '') {
          problems.push(
            `Mini-game "${label}" is missing required field "${String(field)}" ` +
              `(got ${JSON.stringify(value)}) — add it to its definition.ts.`
          );
        }
      });

      if (typeof def.component !== 'function' && typeof def.component !== 'object') {
        problems.push(
          `Mini-game "${label}" has no valid React "component" (got ${typeof def.component}) — ` +
            `check the import in its definition.ts is a default/named export that exists.`
        );
      }

      if (!def.triggers || typeof def.triggers !== 'object') {
        problems.push(
          `Mini-game "${label}" has no "triggers" object — it can never be reached by the player.`
        );
      }
    });

    if (problems.length > 0) {
      console.error('Mini-game definition problems:\n' + problems.join('\n'));
    }
    expect(problems).toEqual([]);
  });

  it('every definition declares at least one usable trigger', () => {
    const unreachable: string[] = [];

    ALL.forEach((def) => {
      const triggerKeys = Object.entries(def.triggers ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      );
      if (triggerKeys.length === 0) {
        unreachable.push(
          `Mini-game "${def.id}" declares no triggers — it is registered but unreachable. ` +
            `Add placedItemId / npcId / npcNameMatch / inventoryItemId to its triggers.`
        );
      }
    });

    if (unreachable.length > 0) {
      console.error('Unreachable mini-games:\n' + unreachable.join('\n'));
    }
    expect(unreachable).toEqual([]);
  });

  it('colour is a valid hex colour string', () => {
    const badColours: string[] = [];

    ALL.forEach((def) => {
      if (typeof def.colour === 'string' && !/^#[0-9a-fA-F]{3,8}$/.test(def.colour)) {
        badColours.push(
          `Mini-game "${def.id}" has colour "${def.colour}" — the radial menu expects a hex string like "#a855f7".`
        );
      }
    });

    if (badColours.length > 0) {
      console.error('Invalid mini-game colours:\n' + badColours.join('\n'));
    }
    expect(badColours).toEqual([]);
  });
});

// ============================================================================
// ITEM SSoT — trigger and requirement item IDs must exist in ITEMS
// ============================================================================

describe('Mini-Game Registry - Item SSoT', () => {
  it('all trigger item IDs must exist in ITEMS', () => {
    const missing: string[] = [];

    ALL.forEach((def) => {
      ITEM_TRIGGER_KEYS.forEach((key) => {
        const itemId = def.triggers?.[key];
        if (itemId && !ITEMS[itemId]) {
          missing.push(
            `Mini-game "${def.id}" triggers.${key} = "${itemId}" but no such item exists in ITEMS. ` +
              `The trigger is matched against real inventory item IDs, so this mini-game can never open. ` +
              `Fix the typo or add the item to data/items/.`
          );
        }
      });
    });

    if (missing.length > 0) {
      console.error('Mini-game trigger items missing from ITEMS:\n' + missing.join('\n'));
    }
    expect(missing).toEqual([]);
  });

  it('all requirement item IDs must exist in ITEMS', () => {
    const missing: string[] = [];

    ALL.forEach((def) => {
      (def.requirements ?? []).forEach((req) => {
        if (!ITEMS[req.itemId]) {
          missing.push(
            `Mini-game "${def.id}" requires missing item: "${req.itemId}" — ` +
              `the requirement can never be satisfied. Use the canonical id from data/items/.`
          );
        }
      });
    });

    if (missing.length > 0) {
      console.error('Mini-game requirement items missing from ITEMS:\n' + missing.join('\n'));
    }
    expect(missing).toEqual([]);
  });

  it('requirement quantities are positive integers', () => {
    const problems: string[] = [];

    ALL.forEach((def) => {
      (def.requirements ?? []).forEach((req) => {
        if (!Number.isInteger(req.quantity) || req.quantity <= 0) {
          problems.push(
            `Mini-game "${def.id}" requirement "${req.itemId}" has quantity ${req.quantity} — must be a positive integer.`
          );
        }
      });
    });

    expect(problems).toEqual([]);
  });
});

// ============================================================================
// Lookup helpers
// ============================================================================

describe('Mini-Game Registry - Lookup Helpers', () => {
  const registered = new Set(ALL);

  it('getMiniGame returns the registered definition and undefined for unknown ids', () => {
    ALL.forEach((def) => {
      expect(getMiniGame(def.id)).toBe(def);
    });

    expect(getMiniGame('definitely-not-a-mini-game')).toBeUndefined();
    expect(getMiniGame('')).toBeUndefined();
  });

  it('lookup helpers return only registered definitions', () => {
    const strays: string[] = [];

    const check = (
      helperName: string,
      results: readonly MiniGameDefinition[],
      key: string
    ): void => {
      results.forEach((def) => {
        if (!registered.has(def)) {
          strays.push(`${helperName}("${key}") returned unregistered definition "${def?.id}"`);
        }
      });
    };

    ALL.forEach((def) => {
      const t = def.triggers ?? {};
      if (t.placedItemId) {
        const results = getMiniGamesForPlacedItem(t.placedItemId);
        check('getMiniGamesForPlacedItem', results, t.placedItemId);
        expect(results).toContain(def);
      }
      if (t.npcId) {
        const results = getMiniGamesForNPC(t.npcId);
        check('getMiniGamesForNPC', results, t.npcId);
        expect(results).toContain(def);
      }
      if (t.npcNameMatch) {
        const results = getMiniGamesForNPCName(t.npcNameMatch);
        check('getMiniGamesForNPCName', results, t.npcNameMatch);
        expect(results).toContain(def);
      }
      if (t.inventoryItemId) {
        const results = getMiniGamesForInventoryItem(t.inventoryItemId);
        check('getMiniGamesForInventoryItem', results, t.inventoryItemId);
        expect(results).toContain(def);
      }
    });

    expect(strays).toEqual([]);
  });

  it('lookup helpers return an empty array (not throw) for unknown ids', () => {
    const unknown = 'no-such-id-12345';

    expect(() => getMiniGamesForPlacedItem(unknown)).not.toThrow();
    expect(getMiniGamesForPlacedItem(unknown)).toEqual([]);

    expect(() => getMiniGamesForNPC(unknown)).not.toThrow();
    expect(getMiniGamesForNPC(unknown)).toEqual([]);

    expect(() => getMiniGamesForNPCName(unknown)).not.toThrow();
    expect(getMiniGamesForNPCName(unknown)).toEqual([]);

    expect(() => getMiniGamesForInventoryItem(unknown)).not.toThrow();
    expect(getMiniGamesForInventoryItem(unknown)).toEqual([]);

    // Empty string must behave the same way, not match a falsy-keyed entry
    expect(getMiniGamesForPlacedItem('')).toEqual([]);
    expect(getMiniGamesForNPC('')).toEqual([]);
  });
});

// ============================================================================
// NPC SSoT — npcId triggers must name an NPC that actually exists
// ============================================================================

describe('Mini-Game Registry - NPC SSoT', () => {
  /** Every NPC id declared by a registered map, from both `npcs` and `layers`. */
  function collectNpcIds(): Set<string> {
    initializeMaps();
    const ids = new Set<string>();

    for (const mapId of mapManager.getAllMapIds()) {
      const map = mapManager.getMap(mapId);
      if (!map) continue;

      for (const npc of map.npcs ?? []) ids.add(npc.id);

      // Background-image rooms place NPCs in the layer stack instead (e.g. Mum).
      for (const layer of map.layers ?? []) {
        const maybeNpc = (layer as { npc?: { id?: string } }).npc;
        if (maybeNpc?.id) ids.add(maybeNpc.id);
      }
    }

    return ids;
  }

  it('every npcId trigger names an NPC declared by some map', () => {
    const known = collectNpcIds();
    const missing: string[] = [];

    ALL.forEach((def) => {
      const npcId = def.triggers?.npcId;
      if (npcId && !known.has(npcId)) {
        missing.push(
          `Mini-game "${def.id}" triggers.npcId = "${npcId}" but no registered map declares ` +
            `an NPC with that id. The interaction provider matches this against the live NPC ` +
            `id, so the game can never open. Check the id passed to the create*NPC() call in ` +
            `maps/definitions/, or use npcNameMatch for dynamically-spawned NPCs.`
        );
      }
    });

    if (missing.length > 0) {
      console.error(
        'Mini-game NPC triggers with no matching NPC:\n' +
          missing.join('\n') +
          `\n\nKnown NPC ids: ${[...known].sort().join(', ')}`
      );
    }
    expect(missing).toEqual([]);
  });
});

// ============================================================================
// MAP-LOCATION SSoT — mapLocation triggers must point at a real, in-bounds tile
// ============================================================================

describe('Mini-Game Registry - mapLocation SSoT', () => {
  it('every mapLocation trigger names a real map and an in-bounds tile', () => {
    initializeMaps();
    const problems: string[] = [];

    ALL.forEach((def) => {
      const loc = def.triggers?.mapLocation;
      if (!loc) return;

      const map = mapManager.getMap(loc.mapId);
      if (!map) {
        problems.push(
          `Mini-game "${def.id}" triggers.mapLocation.mapId = "${loc.mapId}" but no such map ` +
            `is registered — the game can never open. Check maps/index.ts.`
        );
        return;
      }
      if (loc.x < 0 || loc.x >= map.width || loc.y < 0 || loc.y >= map.height) {
        problems.push(
          `Mini-game "${def.id}" mapLocation (${loc.x}, ${loc.y}) is outside "${loc.mapId}" ` +
            `bounds (0-${map.width - 1}, 0-${map.height - 1}).`
        );
        return;
      }
      // The index must actually return it, or the provider will never surface the game.
      const found = getMiniGamesForMapLocation(loc.mapId, loc.x, loc.y).some((g) => g.id === def.id);
      if (!found) {
        problems.push(
          `Mini-game "${def.id}" declares a mapLocation but is not indexed for it — ` +
            `getMiniGamesForMapLocation would not return it.`
        );
      }
    });

    if (problems.length > 0) {
      console.error('mapLocation trigger problems:\n' + problems.join('\n'));
    }
    expect(problems).toEqual([]);
  });
});
