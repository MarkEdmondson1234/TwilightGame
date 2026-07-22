/**
 * Core item types shared by every item module.
 *
 * These live here (rather than in `data/items.ts`) so the category modules can
 * import them without creating a circular dependency with the facade.
 * `data/items.ts` re-exports all three, so existing call sites are unaffected.
 */

export enum ItemCategory {
  SEED = 'seed',
  CROP = 'crop',
  TOOL = 'tool',
  MATERIAL = 'material',
  INGREDIENT = 'ingredient', // Cooking ingredients (shop-bought)
  MAGICAL_INGREDIENT = 'magical', // Magical ingredients (foraged/witch shop)
  FOOD = 'food', // Cooked food items
  POTION = 'potion', // Brewed potions
  DECORATION = 'decoration', // Placeable decorations for home/maps
  FURNITURE = 'furniture', // Placeable furniture with utility effects (beds, etc.)
  MISC = 'misc',
  KEEPSAKE = 'keepsake', // Unique collectibles (photos, mementos) — not stackable, not tradeable
}

export enum ItemRarity {
  COMMON = 'common', // 40% drop rate
  UNCOMMON = 'uncommon', // 30% drop rate
  RARE = 'rare', // 20% drop rate
  VERY_RARE = 'very_rare', // 10% drop rate
}

export interface ItemDefinition {
  id: string;
  name: string;
  displayName: string;
  category: ItemCategory;
  description: string;
  rarity?: ItemRarity; // For seeds found via foraging
  stackable: boolean; // Can multiple be held in one slot
  maxStack?: number; // Max stack size (undefined = infinite)
  maxUses?: number; // How many times this item can be used (undefined = 1 use, consumed entirely)
  sellPrice?: number; // Gold value when sold
  buyPrice?: number; // Cost to purchase
  cropId?: string; // For seeds, which crop they grow into
  image?: string; // Optional sprite image URL
  icon?: string; // Emoji fallback when no image available
  forageSuccessRate?: number; // Success rate for foraging (0.0-1.0, e.g., 1.0 = 100%, 0.5 = 50%)
  placedScale?: number; // Render scale when placed on map (1 = 1 tile, 1.5 = 1.5 tiles, etc.)
  interactionTileRadius?: number; // 0 = only the anchor tile is interactive; absent = full bounding box from placedScale
  interactionOffsetX?: number; // Tile offset applied to the anchor tile for interaction detection (requires interactionTileRadius: 0)
  interactionOffsetY?: number; // Tile offset applied to the anchor tile for interaction detection (requires interactionTileRadius: 0)
  confirmPickup?: boolean; // true = always show radial menu before pick-up (prevents single-click auto-execute)
  placedOffsetX?: number; // Horizontal render offset in tiles when placed (positive = shift right)
  placedOffsetY?: number; // Vertical render offset in tiles when placed (positive = shift down, negative = shift up)
  placedImage?: string; // Alt image URL to use when item is placed in the world (overrides `image`)
  allowOutdoorPlacement?: boolean; // If true, placement works on outdoor maps as well as indoor
  indoorOnly?: boolean; // If true, placement is restricted to 'indoor' colour-scheme maps only (e.g. not shops or outdoors)
  allowAnyTilePlacement?: boolean; // If true, can be placed on non-walkable tiles (e.g. walls, buildings)
  placedOnSurface?: boolean; // If true, renders above all building/tree sprites (for items placed ON buildings)
  placesBelowCharacters?: boolean; // If true, renders at background z-level (above tiles, below player/NPCs)
  foregroundPlacedImage?: string; // Second image rendered above the player when placed (for furniture like beds)
  furnitureEffect?: 'sleep' | 'rest'; // Utility effect when player stands on this furniture
  outdoorOnly?: boolean; // If true, placement is restricted to outdoor (non-indoor) maps
  persistent?: boolean; // If true, item is never consumed when used as a recipe ingredient (e.g. sourdough starter)
  edible?: boolean; // Raw fruits/produce that can be eaten directly (triggers eat radial menu)
  isWallpaper?: boolean; // If true, triggers "Apply to room" flow instead of grid placement
  targetMapId?: string; // The map ID this wallpaper applies to (used when isWallpaper is true)
}
