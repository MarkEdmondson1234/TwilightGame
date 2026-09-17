/**
 * Foreground parallax trees — the decorative crowns that frame the bottom of
 * the screen on outdoor maps ("peering over the treetops").
 *
 * Pure data and asset resolution, shared by the PixiJS layer that draws them
 * (utils/pixi/ForegroundParallaxLayer.ts) and the per-map texture budget
 * (utils/mapTextureSet.ts), which has to count them: seven tree textures at
 * 1024² is ~28 MB of GPU memory on every map that shows them.
 */

import { tileAssets } from '../assets';
import type { MapDefinition } from '../types';
import type { SeasonKey } from '../utils/mapTextureSet';

export type ParallaxTreeType = 'oak' | 'cherry' | 'spruce' | 'willow' | 'lilac';

export interface ParallaxTreeConfig {
  id: string;
  treeType: ParallaxTreeType;
  /** Horizontal position as a percentage of the viewport width (may overhang the edges). */
  horizontalPercent: number;
  /** How far up from the map's bottom edge the crown sits, in pixels. */
  bottomOffset: number;
  /** Scale multiplier on the base tree height. */
  scale: number;
  /** Parallax speed (higher = more movement relative to the camera). */
  parallaxSpeed: number;
}

/** Colour schemes whose maps show the trees. */
export const PARALLAX_COLOR_SCHEMES: ReadonlySet<string> = new Set([
  'village',
  'forest',
  'water_area',
]);

export function hasForegroundParallax(map: MapDefinition | null | undefined): boolean {
  if (!map) return false;
  return map.foregroundParallax ?? PARALLAX_COLOR_SCHEMES.has(map.colorScheme);
}

/** Base on-screen height of a tree before its per-tree scale. */
export const PARALLAX_TREE_HEIGHT_PX = 800;

/** Trees fade as the player's screen position nears them, so they never hide the action. */
export const PARALLAX_FADE_DISTANCE_PX = 650;
export const PARALLAX_FULL_FADE_DISTANCE_PX = 250;

/** Rows from the bottom of the map that the crowns' base sits on. */
export const PARALLAX_BOTTOM_ROWS = 2;

/**
 * Tree configurations - spread across bottom of screen
 * Trees positioned so only their CROWNS (tops) are visible
 * bottomOffset controls how high the tree crown appears (higher = more visible)
 * Mix of different tree types for visual variety
 */
export const PARALLAX_TREES: readonly ParallaxTreeConfig[] = [
  {
    id: 'tree-1',
    treeType: 'oak',
    horizontalPercent: -5,
    bottomOffset: 280,
    scale: 1.3,
    parallaxSpeed: 0.35,
  },
  {
    id: 'tree-2',
    treeType: 'willow',
    horizontalPercent: 15,
    bottomOffset: 250,
    scale: 1.2,
    parallaxSpeed: 0.28,
  },
  {
    id: 'tree-3',
    treeType: 'spruce',
    horizontalPercent: 35,
    bottomOffset: 300,
    scale: 1.4,
    parallaxSpeed: 0.4,
  },
  {
    id: 'tree-4',
    treeType: 'willow',
    horizontalPercent: 55,
    bottomOffset: 230,
    scale: 1.0,
    parallaxSpeed: 0.32,
  },
  {
    id: 'tree-5',
    treeType: 'lilac',
    horizontalPercent: 72,
    bottomOffset: 270,
    scale: 1.3,
    parallaxSpeed: 0.38,
  },
  {
    id: 'tree-6',
    treeType: 'oak',
    horizontalPercent: 90,
    bottomOffset: 260,
    scale: 1.4,
    parallaxSpeed: 0.42,
  },
  {
    id: 'tree-7',
    treeType: 'spruce',
    horizontalPercent: 108,
    bottomOffset: 245,
    scale: 1.2,
    parallaxSpeed: 0.45,
  },
];

/** The artwork for a tree type in a season. */
export function getParallaxTreeUrl(treeType: ParallaxTreeType, season: SeasonKey): string {
  switch (treeType) {
    case 'oak':
      return {
        spring: tileAssets.oak_tree_spring,
        summer: tileAssets.oak_tree_summer,
        autumn: tileAssets.oak_tree_autumn,
        winter: tileAssets.oak_tree_winter,
      }[season];
    case 'cherry':
      return {
        spring: tileAssets.sakura_tree_spring,
        summer: tileAssets.sakura_tree_summer,
        autumn: tileAssets.sakura_tree_autumn,
        winter: tileAssets.sakura_tree_winter,
      }[season];
    case 'spruce':
      return season === 'winter' ? tileAssets.spruce_tree_winter : tileAssets.spruce_tree;
    case 'willow':
      return season === 'autumn'
        ? tileAssets.willow_tree_autumn
        : season === 'winter'
          ? tileAssets.willow_tree_winter
          : tileAssets.willow_tree;
    case 'lilac':
      return {
        spring: tileAssets.lilac_tree_spring,
        summer: tileAssets.lilac_tree_summer,
        autumn: tileAssets.lilac_tree_autumn,
        winter: tileAssets.lilac_tree_winter,
      }[season];
  }
}

/** Every texture the trees need in a season (deduplicated). */
export function getParallaxTreeUrls(season: SeasonKey): string[] {
  return [...new Set(PARALLAX_TREES.map((tree) => getParallaxTreeUrl(tree.treeType, season)))];
}
