/**
 * Map Texture Sets — works out which textures a given map actually needs.
 *
 * WHY THIS EXISTS
 * The startup path used to load every texture in the game before the first
 * frame: 434 files, ~140MB of downloads and ~1.2GB of decoded GPU memory. A
 * desktop absorbs that; iOS caps a web content process far below it and kills
 * the tab, which is not a catchable error — it surfaces (if at all) as a
 * stray "TypeError: Load failed" from whichever fetch happened to be in flight.
 *
 * So textures are now scoped: a small core set that every map needs, plus the
 * set belonging to the map you are actually standing on.
 *
 * IMPORTANT: this resolver is a *prefetch hint*, not a contract. It cannot see
 * through TileData.getImage() resolvers (fruit trees pick sprites from runtime
 * state), placed furniture, or a crop planted thirty seconds from now. Layers
 * resolve textures synchronously via textureManager.getTexture() and call
 * textureManager.requestTexture() when they miss, so anything this function
 * fails to predict still loads — one frame late instead of never. Keep it that
 * way: making rendering depend on this set being exhaustive would turn every
 * omission into an invisible sprite.
 */

import { TILE_LEGEND, SPRITE_METADATA } from '../constants';
import {
  cookingAssets,
  farmingAssets,
  itemAssets,
  particleAssets,
} from '../assets';
import { getCharacterSpriteUrls } from './assetPreloader';
import { mapManager } from '../maps/MapManager';
import type { MapDefinition, NPC } from '../types';
import { TileType } from '../types';

/** Season keys as they appear in SeasonalImageSet (lowercase, unlike TimeManager's enum). */
export const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type SeasonKey = (typeof SEASON_KEYS)[number];

/**
 * Soil and fixture sprites for the farming system. Unlike the `plant_*` crop
 * sprites these are needed the instant a player tills anywhere, on any map, so
 * they stay resident. The crop sprites (the bulk of farmingAssets by memory)
 * load on demand when a plot actually grows one.
 */
const FARMING_CORE_KEYS = [
  'fallow',
  'tilled',
  'tilled_wet',
  'seedling',
  'wilted_plant',
  'farm_fence',
  'farm_fence_side',
] as const;

/** Push every truthy string in `values` into `out`. */
function collect(out: Set<string>, ...values: Array<string | string[] | undefined | null>): void {
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v) out.add(v);
    } else {
      out.add(value);
    }
  }
}

/**
 * Textures needed on every map: inventory icons (always in the HUD), weather
 * particles, cooking sprites and the farming soil states.
 */
export function getCoreTextureUrls(characterId = 'character1'): string[] {
  const urls = new Set<string>();
  // The player is on screen on every map, in every frame. Pinning these stops a
  // map transition evicting the character and re-fetching it mid-walk.
  //
  // Only the *selected* character: the other one is never rendered locally, and
  // a remote player using it is handled on demand by RemotePlayerLayer.
  collect(urls, getCharacterSpriteUrls(characterId));
  collect(urls, ...Object.values(itemAssets));
  collect(urls, ...Object.values(particleAssets));
  collect(urls, ...Object.values(cookingAssets));
  for (const key of FARMING_CORE_KEYS) {
    collect(urls, (farmingAssets as Record<string, string>)[key]);
  }
  return [...urls];
}

/** Every image a TileData entry can render in the given season. */
function tileImages(
  tileType: TileType,
  season: SeasonKey,
  seen: Set<TileType>,
  out: Set<string>
): void {
  if (seen.has(tileType)) return;
  seen.add(tileType);

  const data = TILE_LEGEND[tileType];
  if (!data) return;

  collect(out, data.image, data.animationFrames);

  if (data.seasonalImages) {
    // Current season only, plus the always-applicable defaults. Loading all four
    // quadrupled the cost of every tree — the village's seasonal oak and birch
    // variants alone are 4MB each — for art that is out of season three
    // quarters of the time. The season rolls over on a day boundary and
    // reloadForSeason() re-prefetches; requestTexture() covers the gap.
    collect(out, data.seasonalImages.default, data.seasonalImages[season]);
  }
  if (data.weatherImages) {
    // Weather flips within a session and these are small, so keep them all.
    for (const images of Object.values(data.weatherImages)) collect(out, images);
  }
  if (data.timeOfDayImages) {
    for (const images of Object.values(data.timeOfDayImages[season] ?? {})) {
      collect(out, images as string[]);
    }
  }
  // NOTE: data.getImage() is deliberately not called — it is a runtime resolver
  // needing map/position/season/time. Those sprites arrive via requestTexture().

  // getTileData() (utils/mapUtils.ts) silently substitutes GRASS -> TUFT at ~90% of
  // positions for natural outdoor variety. Anything that resolves to GRASS here —
  // directly, or as another tile's baseType (e.g. LUMINESCENT_TOADSTOOL, normally
  // placed on grass) — can therefore render TUFT's art at render time instead. Without
  // this, a map that never otherwise needs TUFT (a cave/lava room using GRASS only as a
  // decoration's baseType, say) never preloads it, so that decoration shows an
  // untextured colour-fallback square at ~90% of its placements instead of its base.
  if (tileType === TileType.GRASS) {
    tileImages(TileType.TUFT, season, seen, out);
  }

  if (data.baseType !== undefined) tileImages(data.baseType, season, seen, out);
}

