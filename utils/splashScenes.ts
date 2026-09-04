/**
 * Splash screen backdrop composition — pure data, no React.
 *
 * The splash composites the same layer stack the season cutscenes use
 * (data/cutscenes/seasonChange.ts, panorama scenes — no offsets/animation),
 * not just their bottom layer: the bare background files have empty space
 * that the layers above them were drawn to fill (issue #97).
 *
 * Kept as a standalone module so tests/splashScenes.test.ts can guard it:
 * it verifies every layer file exists on disk and that each season's stack
 * still matches the corresponding cutscene scene, so the two cannot drift.
 */

import { Season } from './TimeManager';

/** One layer of the splash backdrop, bottom to top. */
export interface SplashLayer {
  image: string;
  zIndex: number;
}

export const CUTSCENE_DIR = '/TwilightGame/assets-optimized/cutscenes/';

export const SEASON_SCENES: Record<Season, SplashLayer[]> = {
  [Season.SPRING]: [
    { image: 'cutscene_spring_background.png', zIndex: 0 },
    { image: 'cutscene_spring_middleground.png', zIndex: 1 },
    { image: 'cutscene_spring_left.png', zIndex: 2 },
    { image: 'cutscene_spring_right.png', zIndex: 3 },
  ],
  [Season.SUMMER]: [
    { image: 'cutscene_summer_background.png', zIndex: 0 },
    { image: 'cutscene_summer_front_left.png', zIndex: 1 },
    { image: 'cutscene_summer_front_right.png', zIndex: 2 },
  ],
  [Season.AUTUMN]: [
    { image: 'cutscene_autumn_background.png', zIndex: 0 },
    { image: 'cutscene_autumn_middleground.png', zIndex: 1 },
    { image: 'cutscene_autumn_foreground.png', zIndex: 2 },
  ],
  [Season.WINTER]: [
    // NB: winter's stack starts with sky + village — its "background" file is
    // a mid-stack hill layer, not the backdrop (mirrors winter_snowfall).
    { image: 'cutscene_winter_sky.png', zIndex: 0 },
    { image: 'cutscene_winter_village.png', zIndex: 1 },
    { image: 'cutscene_winter_background.png', zIndex: 2 },
    { image: 'cutscene_winter_foreground.png', zIndex: 3 },
  ],
};

/** The seasonChange.ts scenes each splash stack mirrors, keyed by season. */
export const PANORAMA_SCENE_IDS: Record<Season, string> = {
  [Season.SPRING]: 'spring_blossoms',
  [Season.SUMMER]: 'summer_panorama',
  [Season.AUTUMN]: 'autumn_arrival',
  [Season.WINTER]: 'winter_snowfall',
};
