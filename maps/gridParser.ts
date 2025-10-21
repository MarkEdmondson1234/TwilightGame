import { TileType } from '../types';

// Character code to TileType mapping for child-friendly map editing
export const GRID_CODES: Record<string, TileType> = {
  // Outdoor
  'G': TileType.GRASS,
  'R': TileType.ROCK,
  'W': TileType.WATER,
  'P': TileType.PATH,
  // Indoor
  'F': TileType.FLOOR,
  'f': TileType.FLOOR_LIGHT,  // f = light floor (lowercase f)
  'Q': TileType.FLOOR_DARK,   // Q = dark floor
  '#': TileType.WALL,
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
  'A': TileType.BED,      // A = bed (A bed to sleep in!)
  '@': TileType.SOFA,     // @ = sofa (comfortable seating)
  'U': TileType.BUSH,        // U = bUsh (decorative)
  'Y': TileType.TREE,        // Y = Tree (looks like a tree top)
  'Z': TileType.TREE_BIG,    // Z = Big tree
  'J': TileType.CHERRY_TREE, // J = Cherry tree (seasonal)
  // Buildings (outdoor structures)
  'L': TileType.WALL_BOUNDARY,   // L = waLl boundary (brick walls)
  'B': TileType.BUILDING_WALL,   // B = Building wall
  'O': TileType.BUILDING_ROOF,   // O = rOof (top of building)
  'N': TileType.BUILDING_DOOR,   // N = eNtrance
  'K': TileType.COTTAGE,          // K = Cottage (wooden house)
  'V': TileType.BUILDING_WINDOW, // V = looks like a window
  // Farmland
  'X': TileType.SOIL_FALLOW,     // X = Farm plot (fallow soil)
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
