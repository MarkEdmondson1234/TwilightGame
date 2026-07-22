/**
 * Interaction system — shared types.
 *
 * These types were previously declared inside utils/actionHandlers.ts. They live here
 * so that provider modules can import them without creating an import cycle back into
 * actionHandlers.ts (which still owns the runtime helper functions).
 *
 * See ./README.md for how the provider system fits together.
 */

import type { Position, SizeTier } from '../../types';
import type { MiniGameTriggerData } from '../../minigames/types';
import type { CookingResult } from '../CookingManager';
import type { ForageResult } from '../forageHandlers';
import type { getTileData } from '../mapUtils';
import type { gameState } from '../../GameState';
import type { TransitionResult, FarmActionResult } from '../actionHandlers';

/**
 * Available interaction types
 */
export type InteractionType =
  | 'mirror'
  | 'npc'
  | 'transition'
  | 'cooking'
  | 'brewing'
  | 'farm_till'
  | 'farm_plant'
  | 'farm_water'
  | 'farm_harvest'
  | 'farm_harvest_flowers'
  | 'farm_harvest_seeds'
  | 'farm_harvest_herb'
  | 'farm_remove_herb'
  | 'farm_clear'
  | 'harvest_strawberry'
  | 'harvest_blackberry'
  | 'harvest_blueberry'
  | 'harvest_hazelnut'
  | 'forage'
  | 'prune_tree'
  | 'mulch_tree'
  | 'harvest_fruit_tree'
  | 'pickup_item'
  | 'eat_item'
  | 'taste_item'
  | 'collect_water'
  | 'refill_water_can'
  | 'collect_resource'
  | 'give_gift'
  | 'desk_place'
  | 'desk_pickup'
  | 'place_decoration'
  | 'open_workshop'
  | 'open_painting_easel'
  | 'open_mini_game'
  | 'fireplace_tea'
  | 'yule_begin_celebration'
  | 'add_to_basket'
  | 'harvest_red_berries'
  | 'tidy_leaves'
  | 'pickup_leaves'
  | 'open_shop'
  | 'remove_curtains'
  | 'make_snow_angel';

export interface AvailableInteraction {
  type: InteractionType;
  label: string;
  icon?: string;
  color?: string;
  /** Additional data for debugging/testing (interaction logic is in execute callback) */
  data?: unknown;
  /** Force the radial menu to show even when this is the only available interaction */
  requireConfirmation?: boolean;
  /** Execute this interaction */
  execute: () => void;
}

export interface PlacedItemAction {
  action: 'pickup' | 'eat' | 'taste' | 'add_to_basket';
  itemId: string;
  placedItemId: string;
  imageUrl: string; // Sprite image URL for inventory display
  /**
   * ID of the custom artwork this item carries (paintings, wreaths).
   *
   * NAMING: the same value is called `paintingId` on placed items and `decorationId` on
   * inventory items (`InventoryItem.decorationId` in utils/inventoryManager.ts). Both are
   * keys into DecorationManager's `PaintingData` store. Placing converts decorationId →
   * paintingId; picking up converts it back. Losing it mid-round-trip means the item is
   * re-matched to arbitrary artwork, which is what caused the "wrong wreath image" bug.
   */
  paintingId?: string;
}

export interface DeskAction {
  action: 'place' | 'pickup';
  deskPosition: Position;
  itemId?: string;
  slotIndex?: number;
}

export interface GetInteractionsConfig {
  position: Position;
  /** Player's world position — used for large multi-tile sprites (e.g. fruit trees)
   *  where the click target may be on the canopy, far above the anchor tile. */
  playerPosition?: Position;
  currentMapId: string;
  currentTool: string;
  selectedSeed: string | null;
  playerSizeTier?: SizeTier; // Player's current size tier for size-restricted transitions
  onMirror?: () => void;
  onNPC?: (npcId: string) => void;
  onGiveGift?: (npcId: string) => void;
  onTransition?: (result: TransitionResult) => void;
  onCooking?: (locationType: 'stove' | 'campfire', position?: Position) => void;
  onFireplaceTea?: (result: CookingResult) => void;
  onBrewing?: (position?: Position) => void;
  onFarmAction?: (result: FarmActionResult) => void;
  onFarmAnimation?: (
    action: 'till' | 'plant' | 'water' | 'harvest' | 'clear',
    tilePos?: Position
  ) => void;
  onForage?: (result: ForageResult) => void;
  onPlacedItemAction?: (action: PlacedItemAction) => void;
  onCollectWater?: (result: { success: boolean; message: string }) => void;
  onRefillWaterCan?: (result: { success: boolean; message: string }) => void;
  onCollectResource?: (result: { success: boolean; message: string; itemId?: string }) => void;
  onDeskAction?: (action: DeskAction) => void;
  onPlaceDecoration?: (result: {
    itemId: string;
    position: Position;
    image: string;
    paintingId?: string;
    customImage?: string;
    frameStyle?: {
      colour: string;
      secondaryColour?: string;
      borderWidth: number;
      pattern: 'solid' | 'gradient' | 'double' | 'filigree' | 'frosted';
    };
    customScale?: number;
  }) => void;
  onOpenDecorationWorkshop?: () => void;
  onOpenPaintingEasel?: () => void;
  onBeginYuleCelebration?: () => void;
  onOpenShop?: () => void;
  /** Open a mini-game by ID with trigger data */
  onOpenMiniGame?: (miniGameId: string, triggerData: MiniGameTriggerData) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  /** Make a snow angel — block is the top-left tile of the clear 2x2 area found near the click */
  onMakeSnowAngel?: (block: Position) => void;
}

// ---------------------------------------------------------------------------
// Provider system
// ---------------------------------------------------------------------------

/** A placed item as stored on the map. */
export type PlacedItem = ReturnType<typeof gameState.getPlacedItems>[number];

/**
 * Everything a provider needs to decide which interactions it can offer.
 *
 * It is the caller's `GetInteractionsConfig` (inputs + callbacks) plus the handful of
 * values every provider would otherwise recompute — the resolved tile coordinates, the
 * tile under the cursor, and the placed items on the current map.
 */
export interface InteractionContext extends GetInteractionsConfig {
  /** Player's size tier, defaulted to 0 when the caller omits it. */
  playerSizeTier: SizeTier;
  /** Integer tile X of the interaction position. */
  tileX: number;
  /** Integer tile Y of the interaction position. */
  tileY: number;
  /** Tile data at (tileX, tileY), if any. */
  tileData: ReturnType<typeof getTileData>;
  /** Convenience `{ x: tileX, y: tileY }`. */
  tilePos: Position;
  /** All items placed on the current map. */
  placedItems: PlacedItem[];
  /**
   * The placed item under the interaction position, if any. Accounts for the scaled
   * bounding box of large decorations, not just the anchor tile.
   */
  itemAtPosition: PlacedItem | undefined;
}

/**
 * Returned by a provider that needs to suppress every provider after it.
 *
 * Used where one interaction fully owns the click — e.g. a shop counter, where offering
 * "talk to the shopkeeper" alongside "browse the shop" would be wrong.
 */
export interface ProviderResult {
  interactions: AvailableInteraction[];
  /** When true, no further providers run. */
  exclusive?: boolean;
}

/**
 * A provider inspects the context and returns the interactions it can offer there.
 *
 * Providers must be side-effect free at *collection* time — any game-state mutation
 * belongs inside an interaction's `execute` callback, which only runs if the player
 * actually picks that option.
 */
export type InteractionProvider = (
  ctx: InteractionContext
) => AvailableInteraction[] | ProviderResult;
