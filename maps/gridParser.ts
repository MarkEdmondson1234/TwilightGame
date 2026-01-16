import { TileType } from '../types';

/**
 * Global validation errors collected during map registration
 * These are displayed on screen to help developers quickly fix issues
 */
export interface MapValidationError {
  mapId: string;
  errors: string[];
  warnings: string[];
}

let validationErrors: MapValidationError[] = [];

/**
 * Get all collected validation errors
 */
export function getValidationErrors(): MapValidationError[] {
  return validationErrors;
}

/**
 * Clear all validation errors (call after displaying them)
 */
export function clearValidationErrors(): void {
  validationErrors = [];
}

/**
 * Check if there are any critical validation errors
 */
export function hasValidationErrors(): boolean {
  return validationErrors.some((v) => v.errors.length > 0);
}

// Character code to TileType mapping for child-friendly map editing
export const GRID_CODES: Record<string, TileType> = {
  // Outdoor
  G: TileType.GRASS,
  '.': TileType.TUFT, // . = Grass tuft (seasonal grass variation)
  ',': TileType.TUFT_SPARSE, // , = Sparse tuft (less visual intensity than regular tuft)
  R: TileType.ROCK,
  W: TileType.WATER_CENTER, // W = water center (updated to use new lake tiles)
  // Lake tiles (directional edges for proper water rendering)
  w: TileType.WATER_CENTER, // w = water center (same as W, for consistency)
  '<': TileType.WATER_LEFT, // < = left edge (arrow pointing left)
  '>': TileType.WATER_RIGHT, // > = right edge (arrow pointing right)
  '^': TileType.WATER_TOP, // ^ = top edge (arrow pointing up)
  v: TileType.WATER_BOTTOM, // v = bottom edge (arrow pointing down)
  P: TileType.PATH,
  // Indoor
  F: TileType.FLOOR,
  f: TileType.FLOOR_LIGHT, // f = light floor (lowercase f)
  Q: TileType.FLOOR_DARK, // Q = dark floor
  m: TileType.MINE_FLOOR, // m = mine floor (rocky cave floor)
  '#': TileType.WALL,
  '1': TileType.WOODEN_WALL_POOR, // 1 = wooden wall (poor quality)
  '2': TileType.WOODEN_WALL, // 2 = wooden wall (regular)
  '3': TileType.WOODEN_WALL_POSH, // 3 = wooden wall (posh/fancy)
  C: TileType.CARPET,
  r: TileType.RUG,
  // Transitions
  D: TileType.DOOR,
  E: TileType.EXIT_DOOR,
  S: TileType.SHOP_DOOR,
  M: TileType.MINE_ENTRANCE,
  // Furniture
  T: TileType.TABLE,
  H: TileType.CHAIR,
  I: TileType.MIRROR, // Mirror (I looks like a mirror!)
  // interior
  A: TileType.BED, // A = bed (A bed to sleep in!)
  '@': TileType.SOFA, // @ = sofa (comfortable seating)
  '&': TileType.CHIMNEY, // & = chimney (brick structure)
  $: TileType.STOVE, // $ = stove (vertical pipe like $ symbol)
  _: TileType.DESK, // _ = desk (flat surface for placing/picking items)
  U: TileType.BUSH, // U = bUsh (decorative)
  u: TileType.MUSHROOM, // u = mUshroom (decorative forest floor)
  x: TileType.GIANT_MUSHROOM, // x = Giant mushroom (magical witch hut area)
  g: TileType.SAMBUCA_BUSH, // g = Sambuca bush (magical witch hut area)
  e: TileType.FERN, // e = fErn (forest floor plant)
  Y: TileType.TREE, // Y = Tree (looks like a tree top)
  Z: TileType.TREE_BIG, // Z = Big tree
  J: TileType.CHERRY_TREE, // J = Cherry tree (seasonal)
  o: TileType.OAK_TREE, // o = Oak tree (seasonal)
  '*': TileType.FAIRY_OAK, // * = Fairy oak (magical tree, forest only)
  '!': TileType.FAIRY_OAK_GIANT, // ! = Giant Fairy Oak (enormous 10x10, deep forest only)
  t: TileType.SPRUCE_TREE, // t = spruce Tree (evergreen conifer)
  j: TileType.FIR_TREE_SMALL, // j = small fir tree (walkable underbrush)
  n: TileType.SPRUCE_TREE_SMALL, // n = small spruce tree (solid evergreen)
  y: TileType.WILLOW_TREE, // y = willYw tree (graceful weeping willow)
  c: TileType.LILAC_TREE, // c = lilaC tree (flowering shrub/small tree)
  '4': TileType.TREE_MUSHROOMS, // 4 = Dead tree with mushrooms (old gnarled tree, deep forest)
  '|': TileType.TREE_STUMP, // | = Tree stump (vertical trunk, 2x2 forest decoration)
  i: TileType.WILD_IRIS, // i = Iris (wild iris flower, grows near water)
  p: TileType.POND_FLOWERS, // p = Pond flowers (floating flowers, seasonal colors)
  b: TileType.BRAMBLES, // b = Brambles (thorny obstacle with seasonal colors)
  d: TileType.BLUEBERRY_BUSH, // d = Blueberry bush (wild forageable berry bush, 3x3, seasonal variations)
  h: TileType.HAZEL_BUSH, // h = Hazel bush (wild forageable bush, seasonal variations)
  s: TileType.WILD_STRAWBERRY, // s = Strawberry (wild forageable strawberry plants)
  l: TileType.VILLAGE_FLOWERS, // l = Village flowers (decorative flowers in village, stem-like)
  // Deep Forest plants
  a: TileType.MOONPETAL, // a = Moonpetal (night-blooming magical flower, deep forest only)
  "'": TileType.ADDERSMEAT, // ' = Addersmeat (night-blooming flower, moon magic, deep forest only)
  // Buildings (outdoor structures)
  L: TileType.WALL_BOUNDARY, // L = waLl boundary (brick walls)
  B: TileType.BUILDING_WALL, // B = Building wall
  O: TileType.BUILDING_ROOF, // O = rOof (top of building)
  N: TileType.BUILDING_DOOR, // N = eNtrance
  K: TileType.COTTAGE, // K = Cottage (wooden house)
  // manual
  z: TileType.COTTAGE_FLOWERS,
  k: TileType.COTTAGE_STONE,
  '%': TileType.SHOP, // % = Shop (seasonal building)
  '~': TileType.GARDEN_SHED, // ~ = Garden shed (seasonal farm building)
  V: TileType.BUILDING_WINDOW, // V = looks like a window
  // Farmland
  X: TileType.SOIL_FALLOW, // X = Farm plot (fallow soil)
  // Outdoor structures
  '=': TileType.WELL, // = = Well (horizontal lines like stone well)
  q: TileType.CAMPFIRE, // q = Campfire (looks like fire/smoke)
  '?': TileType.WITCH_HUT, // ? = Witch hut (mysterious magical dwelling)
  '{': TileType.BEAR_HOUSE, // { = Bear house (cozy dwelling in cave, curly like a den)
  '+': TileType.CAULDRON, // + = Cauldron (bubbling witch's pot)
  '(': TileType.MAGICAL_LAKE, // ( = Magical lake (12x12 mystical water feature, curves like a pool)
  ')': TileType.SMALL_LAKE, // ) = Small lake (6x6 pond, same sprite scaled down)
  // Utility tiles
  '0': TileType.INVISIBLE_WALL, // 0 = Invisible wall (blocks movement, zero visibility)
};

