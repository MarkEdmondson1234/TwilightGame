/**
 * Yule Celebration Configuration
 *
 * Data-only file for the annual Yule gift-giving event — a genuinely shared
 * community spectacle, like the Harvest Feast (data/harvestFeast.ts): every
 * client's YuleCelebrationManager gathers the same NPCs at the same clock-
 * driven moment off the same TimeManager clock, with no player action
 * required to start it. See utils/YuleCelebrationManager.ts.
 * All item IDs have been verified against data/items.ts.
 */

import type { Position } from '../types';

// ============================================================================
// Constants
// ============================================================================

export const YULE_MAP_ID = 'village';
export const YULE_TREE_POSITION: Position = { x: 24, y: 16 };
export const YULE_CUTSCENE_ID = 'yule_celebration_opening';
export const YULE_CELEBRATION_DURATION_MS = 10 * 60 * 1000; // 10 minutes
export const YULE_THOUGHT_BUBBLE_CYCLE_MS = 15_000; // 15 seconds per NPC

/** The day of Winter the celebration happens on. */
export const YULE_DAY = 42;

/** Hour the tree appears and NPCs gather — a single threshold, unlike Harvest
 * Feast's two-phase table/gather split, since Yule has no pre-gathering
 * contribution phase (gifting happens during the gathering itself). Matches
 * the legacy tree-appearance hour and the existing ambient hour-9 narration
 * cutscene (seasonal_event_yule), so the "villagers gather" narration and the
 * actual gathering read as coincident. */
export const YULE_GATHER_HOUR = 9;

/** Reuses the same generic seasonal decoration item SeasonalEventManager used
 * to place for all of Winter — now owned entirely by YuleCelebrationManager. */
export const YULE_TREE_ITEM_ID = 'seasonal_yule_tree';
export const YULE_TREE_IMAGE = '/TwilightGame/assets-optimized/seasonal/yule_tree.png';

/**
 * Deterministic PlacedItem id for the tree itself — fixed (not year-scoped)
 * since it is added and removed within the same year, mirroring
 * HARVEST_FEAST_TABLE_PLACED_ID.
 */
export const YULE_TREE_PLACED_ID = 'yule_tree_current';

/** Manual cutscene id for the "you missed it" retrospective recap. */
export const YULE_CATCHUP_CUTSCENE_ID = 'yule_catchup';

/** Recap shown in the catch-up cutscene, for a player who missed the whole day. */
export const YULE_CATCHUP_RECAP =
  "Ah, you missed Yule this year. Mum handed out warm Yule logs, and the whole village gathered round the tree to exchange gifts. There's always next Yule, traveller.";

// ============================================================================
// NPC Positions
// ============================================================================

export interface YuleNPCConfig {
  /** The NPC ID used during the celebration (village NPCs keep their real ID; festival NPCs use festival_ prefix) */
  celebrationId: string;
  /** The original NPC ID (used to look up factory / restore after celebration) */
  originalId: string;
  /** Whether this NPC needs to be added temporarily (not normally on village map in winter) */
  isDynamic: boolean;
  /** Position around the Yule tree */
  position: Position;
  /** Display name for reference */
  displayName: string;
  /** Optional scale override during the celebration only (restored when celebration ends) */
  scaleOverride?: number;
}

/**
 * Scatter positions around the Yule tree at {x:24, y:16}.
 * Village NPCs (isDynamic: false) get position overrides.
 * Non-village NPCs (isDynamic: true) are added as dynamic festival instances.
 */
