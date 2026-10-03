import { Season } from './TimeManager';
import { isMagicShopMapId } from '../maps/magicShopId';

interface FootstepRule {
  maps?: string[];
  /** For ids the `maps` prefix match cannot tell apart (see the magic shop rule). */
  matchMap?: (mapId: string) => boolean;
  outdoor?: boolean;
  seasons: Season[];
  key: string;
}

const FOOTSTEP_RULES: FootstepRule[] = [
  {
    // The magic shop (`shop_<seed>`) has a stone floor. It must come before the
    // indoor rule, whose 'shop' entry (the grocery) prefix-matches `shop_<seed>` too.
    matchMap: isMagicShopMapId,
    seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER],
    key: 'footstep_stone',
  },
  {
    maps: ['village'],
    seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN],
    key: 'footstep_village_grass',
  },
  {
    maps: ['cave', 'lava'],
    seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER],
    key: 'footstep_stone',
  },
  {
    maps: ['forest', 'deep_forest', 'mushroom_forest', 'bear_cave', 'witch_hut', 'magical_lake', 'ruins'],
    seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN],
    key: 'footstep_leaves',
  },
  {
    outdoor: true,
    seasons: [Season.WINTER],
    key: 'footstep_snow',
  },
  {
    maps: [
      'house1', 'house2', 'home_upstairs',
      'mums_kitchen', 'cottage_interior', 'mushras_shop',
      'bear_den', 'seed_shed', 'shop',
    ],
    seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER],
    key: 'footstep_inside',
  },
  // Add new entries here as audio files are uploaded
];

/** Returns the audio key to play for footsteps, or null if none defined for this context. */
export function getFootstepKey(mapId: string, season: Season, isOutdoor: boolean): string | null {
  for (const rule of FOOTSTEP_RULES) {
    if (rule.matchMap && !rule.matchMap(mapId)) continue;
    if (rule.maps && !rule.maps.some((m) => mapId === m || mapId.startsWith(m + '_'))) continue;
    if (rule.outdoor && !isOutdoor) continue;
    if (rule.seasons.includes(season)) return rule.key;
  }
  return null;
}
