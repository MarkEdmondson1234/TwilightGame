import { TileType } from '../types';

// Character code to TileType mapping for child-friendly map editing
export const GRID_CODES: Record<string, TileType> = {
  // Outdoor
  'G': TileType.GRASS,
  'R': TileType.ROCK,
  'W': TileType.WATER_CENTER,     // W = water center (updated to use new lake tiles)
  // Lake tiles (directional edges for proper water rendering)
  'w': TileType.WATER_CENTER,     // w = water center (same as W, for consistency)
  '<': TileType.WATER_LEFT,       // < = left edge (arrow pointing left)
  '>': TileType.WATER_RIGHT,      // > = right edge (arrow pointing right)
  '^': TileType.WATER_TOP,        // ^ = top edge (arrow pointing up)
  'v': TileType.WATER_BOTTOM,     // v = bottom edge (arrow pointing down)
  'P': TileType.PATH,
  // Indoor
  'F': TileType.FLOOR,
  'f': TileType.FLOOR_LIGHT,  // f = light floor (lowercase f)
  'Q': TileType.FLOOR_DARK,   // Q = dark floor
  'm': TileType.MINE_FLOOR,   // m = mine floor (rocky cave floor)
  '#': TileType.WALL,
  '1': TileType.WOODEN_WALL_POOR,  // 1 = wooden wall (poor quality)
  '2': TileType.WOODEN_WALL,       // 2 = wooden wall (regular)
  '3': TileType.WOODEN_WALL_POSH,  // 3 = wooden wall (posh/fancy)
  'C': TileType.CARPET,
  'r': TileType.RUG,
  // Transitions
  'D': TileType.DOOR,
  'E': TileType.EXIT_DOOR,
  'S': TileType.SHOP_DOOR,
  'M': TileType.MINE_ENTRANCE,
  // Furniture
  'T': TileType.TABLE,
  'H': TileType.CHAIR,
  'I': TileType.MIRROR,   // Mirror (I looks like a mirror!)
  // interior
  'A': TileType.BED,      // A = bed (A bed to sleep in!)
  '@': TileType.SOFA,     // @ = sofa (comfortable seating)
  '&': TileType.CHIMNEY,  // & = chimney (brick structure)
  '$': TileType.STOVE,    // $ = stove (vertical pipe like $ symbol)
  'U': TileType.BUSH,        // U = bUsh (decorative)
  'e': TileType.FERN,        // e = fErn (forest floor plant)
  'Y': TileType.TREE,        // Y = Tree (looks like a tree top)
  'Z': TileType.TREE_BIG,    // Z = Big tree
  'J': TileType.CHERRY_TREE, // J = Cherry tree (seasonal)
  'o': TileType.OAK_TREE,    // o = Oak tree (seasonal)
  '*': TileType.FAIRY_OAK,   // * = Fairy oak (magical tree, forest only)
  '!': TileType.FAIRY_OAK_GIANT, // ! = Giant Fairy Oak (enormous 10x10, deep forest only)
  't': TileType.SPRUCE_TREE, // t = spruce Tree (evergreen conifer)
  // Buildings (outdoor structures)
  'L': TileType.WALL_BOUNDARY,   // L = waLl boundary (brick walls)
  'B': TileType.BUILDING_WALL,   // B = Building wall
  'O': TileType.BUILDING_ROOF,   // O = rOof (top of building)
  'N': TileType.BUILDING_DOOR,   // N = eNtrance
  'K': TileType.COTTAGE,          // K = Cottage (wooden house)
  // manual
  'z': TileType.COTTAGE_FLOWERS,
  'k': TileType.COTTAGE_STONE,
  '%': TileType.SHOP,             // % = Shop (seasonal building)
  '~': TileType.GARDEN_SHED,      // ~ = Garden shed (seasonal farm building)
  'V': TileType.BUILDING_WINDOW, // V = looks like a window
  // Farmland
  'X': TileType.SOIL_FALLOW,     // X = Farm plot (fallow soil)
  // Outdoor structures
  '=': TileType.WELL,            // = = Well (horizontal lines like stone well)
  '?': TileType.WITCH_HUT,       // ? = Witch hut (mysterious magical dwelling)

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
  const lines = gridString.trim().split('\n').map(line => line.trim());
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

  return grid.map(row =>
    row.map(tile => reverseMap[tile] || '?').join('')
  ).join('\n');
}