/** Multi-tile sprite art registered for a tile type, in the given season. */
function spriteImages(tileTypes: Set<TileType>, season: SeasonKey, out: Set<string>): void {
  for (const entry of SPRITE_METADATA) {
    if (!tileTypes.has(entry.tileType)) continue;
    collect(out, entry.image, entry.animationFrames);
    const seasonal = (entry as { seasonalImages?: Record<string, string | string[]> })
      .seasonalImages;
    if (seasonal) collect(out, seasonal.default, seasonal[season]);
  }
}

/**
 * The sprites an NPC renders *in the world*, which is all PixiJS ever uploads
 * for them: `sprite` plus every animation frame (npcManager swaps `sprite` to
 * the current frame as states advance).
 *
 * Deliberately excludes portraitSprite, dialogueSprite and dialogueExpressions.
 * Those are shown by DialogueBox/GiftModal/GlamourModal as ordinary React <img>
 * elements — they live in the browser's image cache, never become GPU textures,
 * and are among the largest art in the game. Counting them here would have
 * charged every map a few hundred megabytes it never actually uses.
 */
function npcImages(npcs: NPC[] | undefined, out: Set<string>): void {
  for (const npc of npcs ?? []) {
    collect(out, npc.sprite);
    for (const state of Object.values(npc.animatedStates?.states ?? {})) {
      collect(out, state.sprites);
      if (state.directionalSprites) {
        collect(out, ...Object.values(state.directionalSprites));
      }
    }
  }
}

/**
 * The textures a specific map needs: every tile type present in its grid (plus
 * the base types they render over), the multi-tile sprites those types trigger,
 * and every NPC that can appear there.
 */
export function getTexturesForMap(mapId: string, season: SeasonKey = 'spring'): string[] {
  const map: MapDefinition | undefined =
    mapManager.getCurrentMapId() === mapId
      ? (mapManager.getCurrentMap() ?? undefined)
      : mapManager.getMap(mapId);
  if (!map) return [];

  const out = new Set<string>();

  // Tile types actually present in the grid, plus the out-of-bounds border tile.
  const tileTypes = new Set<TileType>();
  for (const row of map.grid ?? []) {
    for (const tile of row) tileTypes.add(tile);
  }
  if (map.borderTileType !== undefined) tileTypes.add(map.borderTileType);

  const seen = new Set<TileType>();
  for (const tileType of tileTypes) tileImages(tileType, season, seen, out);
  // baseType chains can pull in types not present in the grid (GRASS under a
  // tree); those need their sprite metadata too.
  spriteImages(seen, season, out);

  npcImages(map.npcs, out);
  collect(out, map.backgroundTexture?.image);

  // Room background images are loaded per-map by BackgroundImageLayer already.

  return [...out];
}

/**
 * Core set plus the given map's set — the full keep-list for eviction.
 */
export function getResidentTextureUrls(
  mapId: string,
  season: SeasonKey = 'spring',
  characterId = 'character1'
): string[] {
  return [
    ...new Set([...getCoreTextureUrls(characterId), ...getTexturesForMap(mapId, season)]),
  ];
}

/** Convert TimeManager's Season enum ('Spring') to the lowercase asset key. */
export function toSeasonKey(season: string): SeasonKey {
  const key = season.toLowerCase();
  return (SEASON_KEYS as readonly string[]).includes(key) ? (key as SeasonKey) : 'spring';
}
