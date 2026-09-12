/**
 * Harvest Feast Configuration
 *
 * Data-only file for the annual Harvest Feast community event — a genuinely
 * shared spectacle, like the Yule celebration (data/yuleCelebration.ts):
 * every player physically present in the village sees the same table, the
 * same food, the same gathering, and hears the same closing speech. That is
 * achieved by every client's HarvestFeastManager running identical,
 * deterministic logic off the same TimeManager clock rather than any new
 * broadcast mechanism — see utils/HarvestFeastManager.ts. The two events
 * differ mainly in shape: Harvest Feast has a contribution phase before the
 * gathering (hence its two-phase table/gather hour split) and no per-item
 * exclusivity; Yule's gifting happens during its single gathering and each
 * NPC's reward is claimable once, globally.
 */

import type { Position } from '../types';

// ============================================================================
// Constants
// ============================================================================

export const HARVEST_FEAST_MAP_ID = 'village';

/** Same tile the Yule tree/SeasonalEventManager's decoration occupies. */
export const HARVEST_FEAST_TABLE_POSITION: Position = { x: 24, y: 16 };

/** Reuses the existing generic seasonal decoration item — see data/items/craftedDecorations.ts. */
export const HARVEST_FEAST_TABLE_ITEM_ID = 'seasonal_harvest_table';

export const HARVEST_FEAST_TABLE_IMAGE =
  '/TwilightGame/assets-optimized/seasonal/harvest_feast.png';

/** Manual cutscene id for the "you missed it" retrospective recap. */
export const HARVEST_FEAST_CATCHUP_CUTSCENE_ID = 'harvest_feast_catchup';

/** Manual cutscene id for Elias's gathering speech. */
export const HARVEST_FEAST_GATHERING_CUTSCENE_ID = 'harvest_feast_gathering';

/** Manual cutscene ids for Elias's closing speech, one per feast tier. */
export const HARVEST_FEAST_CLOSING_CUTSCENE_IDS: Record<1 | 2 | 3, string> = {
  1: 'harvest_feast_closing_tier1',
  2: 'harvest_feast_closing_tier2',
  3: 'harvest_feast_closing_tier3',
};

/** The day of Autumn the feast happens on. */
export const HARVEST_FEAST_DAY = 42;

/** Hour the table is erected and food placement opens. */
export const HARVEST_FEAST_TABLE_HOUR = 16;

/** Hour villagers gather round and Elias gives his intro speech. */
export const HARVEST_FEAST_GATHER_HOUR = 18;

/** How long each food item takes to be "eaten" once consumption starts. */
export const HARVEST_FEAST_CONSUMPTION_INTERVAL_MS = 90 * 1000; // 90 seconds/item

// ============================================================================
// Food Slots
// ============================================================================

/**
 * 8 positions laid out along a single line running the width of the table
 * (the table sprite is `placedScale: 4`, anchored at HARVEST_FEAST_TABLE_POSITION
 * {24,16}, so it visually spans roughly x:[22.5,26.5]) — as absolute map
 * positions, NOT deltas to add to HARVEST_FEAST_TABLE_POSITION, despite the
 * "OFFSETS" name. Slots 0-1 are reserved for the two baseline NPC-placed
 * dishes; slots 2-7 are available to players. Spaced 0.4 tiles apart (instead
 * of a full tile) and paired with `customScale: 0.75` on every food
 * PlacedItem (see HarvestFeastManager) so all 8 fit within the table's true
 * ~4-tile width with margin to spare on both edges, rather than the sprites'
 * own full-size bounding boxes hanging off it. Every placed food item is its
 * own PlacedItem (there is no generic multi-slot container renderer in this
 * codebase), so each slot must be a distinct grid tile to avoid visual
 * overlap. Every food PlacedItem is created with `placedOnSurface: true` (see
 * HarvestFeastManager) so it always sorts above the table sprite regardless
 * of this line's y — no per-item z tuning needed here.
 */
export const FOOD_SLOT_OFFSETS: Position[] = [
  { x: 22.6, y: 15.44375 }, // 0 — reserved: Mum's corn bread
  { x: 23.0, y: 15.44375 }, // 1 — reserved: Althea's apple cobbler
  { x: 23.4, y: 15.44375 },
  { x: 23.8, y: 15.44375 },
  { x: 24.2, y: 15.44375 },
  { x: 24.6, y: 15.44375 },
  { x: 25.0, y: 15.44375 },
  { x: 25.4, y: 15.44375 },
];

