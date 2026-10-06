/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { festivalBullet, getMissedFestivals as getFestivals } from '../utils/missedFestivals';

/** Names only — most cases here are about the calendar, not the art. */
const getMissedFestivals = (since: number, now: number) =>
  getFestivals(since, now).map((festival) => festival.name);
import { TimeManager } from '../utils/TimeManager';
import { HARVEST_FEAST_TABLE_IMAGE } from '../data/harvestFeast';
import { YULE_TREE_IMAGE } from '../data/yuleCelebration';

const DAY = TimeManager.MS_PER_GAME_DAY;
const SEASON = TimeManager.DAYS_PER_SEASON * DAY;
/** Real time of a given game day (0-based from the clock start) and hour. */
const at = (totalDays: number, hour = 0) =>
  TimeManager.GAME_START_DATE + totalDays * DAY + hour * TimeManager.MS_PER_GAME_HOUR;
// Year 2, so the maths is not only exercised at the epoch. Winter starts on day 252 of a year.
const YEAR = TimeManager.DAYS_PER_YEAR * 2;
const winterFestival = at(YEAR + 252 + 41, 9);

describe('festivals missed while away', () => {
  it('finds nothing for a short absence away from festival day', () => {
    expect(getMissedFestivals(at(YEAR + 10), at(YEAR + 30))).toEqual([]);
  });
  it('reports Yule when the absence spans winter day 42, 9am', () => {
    expect(getMissedFestivals(winterFestival - 1, winterFestival)).toEqual(['Yule']);
    expect(getMissedFestivals(winterFestival, winterFestival + DAY)).toEqual([]);
  });
  it('lists several festivals newest first, and never more than a year of them', () => {
    expect(getMissedFestivals(winterFestival - SEASON - DAY, winterFestival + DAY)).toEqual([
      'Yule',
      'the Harvest Feast',
    ]);
    expect(getMissedFestivals(winterFestival - 10 * SEASON, winterFestival + DAY)).toHaveLength(4);
  });
  it('ignores clocks running backwards', () => {
    expect(getMissedFestivals(winterFestival + DAY, winterFestival - SEASON)).toEqual([]);
  });
  it('writes a sentence that starts with a capital', () => {
    expect(festivalBullet('the Summer Solstice')).toBe(
      'The Summer Solstice took place in the village!'
    );
  });
});

describe('festival pictures', () => {
  it('shows the hand-drawn Yule tree and harvest feast table, and nothing invented for the rest', () => {
    const year = getFestivals(winterFestival - 4 * SEASON + DAY, winterFestival + DAY);
    const images = Object.fromEntries(year.map((f) => [f.name, f.image]));
    expect(images).toEqual({
      Yule: YULE_TREE_IMAGE,
      'the Harvest Feast': HARVEST_FEAST_TABLE_IMAGE,
      'the Summer Solstice': undefined,
      Mayday: undefined,
    });
  });
});
