/**
 * Where the tile-triggered animations go (falling petals over a sakura, bees
 * round a hive, dragonflies over a stream, fire in a hearth).
 *
 * Pure: scans the visible tiles of a map for the trigger tile types in
 * TILE_ANIMATIONS, applies each animation's season/time conditions, and
 * returns one placement per instance in pre-zoom stage pixels — the same
 * space the Pixi entities use (docs/ARCHITECTURE_GOTCHAS.md §1). Every
 * "random" choice (offset, scale, flip, instance count) is seeded on the
 * animation id and tile, so the placement is stable across renders and the
 * same for every player on a shared map.
 *
 * Drawn by utils/pixi/AnimationLayer.ts. This used to be inside
 * components/AnimationOverlay.tsx, which rendered the results as animated
 * GIF <img>s over the canvas (PERFORMANCE_MOBILE_PLAN.md §5 M1).
 */

import { TILE_ANIMATIONS, TILE_SIZE } from '../constants';
import type { MapDefinition, Position, TileAnimation, TileType } from '../types';
import { getTileData } from './mapUtils';
import type { VisibleRange } from './viewportUtils';

/** Default size of an animation's source canvas in pixels; scale is relative to it. */
export const DEFAULT_ANIMATION_SIZE = 512;
/** Tiles beyond the visible range still scanned, for animations that reach into view. */
const SCAN_MARGIN = 5;

export type AnimationLayerName = TileAnimation['layer'];

export interface AnimationPlacement {
  /** Stable per animation, tile and instance. */
  key: string;
  animation: TileAnimation;
  /** Top-left corner in pre-zoom stage pixels (gridOffset applied). */
  x: number;
  y: number;
  /** On-screen size in pre-zoom stage pixels (square). */
  size: number;
  flip: boolean;
  opacity: number;
  /** Tile the placement belongs to, for depth sorting. */
  tileY: number;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(value: T | T[], r: number): T {
  return Array.isArray(value) ? value[Math.floor(r * value.length)] : value;
}

function conditionsAllow(
  animation: TileAnimation,
  seasonKey: string,
  timeOfDay: 'day' | 'night'
): boolean {
  const c = animation.conditions;
  if (!c) return true;
  if (c.season) {
    const seasons = Array.isArray(c.season) ? c.season : [c.season];
    if (!(seasons as string[]).includes(seasonKey)) return false;
  }
  if (c.timeOfDay) {
    const times = Array.isArray(c.timeOfDay) ? c.timeOfDay : [c.timeOfDay];
    if (!times.includes(timeOfDay)) return false;
  }
  return true;
}

/**
 * The sprite sheets a map can need in a season: every animation whose trigger
 * tile is on the map and whose season condition (if any) includes the season.
 * Time of day is ignored — a dragonfly sheet resident all day is cheaper than
 * a load at dawn. For the per-map texture budget (utils/mapTextureSet.ts).
 */
export function getTileAnimationSheetUrls(tileTypes: ReadonlySet<TileType>, seasonKey: string): string[] {
  const urls = new Set<string>();
  for (const animation of TILE_ANIMATIONS) {
    if (!tileTypes.has(animation.tileType)) continue;
    const season = animation.conditions?.season;
    if (season) {
      const seasons = Array.isArray(season) ? season : [season];
      if (!(seasons as string[]).includes(seasonKey)) continue;
    }
    urls.add(animation.image);
  }
  return [...urls];
}

/** The animations whose conditions hold now, optionally for one layer. */
export function getActiveTileAnimations(
  seasonKey: string,
  timeOfDay: 'day' | 'night',
  layer?: AnimationLayerName
): TileAnimation[] {
  return TILE_ANIMATIONS.filter(
    (a) => (!layer || a.layer === layer) && conditionsAllow(a, seasonKey, timeOfDay)
  );
}

export function getTileAnimationPlacements(
  map: MapDefinition,
  visibleRange: VisibleRange,
  seasonKey: string,
  timeOfDay: 'day' | 'night',
  gridOffset?: Position,
  tileSize: number = TILE_SIZE
): AnimationPlacement[] {
  const active = getActiveTileAnimations(seasonKey, timeOfDay);
  if (active.length === 0) return [];

  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  // Scale factor applied to animation sizes so they stay proportional to the tile size
  const tileSizeScale = tileSize / TILE_SIZE;
  const viewMinX = offsetX + visibleRange.minX * tileSize;
  const viewMaxX = offsetX + visibleRange.maxX * tileSize;
  const viewMinY = offsetY + visibleRange.minY * tileSize;
  const viewMaxY = offsetY + visibleRange.maxY * tileSize;

  const startX = Math.max(0, visibleRange.minX - SCAN_MARGIN);
  const endX = Math.min(map.width - 1, visibleRange.maxX + SCAN_MARGIN);
  const startY = Math.max(0, visibleRange.minY - SCAN_MARGIN);
  const endY = Math.min(map.height - 1, visibleRange.maxY + SCAN_MARGIN);

  const placements: AnimationPlacement[] = [];
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const tileData = getTileData(x, y);
      if (!tileData) continue;

      for (const animation of active) {
        if (animation.tileType !== tileData.type) continue;

        const tileX = offsetX + x * tileSize;
        const tileY = offsetY + y * tileSize;
        const tileSeed = hash(`${animation.id}-${x}-${y}`);
        const instanceCount = Array.isArray(animation.instances)
          ? animation.instances[0] +
            Math.floor(
              ((tileSeed % 10000) / 10000) * (animation.instances[1] - animation.instances[0] + 1)
            )
          : (animation.instances ?? 1);

        for (let instance = 0; instance < instanceCount; instance++) {
          const key = `${animation.id}-${x}-${y}-${instance}`;
          const seed = hash(key);
          const seededRandom = (index: number) => ((seed + index * 1234567) % 10000) / 10000;

          const dx = pick(animation.offsetX, seededRandom(0));
          const dy = pick(animation.offsetY, seededRandom(1));
          const scale = animation.scale ? pick(animation.scale, seededRandom(2)) : 1;
          const flip = !!animation.flipHorizontal && seededRandom(3) > 0.5;

          const size = (animation.gifSize ?? DEFAULT_ANIMATION_SIZE) * scale * tileSizeScale;
          // Centred on the tile centre plus the offset.
          const px = tileX + dx * tileSize + tileSize / 2 - size / 2;
          const py = tileY + dy * tileSize + tileSize / 2 - size / 2;

          if (px + size < viewMinX || px - size > viewMaxX || py + size < viewMinY || py - size > viewMaxY) {
            continue;
          }

          placements.push({
            key,
            animation,
            x: px,
            y: py,
            size,
            flip,
            opacity: animation.opacity ?? 1,
            tileY: y,
          });
        }
      }
    }
  }
  return placements;
}
