/**
 * Tile Registration Completeness Tests
 *
 * Adding a tile means touching several registries that nothing forces you to
 * keep in sync: TILE_LEGEND (data/tiles.ts), GRID_CODES (maps/gridParser.ts),
 * SPRITE_METADATA (data/spriteMetadata.ts) and TILE_TYPE_TO_COLOR_KEY
 * (utils/ColorResolver.ts). Miss one and the failure is silent — the game still
 * boots, the tile still renders, it just renders *wrong*.
 *
 * These tests assert completeness across those registries. They deliberately do
 * NOT re-test ColorResolver behaviour, which tests/colorResolver.test.ts covers.
 *
 * WHAT BREAKS IF THESE FAIL:
 * - Missing TILE_LEGEND entry: no name, no colour, no collision type. The tile
 *   is invisible and walkable regardless of intent.
 * - Missing TILE_TYPE_TO_COLOR_KEY entry: ColorResolver falls back to the
 *   hardcoded TILE_LEGEND `color` instead of resolving through the map's colour
 *   scheme. The tile renders a visible wrong-coloured box the moment the scheme
 *   diverges from that hardcoded value — which every seasonal and night-time
 *   modifier does. This is the exact bug CLAUDE.md documents under "Tile
 *   Background Colors and ColorResolver": the cause is almost never image
 *   transparency, it is a missing mapping here.
 * - Duplicate GRID_CODES key: JavaScript object literals silently keep only the
 *   last entry, so an entire tile type quietly disappears from map grids.
 * - Duplicate SPRITE_METADATA tileType: only one definition wins; the other's
 *   dimensions and collision box are silently ignored.
 */

/** @vitest-environment node */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { initializeMaps, mapManager } from '../maps';
import { GRID_CODES } from '../maps/gridParser';
import { COLOR_SCHEMES } from '../maps/colorSchemes';
import { TILE_LEGEND } from '../constants';
import { SPRITE_METADATA } from '../data/spriteMetadata';
import { ColorResolver } from '../utils/ColorResolver';
import { TileType } from '../types';

/** Human-readable tile name for failure output ("TileType.42" helps nobody). */
const tileName = (t: TileType): string => `${TileType[t] ?? 'UNKNOWN'} (${t})`;

/** Tile types placed in at least one registered map grid. */
let tilesUsedInMaps: Set<TileType>;
/** Tile types that have a multi-tile foreground/background sprite. */
let spriteTileTypes: Set<TileType>;
/** Tile types whose legend entry sets `baseType` (renders another tile beneath). */
let baseTypeTiles: TileType[];

beforeAll(() => {
  initializeMaps();

  tilesUsedInMaps = new Set<TileType>();
  for (const id of mapManager.getAllMapIds()) {
    for (const row of mapManager.getMap(id)!.grid) {
      for (const tile of row) tilesUsedInMaps.add(tile);
    }
  }

  spriteTileTypes = new Set(SPRITE_METADATA.map((s) => s.tileType));

  baseTypeTiles = (Object.keys(TILE_LEGEND) as unknown as string[])
    .map((k) => Number(k) as TileType)
    .filter((t) => TILE_LEGEND[t]?.baseType !== undefined);
});

// ============================================================================
// TILE_LEGEND completeness
// ============================================================================