export const HARVEST_FEAST_BASELINE_SLOT_COUNT = 2;

/**
 * Deterministic PlacedItem id for the table itself — fixed (not year-scoped)
 * since it is added and removed within the same year, mirroring
 * SeasonalEventManager's DECORATION_ITEM_ID pattern.
 */
export const HARVEST_FEAST_TABLE_PLACED_ID = 'harvest_feast_table_current';

/**
 * Deterministic PlacedItem id for one food slot. Keying by (slot, year) —
 * rather than a random id per contribution — is what lets every client
 * independently compute the exact same consumption schedule with zero shared
 * state: the set of "things that might need eating" is always the same 8
 * fixed ids, so a scheduled removal is simply "does this id still exist?",
 * not "which of the items I happen to see right now is next?".
 */
export function harvestFeastFoodPlacedItemId(slot: number, year: number): string {
  return `harvest_feast_food_slot_${slot}_${year}`;
}

export interface HarvestFeastBaselineFood {
  npcDisplayName: string;
  itemId: string;
  slot: number;
}

/** Placed automatically at HARVEST_FEAST_TABLE_HOUR — never counted toward tiers. */
export const HARVEST_FEAST_BASELINE_FOOD: HarvestFeastBaselineFood[] = [
  { npcDisplayName: 'Mum', itemId: 'food_corn_bread', slot: 0 },
  { npcDisplayName: 'Althea', itemId: 'food_apple_cobbler', slot: 1 },
];

// ============================================================================
// NPC Positions
// ============================================================================

export interface HarvestFeastNPCConfig {
  /** The NPC id used during the gathering (village NPCs keep their real id; dynamic clones use a harvest_feast_ prefix). */
  celebrationId: string;
  /** The original NPC id (used to look up the factory / restore afterwards). */
  originalId: string;
  /** Whether this NPC needs to be added temporarily via addDynamicNPC. */
  isDynamic: boolean;
  /** Gathering position around the table. */
  position: Position;
  /** Display name for reference. */
  displayName: string;
}

/**
 * Gathering positions, kept 2 tiles from the table anchor so nobody stands on
 * a food slot (FOOD_SLOT_OFFSETS is a 1-tile ring).
 */
export const HARVEST_FEAST_NPC_CONFIGS: HarvestFeastNPCConfig[] = [
  { celebrationId: 'village_elder', originalId: 'village_elder', isDynamic: false, position: { x: 24, y: 14 }, displayName: 'Old Man Elias' },
  { celebrationId: 'harvest_feast_mum', originalId: 'mum', isDynamic: true, position: { x: 22, y: 16 }, displayName: 'Mum' },
  { celebrationId: 'harvest_feast_old_woman_knitting', originalId: 'old_woman_knitting', isDynamic: true, position: { x: 26, y: 16 }, displayName: 'Althea' },
  { celebrationId: 'shopkeeper', originalId: 'shopkeeper', isDynamic: false, position: { x: 22, y: 14 }, displayName: 'Mr Fox' },
  { celebrationId: 'harvest_feast_child', originalId: 'child', isDynamic: true, position: { x: 20, y: 16 }, displayName: 'Little Girl' },
  { celebrationId: 'harvest_feast_mushra', originalId: 'mushra', isDynamic: true, position: { x: 24, y: 18 }, displayName: 'Mushra' },
  { celebrationId: 'harvest_feast_chill_bear', originalId: 'chill_bear', isDynamic: true, position: { x: 20, y: 14 }, displayName: 'Mr Bear' },
];

// ============================================================================
// Dialogue (British English)
// ============================================================================

export const ELIAS_GATHERING_LINE =
  'Now then — gather round, all of you. Every harvest, this village puts something on the table, and every harvest, we\'re glad of each other\'s company. Let\'s not let it go cold.';

export const ELIAS_CLOSING_LINES: Record<1 | 2 | 3, string> = {
  1: "Well, that's the last of it. Good company tonight, even if the table looked a little bare — still, I've had worse harvests than this one.",
  2: "Now that's more like it — a proper bountiful year. Thank you all for sharing your bread. A feast is only as good as what everyone brings to it.",
  3: "Well I never — I don't think I've seen this table so laden in years. This was a special one, this harvest — the company and the food both made it so.",
};

/** Recap shown in the catch-up cutscene, for a player who missed the whole day. */
export const HARVEST_FEAST_CATCHUP_RECAP =
  "Ah, you missed the feast this year. Mum's corn bread went down a treat, and Old Man Elias gave one of his speeches, as ever. There's always next harvest, traveller.";
