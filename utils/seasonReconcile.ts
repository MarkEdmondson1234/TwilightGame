/**
 * seasonReconcile — Pure calendar helpers for detecting seasons missed while
 * the game was closed.
 *
 * Season-driven resets (FruitTreeManager's winter pruning window, spring
 * growing cycle) used to fire only from TIME_CHANGED — i.e. only while the
 * game was running. With one real week per season, a spring that passed while
 * nobody was playing was never observed, and flags stayed stuck for a whole
 * year. These helpers let startup code compare the saved game-day count
 * against the current one and replay the missed transitions.
 */

/** Lowercase season names in calendar order — matches TimeManager.SEASON_ORDER. */
const SEASON_CYCLE = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Whether a season start (e.g. the first day of spring) falls in the game-day
 * interval (fromDay, toDay].
 *
 * A boundary exactly ON fromDay counts as already processed — saves are
 * stamped after resets are applied. On toDay it counts as newly reached
 * (returning on the first day of spring should trigger the spring reset).
 */
export function crossedSeasonStart(
  fromDay: number,
  toDay: number,
  startDayInYear: number,
  daysPerYear: number
): boolean {
  if (toDay <= fromDay) return false;
  const daysUntilNext =
    (((startDayInYear - (fromDay % daysPerYear)) % daysPerYear) + daysPerYear) % daysPerYear;
  const firstBoundaryDay = fromDay + (daysUntilNext === 0 ? daysPerYear : daysUntilNext);
  return firstBoundaryDay <= toDay;
}

/**
 * Seasons crossed walking forward from `from` (exclusive) to `to` (inclusive),
 * e.g. seasonsBetween('autumn', 'spring') → ['winter', 'spring'].
 *
 * Fallback for legacy saves that recorded only the season name: it cannot
 * detect a whole missing year when from === to (the day-count path handles
 * that exactly). Unknown inputs return [].
 */
export function seasonsBetween(from: string, to: string): string[] {
  const start = SEASON_CYCLE.indexOf(from);
  if (start === -1 || SEASON_CYCLE.indexOf(to) === -1 || from === to) return [];
  const out: string[] = [];
  for (let idx = start + 1; ; idx++) {
    const season = SEASON_CYCLE[idx % SEASON_CYCLE.length];
    out.push(season);
    if (season === to) break;
  }
  return out;
}