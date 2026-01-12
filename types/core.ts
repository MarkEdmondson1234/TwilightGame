/**
 * Core Types
 *
 * Base types used throughout the game:
 * - CollisionType enum (walkability categories)
 * - TileType enum (all tile types)
 * - Position (x, y coordinates)
 * - Direction (movement directions)
 * - PlacedItem (items placed on the map)
 * - DeskContents/DeskItem (items placed on desks)
 */

/**
 * Collision type enum - defines walkability categories for tiles
 * WALKABLE: Player can walk through (grass, floor, doors)
 * SOLID: Player cannot walk through (walls, furniture, trees)
 * DESK: Solid but with item drop/pickup interactions
 */
export enum CollisionType {
  WALKABLE = 'walkable',
  SOLID = 'solid',
  DESK = 'desk',
}

/**
 * Helper function to check if a collision type blocks movement
 */
export function isTileSolid(collisionType: CollisionType): boolean {
  return collisionType === CollisionType.SOLID || collisionType === CollisionType.DESK;
}

export enum TileType {
  // Outdoor tiles
  GRASS,
  TUFT, // Grass with tufts - seasonal variation (replaces 90% of grass)
  TUFT_SPARSE, // Sparse tuft variant - less visual intensity (uses only sparse images)
  ROCK,
  WATER,
  // Lake tiles (directional edges for proper water rendering)
  WATER_CENTER,
  WATER_LEFT,
  WATER_RIGHT,
  WATER_TOP,
  WATER_BOTTOM,
  MAGICAL_LAKE, // Large 12x12 magical lake tile (multi-tile sprite for forest lake scene)
  SMALL_LAKE, // Smaller 6x6 lake tile (same sprite, scaled down for forest ponds)
  PATH,
  // Indoor tiles
  FLOOR,
  FLOOR_LIGHT,
  FLOOR_DARK,
  MINE_FLOOR,
  WALL,
  WOODEN_WALL_POOR,
  WOODEN_WALL,
  WOODEN_WALL_POSH,
  CARPET,
  RUG,
  // Transition tiles
  DOOR,
  EXIT_DOOR,
  SHOP_DOOR,
  MINE_ENTRANCE,
  // Furniture/objects
  TABLE,
  CHAIR,
  MIRROR,
  // Decorative (walkable)
  MUSHROOM,
  FERN,
  BUSH,
  TREE,
  TREE_BIG,
  CHERRY_TREE,
  OAK_TREE,
  FAIRY_OAK,
  FAIRY_OAK_GIANT, // Enormous 10x10 fairy oak for the deep forest
  SPRUCE_TREE,
  WILLOW_TREE,
  LILAC_TREE, // Lilac bush/tree (seasonal flowering shrub)
  WILD_IRIS, // Flowering plant that grows near water
  POND_FLOWERS, // Pond flowers (seasonal variations, spring/summer use same sprite)
  BRAMBLES, // Thorny brambles (seasonal variations, solid obstacle)
  HAZEL_BUSH, // Hazel bushes (wild forageable, seasonal variations, solid obstacle)
  BLUEBERRY_BUSH, // Wild blueberry bushes (forageable in forest, seasonal variations, solid obstacle, 3x3)
  WILD_STRAWBERRY, // Wild strawberry plants (forageable in forest, seasonal variations)
  VILLAGE_FLOWERS, // Village decorative flowers (seasonal variations, appears in village)
  GIANT_MUSHROOM, // Giant magical mushroom (appears on witch hut map, tree-like)
  SAMBUCA_BUSH, // Sambuca bush (appears on witch hut map, seasonal variations)
  DEAD_SPRUCE, // Dead spruce tree (appears in forest, barren tree with winter variation)
  FIR_TREE_SMALL, // Small fir tree (walkable underbrush decoration, seasonal variations)
  SPRUCE_TREE_SMALL, // Small spruce tree (solid obstacle, seasonal variations)
  // Building tiles (outdoor structures)
  WALL_BOUNDARY,
  BUILDING_WALL,
  BUILDING_ROOF,
  BUILDING_DOOR,
  BUILDING_WINDOW,
  COTTAGE,
  COTTAGE_STONE,
  COTTAGE_FLOWERS,
  SHOP,
  GARDEN_SHED,
  // Farmland tiles
  SOIL_FALLOW,
  SOIL_TILLED,
  SOIL_PLANTED,
  SOIL_WATERED,
  SOIL_READY,
  SOIL_WILTING,
  SOIL_DEAD,
  // Indoor furniture (multi-tile)
  BED,
  SOFA,
  CHIMNEY,
  STOVE,
  DESK, // Desk surface for placing/picking up items (uses CollisionType.DESK)
  // Outdoor structures
  WELL,
  CAMPFIRE, // Campfire for outdoor cooking (higher failure rate than stove)
  WITCH_HUT, // Witch's magical house built into a giant tree (16x16 tiles)
  BEAR_HOUSE, // Bear's cozy house inside the cave (multi-tile sprite with seasonal variations)
  CAULDRON, // Animated bubbling cauldron (witch's brewing pot)
  TREE_STUMP, // Tree stump (2x2 forest decoration)
  STREAM, // Animated flowing stream (3-frame animation for forest levels)
  // Utility tiles
  INVISIBLE_WALL, // Blocks movement but renders as transparent (invisible boundary)
}

export interface Position {
  x: number;
  y: number;
}

export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// Placed item (food, decoration, etc.) that appears on the map
export interface PlacedItem {
  id: string; // Unique ID for this placed item
  itemId: string; // Item type (e.g., 'food_tea')
  position: Position; // Grid position
  mapId: string; // Which map it's on
  image: string; // Image URL
  timestamp: number; // When it was placed
}

// Item placed on a desk surface
export interface DeskItem {
  id: string; // Unique ID for this placed item
  itemId: string; // Item type from inventory (e.g., 'food_tea')
  image: string; // Image URL for rendering
  slotIndex: number; // Position in the desk's slots (0-3)
  placedAt: number; // Timestamp when placed
}

// Contents of a specific desk tile
export interface DeskContents {
  mapId: string; // Which map the desk is on
  position: Position; // Grid position of the desk tile
  items: DeskItem[]; // Items currently on the desk (max 4)
}
