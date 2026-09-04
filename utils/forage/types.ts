/**
 * Shared types for the forage system.
 *
 * The forage system has two kinds of sources:
 *  - Declarative "anchor" sources (utils/forage/sources.ts): find a tile (or
 *    lava-lake) anchor near the player, pass optional gates, roll for success,
 *    grant one item type. ~18 of these, all data-driven.
 *  - Special sources (utils/forage/specialForage.ts): stream dragonfly wings
 *    (5×5-area adjacency geometry) and sparrow feathers (NPC state) — bespoke.
 */

import { TileType } from '../../types';

export interface ForageResult {
  found: boolean;
  seedId?: string;
  seedName?: string;
  message: string;
  outOfSeason?: boolean;
}

/**
 * A gate blocks a forage attempt before the harvest roll (season, time of
 * day, weather, …). Return a ForageResult to short-circuit, or null to let
 * the attempt continue.
 */
export type ForageGate = () => ForageResult | null;

/**
 * Declarative description of one forageable thing in the world.
 *
 * Order matters: FORAGE_SOURCES in sources.ts is walked top to bottom and the
 * first source whose anchor is near the player owns the forage, exactly like
 * the pre-refactor if-chain did.
 */
export interface ForageSource {
  /** Human-readable name for debug logs ("moonpetal", "bee hive", …). */
  label: string;
  /** Tile type(s) whose anchor triggers this source. */
  tileTypes: TileType[];
  /** Item granted on success. */
  itemId: string;
  /** Success rate used when the item definition lacks forageSuccessRate. */
  fallbackSuccessRate: number;
  /** Gates evaluated in order before the harvest roll; first block wins. */
  gates?: ForageGate[];
  /**
   * When set, an explicit cooldown check runs against the ANCHOR tile (so a
   * whole multi-tile sprite shares one cooldown) with this message. Sources
   * whose tile is covered by the early cooldown scan in forageHandlers.ts
   * (EARLY_COOLDOWN_TILES) don't need one.
   */
  cooldownMessage?: string;
  /** Message when the harvest roll fails. */
  failureMessage: string;
  /** Quantity roll; defaults to the standard 50/35/15 table (rollForageQuantity). */
  rollQuantity?: () => number;
  /**
   * Custom anchor finder; defaults to findTileTypeNearby over tileTypes.
   * Used by the lava lake (footprint check, not simple adjacency).
   */
  findAnchor?: (playerTileX: number, playerTileY: number) => { x: number; y: number } | null;
  /** Success message; defaults to `Found ${quantity} ${displayName}!`. */
  successMessage?: (displayName: string, quantity: number) => string;
}