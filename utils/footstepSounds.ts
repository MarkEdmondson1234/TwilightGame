import { Season } from './TimeManager';

interface FootstepRule {
  maps?: string[];
  outdoor?: boolean;
  seasons: Season[];
  key: string;
}

const FOOTSTEP_RULES: FootstepRule[] = [
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
    if (rule.maps && !rule.maps.some((m) => mapId === m || mapId.startsWith(m + '_'))) continue;
    if (rule.outdoor && !isOutdoor) continue;
    if (rule.seasons.includes(season)) return rule.key;
  }
  return null;
}
