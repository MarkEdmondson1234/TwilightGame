/**
 * Level data for the Sliding Crate Puzzle mini-game.
 *
 * Levels are authored as fixed-width ASCII grids (matching the readable-grid-string
 * idiom used throughout maps/definitions/), then parsed once at module load.
 *
 * Legend: '#' = wall, 'C' = crate, '.' = floor, 'S' = player start, 'E' = exit.
 *
 * IMPORTANT — why there are several open floor tiles, not exactly one: an earlier
 * design had only a single empty tile (a literal 15-puzzle). With push-only movement,
 * the empty tile is always forced to end up exactly where the player just stood, so
 * after the very first move the only legal move is to undo it — no layout can make
 * progress past move one. Real Sokoban levels always scatter several open floor tiles
 * among the crates so the player has room to route around and approach a crate from
 * whichever side a push needs.
 *
 * LEVEL_1 is hand-designed (from maps/sokoban.png) — a carved-out "pipe" shape rather
 * than an open square, with 9 crates. Verified solvable with a throwaway BFS solver
 * script (not shipped code): a 12-move solution exists that pushes three different
 * crates (up, up, push-right x2, up, push-right, up, up, push-right x2, up, right),
 * reaching the exit only after clearing all three out of the way.
 */

export enum CellKind {
  Floor,
  Wall,
  Crate,
  PlayerStart,
  Exit,
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface CrateLevel {
  id: string;
  width: number;
  height: number;
  grid: CellKind[][];
  playerStart: GridPosition;
  exit: GridPosition;
}

const LEGEND: Record<string, CellKind> = {
  '#': CellKind.Wall,
  C: CellKind.Crate,
  '.': CellKind.Floor,
  S: CellKind.Floor, // player's own starting cell — walkable, not a crate/wall
  E: CellKind.Exit,
};

function parseLevel(id: string, rows: string[]): CrateLevel {
  const height = rows.length;
  const width = rows[0].length;
  let playerStart: GridPosition | undefined;
  let exit: GridPosition | undefined;

  const grid: CellKind[][] = rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Level "${id}": row ${y} has length ${row.length}, expected ${width}`);
    }
    return row.split('').map((ch, x) => {
      if (ch === 'S') playerStart = { x, y };
      if (ch === 'E') exit = { x, y };
      const kind = LEGEND[ch];
      if (kind === undefined) throw new Error(`Level "${id}": unknown cell "${ch}" at (${x}, ${y})`);
      return kind;
    });
  });

  if (!playerStart) throw new Error(`Level "${id}": no player start ("S") found`);
  if (!exit) throw new Error(`Level "${id}": no exit ("E") found`);

  return { id, width, height, grid, playerStart, exit };
}

const LEVEL_1_ROWS = [
  '#########',
  '#C.C.#.E#',
  '#.##.C..#',
  '#.##..C##',
  '#.#.C..##',
  '#.C..#.##',
  '#.##.#C##',
  '#SCC...##',
  '#########',
];

/** All authored levels. Only one is populated for v1; the array shape stays open for more. */
export const CRATE_LEVELS: CrateLevel[] = [parseLevel('crate-puzzle-1', LEVEL_1_ROWS)];