describe('Tile Registration - TILE_LEGEND Coverage', () => {
  it('every tile type used in a registered map grid has a TILE_LEGEND entry', () => {
    const violations = [...tilesUsedInMaps]
      .filter((t) => !TILE_LEGEND[t])
      .map((t) => `Tile ${tileName(t)} appears in a map grid but has no TILE_LEGEND entry`);

    if (violations.length > 0) {
      console.error(
        'Unregistered tile types found in map grids:\n' +
          violations.join('\n') +
          '\n\nFIX: add the tile to TILE_LEGEND in data/tiles.ts with at least ' +
          '`name`, `color` and `collisionType`. Without it the tile is invisible ' +
          'and always walkable.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('every tile type reachable from a grid code has a TILE_LEGEND entry', () => {
    const violations = Object.entries(GRID_CODES)
      .filter(([, t]) => !TILE_LEGEND[t])
      .map(
        ([code, t]) => `Grid code '${code}' maps to ${tileName(t)}, which has no TILE_LEGEND entry`
      );

    if (violations.length > 0) {
      console.error(
        'Grid codes pointing at unregistered tiles:\n' +
          violations.join('\n') +
          '\n\nFIX: add the tile to TILE_LEGEND in data/tiles.ts, or remove the ' +
          'dead grid code from GRID_CODES in maps/gridParser.ts.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('every SPRITE_METADATA tile type has a TILE_LEGEND entry', () => {
    const violations = [...spriteTileTypes]
      .filter((t) => !TILE_LEGEND[t])
      .map(
        (t) => `SPRITE_METADATA defines a sprite for ${tileName(t)}, which has no TILE_LEGEND entry`
      );

    if (violations.length > 0) {
      console.error(
        'Sprites for unregistered tiles:\n' +
          violations.join('\n') +
          '\n\nFIX: add the tile to TILE_LEGEND in data/tiles.ts. The sprite ' +
          'layer needs the legend entry for the background colour and collision type.'
      );
    }
    expect(violations).toEqual([]);
  });
});

// ============================================================================
// TILE_TYPE_TO_COLOR_KEY completeness — the recurring "wrong coloured box" bug
// ============================================================================

describe('Tile Registration - ColorResolver Mapping Coverage', () => {
  it('every tile with a baseType is mapped in TILE_TYPE_TO_COLOR_KEY', () => {
    const colorKeys = ColorResolver.TILE_TYPE_TO_COLOR_KEY;

    const violations = baseTypeTiles
      .filter((t) => !colorKeys[t])
      .map(
        (t) =>
          `Tile ${tileName(t)} sets baseType=${tileName(TILE_LEGEND[t]!.baseType!)} ` +
          `but has no TILE_TYPE_TO_COLOR_KEY entry ` +
          `(falls back to hardcoded "${TILE_LEGEND[t]!.color}")`
      );

    if (violations.length > 0) {
      console.error(
        'Decorative tiles missing a colour-scheme mapping:\n' +
          violations.join('\n') +
          '\n\nFIX: add the tile to TILE_TYPE_TO_COLOR_KEY in utils/ColorResolver.ts ' +
          "(usually mapping to 'grass'). A tile with a baseType is drawn over " +
          'another tile, so its background MUST resolve through the map colour ' +
          'scheme — otherwise it renders a fixed-colour box that diverges from ' +
          'the surrounding ground under seasonal and night-time modifiers.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('every multi-tile sprite placed in a map is mapped in TILE_TYPE_TO_COLOR_KEY', () => {
    const colorKeys = ColorResolver.TILE_TYPE_TO_COLOR_KEY;

    const violations = [...spriteTileTypes]
      .filter((t) => tilesUsedInMaps.has(t) && !colorKeys[t])
      .map(
        (t) =>
          `Tile ${tileName(t)} renders a multi-tile sprite in a map grid but has ` +
          `no TILE_TYPE_TO_COLOR_KEY entry ` +
          `(falls back to hardcoded "${TILE_LEGEND[t]?.color}")`
      );

    if (violations.length > 0) {
      console.error(
        'Placed sprites missing a colour-scheme mapping:\n' +
          violations.join('\n') +
          '\n\nFIX: add the tile to TILE_TYPE_TO_COLOR_KEY in utils/ColorResolver.ts ' +
          "('grass' for outdoor sprites, 'floor' for indoor furniture). Multi-tile " +
          'sprites are transparent around the edges, so the tile background shows ' +
          'through — it must follow the map colour scheme, not a hardcoded value.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('every colour key used by the mapping exists in every registered colour scheme', () => {
    const usedKeys = new Set(Object.values(ColorResolver.TILE_TYPE_TO_COLOR_KEY));
    const violations: string[] = [];

    for (const scheme of Object.values(COLOR_SCHEMES)) {
      for (const key of usedKeys) {
        if (!(key in scheme.colors)) {
          violations.push(`Colour scheme "${scheme.name}" has no "${key}" colour`);
        }
      }
    }

    if (violations.length > 0) {
      console.error(
        'Colour schemes missing keys that tiles depend on:\n' +
          violations.join('\n') +
          '\n\nFIX: add the missing colour to the scheme in maps/colorSchemes.ts. ' +
          'A tile mapped to a key the scheme lacks silently falls back to its ' +
          'TILE_LEGEND base colour.'
      );
    }
    expect(violations).toEqual([]);
  });
});

// ============================================================================
// Registry uniqueness — duplicates are silently dropped by JavaScript
// ============================================================================

describe('Tile Registration - No Silently Dropped Duplicates', () => {
  it('GRID_CODES has no duplicate character keys', () => {
    // Parsed from source, not from the runtime object: a duplicate key in an
    // object literal is silently collapsed, so the runtime object can never
    // reveal that a tile type was overwritten.
    const source = readFileSync(new URL('../maps/gridParser.ts', import.meta.url), 'utf8');
    const start = source.indexOf('export const GRID_CODES');
    const end = source.indexOf('\n};', start);
    expect(
      start,
      'Could not locate the GRID_CODES literal in maps/gridParser.ts — this test needs updating'
    ).toBeGreaterThan(-1);

    const body = source.slice(start, end);
    // Matches quoted keys, bare identifier keys, and the bare `$` key.
    const keyPattern =
      /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([A-Za-z_$][\w$]*)|(\$))\s*:/gm;

    const counts = new Map<string, number>();
    let match: RegExpExecArray | null;
    while ((match = keyPattern.exec(body)) !== null) {
      const key = match[1] ?? match[2] ?? match[3] ?? match[4]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // Guard the parser itself: if it drifts, the duplicate check is meaningless.
    expect(
      counts.size,
      'GRID_CODES source parser drifted from the runtime object — fix the parser in this test'
    ).toBe(Object.keys(GRID_CODES).length);

    const violations = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(
        ([key, n]) => `Grid code '${key}' is defined ${n} times — only the last one takes effect`
      );

    if (violations.length > 0) {
      console.error(
        'Duplicate grid codes:\n' +
          violations.join('\n') +
          '\n\nFIX: give one of the tiles a different character in GRID_CODES ' +
          '(maps/gridParser.ts), or use a map-specific customCodes override. ' +
          'Duplicated keys silently erase a tile type from every map grid.'
      );
    }
    expect(violations).toEqual([]);
  });

  it('SPRITE_METADATA defines each tile type at most once', () => {
    const counts = new Map<TileType, number>();
    for (const sprite of SPRITE_METADATA) {
      counts.set(sprite.tileType, (counts.get(sprite.tileType) ?? 0) + 1);
    }

    const violations = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([t, n]) => `Tile ${tileName(t)} has ${n} SPRITE_METADATA entries — only one is used`);

    if (violations.length > 0) {
      console.error(
        'Duplicate sprite definitions:\n' +
          violations.join('\n') +
          '\n\nFIX: merge the duplicates in data/spriteMetadata.ts. The losing ' +
          "entry's dimensions, offsets and collision box are silently ignored, " +
          'which reads as "my collision box changes did nothing".'
      );
    }
    expect(violations).toEqual([]);
  });
});

/**
 * Grid characters that `parseGrid` does not recognise, by map.
 *
 * When a grid contains a character that is in neither GRID_CODES nor that map's own
 * `customCodes`, parseGrid silently substitutes GRASS and logs a warning nobody reads —
 * so a typo becomes a permanent, invisible patch of grass.
 *
 * `´` (U+00B4) in village.ts is almost certainly a slipped keystroke: on a Mac it is what
 * Option+E produces. Which tile actually belongs there is a judgement call about how that
 * spot in the village should look, so it is recorded rather than guessed at.
 *
 * ⚠️ Do NOT add characters here to silence a grid you are editing. Use a real code, or
 * register one — either in GRID_CODES (maps/gridParser.ts) or in that map's customCodes.
 */
const KNOWN_UNKNOWN_GRID_CHARS = ['´'];

describe('Map grids use only recognised grid codes', () => {
  it('parsing every map definition produces no "Unknown grid code" warnings', async () => {
    // Grid codes are resolved per map — parseGrid merges GRID_CODES with each map's own
    // `customCodes` argument — so a static scan of the grid strings cannot know what is
    // valid. Instead we re-parse the definitions for real and capture what the parser says.
    vi.resetModules();

    const unknown: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (message.includes('Unknown grid code')) unknown.push(message);
    });

    try {
      await import('../maps/index');
    } finally {
      warn.mockRestore();
    }

    const unexpected = [
      ...new Set(unknown.filter((w) => !KNOWN_UNKNOWN_GRID_CHARS.some((c) => w.includes(`'${c}'`)))),
    ];

    if (unexpected.length > 0) {
      console.error(
        `Unrecognised grid codes:\n${unexpected.join('\n')}\n\n` +
          'FIX: parseGrid turns these into GRASS with no error, so the map renders wrong ' +
          'and nothing fails. Use an existing code from GRID_CODES (maps/gridParser.ts), ' +
          "or add it to that map's customCodes argument."
      );
    }
    expect(unexpected).toEqual([]);
  });
});