/**
 * Converts a multi-line string grid into a 2D TileType array
 * Example:
 * ```
 * ####
 * #FFE
 * ####
 * ```
 */
export function parseGrid(gridString: string): TileType[][] {
  const lines = gridString
    .trim()
    .split('\n')
    .map((line) => line.trim());
  const grid: TileType[][] = [];

  for (const line of lines) {
    const row: TileType[] = [];
    for (const char of line) {
      const tileType = GRID_CODES[char];
      if (tileType !== undefined) {
        row.push(tileType);
      } else {
        console.warn(`Unknown grid code: '${char}', defaulting to GRASS`);
        row.push(TileType.GRASS);
      }
    }
    if (row.length > 0) {
      grid.push(row);
    }
  }

  return grid;
}

/**
 * Converts a 2D TileType array back to a grid string (for debugging)
 */
export function gridToString(grid: TileType[][]): string {
  const reverseMap: Record<number, string> = {};
  for (const [char, tileType] of Object.entries(GRID_CODES)) {
    reverseMap[tileType] = char;
  }

  return grid.map((row) => row.map((tile) => reverseMap[tile] || '?').join('')).join('\n');
}

/**
 * Validates a map definition and logs any errors
 * Call this during development to catch common issues
 */
export function validateMapDefinition(map: {
  id: string;
  width: number;
  height: number;
  grid: TileType[][];
  spawnPoint?: { x: number; y: number };
  transitions?: Array<{ fromPosition: { x: number; y: number } }>;
  npcs?: Array<{ position: { x: number; y: number }; name?: string }>;
}): boolean {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check grid dimensions
  const actualHeight = map.grid.length;
  const actualWidth = map.grid[0]?.length ?? 0;

  if (actualHeight !== map.height) {
    errors.push(`Grid height mismatch: declared ${map.height}, actual ${actualHeight} rows`);
  }

  if (actualWidth !== map.width) {
    errors.push(`Grid width mismatch: declared ${map.width}, actual ${actualWidth} columns`);
  }

  // Check for inconsistent row widths
  for (let y = 0; y < map.grid.length; y++) {
    if (map.grid[y].length !== actualWidth) {
      errors.push(`Row ${y} has ${map.grid[y].length} columns, expected ${actualWidth}`);
    }
  }

  // Check spawn point bounds
  if (map.spawnPoint) {
    const { x, y } = map.spawnPoint;
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      errors.push(
        `Spawn point (${x}, ${y}) is out of bounds (0-${map.width - 1}, 0-${map.height - 1})`
      );
    }
  }

  // Check transition positions
  if (map.transitions) {
    for (const t of map.transitions) {
      const { x, y } = t.fromPosition;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
        errors.push(`Transition at (${x}, ${y}) is out of bounds`);
      }
    }
  }

  // Check NPC positions
  if (map.npcs) {
    for (const npc of map.npcs) {
      const { x, y } = npc.position;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
        warnings.push(`NPC "${npc.name || 'unknown'}" at (${x}, ${y}) is out of bounds`);
      }
    }
  }

  // Collect errors for display
  if (errors.length > 0 || warnings.length > 0) {
    validationErrors.push({
      mapId: map.id,
      errors,
      warnings,
    });

    // Also log to console for immediate feedback
    console.group(`🗺️ Map Validation: ${map.id}`);
    console.log(
      `Declared: ${map.width}x${map.height}, Actual grid: ${actualWidth}x${actualHeight}`
    );

    if (errors.length > 0) {
      console.error('❌ ERRORS:');
      errors.forEach((e) => console.error(`  - ${e}`));
    }

    if (warnings.length > 0) {
      console.warn('⚠️ WARNINGS:');
      warnings.forEach((w) => console.warn(`  - ${w}`));
    }

    console.groupEnd();
  }

  return errors.length === 0;
}