export const YULE_NPC_CONFIGS: YuleNPCConfig[] = [
  { celebrationId: 'village_elder',              originalId: 'village_elder',      isDynamic: false, position: { x: 26, y: 17 }, displayName: 'Village Elder' },
  { celebrationId: 'shopkeeper',                 originalId: 'shopkeeper',         isDynamic: false, position: { x: 22, y: 14 }, displayName: 'Mr Fox',          scaleOverride: 4.0 },
  { celebrationId: 'festival_old_woman_knitting', originalId: 'old_woman_knitting', isDynamic: true,  position: { x: 27, y: 17 }, displayName: 'The Old Woman' },
  { celebrationId: 'festival_child',             originalId: 'child',               isDynamic: true,  position: { x: 24, y: 14 }, displayName: 'The Little Girl' },
  { celebrationId: 'festival_mum',               originalId: 'mum',                 isDynamic: true,  position: { x: 22, y: 16 }, displayName: 'Mum',             scaleOverride: 4.5 },
  { celebrationId: 'festival_mushra',             originalId: 'mushra',              isDynamic: true,  position: { x: 23, y: 16 }, displayName: 'Mushra' },
  { celebrationId: 'festival_bear',               originalId: 'chill_bear',          isDynamic: true,  position: { x: 26, y: 15 }, displayName: 'Mr Bear' },
];

// ============================================================================
// Gift Wish Pool
// ============================================================================

/**
 * Items NPCs may wish for. Randomly assigned (no duplicates) at celebration start.
 * One wish per NPC. All IDs verified in data/items.ts.
 */
export const YULE_WISH_POOL: string[] = [
  'food_cookies',
  'food_chocolate_cake',
  'food_roast_dinner',
  'food_crepes',
  'food_cucumber_sandwich',
  'food_marzipan_chocolates',
  'photo',
];

// ============================================================================
// Rewards
// ============================================================================

/**
 * Rare rewards given when the player gives the exact wished-for item.
 * One is chosen at random per correct gift.
 */
export const YULE_RARE_REWARDS: string[] = [
  'phoenix_ash',
  'golden_apple',
  'hearthstone',
  'shrinking_violet',
];

/**
 * Common rewards given when the player gives any gift (not the wished-for item).
 * One is chosen at random per gift given.
 * All IDs verified in data/items.ts.
 */
export const YULE_COMMON_REWARDS: string[] = [
  'cheese',
  'chocolate',
  'almonds',
  'vanilla',
  'strawberry_jam',
  'ceramic_vase',
  'plant_pot',
  'camera',
];

// ============================================================================
// Dialogue
// ============================================================================

/** Shown when the player gives the exact wished-for item — very enthusiastic! */
export const YULE_PERFECT_GIFT_DIALOGUES: string[] = [
  "Oh! Oh my goodness — how did you know?! This is exactly what I wished for! You've made my Yule!",
  "I can't believe it! I was just thinking about this! You are absolutely wonderful, you know that?",
  "This is the most perfect gift! I shall treasure it always. A very merry Yule to you, dear friend!",
  "Stars above — you've brought tears to my eyes! This is exactly right. Exactly. I'm so happy!",
  "My heart is singing! How on earth did you guess? This is simply the best Yule gift I've ever received!",
];

/** Shown when the player gives any gift (not the wished-for item) — cheerful and grateful. */
export const YULE_ANY_GIFT_DIALOGUES: string[] = [
  "Oh, how thoughtful of you! What a lovely Yule surprise. Thank you so much — truly.",
  "A gift! For me! How wonderfully kind. You have such a generous heart. Happy Yule!",
  "Well, isn't this delightful! Thank you, dear. Every gift given in the spirit of Yule is a treasure.",
  "How sweet of you to think of me! I do love a surprise. Merry Yule, and may it be a bright one!",
  "A present! How festive! You really didn't have to, but I'm so glad you did. Happy Yule!",
];

/** Shown as the second dialogue node after an NPC receives a Yule gift. */
export const YULE_RECIPROCATION_DIALOGUE =
  "Here, I have something for you too! Happy Yule!";

/** Mum's automatic greeting when the celebration begins. */
export const YULE_MUM_GREETING =
  "Mum beams at you and presses a warm Yule log into your hands. \"Happy Yule, my love. Now go and enjoy yourself!\"";
