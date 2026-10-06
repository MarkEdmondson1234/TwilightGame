/**
 * Which village festivals took place while the player was away.
 *
 * Festivals run on the shared, deterministic calendar (day 42 of every season,
 * from 9am — see data/cutscenes/seasonalEvents.ts), so this needs no network:
 * the same real-time span gives every player the same answer.
 */
import { Season, TimeManager } from './TimeManager';
import { HARVEST_FEAST_TABLE_IMAGE } from '../data/harvestFeast';
import { YULE_TREE_IMAGE } from '../data/yuleCelebration';

/** Day of the season every festival falls on (1-based, as GameTime.day). */
const FESTIVAL_DAY = 42;
/** Game hour the festival begins. */
const FESTIVAL_HOUR = 9;
/** Never list more than a year of festivals, however long the player was gone. */
const MAX_MISSED_FESTIVALS = 4;

export interface MissedFestival {
  name: string;
  /** Hand-drawn festival art, shown small beside the bullet. */
  image?: string;
}

const FESTIVALS: Record<Season, MissedFestival> = {
  [Season.SPRING]: { name: 'Mayday' },
  [Season.SUMMER]: { name: 'the Summer Solstice' },
  [Season.AUTUMN]: { name: 'the Harvest Feast', image: HARVEST_FEAST_TABLE_IMAGE },
  [Season.WINTER]: { name: 'Yule', image: YULE_TREE_IMAGE },
};
const SEASON_ORDER = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];

/** Real-time ms at which the festival of the given absolute season index begins. */
function festivalStartMs(seasonIndex: number): number {
  const day = seasonIndex * TimeManager.DAYS_PER_SEASON + (FESTIVAL_DAY - 1);
  return (
    TimeManager.GAME_START_DATE +
    day * TimeManager.MS_PER_GAME_DAY +
    FESTIVAL_HOUR * TimeManager.MS_PER_GAME_HOUR
  );
}

/** Festivals that began in (sinceMs, nowMs], newest first. */
export function getMissedFestivals(sinceMs: number, nowMs: number): MissedFestival[] {
  if (!(nowMs > sinceMs)) return [];
  const msPerSeason = TimeManager.DAYS_PER_SEASON * TimeManager.MS_PER_GAME_DAY;
  let index = Math.floor((nowMs - TimeManager.GAME_START_DATE) / msPerSeason);
  const names: MissedFestival[] = [];
  while (index >= 0 && names.length < MAX_MISSED_FESTIVALS) {
    const start = festivalStartMs(index);
    if (start <= sinceMs) break;
    if (start <= nowMs) names.push(FESTIVALS[SEASON_ORDER[index % SEASON_ORDER.length]]);
    index--;
  }
  return names;
}

/** "Yule took place in the village!" */
export function festivalBullet(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} took place in the village!`;
}
