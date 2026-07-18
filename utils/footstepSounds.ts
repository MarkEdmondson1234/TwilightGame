import { Season } from './TimeManager';

interface FootstepRule {
  maps: string[];
  seasons: Season[];
  key: string;
}

const FOOTSTEP_RULES: FootstepRule[] = [
  {
    maps: ['village'],
    seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN],
    key: 'footstep_village_grass',
  },
  // Add new entries here as audio files are uploaded
];

/** Returns the audio key to play for footsteps, or null if none defined for this context. */
export function getFootstepKey(mapId: string, season: Season): string | null {
  for (const rule of FOOTSTEP_RULES) {
    if (rule.maps.some((m) => mapId === m || mapId.startsWith(m + '_'))) {
      if (rule.seasons.includes(season)) return rule.key;
    }
  }
  return null;
}
